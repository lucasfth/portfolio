import assert from "node:assert/strict";
import test from "node:test";
import { RULES, evaluateRules } from "./rules.ts";
import * as gameRules from "./rules.ts";

// 2026-09-29 draws the camel anchor.
const witness =
  "On Tuesday, 2026-09-29, we regret the delay because camel 2 is calm; at 14:35, the thirteen-minute incident remains serious but stable under review.";
const sampleContext = { now: new Date("2026-09-29T14:35:00.000Z") };

function failedRuleIds(sentence, context = sampleContext) {
  return evaluateRules(sentence, context)
    .filter(({ passed }) => !passed)
    .map(({ id }) => id);
}
test("token counter uses the same boundaries as R09", () => {
  assert.equal(typeof gameRules.countTokens, "function");
  assert.equal(gameRules.countTokens(witness), 23);
  assert.equal(failedRuleIds(witness).includes("R09"), false);
  assert.equal(gameRules.countTokens(""), 0);
});

test("the catalog has 20 ordered, unique rules", () => {
  assert.deepEqual(
    RULES.map(({ id }) => id),
    Array.from({ length: 20 }, (_, index) => `R${String(index + 1).padStart(2, "0")}`)
  );
});

test("the approved witness satisfies every rule for its UTC date and time", () => {
  assert.deepEqual(failedRuleIds(witness), []);
});

test("the rolling time rule and its dependent sum invalidate a stale sentence", () => {
  assert.deepEqual(
    failedRuleIds(witness, { now: new Date("2026-09-29T14:40:00.000Z") }),
    ["R03", "R04"]
  );
});

test("the anchor's vowel-count qualifier is enforced", () => {
  assert.deepEqual(failedRuleIds(witness.replace("camel 2", "camel 3")), ["R06"]);
});

test("anchor-derived initial-letter rules are enforced", () => {
  assert.deepEqual(failedRuleIds(witness.replace("calm", "stable")), ["R07", "R08"]);
});

test("repeating the second initial-letter word does not add another distinct-word constraint", () => {
  const results = evaluateRules(witness.replace("calm; at", "calm, calm; at"), sampleContext);
  assert.equal(results.find(({ id }) => id === "R07")?.passed, true);
  assert.equal(results.find(({ id }) => id === "R08")?.passed, true);
});

test("the anchor rotates by date, so yesterday's solution fails today's anchor rules", () => {
  const nextDay = witness.replace("Tuesday", "Wednesday").replace("2026-09-29", "2026-09-30");
  const failed = failedRuleIds(nextDay, { now: new Date("2026-09-30T14:35:00.000Z") });
  assert.deepEqual(failed, ["R05", "R06", "R07", "R08"]);
  assert.notEqual(gameRules.getDailyAnchor("2026-09-29").word, gameRules.getDailyAnchor("2026-09-30").word);
});
