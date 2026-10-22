import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

function sources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? sources(path) : /\.(tsx|css)$/.test(path) ? [path] : [];
  });
}

test('all headings use the shared sans-serif family, not handwriting', () => {
  for (const file of [...sources('app'), ...sources('components')]) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /font-hand|font-patrick-hand|Patrick_Hand/, file);
  }
  assert.match(readFileSync('app/globals.css', 'utf8'), /--font-heading: Arial, Helvetica, sans-serif/);
});
