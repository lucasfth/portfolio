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
