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

test("Radar publication source defaults to the GitHub feed", async () => {
  delete process.env.RADAR_PUBLICATION_SOURCE;
  const response = {
    ok: true,
    json: async () => ({
      generated: "2026-10-28T04:11:24+00:00",
      count_scanned: 1,
      items: [{
        title: "GitHub edition", url: "https://example.com", source: "Example",
        summary: "Public item", tag: "agents", score: 7, kind: "article", ts: 1,
      }],
    }),
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.match(String(input), /^https:\/\/raw\.githubusercontent\.com\/lucasfth\/loki-radar\/main\/public\.json/);
    return response;
  };
  try {
    const result = await fetchRadar();
    assert.equal(result.status, "ok");
    assert.equal(result.generated, "2026-10-28T04:11:24+00:00");
    assert.equal(result.items[0].title, "GitHub edition");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
