import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const source = path => readFileSync(path, 'utf8');

test('document scrolling and scrollbars belong to the browser', () => {
  assert.doesNotMatch(source('app/layout.tsx'), /SmoothScroll|lenis/);
  assert.equal(existsSync('components/SmoothScroll.tsx'), false);
  assert.doesNotMatch(source('app/globals.css'), /scroll-behavior:\s*smooth|::-webkit-scrollbar/);
  assert.equal(JSON.parse(source('package.json')).dependencies.lenis, undefined);
  assert.doesNotMatch(source('components/ScrollToTop.tsx'), /behavior:\s*"smooth"/);
  assert.match(source('components/ScrollToTop.tsx'), /mainContent\.focus\(\{ preventScroll: true \}\)/);
});
