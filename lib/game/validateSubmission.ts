import type { RuleId } from "./rules.ts";
import { evaluateRules } from "./rules.ts";
import { hasObviousGibberish } from "./grammar.ts";
import { getTimeBucket, getUtcDate } from "./challenge.ts";

interface ValidatedSubmission {
  ok: true;
  date: string;
  displayNickname: string;
  normalizedNickname: string;
  level: number;
  elapsedMs: number;
}

interface InvalidSubmission {
  ok: false;
  code:
    | "invalid_payload"
    | "invalid_nickname"
    | "invalid_elapsed"
    | "invalid_history"
    | "invalid_progression"
    | "stale_challenge"
    | "rules_failed"
    | "gibberish_detected";
  level?: number;
  failedRuleIds?: RuleId[];
}

export type SubmissionValidation = ValidatedSubmission | InvalidSubmission;

interface RawSubmission {
  nickname?: unknown;
  elapsedMs?: unknown;
  history?: unknown;
}

interface RawHistoryEntry {
  level?: unknown;
  sentence?: unknown;
  date?: unknown;
  timeBucket?: unknown;
}

function normalizeNickname(value: unknown): {
  displayNickname: string;
  normalizedNickname: string;
} | null {
  if (typeof value !== "string") return null;
  const displayNickname = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const length = Array.from(displayNickname).length;
  if (length < 1 || length > 24 || /\p{Cc}/u.test(displayNickname)) return null;
  return { displayNickname, normalizedNickname: displayNickname.toLowerCase() };
}

export function validateSubmission(input: unknown, now: Date = new Date()): SubmissionValidation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, code: "invalid_payload" };
  }
  const payload = input as RawSubmission;

  const nickname = normalizeNickname(payload.nickname);
  if (!nickname) return { ok: false, code: "invalid_nickname" };
  if (
    typeof payload.elapsedMs !== "number" ||
    !Number.isInteger(payload.elapsedMs) ||
    payload.elapsedMs < 0 ||
    payload.elapsedMs > 86_400_000
  ) {
    return { ok: false, code: "invalid_elapsed" };
  }
  if (!Array.isArray(payload.history) || payload.history.length !== 20) {
    return { ok: false, code: "invalid_history" };
  }

  const currentDate = getUtcDate(now);
  let previousTimeBucket = "00:00";
  let finalTimeBucket = "";

  for (let index = 0; index < payload.history.length; index++) {
    const value = payload.history[index];
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return { ok: false, code: "invalid_history" };
    }
    const entry = value as RawHistoryEntry;
    if (
      typeof entry.level !== "number" ||
      !Number.isInteger(entry.level) ||
      entry.level !== index + 1
    ) {
      return { ok: false, code: "invalid_progression" };
    }
    if (
      typeof entry.sentence !== "string" ||
      entry.sentence.length > 500 ||
      typeof entry.date !== "string" ||
      typeof entry.timeBucket !== "string" ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(entry.timeBucket) ||
      Number(entry.timeBucket.slice(3)) % 5 !== 0
    ) {
      return { ok: false, code: "invalid_history" };
    }
    if (entry.date !== currentDate) return { ok: false, code: "stale_challenge" };
    if (hasObviousGibberish(entry.sentence)) {
      return { ok: false, code: "gibberish_detected", level: entry.level };
    }
    if (entry.timeBucket < previousTimeBucket) {
      return { ok: false, code: "invalid_progression" };
    }

    const stepResults = evaluateRules(entry.sentence, {
      now: new Date(`${entry.date}T${entry.timeBucket}:00.000Z`),
    });
    const failedRuleIds = stepResults
      .slice(0, entry.level)
      .filter(({ passed }) => !passed)
      .map(({ id }) => id);
    if (failedRuleIds.length > 0) {
      return { ok: false, code: "rules_failed", level: entry.level, failedRuleIds };
    }

    previousTimeBucket = entry.timeBucket;
    finalTimeBucket = entry.timeBucket;
  }

  if (finalTimeBucket !== getTimeBucket(now)) {
    return { ok: false, code: "stale_challenge" };
  }

  return {
    ok: true,
    date: currentDate,
    displayNickname: nickname.displayNickname,
    normalizedNickname: nickname.normalizedNickname,
    level: 20,
    elapsedMs: payload.elapsedMs,
  };
}
