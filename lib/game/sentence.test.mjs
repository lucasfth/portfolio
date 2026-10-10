import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ACCEPTABLE_THRESHOLD, checkGrammar, sentenceScore, tokenize } from "./sentence.ts";

const vocab = new Map(
  readFileSync(new URL("./sentence-model/vocab.txt", import.meta.url), "utf8")
    .split("\n")
    .map((token, id) => [token, id]),
);

test("tokenizer matches the Hugging Face BertTokenizer", () => {
  assert.deepEqual(
    tokenize("On Saturday, 2026-10-10 at 20:40, koala 3's kind.", vocab),
    [101, 2006, 5095, 1010, 16798, 2575, 1011, 2184, 1011, 2184, 2012, 2322, 1024, 2871, 1010, 12849, 7911, 1017, 1005, 1055, 2785, 1012, 102],
  );
});

const valid = [
  "On Tuesday, 2026-09-29, we regret the delay because camel 2 is calm; at 14:35, the thirteen-minute incident remains serious but stable under review.",
  "On Saturday, 2026-10-10, we regret the delay because koala 3 is kind; at 20:45, the six-minute incident remains serious but stable under review.",
  "On Monday, 2026-10-12, we regret the delay because kestrel 2 is keen; at 09:05, the five-minute incident remains serious but stable under review.",
  "On Friday, 2026-10-16, we regret the delay because yak 1 is young; at 23:55, the nineteen-minute incident remains serious but stable under review.",
  "On Wednesday, 2026-10-14, the hamster 2 stayed humble; we regret the delay because at 18:30, the ten-minute incident remains serious, but stable under review.",
  "On Saturday at 20:40 the six-minute incident began.",
  "On Saturday, 2026-10-10 at 20:45, the six-minute incident hit koala 3.",
  "We regret the delay.",
];

const salad = [
  "On Saturday 2026-10-10 20:40 six-minute incident koala 3 kiss",
  "On Saturday 2026-10-10 koala kiss banana purple.",
  "On Saturday, 2026-10-10, koala 3 kind, we regret the delay because remains serious but stable under review; incident six-minute the at 20:45 banana.",
  "Delay regret we because serious remains but stable review under.",
  "On Saturday, 2026-10-10, we regret the delay because koala 3 kind; at 20:45, the six-minute incident remains serious but stable under review.",
  "Purple monkey dishwasher koala 3 kind regret delay.",
  "On Saturday 2026-10-10.",
  "Saturday On 2026-10-10 we the regret delay.",
];

test("grammatical sentences pass", async () => {
  for (const sentence of valid) {
    const verdict = await checkGrammar(sentence);
    assert.ok(verdict.ok, `${verdict.score.toFixed(3)} verb=${verdict.verb} ${sentence}`);
  }
});

test("word salad and fragments fail", async () => {
  for (const sentence of salad) {
    const verdict = await checkGrammar(sentence);
    assert.ok(!verdict.ok, `${verdict.score.toFixed(3)} verb=${verdict.verb} ${sentence}`);
  }
});

test("score is a probability", async () => {
  const score = await sentenceScore("We regret the delay.");
  assert.ok(score > ACCEPTABLE_THRESHOLD && score <= 1);
});
