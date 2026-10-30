import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync("components/AdminDashboard.tsx", "utf8");
const revealSource = readFileSync("components/TerminalReveal.tsx", "utf8");

test("unloaded data fields use the shared ASCII shimmer until data is ready", () => {
  assert.match(source, /!ready && state === "loading"[\s\S]*?loadingFields\.map\(text => <AdminField key=\{text\} text=\{text\} loading/);
  assert.match(readFileSync("components/AdminField.tsx", "utf8"), /<TerminalReveal key=\{text\}[\s\S]*?loading=\{loading\} loadingLoop=\{loading\}/);
  assert.match(revealSource, /if \(!titlesOnly && loading && loadingLoop\)[\s\S]*?createAsciiReveal\(root, \{ preset: \{ \.\.\.presets\.terminal, tick: 120 \}[\s\S]*?controller\.shimmer\(true\)/);
  assert.match(revealSource, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.match(source, /isLoading && ready[\s\S]*?Updating; showing last available data\.[\s\S]*?\{children\}</);
  assert.doesNotMatch(source, /isLoading && ready[\s\S]*?<FieldReveal/);
  assert.match(source, /setWeather\(previous => retainSuccessfulPayload\(previous, w\)\)/);
  assert.match(source, /state === "error"[\s\S]*?Unavailable: \{error \?\? "source error"\}/);
});

test("weather panel includes feels-like, wind, rain, range, UV, and sun data", () => {
  const envStart = source.indexOf('eyebrow="Env"');
  const weather = source.slice(envStart, source.indexOf('</Panel>', envStart));
  assert.match(weather, /openDetail\(weatherDetail\(weather, weatherRefreshError\)/);
  const details = readFileSync("lib/admin/detail-content.mjs", "utf8");
  for (const field of ["Feels like", "Wind", "Precipitation", "Low / high", "UV index", "Sunrise", "Sunset"]) assert.ok(details.includes(field), `missing ${field}`);
});

test("reports initial failure leaves Overnight in an unavailable state", () => {
  assert.match(source, /reportReadResult\(reports, \{ data: !error[\s\S]*?setReportsError\(result\.error\)/);
  assert.match(source, /reportsError \? "error" : reports === null \? "loading"/);
  assert.match(source, /error=\{reportsError\}/);
});

test("refresh failures remain visible while prior weather/stocks/github/radar payloads are retained", () => {
  for (const [key, value] of [["Weather", "w"], ["Stocks", "s"], ["Radar", "r"]]) {
    assert.match(source, new RegExp(`set${key}\\(previous => retainSuccessfulPayload\\(previous, ${value}\\)\\); set${key}RefreshError\\(payloadRefreshError\\(${value}\\)\\)`));
  }
  assert.match(source, /setGithub\(previous => retainSuccessfulPayload\(previous, g\)\); setGithubRefreshError\(githubRefreshErrorFor\(g\)\)/);
  assert.match(source, /Refresh unavailable \(\{error\}\); showing last available data\./);
});

test("FinancePanel provides stable distinct loading fields and keeps its external link outside the field region", () => {
  const finance = source.slice(source.indexOf("function FinancePanel"), source.indexOf("export default function AdminDashboard"));
  assert.match(finance, /\{ label: "Nordea", item: finance \?/);
  assert.match(finance, /\{ label: "Saxo", item: finance \?/);
  assert.match(finance, /Supported subtotal \(partial assets\)/);
  assert.match(finance, /\{finance \? `[\s\S]*? : <span aria-hidden="true">&nbsp;<\/span>\}/);
  assert.match(finance, /<a href=\{ACTUAL_URL\}/);
  assert.ok(finance.indexOf("<a href={ACTUAL_URL}") > finance.indexOf("Supported subtotal"));
});

test("radar cadence is described as daily", () => {
  assert.match(source, /sub: "llm-radar, daily"/);
  assert.match(source, /compiled daily/);
});
