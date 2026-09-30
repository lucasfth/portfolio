import assert from "node:assert/strict";
import test from "node:test";
import { rankScores, shouldReplaceBest } from "./leaderboard.ts";

const candidate = {
  date: "2026-09-29",
  normalizedNickname: "lucas",
  displayNickname: "Lucas",
  level: 12,
  elapsedMs: 90_000,
  createdAt: 1_000,
};

test("a higher completed level replaces a previous best regardless of elapsed time", () => {
  assert.equal(
    shouldReplaceBest(candidate, { ...candidate, level: 13, elapsedMs: 500_000 }),
    true
  );
});

test("an equal level replaces only when elapsed time improves", () => {
  assert.equal(shouldReplaceBest(candidate, { ...candidate, elapsedMs: 89_999 }), true);
  assert.equal(shouldReplaceBest(candidate, { ...candidate, elapsedMs: 90_001 }), false);
  assert.equal(shouldReplaceBest(candidate, { ...candidate }), false);
});

test("the first valid result becomes the nickname's best", () => {
  assert.equal(shouldReplaceBest(null, candidate), true);
});

test("leaderboard ranks level, elapsed time, then normalized nickname and respects its limit", () => {
  const rows = [
    { ...candidate, normalizedNickname: "zeta", level: 12, elapsedMs: 1_000 },
    { ...candidate, normalizedNickname: "slower", level: 20, elapsedMs: 5_000 },
    { ...candidate, normalizedNickname: "beta", level: 20, elapsedMs: 1_200 },
    { ...candidate, normalizedNickname: "alpha", level: 20, elapsedMs: 1_200 },
    { ...candidate, normalizedNickname: "fast", level: 20, elapsedMs: 900 },
    { ...candidate, normalizedNickname: "low", level: 19, elapsedMs: 1 },
  ];
  const ranked = rankScores(rows, 3);
  assert.deepEqual(
    ranked.map(({ normalizedNickname }) => normalizedNickname),
    ["fast", "alpha", "beta"]
  );
  assert.deepEqual(
    rows.map(({ normalizedNickname }) => normalizedNickname),
    ["zeta", "slower", "beta", "alpha", "fast", "low"]
  );
});
