import assert from "node:assert/strict";
import test from "node:test";
import { refreshFailure, retainLastGood } from "../lib/admin/refresh-state.mjs";

test("failed refetch retains the last payload and reports stale status", () => {
  const prior = { value: "last good" };
  assert.equal(retainLastGood(prior, null), prior);
  assert.equal(refreshFailure(null, null), "Request failed");
});

test("failed initial fetch reports failure rather than remaining in loading", () => {
  assert.equal(retainLastGood(null, null), null);
  assert.equal(refreshFailure(null, null), "Request failed");
});

test("successful fetch replaces payload and clears failure", () => {
  const next = { value: "fresh" };
  assert.equal(retainLastGood({ value: "old" }, next), next);
  assert.equal(refreshFailure(null, next), null);
});
