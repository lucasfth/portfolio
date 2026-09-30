import assert from "node:assert/strict";
import test from "node:test";
import { createChallenge, createWitness, getTimeBucket, getUtcDate, getWeekday } from "./challenge.ts";
import { evaluateRules, getTimeDigitSumWord } from "./rules.ts";

const SUM_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty",
];
const REPRESENTATIVE_DATES = ["2026-09-29", "2024-02-29", "2025-12-31"];

function bucketDate(date, bucket) {
  return new Date(`${date}T${bucket}:00.000Z`);
}

test("UTC date, weekday, and five-minute bucket use UTC boundaries", () => {
  assert.equal(getUtcDate(new Date("2026-09-29T23:59:00.000Z")), "2026-09-29");
  assert.equal(getWeekday(new Date("2024-02-29T12:00:00.000Z")), "Thursday");
  assert.equal(getTimeBucket(new Date("2026-09-29T14:39:00.000Z")), "14:35");
  assert.equal(getTimeBucket(new Date("2026-09-29T14:40:00.000Z")), "14:40");
});

test("the digit-sum rule changes with the time bucket and covers sums zero through twenty", () => {
  assert.equal(getTimeDigitSumWord("14:35"), "thirteen");
  assert.equal(getTimeDigitSumWord("14:40"), "nine");
  const observedWords = new Set();
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const bucket = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      observedWords.add(getTimeDigitSumWord(bucket));
    }
  }
  assert.deepEqual([...observedWords].sort(), [...SUM_WORDS].sort());
});

test("a previous five-minute witness fails the current time and dependent sum rules", () => {
  const previous = createWitness("2026-09-29", "14:35");
  const current = evaluateRules(previous, { now: new Date("2026-09-29T14:40:00.000Z") });
  assert.deepEqual(current.filter(({ passed }) => !passed).map(({ id }) => id), ["R03", "R04"]);
});

test("a previous UTC date fails the date and dependent weekday rules after midnight", () => {
  const previous = createWitness("2026-09-30", "23:55");
  const current = evaluateRules(previous, { now: new Date("2026-10-01T00:00:00.000Z") });
  const failedIds = current.filter(({ passed }) => !passed).map(({ id }) => id);
  assert.ok(failedIds.includes("R01"));
  assert.ok(failedIds.includes("R02"));
});

test("each public daily challenge hides the witness and exposes the current UTC values", () => {
  const challenge = createChallenge(new Date("2026-09-29T14:39:00.000Z"));
  assert.deepEqual(Object.keys(challenge), ["date", "weekday", "timeBucket", "rules"]);
  assert.equal(challenge.date, "2026-09-29");
  assert.equal(challenge.weekday, "Tuesday");
  assert.equal(challenge.timeBucket, "14:35");
  assert.equal(challenge.rules.length, 20);
  assert.ok(!Object.hasOwn(challenge, "witness"));
});

test("generated witnesses satisfy all twenty rules for every daily time bucket", () => {
  for (const date of REPRESENTATIVE_DATES) {
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const bucket = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        const now = bucketDate(date, bucket);
        const results = evaluateRules(createWitness(date, bucket), { now });
        assert.equal(results.length, 20, `${date} ${bucket}: rule count`);
        assert.deepEqual(
          results.filter(({ passed }) => !passed).map(({ id }) => id),
          [],
          `${date} ${bucket}: witness failures`
        );
      }
    }
  }
});
