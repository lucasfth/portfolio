import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

function page(route) {
  return parseHTML(readFileSync(`.next/server/app/${route}.html`, 'utf8')).document;
}
function assertPair(picture) {
  assert.ok(picture);
  const source = picture.querySelector('source');
  assert.equal(source.getAttribute('media'), '(prefers-color-scheme: light)');
  assert.match(source.getAttribute('srcSet'), /fafnir-latte/);
  assert.match(picture.querySelector('img').getAttribute('srcSet'), /fafnir-mocha/);
  assert.ok(picture.querySelector('img').getAttribute('sizes'));
}

test('Fafnir detail renders a native responsive theme pair and approved limits', () => {
  const doc = page('projects/fafnir');
  assertPair(doc.querySelector('main picture'));
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.equal(doc.querySelector('link[rel=canonical]').href, 'https://lucashanson.dk/projects/fafnir');
  for (const el of doc.querySelectorAll('script,style')) el.remove();
  assert.match(doc.body.textContent, /personal projects, where a leak would not compromise anything important/);
});

test('project index and desktop/mobile homepage pass both image variants', () => {
  assertPair(page('projects').querySelector('a[href="/projects/fafnir"] picture'));
  const home = page('index');
  const pictures = [...home.querySelectorAll('a[href="/projects/fafnir"] picture')];
  assert.equal(pictures.length, 2);
  pictures.forEach(assertPair);
});

test('existing single-source frontpage and blog images are unchanged', () => {
  const home = page('index');
  const hero = home.querySelector('.hero-frame');
  assert.ok(!hero.querySelector('picture'));
  assert.match(hero.querySelector('img').getAttribute('src'), /DSCF5108/);
  const blog = page('blog/muninn-checkable-memory');
  assert.ok(blog.querySelector('main img'));
  assert.ok(!blog.querySelector('main picture'));
});
