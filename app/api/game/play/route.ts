import { checkSentence } from "@/lib/game/check";
import { createChallenge } from "@/lib/game/challenge";
import { findMisspellings } from "@/lib/game/spelling";
import { MIN_LEVEL_MS, createRun, getRunSecret, readRun, signRun } from "@/lib/game/runToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status, headers: HEADERS });
}

/**
 * Play one step. `{}` starts a run. `{ token, sentence }` tries to clear the next rule.
 * Every earlier rule is re-checked on the server clock, so progress cannot be forged.
 */
export async function POST(request: Request) {
  const secret = getRunSecret();
  if (!secret) return fail(503, "game_unavailable", { message: "The game server is not set up yet." });

  let input: { token?: unknown; sentence?: unknown };
  try {
    const text = await request.text();
    if (text.length > 4_096) return fail(413, "payload_too_large");
    input = text ? JSON.parse(text) : {};
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return fail(400, "invalid_payload", { message: "Send JSON: {} to start, or { token, sentence } to clear the next rule." });
  }

  const now = new Date();
  const challenge = createChallenge(now);

  if (input.token === undefined) {
    const run = createRun(now.getTime());
    return Response.json(
      { token: signRun(run, secret), cleared: 0, nextRule: challenge.rules[0], challenge },
      { headers: HEADERS }
    );
  }

  const run = readRun(input.token, secret, now.getTime());
  if (!run) return fail(400, "invalid_run", { message: "The run token is invalid or expired. Start a new run." });
  if (run.cleared === 20) return fail(409, "run_complete", { message: "All 20 rules are cleared. Submit to /api/game/scores." });
  if (now.getTime() - run.clearedAt < MIN_LEVEL_MS) return fail(429, "too_fast", { retryAfterMs: MIN_LEVEL_MS });

  const level = run.cleared + 1;
  const check = checkSentence(input.sentence, level, now);
  if (check.ok === false) {
    return fail(422, check.code, {
      level,
      failedRuleIds: check.failedRuleIds,
      token: input.token,
      rules: challenge.rules.slice(0, level),
    });
  }

  const misspelled = await findMisspellings(input.sentence as string);
  if (misspelled.length > 0) {
    return fail(422, "misspelled_words", {
      level,
      misspelled,
      token: input.token,
      message: `Use real English words. Not recognised: ${misspelled.join(", ")}.`,
    });
  }

  const next = { ...run, cleared: level, clearedAt: now.getTime() };
  return Response.json(
    {
      token: signRun(next, secret),
      cleared: level,
      nextRule: challenge.rules[level] ?? null,
      rules: challenge.rules.slice(0, Math.min(level + 1, 20)),
      elapsedMs: now.getTime() - run.startedAt,
    },
    { headers: HEADERS }
  );
}
