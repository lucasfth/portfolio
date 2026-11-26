import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

const hostname = `npub${'a'.repeat(59)}.blossom.band`;
const item = {
  title: 'long'.repeat(50),
  summary: 'unbroken'.repeat(75),
  source: 'Nostr',
  url: `https://${hostname}/post`,
  tag: 'other',
};

// Assert the wrapping contract on the rendered Radar row, not browser geometry.
test('Radar keeps long feed text in a shrinkable, wrapping column beside the arrow', async () => {
  const file = fileURLToPath(new URL('../app/radar/page.tsx', import.meta.url));
  const mod = new Module(file);
  const require = createRequire(file);
  mod.require = name => {
    if (name === '@/components/PageHero') return { default: () => null, __esModule: true };
    if (name === '@/lib/content') return { SITE_URL: 'https://example.test' };
    if (name === '@/lib/radar/publication') return {
      getRadarEdition: async () => ({ generated: '2026-11-26T04:08:00Z', count_scanned: 327, items: [item] }),
      radarEditionStale: () => false,
    };
    return require(name);
  };
  mod._compile(swc.transformSync(readFileSync(file, 'utf8'), {
    filename: file,
    jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } },
    module: { type: 'commonjs' },
  }).code, file);
  const { document } = parseHTML(renderToStaticMarkup(await mod.exports.default()));
  const row = document.querySelector('li > a');
  assert.equal(row.getAttribute('href'), item.url);
  const [text, icon] = row.children;
  assert.deepEqual([...text.children].map(node => node.textContent), [item.title, item.summary, `Nostr / ${hostname}`]);
  assert.ok(text.classList.contains('min-w-0'), 'the text column must be allowed to shrink');
  assert.ok(icon.classList.contains('shrink-0'), 'the arrow must keep its width');
  assert.ok(text.classList.contains('wrap-anywhere'), 'the text column must wrap unbroken feed text');
});
