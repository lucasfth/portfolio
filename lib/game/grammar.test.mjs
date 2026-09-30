import assert from "node:assert/strict";
import test from "node:test";
import { Dialect, LocalLinter } from "harper.js";
import { binary } from "harper.js/binary";
import * as grammar from "./grammar.ts";
import { evaluateRules } from "./rules.ts";

const now = new Date("2026-09-29T14:35:00.000Z");
const validWitness =
  "On Tuesday, 2026-09-29, we regret the delay because camel 2 is calm; at 14:35, the thirteen-minute incident remains serious but stable under review.";

test("repeated-letter words are identified as obvious gibberish", () => {
  assert.equal(typeof grammar.hasObviousGibberish, "function");
  assert.equal(grammar.hasObviousGibberish("pppppppp sss"), true);
  assert.equal(grammar.hasObviousGibberish("camel calm"), false);
});

test("Harper finds gibberish in a sentence that passes all game rules", async () => {
  assert.equal(typeof grammar.summarizeHarperLints, "function");
  const linter = new LocalLinter({ binary, dialect: Dialect.American });
  try {
    await linter.setup();
    const goodLints = grammar.summarizeHarperLints(
      await linter.lint(validWitness, { language: "plaintext" })
    );
    assert.deepEqual(goodLints, []);
    const nonsense = validWitness.replace("calm", "cccccccc");
    assert.ok(evaluateRules(nonsense, { now }).every(({ passed }) => passed));
    const issues = grammar.summarizeHarperLints(
      await linter.lint(nonsense, { language: "plaintext" })
    );
    assert.ok(issues.some(({ kind, text }) => kind === "Spelling" && text === "cccccccc"));
    assert.equal(grammar.hasObviousGibberish(nonsense), true);
  } finally {
    await linter.dispose();
  }
});
