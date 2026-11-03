import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequestCoordinator, payloadRefreshError, reportReadResult, retainSuccessfulPayload, toggleExpanded } from "../lib/admin/dashboard-state.mjs";

const source = readFileSync("components/AdminDashboard.tsx", "utf8");
const deferred = () => {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
};

test("dashboard refresh wiring uses one generation and aborts on refresh, signout, and unmount", () => {
  assert.match(source, /const loadAll = useCallback\(async \(request = requests\.current\.begin\(\)\)/);
  assert.match(source, /const \{ id, signal \} = requests\.current\.begin\(\);[\s\S]*?const current = await loadAll\(\{ id, signal \}\)/);
  // Generation-guarded cleanup must not clear a newer refresh indicator.
  assert.match(source, /if \(readOnlyBusy\.current === id\) \{ readOnlyBusy\.current = null; setRefreshing\(false\); \}/);
  assert.match(source, /requests\.current\.cancel\(\);\s*sub\.subscription\.unsubscribe\(\)/);
  const requests = createRequestCoordinator();
  const first = requests.begin();
  const second = requests.begin();
  assert.equal(first.signal.aborted, true);
  assert.equal(requests.isCurrent(first.id), false);
  requests.cancel();
  assert.equal(second.signal.aborted, true);
});

test("an older dashboard request resolving last cannot overwrite current payload", async () => {
  assert.match(source, /if \(!requests\.current\.isCurrent\(id\)\) return false;[\s\S]*?setWeather\(previous => retainSuccessfulPayload\(previous, w\)\)/);
  const requests = createRequestCoordinator();
  let payload = { status: "ok", value: "old baseline" };
  const older = requests.begin();
  const delayed = deferred();
  const oldCompletion = delayed.promise.then(candidate => {
    if (requests.isCurrent(older.id)) payload = retainSuccessfulPayload(payload, candidate);
  });
  const newer = requests.begin();
  if (requests.isCurrent(newer.id)) payload = retainSuccessfulPayload(payload, { status: "ok", value: "new" });
  delayed.resolve({ status: "ok", value: "stale" });
  await oldCompletion;
  assert.equal(payload.value, "new");
});

test("HTTP-200 error payload retains the last good data and dashboard has stale notice wiring", () => {
  assert.match(source, /return result\.response\.ok && body\?\.status === "ok" \? result\.body : null/);
  assert.match(source, /setWeather\(previous => retainSuccessfulPayload\(previous, w\)\); setWeatherRefreshError\(weatherRefreshErrorFor\(w\)\)/);
  assert.match(source, /Refresh unavailable \(\{error\}\); showing last available data\./);
  assert.match(source, /error=\{weatherRefreshError \?\? weather\?\.message\}/);
  const prior = { status: "ok", value: "last good" };
  const responseBody = { status: "error", message: "upstream error" };
  assert.equal(retainSuccessfulPayload(prior, responseBody), prior);
  assert.equal(payloadRefreshError(responseBody), "Request failed");
});

test("failed initial reports stay null and dashboard renders Overnight unavailable", () => {
  assert.match(source, /reportReadResult\(reports, \{ data: !error && Array\.isArray\(data\)[\s\S]*?setReports\(result\.reports\)/);
  assert.match(source, /reportsError \? "error" : reports === null \? "loading"/);
  assert.match(source, /error=\{reportsError\}/);
  const initial = reportReadResult(null, { data: null, error: new Error("read failed") });
  assert.equal(initial.reports, null);
  assert.equal(initial.error, "Overnight reports unavailable");
  assert.deepEqual(reportReadResult([{ id: "prior" }], { data: null, error: new Error("read failed") }).reports, [{ id: "prior" }]);
});

test("Copenhagen summary opens the shared weather detail dialog", () => {
  assert.match(source, /setDetailOpener\(event\.currentTarget\); setSelectedDetail\("weather"\)/);
  assert.match(source, /detail=\{selectedDetail === "weather" \? weatherDetail\(weather!, weatherRefreshError\) : selectedDetail\} opener=\{detailOpener\} onClose=\{closeDetail\}/);
  assert.match(readFileSync("components/AdminDetailDialog.tsx", "utf8"), /role="dialog" aria-modal="true" aria-labelledby="admin-detail-title"/);
  assert.doesNotMatch(source, /weatherExpanded/);
});

test("cron reference uses a separate copy button while the job summary opens safe details", () => {
  const cron = source.slice(source.indexOf("function CronSidebar"), source.indexOf("function FinancePanel"));
  assert.match(cron, /<button type="button" data-dialog-focusable onClick=\{event => openDetail\(scheduledJobDetail\(job,/);
  assert.match(cron, /onClick=\{\(\) => void copy\(job\.reference!\)\}/);
  assert.doesNotMatch(cron, /onClick=\{[^}]*copy\([^}]*openDetail|openDetail\([^}]*copy/);
  assert.match(cron, /\$\{job\.referenceType \?\? "reference"\}: \$\{job\.reference\}/);
});

// Behavioral 401 + no-source-read proof is in admin-route-auth.test.mjs,
// which compiles and calls the shipping GET handlers including fleet.
test("admin API route guard syntax remains a supplementary source check only", () => {
  for (const routePath of ["weather", "stocks", "github", "radar"]) {
    const routeSource = readFileSync(`app/api/admin/${routePath}/route.ts`, "utf8");
    assert.match(routeSource, /if \(!\(await adminUser\(req\)\)\)/);
    assert.match(routeSource, /status: 401/);
  }
});
