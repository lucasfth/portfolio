import assert from "node:assert/strict";
import test from "node:test";
import { isRadarEdition } from "./publication.ts";

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
