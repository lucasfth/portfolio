import assert from "node:assert/strict";
import test from "node:test";
import { RULES, evaluateRules } from "./rules.ts";
import * as gameRules from "./rules.ts";

const witness =
  "On Tuesday, 2026-09-29, we regret the delay because pigeon 3 is patient; at 14:35, the thirteen-minute incident remains serious but stable under review.";
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
  assert.deepEqual(failedRuleIds(witness.replace("pigeon 3", "pigeon 4")), ["R06"]);
});

test("anchor-derived initial-letter rules are enforced", () => {
  assert.deepEqual(failedRuleIds(witness.replace("patient", "stable")), ["R07", "R08"]);
});

test("repeating the second initial-letter word does not add another distinct-word constraint", () => {
  const results = evaluateRules(witness.replace("patient; at", "patient, patient; at"), sampleContext);
  assert.equal(results.find(({ id }) => id === "R07")?.passed, true);
  assert.equal(results.find(({ id }) => id === "R08")?.passed, true);
});
