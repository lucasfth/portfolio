import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync('components/AdminDashboard.tsx', 'utf8');

test('board uses main-first document order, context and dedicated cron with no mobile CSS reordering', () => {
  assert.match(dashboard, /className="admin-main"[\s\S]*AdminFleetPanel[\s\S]*eyebrow="GitHub"[\s\S]*eyebrow="Overnight"[\s\S]*eyebrow="Radar"[\s\S]*className="admin-context"[\s\S]*FinancePanel[\s\S]*eyebrow="Market"[\s\S]*eyebrow="Env"[\s\S]*CronSidebar/);
  assert.doesNotMatch(dashboard, /order-[12]|Children\.toArray|content\.map\(\(child/);
  assert.match(dashboard, /href: "#admin-github"/);
  assert.match(dashboard, /href: "#admin-cron"/);
});

test('loading uses named text-only fields, never controls or mixed children', () => {
  assert.match(dashboard, /loadingFields\.map\(text => <AdminField key=\{text\} text=\{text\} loading/);
  assert.doesNotMatch(dashboard, /<TerminalReveal|FieldReveal/);
  assert.match(dashboard, /isLoading && ready[\s\S]*Updating; showing last available data\.[\s\S]*\{children\}/);
  assert.match(dashboard, /<AdminField text=\{item\.title\}/);
  assert.match(dashboard, /<AdminField text=\{weather\.current\.desc\}/);
});

test('compact reports and fleet preserve accessible details and timestamp provenance', () => {
  assert.match(dashboard, /<details[^>]*>[\s\S]*<summary[^>]*>[\s\S]*r\.title/);
  const fleet = readFileSync('components/AdminFleetPanel.tsx', 'utf8');
  assert.match(fleet, /<summary[^>]*>Observation timestamps<\/summary>/);
  for (const label of ['Source observed', 'Backend received', 'Latest completed tool reported', 'not task progress or success']) assert.ok(fleet.includes(label));
});

test('responsive board uses portfolio tokens, bounded columns and visible keyboard focus', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.admin-columns\s*\{[^}]*display:\s*grid/);
  assert.match(css, /minmax\(0,\s*1fr\)/);
  assert.match(css, /\.admin-dashboard :is\(button, a, summary, input\):focus-visible/);
  assert.match(css, /\.admin-panel\s*\{[^}]*border-radius:\s*var\(--media-radius\)/);
});

test('status strip wraps headers and bounds two full value lines without losing destination details', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(dashboard, /flex flex-wrap items-center justify-between gap-x-2 gap-y-1/);
  assert.match(dashboard, /admin-board-value mt-2 text-sm leading-5/);
  assert.match(css, /\.admin-board-value\s*\{\s*max-height: 2\.5rem; overflow: clip/);
  assert.match(css, /\.admin-board-sub[^}]*-webkit-line-clamp: 2/);
  assert.match(dashboard, /FAULT marks unavailable or incomplete sources, or failed jobs/);
  assert.match(dashboard, /openDetail\(\{ title: "Copenhagen weather"[^\n]*Description: weather\.current!\.desc/);
});

test('finance retained-data refresh faults agree between strip and panel', () => {
  const panel = dashboard.slice(dashboard.indexOf('function FinancePanel('), dashboard.indexOf('export default'));
  assert.match(panel, /const state: ModuleState = error \? "error" : finance \? "ok" : "loading"/);
  assert.match(dashboard, /code: "Finance"[^\n]*state: financeError \|\| financeRefreshError \? "error"/);
  assert.match(dashboard, /Refresh unavailable \(\{error\}\); showing last available data/);
});

test('Latte admin text and focus use existing contrast-safe tokens', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /prefers-color-scheme: light[\s\S]*\.admin-dashboard :is\(\.text-muted-foreground[^}]*color: var\(--color-subtext\)/);
  assert.match(css, /\.admin-dashboard :is\(\.text-foreground[^}]*color: var\(--color-foreground\)/);
  assert.match(css, /\.admin-dashboard :is\(button, a, summary, input\):focus-visible \{ outline-color: var\(--color-accent\)/);
});
