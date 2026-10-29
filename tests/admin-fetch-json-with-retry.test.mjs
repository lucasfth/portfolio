import assert from "node:assert/strict";
import test from "node:test";
import { fetchJsonWithRetry } from "../lib/admin/fetch-json-with-retry.mjs";

const originalFetch = globalThis.fetch;

test.afterEach(() => { globalThis.fetch = originalFetch; });

test("returns parsed JSON for 200", async () => {
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 200 });
  const { response, body } = await fetchJsonWithRetry("/data", {}, { timeoutMs: 100 });
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true });
});

test("does not retry 404", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("", { status: 404 }); };
  const result = await fetchJsonWithRetry("/data", {}, { timeoutMs: 100 });
  assert.equal(result.response.status, 404);
  assert.equal(result.body, null);
  assert.equal(calls, 1);
});

test("retries 503 once then returns JSON", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? new Response("", { status: 503 })
    : new Response('{"ok":true}', { status: 200 });
  const result = await fetchJsonWithRetry("/data", {}, { timeoutMs: 100 });
  assert.deepEqual(result.body, { ok: true });
  assert.equal(calls, 2);
});

test("retries invalid JSON from successful GET deliberately", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1
    ? new Response("not json", { status: 200 })
    : new Response('{"ok":true}', { status: 200 });
  const result = await fetchJsonWithRetry("/data", {}, { timeoutMs: 100 });
  assert.deepEqual(result.body, { ok: true });
  assert.equal(calls, 2);
});

test("caller abort rejects without retry", async () => {
  let calls = 0;
  const caller = new AbortController();
  globalThis.fetch = (_url, { signal }) => {
    calls++;
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  };
  const request = fetchJsonWithRetry("/data", { signal: caller.signal }, { timeoutMs: 5_000 });
  caller.abort(new DOMException("caller cancelled", "AbortError"));
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("timeout remains active while reading response body", async () => {
  let calls = 0;
  globalThis.fetch = (_url, { signal }) => {
    calls++;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
    });
  };
  const start = Date.now();
  await assert.rejects(fetchJsonWithRetry("/data", {}, { timeoutMs: 30, attempts: 1 }));
  assert.ok(Date.now() - start < 500);
  assert.equal(calls, 1);
});

test("POST is rejected before fetch", async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("{}", { status: 200 }); };
  await assert.rejects(fetchJsonWithRetry("/data", { method: "POST" }), TypeError);
  assert.equal(calls, 0);
});
