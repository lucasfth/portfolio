import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(path, 'utf8');

test('meaningful accent states follow Mocha and Latte, not hardcoded component colors', () => {
  const css = source('app/globals.css');
  assert.match(css, /--color-accent: #89b4fa/);
  assert.match(css, /prefers-color-scheme: light[\s\S]*--color-accent: #1e66f5/);
  assert.match(css, /\.md-body a\s*\{[^}]*color: var\(--color-accent\)/);
  assert.match(css, /\.hero-actions a:first-child\s*\{[^}]*color: var\(--color-accent\)/);
  assert.match(css, /\.work-preview-button\[aria-pressed="true"\]\s*\{[^}]*color: var\(--color-accent\)/);
  assert.match(source('components/Header.tsx'), /aria-current=\{isActive\(item.href\) \? "page" : undefined\}/);
  assert.match(source('components/StatsLive.tsx'), /bg-accent/);
});

test('admin exposes compact overview navigation and consistent toolbar controls without demo data', () => {
  const admin = source('components/AdminDashboard.tsx');
  assert.match(admin, /aria-label="Dashboard sections"/);
  assert.match(admin, /className="admin-overview" role="group" aria-label="Source overview"/);
  assert.match(admin, /admin-toolbar-button/);
  assert.match(admin, /href="\/stats"/);
  assert.doesNotMatch(admin, /Revenue|Ask AI|mockData/);
});
