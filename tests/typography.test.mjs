import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? sources(path) : /\.(tsx|css)$/.test(path) ? [path] : [];
  });
}

test('editorial headings, readable sans body and mono UI use the shared local fonts', () => {
  for (const file of [...sources('app'), ...sources('components')]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /font-hand|font-patrick-hand|Patrick_Hand/, file);
  }
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /--font-heading: var\(--font-source-serif\), Georgia, serif/);
  assert.match(css, /--font-sans: var\(--font-source-sans\), Arial, Helvetica, sans-serif/);
  assert.match(css, /--font-mono: var\(--font-obel-mono\), ui-monospace/);
  assert.match(css, /body\s*\{[^}]*font-family: var\(--font-sans\)/);
  const layout = readFileSync('app/layout.tsx', 'utf8');
  assert.match(layout, /next\/font\/local/);
  assert.doesNotMatch(layout, /next\/font\/google|Space_Mono/);
  assert.doesNotMatch(css, /ss01[^;]*on|Masked/);
});

test('portfolio reading copy and compact labels have readable minimum sizes', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.hero-intro\s*\{[^}]*font-size: clamp\(1\.0625rem, 1\.4vw, 1\.1875rem\)/);
  assert.match(css, /\.work-entry p\s*\{[^}]*font-size: 16px/);
  assert.match(css, /\.hero-location\s*\{[^}]*font-size: 14px/);
  assert.match(css, /\.hero-actions\s*\{[^}]*font-size: 14px/);
  assert.match(css, /\.work-tags\s*\{[^}]*font-size: 14px/);
  assert.match(css, /\.md-body\s*\{[^}]*font-size: 1\.0625rem/);
  assert.match(readFileSync('components/Header.tsx', 'utf8'), /text-sm font-medium uppercase tracking-\[0\.14em\]/);
  // Keep the approved hero scale unchanged rather than zooming the entire page.
  assert.match(css, /\.portfolio-hero h1\s*\{[^}]*font-size: clamp\(4rem, 8\.4vw, 9rem\)/);
});
