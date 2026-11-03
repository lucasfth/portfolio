import assert from "node:assert/strict";
import test from "node:test";
import { isRadarEdition, radarEditionStale } from "./publication.ts";

const edition = {
  generated: "2026-10-28T04:11:24+00:00",
  count_scanned: 1,
  items: [{
    title: "Valid item", url: "https://example.com", source: "Example",
    summary: "A public item", tag: "agents", score: 7, kind: "article", ts: 1,
  }],
};

test("Radar validator accepts a public edition and rejects private/non-public shape", () => {
  assert.equal(isRadarEdition(edition), true);
  assert.equal(isRadarEdition({ ...edition, private: { items: [] } }), false);
  assert.equal(isRadarEdition({
    ...edition,
    items: [{ ...edition.items[0], tag: "invented" }],
  }), false);
  assert.equal(isRadarEdition({
    ...edition,
    items: [{ ...edition.items[0], private: "secret" }],
  }), false);
});

test("Radar validator accepts the live timestamp format and rejects a timezone-naive timestamp", () => {
  assert.equal(isRadarEdition({ ...edition, generated: "2026-10-28T04:11:24+00:00" }), true);
  assert.equal(isRadarEdition({ ...edition, generated: "2026-10-28T04:11:24" }), false);
});

test("Radar freshness qualifies retained daily editions, missing dates and clock skew", () => {
  const now = Date.parse("2026-11-03T09:00:00Z");
  assert.equal(radarEditionStale("2026-11-03T04:10:00Z", now), false);
  assert.equal(radarEditionStale("2026-11-02T04:10:00Z", now), false);
  assert.equal(radarEditionStale("2026-10-29T16:04:00Z", now), true);
  assert.equal(radarEditionStale("invalid", now), true);
  assert.equal(radarEditionStale("2026-11-03T09:16:00Z", now), true);
});
