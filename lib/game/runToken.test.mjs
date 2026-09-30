import assert from "node:assert/strict";
import test from "node:test";
import { MAX_RUN_MS, createRun, readRun, signRun } from "./runToken.ts";

const secret = "s".repeat(32);
const now = 1_790_000_000_000;

test("a signed run round-trips", () => {
  const run = createRun(now);
  assert.deepEqual(readRun(signRun(run, secret), secret, now + 1_000), run);
});

test("forged progress or timing is rejected", () => {
  const token = signRun(createRun(now), secret);
  const [body, signature] = token.split(".");
  const state = JSON.parse(Buffer.from(body, "base64url").toString());
  const forged = Buffer.from(JSON.stringify({ ...state, cleared: 20, startedAt: now - 1 })).toString("base64url");
  assert.equal(readRun(`${forged}.${signature}`, secret, now), null);
  assert.equal(readRun(token, "t".repeat(32), now), null);
  assert.equal(readRun(`${token}.x`, secret, now), null);
  assert.equal(readRun(42, secret, now), null);
});

test("runs expire", () => {
  const token = signRun(createRun(now), secret);
  assert.equal(readRun(token, secret, now + MAX_RUN_MS + 1), null);
});
