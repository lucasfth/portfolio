import assert from "node:assert/strict";
import test from "node:test";
import { createWitness } from "./challenge.ts";
import { validateSubmission } from "./validateSubmission.ts";

const now = new Date("2026-09-29T14:35:00.000Z");
const date = "2026-09-29";
const timeBucket = "14:35";

function validPayload(overrides = {}) {
  const sentence = createWitness(date, timeBucket);
  const history = Array.from({ length: 20 }, (_, index) => ({
    level: index + 1,
    sentence,
    date,
    timeBucket,
  }));
  return { nickname: "  Ada Lovelace  ", elapsedMs: 45_000, history, ...overrides };
}

test("a complete twenty-step history derives its validated score and normalized nickname", () => {
  assert.deepEqual(validateSubmission(validPayload(), now), {
    ok: true,
    date,
    displayNickname: "Ada Lovelace",
    normalizedNickname: "ada lovelace",
    level: 20,
    elapsedMs: 45_000,
  });
});

test("a sentence that fails one level's cumulative rules cannot be submitted", () => {
  const payload = validPayload();
  payload.history[6].sentence = payload.history[6].sentence.replace("patient", "stable");
  const result = validateSubmission(payload, now);
  assert.equal(result.ok, false);
  assert.equal(result.code, "rules_failed");
  assert.equal(result.level, 7);
  assert.ok(result.failedRuleIds.includes("R07"));
});

test("skipped or reordered levels are rejected", () => {
  const skipped = validPayload();
  skipped.history[4].level = 6;
  const result = validateSubmission(skipped, now);
  assert.equal(result.ok, false);
  assert.equal(result.code, "invalid_progression");
});

test("a stale final time bucket is rejected even when its sentence was valid earlier", () => {
  const result = validateSubmission(
    validPayload(),
    new Date("2026-09-29T14:40:00.000Z")
  );
  assert.equal(result.ok, false);
  assert.equal(result.code, "stale_challenge");
});

test("a previous UTC date cannot be submitted as today's run", () => {
  const previousDate = "2026-09-28";
  const payload = validPayload({
    history: Array.from({ length: 20 }, (_, index) => ({
      level: index + 1,
      sentence: createWitness(previousDate, timeBucket),
      date: previousDate,
      timeBucket,
    })),
  });
  const result = validateSubmission(payload, now);
  assert.equal(result.ok, false);
  assert.equal(result.code, "stale_challenge");
});

test("malformed, blank, and oversized nicknames are rejected", () => {
  for (const nickname of [null, "   ", "x".repeat(25)]) {
    const result = validateSubmission(validPayload({ nickname }), now);
    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid_nickname");
  }
});

test("elapsed time must be an integer within one day", () => {
  for (const elapsedMs of [-1, 86_400_001, 1.5, "45000"]) {
    const result = validateSubmission(validPayload({ elapsedMs }), now);
    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid_elapsed");
  }
});

test("a mechanically valid run with repeated-letter gibberish cannot be submitted", () => {
  const payload = validPayload();
  payload.history = payload.history.map((entry) => ({
    ...entry,
    sentence: entry.sentence.replace("patient", "pppppppp"),
  }));
  assert.deepEqual(validateSubmission(payload, now), {
    ok: false,
    code: "gibberish_detected",
    level: 1,
  });
});
