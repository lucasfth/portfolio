import assert from "node:assert/strict";
import test from "node:test";
import { buildShareText, formatShareTime } from "./share.ts";

test("full run with rank", () => {
  assert.equal(
    buildShareText({ date: "2026-10-11", cleared: 20, elapsedMs: 221_400, rank: 3 }),
    "Damage Control 2026-10-11\n🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩\n20/20 · 3:41 · rank #3\nhttps://lucashanson.dk/game"
  );
});

test("unsaved run omits rank, partial bar rounds up", () => {
  const text = buildShareText({ date: "2026-10-11", cleared: 7, elapsedMs: 59_600, rank: null });
  assert.match(text, /^Damage Control 2026-10-11\n🟩{4}⬜{6}\n7\/20 · 1:00\n/u);
});

test("missing time and out-of-range level are safe", () => {
  const text = buildShareText({ date: "2026-10-11", cleared: 99, elapsedMs: null, rank: null });
  assert.ok(text.includes("\n20/20\n"));
  assert.ok(!text.includes("NaN"));
});

test("formats hours", () => {
  assert.equal(formatShareTime(3_725_000), "1:02:05");
  assert.equal(formatShareTime(27_600), "0:28");
});

test("never leaks the sentence", () => {
  const text = buildShareText({ date: "2026-10-11", cleared: 20, elapsedMs: 1_000, rank: 1 });
  assert.equal(text.split("\n").length, 4);
});
