import { revalidateTag } from "next/cache";
import { fetchLeaderboard, storeBestScore } from "@/lib/game/convex";
import { validateSubmission } from "@/lib/game/validateSubmission";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_payload", message: "Request body must be valid JSON." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const submission = validateSubmission(input);
  if (submission.ok === false) {
    return Response.json(
      {
        error: submission.code,
        level: submission.level,
        failedRuleIds: submission.failedRuleIds,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const saved = await storeBestScore({
      date: submission.date,
      normalizedNickname: submission.normalizedNickname,
      displayNickname: submission.displayNickname,
      level: submission.level,
      elapsedMs: submission.elapsedMs,
    });
    revalidateTag(`game-leaderboard-${submission.date}`, { expire: 0 });
    const currentScores = await fetchLeaderboard(submission.date);
    const rankIndex = currentScores.findIndex(
      ({ normalizedNickname }) => normalizedNickname === submission.normalizedNickname
    );

    return Response.json(
      {
        date: submission.date,
        score: {
          displayNickname: saved.displayNickname,
          level: saved.level,
          elapsedMs: saved.elapsedMs,
          rank: rankIndex === -1 ? null : rankIndex + 1,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const setupError =
      error instanceof Error &&
      error.message.startsWith("Portfolio leaderboard is not configured.");
    return Response.json(
      {
        error: "leaderboard_unavailable",
        message: setupError
          ? error.message
          : "Portfolio leaderboard is temporarily unavailable.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
