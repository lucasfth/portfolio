import type { RuleId } from "./rules.ts";
import { evaluateRules } from "./rules.ts";
import { hasObviousGibberish } from "./grammar.ts";

export type SentenceCheck =
  | { ok: true }
  | {
      ok: false;
      code: "invalid_sentence" | "gibberish_detected" | "rules_failed";
      failedRuleIds?: RuleId[];
    };

const BUCKET_MS = 5 * 60 * 1_000;
/** A sentence written for the previous bucket stays valid this long after rollover. */
export const BUCKET_GRACE_MS = 60 * 1_000;

const RESERVED_NICKNAMES = new Set(["lucas", "lucas hanson", "lucasfth", "admin", "moderator", "system"]);

export function normalizeNickname(value: unknown): {
  displayNickname: string;
  normalizedNickname: string;
} | null {
  if (typeof value !== "string") return null;
  const displayNickname = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  const normalizedNickname = displayNickname.toLowerCase();
  const length = Array.from(displayNickname).length;
  if (
    length < 1 ||
    length > 24 ||
    /[\p{Cc}\p{Cf}]/u.test(displayNickname) ||
    /https?:|www\.|\.[a-z]{2,}(?:\/|$)/iu.test(displayNickname) ||
    RESERVED_NICKNAMES.has(normalizedNickname)
  ) {
    return null;
  }
  return { displayNickname, normalizedNickname };
}

function failedRules(sentence: string, levels: number, now: Date): RuleId[] {
  return evaluateRules(sentence, { now })
    .slice(0, levels)
    .filter(({ passed }) => !passed)
    .map(({ id }) => id);
}

/** Check the first `levels` rules against the server clock, with a short rollover grace. */
export function checkSentence(sentence: unknown, levels: number, now: Date): SentenceCheck {
  if (typeof sentence !== "string" || sentence.length === 0 || sentence.length > 500) {
    return { ok: false, code: "invalid_sentence" };
  }
  if (hasObviousGibberish(sentence)) return { ok: false, code: "gibberish_detected" };

  const failed = failedRules(sentence, levels, now);
  if (failed.length === 0) return { ok: true };

  if (now.getTime() % BUCKET_MS < BUCKET_GRACE_MS) {
    const previous = new Date(now.getTime() - BUCKET_GRACE_MS - 1);
    if (failedRules(sentence, levels, previous).length === 0) return { ok: true };
  }
  return { ok: false, code: "rules_failed", failedRuleIds: failed };
}
