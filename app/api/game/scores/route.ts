import { revalidateTag } from "next/cache";
import { claimRun, fetchLeaderboard, isSetupError, storeBestScore } from "@/lib/game/convex";
import { checkSentence, normalizeNickname } from "@/lib/game/check";
import { getUtcDate } from "@/lib/game/challenge";
import { checkHuman } from "@/lib/game/human";
import { findMisspellings } from "@/lib/game/spelling";
import { getRunSecret, readRun } from "@/lib/game/runToken";
import {
  decodePayment,
  matchesRequirements,
  paymentRequired,
  readX402Config,
  settlePayment,
  verifyPayment,
} from "@/lib/game/x402";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };

function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status, headers: HEADERS });
}

function unavailable(error: unknown) {
  return fail(503, "leaderboard_unavailable", {
    message: isSetupError(error) ? "The leaderboard is not set up yet." : "Portfolio leaderboard is temporarily unavailable.",
  });
}

/**
 * Submit a finished run: `{ token, nickname, sentence }`.
 * Sessions that pass the bot check save free. Everyone else pays per entry with x402 (HTTP 402).
 */
export async function POST(request: Request) {
  const secret = getRunSecret();
  if (!secret) return fail(503, "game_unavailable", { message: "The game server is not set up yet." });

  let input: { token?: unknown; nickname?: unknown; sentence?: unknown };
  try {
    const text = await request.text();
    if (text.length > 4_096) return fail(413, "payload_too_large");
    input = JSON.parse(text);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error();
  } catch {
    return fail(400, "invalid_payload", { message: "Send JSON: { token, nickname, sentence }." });
  }

  const now = new Date();
  const run = readRun(input.token, secret, now.getTime());
  if (!run) return fail(400, "invalid_run", { message: "The run token is invalid or expired." });
  if (run.cleared !== 20) return fail(400, "run_incomplete", { cleared: run.cleared });

  const nickname = normalizeNickname(input.nickname);
  if (!nickname) return fail(400, "invalid_nickname", { message: "Use 1 to 24 characters, no links or reserved names." });

  const check = checkSentence(input.sentence, 20, now);
  if (check.ok === false) return fail(422, check.code, { failedRuleIds: check.failedRuleIds });
  const misspelled = await findMisspellings(input.sentence as string);
  if (misspelled.length > 0) {
    return fail(422, "misspelled_words", { misspelled, message: `Use real English words. Not recognised: ${misspelled.join(", ")}.` });
  }

  const human = await checkHuman(request);
  if (human === "unavailable") {
    return fail(503, "human_check_unavailable", { message: "The bot check is unavailable. Nothing was charged. Try again shortly." });
  }
  const config = readX402Config();
  const payment = human === "human" ? null : decodePayment(request.headers.get("payment-signature"));
  if (human === "not_human") {
    if (!config || !payment) return paymentRequired(request.url, config, "PAYMENT-SIGNATURE header is required");
    if (!matchesRequirements(payment, config.requirements)) {
      return paymentRequired(request.url, config, "Payment does not match the advertised requirements");
    }
    try {
      const verified = await verifyPayment(config, payment);
      if (!verified.isValid) return paymentRequired(request.url, config, verified.invalidReason || "Payment is invalid");
    } catch {
      return fail(502, "payment_unavailable", { message: "The payment facilitator could not be reached. Nothing was charged." });
    }
  }

  // Claim before settling: a run is never charged twice, and a replay fails before payment.
  try {
    if (!(await claimRun(run.id))) return fail(409, "run_already_submitted");
  } catch (error) {
    return unavailable(error);
  }

  // Settle before writing, so a payment that fails settlement never reaches the board.
  let settlement: Record<string, any> | null = null;
  if (payment && config) {
    settlement = await settlePayment(config, payment).catch(() => null);
    if (!settlement?.success) {
      return paymentRequired(request.url, config, settlement?.errorReason || "Settlement failed");
    }
  }

  const date = getUtcDate(now);
  try {
    const saved = await storeBestScore({ runId: run.id, date, ...nickname, level: 20, elapsedMs: now.getTime() - run.startedAt });
    revalidateTag(`game-leaderboard-${date}`, { expire: 0 });
    const scores = await fetchLeaderboard(date);
    const rankIndex = scores.findIndex(({ normalizedNickname }) => normalizedNickname === nickname.normalizedNickname);
    return Response.json(
      {
        date,
        score: {
          displayNickname: saved.displayNickname,
          level: saved.level,
          elapsedMs: saved.elapsedMs,
          rank: rankIndex === -1 ? null : rankIndex + 1,
        },
      },
      {
        headers: {
          ...HEADERS,
          ...(settlement ? { "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(settlement)).toString("base64") } : {}),
        },
      }
    );
  } catch (error) {
    return unavailable(error);
  }
}
