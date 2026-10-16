import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { registerHooks } from "node:module";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to an isolated local test database.");
const parsed = new URL(url);
const host = parsed.hostname || parsed.searchParams.get("host") || "";
if (!["127.0.0.1", "localhost", "[::1]"].includes(host) && !host.startsWith("/")) {
  throw new Error("Refusing to seed a nonlocal database.");
}
const api = new URL(process.env.SUPABASE_URL || "http://invalid");
if (!["127.0.0.1", "localhost", "[::1]"].includes(api.hostname)) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY for a real local PostgREST service.");
}

// Next.js replaces this compile-time boundary marker. The test runs real store
// code against PostgREST; it does not replace database calls or their responses.
registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { url: "data:text/javascript,export{}", shortCircuit: true }
      : nextResolve(specifier, context);
  },
});
const { fetchLeaderboard } = await import("../../lib/game/store.ts");

function sql(query) {
  return execFileSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-At", "-d", url, "-c", query], { encoding: "utf8" }).trim();
}

test("leaderboard ranks all pages, preserves UTF-16 ties and excludes other dates", async () => {
  const date = "1902-01-01";
  const otherDate = "1902-01-02";
  assert.equal(sql(`select count(*) from public.game_scores where date in ('${date}', '${otherDate}')`), "0", "fixture dates must be unused");
  const supplementary = "𐀀-example";
  const privateUse = "-example";
  try {
    sql(`begin;
      insert into public.game_scores (date, normalized_nickname, display_nickname, level, elapsed_ms)
      select '${date}', 'page-' || lpad(i::text, 4, '0'), 'page-' || lpad(i::text, 4, '0'), 19, 1000 from generate_series(1, 1002) i;
      insert into public.game_scores (date, normalized_nickname, display_nickname, level, elapsed_ms) values
      ('${date}', '${supplementary}', '${supplementary}', 20, 0),
      ('${date}', '${privateUse}', '${privateUse}', 20, 0),
      ('${date}', 'zz-best', 'zz-best', 20, 1),
      ('${otherDate}', 'other-day', 'other-day', 20, 0);
      commit;`);
    const scores = await fetchLeaderboard(date);
    assert.deepEqual(scores.slice(0, 3).map(score => score.normalizedNickname), [supplementary, privateUse, "zz-best"]);
    assert.equal(scores.length, 50);
    assert.ok(scores.every(score => score.normalizedNickname !== "other-day"));
    assert.equal(scores[3].normalizedNickname, "page-0001");
    assert.equal(scores[49].normalizedNickname, "page-0047");
  } finally {
    sql(`delete from public.game_scores where date in ('${date}', '${otherDate}') and (normalized_nickname like 'page-%' or normalized_nickname in ('${supplementary}', '${privateUse}', 'zz-best', 'other-day'));`);
  }
});
