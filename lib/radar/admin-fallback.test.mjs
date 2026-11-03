import assert from "node:assert/strict";
import test from "node:test";

import { fetchRadar } from "../admin/sources.ts";
test("admin Radar errors when Supabase is selected but public credentials are absent", async () => {
  process.env.RADAR_PUBLICATION_SOURCE = "supabase";
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const result = await fetchRadar();
  assert.equal(result.status, "error");
  assert.deepEqual(result.items, []);
  assert.match(result.message, /not configured/);
});

test("admin Radar keeps Supabase as the default even when its reader fails", async () => {
  delete process.env.RADAR_PUBLICATION_SOURCE;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://radar.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(input.url, "https://radar.example.test/rest/v1/rpc/get_radar_edition");
    throw new Error("Radar feed unavailable");
  };
  try {
    const result = await fetchRadar();
    assert.equal(result.status, "error");
    assert.deepEqual(result.items, []);
    assert.match(result.message, /Radar feed unavailable/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin Radar reads the current Supabase edition by default without a GitHub fallback", async () => {
  delete process.env.RADAR_PUBLICATION_SOURCE;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://radar.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(input.url, "https://radar.example.test/rest/v1/rpc/get_radar_edition");
    assert.equal(input.method, "POST");
    return { ok: true, json: async () => ({
      generated: "2026-11-03T04:11:24+00:00", count_scanned: 1,
      items: [{ title: "Supabase edition", url: "https://example.com", source: "Example",
        summary: "Public item", tag: "agents", score: 7, kind: "article", ts: 1 }],
    }) };
  };
  try {
    const result = await fetchRadar();
    assert.equal(result.status, "ok");
    assert.equal(result.generated, "2026-11-03T04:11:24+00:00");
    assert.equal(result.items[0].title, "Supabase edition");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
