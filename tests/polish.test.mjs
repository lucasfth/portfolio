import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = path => readFileSync(path, 'utf8');
test('blog titles wrap and mobile dates remain available', () => {
  const post = source('components/PostRow.tsx');
  assert.doesNotMatch(post, /truncate/);
  assert.match(post, /<time dateTime=\{post.date\}/);
});
test('navigation agrees and click sparks are not mounted', () => {
  assert.match(source('components/Header.tsx'), /name: "About", href: "\/about"/);
  assert.doesNotMatch(source('app/layout.tsx'), /ClickSpark/);
});
test('cover media keeps original colors and shared corners', () => {
  for (const path of ['components/ProjectCard.tsx', 'components/GalleryTile.tsx', 'app/blog/[postId]/page.tsx', 'app/projects/[projectId]/page.tsx']) {
    assert.doesNotMatch(source(path), /grayscale|brightness/);
    assert.match(source(path), /var\(--media-radius\)/);
  }
  assert.doesNotMatch(source('components/ProjectCard.tsx'), /from-card/);
});
