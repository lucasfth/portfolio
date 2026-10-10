import assert from "node:assert/strict";
import test from "node:test";
import { findMisspellings } from "./spelling.ts";

const witness =
  "On Tuesday, 2026-09-29, we regret the delay because camel 2 is calm; at 14:35, the thirteen-minute incident remains serious but stable under review.";

test("a valid witness sentence has no misspellings", async () => {
  assert.deepEqual(await findMisspellings(witness), []);
});

test("made-up words are reported", async () => {
  const words = await findMisspellings(witness.replace("calm", "killfa").replace("delay", "segre"));
  assert.ok(words.includes("killfa"));
  assert.ok(words.includes("segre"));
});

test("every anchor pair and minute word is a real word", async () => {
  const vocab = "pigeon patient heron hungry gecko grumpy koala kind lobster late camel calm yak young vulture vigilant jackal jolly panda polite llama loyal cobra curious hamster humble kestrel keen gull gentle penguin punctual zero-minute one-minute nineteen-minute twenty-minute incident.";
  assert.deepEqual(await findMisspellings(vocab), []);
});
