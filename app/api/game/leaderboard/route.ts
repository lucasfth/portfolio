import { unstable_cache } from "next/cache";
import { fetchLeaderboard } from "@/lib/game/convex";

export const runtime = "nodejs";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedDate = searchParams.get("date");
  const date = requestedDate ?? new Date().toISOString().slice(0, 10);
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (
    !DATE_PATTERN.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return Response.json(
      { error: "invalid_date", message: "Use a real UTC date in YYYY-MM-DD form." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const readCachedLeaderboard = unstable_cache(
    () => fetchLeaderboard(date),
    ["game-leaderboard", date],
    { revalidate: 30, tags: [`game-leaderboard-${date}`] }
  );

  try {
    const scores = await readCachedLeaderboard();
    return Response.json(
      {
        date,
        scores: scores.map(({ displayNickname, level, elapsedMs, createdAt }) => ({
          displayNickname,
          level,
          elapsedMs,
          createdAt,
        })),
      },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=30" } }
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
