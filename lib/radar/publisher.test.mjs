import assert from "node:assert/strict";
import test from "node:test";
import { publishRadarRequest, writeRadarEdition } from "./publisher.ts";

const token = "synthetic-radar-publisher-token-000000000000";
const env = {
  RADAR_PUBLISH_TOKEN: token,
  SUPABASE_URL: "https://supabase.example.invalid",
  RADAR_SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-secret",
};
const edition = {
  generated: "2026-10-28T04:11:24+00:00",
  count_scanned: 1,
  items: [{
    title: "Example", url: "https://example.com", source: "Example",
    summary: "Public item", tag: "agents", score: 7, kind: "article", ts: 1,
  }],
};
function request(body = JSON.stringify(edition), authorization = `Bearer ${token}`, headers = {}) {
  return new Request("https://example.test/api/radar/publish", {
    method: "POST",
    headers: { authorization, "content-type": "application/json", ...headers },
    body,
  });
}

test("publisher authenticates, validates, and returns an empty 204 after publishing", async () => {
  let published;
  const publish = async (value) => { published = value; };
  const response = await publishRadarRequest(request(), env, publish);
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(published, edition);
});

test("publisher uses the existing server-only Supabase key when no dedicated override exists", async () => {
  let capturedKey;
  const clientFactory = (_url, key) => {
    capturedKey = key;
    return { rpc: () => ({ abortSignal: async () => ({ error: null }) }) };
  };
  await writeRadarEdition(edition, { SUPABASE_URL: env.SUPABASE_URL, SUPABASE_SECRET_KEY: "synthetic-existing-server-key" }, clientFactory);
  assert.equal(capturedKey, "synthetic-existing-server-key");
});

test("publisher fails closed on auth, config, JSON, shape, size, and backend errors", async () => {
  const publish = async () => {};
  assert.equal((await publishRadarRequest(request(undefined, "Bearer wrong"), env, publish)).status, 401);
  assert.equal((await publishRadarRequest(request(), { ...env, RADAR_PUBLISH_TOKEN: undefined }, publish)).status, 503);
  assert.equal((await publishRadarRequest(request(), { ...env, SUPABASE_SECRET_KEY: undefined, RADAR_SUPABASE_SERVICE_ROLE_KEY: undefined }, publish)).status, 503);
  assert.equal((await publishRadarRequest(request("{"), env, publish)).status, 400);
  assert.equal((await publishRadarRequest(request(JSON.stringify({ private: true })), env, publish)).status, 400);
  assert.equal((await publishRadarRequest(request("x".repeat(64 * 1024 + 1)), env, publish)).status, 413);
  assert.equal((await publishRadarRequest(request(), env, async () => { throw new Error("backend failure"); })).status, 503);
});
