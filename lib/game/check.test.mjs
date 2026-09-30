import assert from "node:assert/strict";
import test from "node:test";
import { createWitness } from "./challenge.ts";
import { checkSentence, normalizeNickname } from "./check.ts";

const date = "2026-09-29";

test("a valid sentence passes on the server clock", () => {
  assert.deepEqual(checkSentence(createWitness(date, "14:35"), 20, new Date("2026-09-29T14:37:00.000Z")), { ok: true });
});

test("a sentence for the previous bucket passes within the one-minute grace", () => {
  const sentence = createWitness(date, "14:35");
  assert.deepEqual(checkSentence(sentence, 20, new Date("2026-09-29T14:40:30.000Z")), { ok: true });
  const late = checkSentence(sentence, 20, new Date("2026-09-29T14:41:30.000Z"));
  assert.equal(late.ok, false);
  assert.deepEqual(late.failedRuleIds, ["R03", "R04"]);
});

test("only the first N rules are checked at level N", () => {
  const now = new Date("2026-09-29T14:35:00.000Z");
  assert.deepEqual(checkSentence("On Tuesday 2026-09-29", 2, now), { ok: true });
  assert.equal(checkSentence("On Tuesday 2026-09-29", 3, now).ok, false);
});

test("gibberish and oversized sentences are rejected", () => {
  const now = new Date("2026-09-29T14:35:00.000Z");
  assert.equal(checkSentence(createWitness(date, "14:35").replace("calm", "caaaalm"), 20, now).code, "gibberish_detected");
  assert.equal(checkSentence("x".repeat(501), 1, now).code, "invalid_sentence");
  assert.equal(checkSentence(42, 1, now).code, "invalid_sentence");
});

test("nicknames reject links, control and format characters, and reserved names", () => {
  assert.deepEqual(normalizeNickname("  Ada  Lovelace "), { displayNickname: "Ada Lovelace", normalizedNickname: "ada lovelace" });
  for (const bad of [null, "   ", "x".repeat(25), "visit example.com", "https://x", "Lucas", "ad\u200bmin", "a\u0007b"]) {
    assert.equal(normalizeNickname(bad), null, String(bad));
  }
});
