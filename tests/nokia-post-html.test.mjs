import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';

const slug = 'nokia-klaus-voice-terminal';
const route = `https://lucashanson.dk/blog/${slug}`;

test('Nokia post publishes the approved uncropped theme pair and metadata', () => {
  const doc = parseHTML(readFileSync(`.next/server/app/blog/${slug}.html`, 'utf8')).document;
  assert.equal(doc.querySelectorAll('h1').length, 1);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, route);
  const media = doc.querySelector('header [data-terminal-media]');
  assert.match(media.getAttribute('style'), /aspect-ratio:1200\s*\/\s*890/);
  assert.match(media.querySelector('source').getAttribute('srcSet'), /nokia-klaus-light/);
  assert.match(media.querySelector('img').getAttribute('srcSet'), /nokia-klaus-dark/);
  for (const field of ['property="og:image"', 'name="twitter:image"']) {
    assert.equal(doc.querySelector(`meta[${field}]`).getAttribute('content'), 'https://lucashanson.dk/images/nokia-klaus-dark.png');
  }
  for (const el of doc.querySelectorAll('script,style')) el.remove();
  assert.match(doc.body.textContent, /He had a Nokia 6300 4G/);
  assert.match(doc.body.textContent, /not an official EcoRay product/);
  assert.match(doc.body.textContent, /Not a full recovery qualification/);
  assert.doesNotMatch(doc.body.textContent, /Alexander|Loki|NEO_PROXY|\/Users\//);
  for (const theme of ['dark', 'light']) assert.ok(existsSync(`public/images/nokia-klaus-${theme}.png`));
});

test('Nokia post is present in index, sitemap and RSS', () => {
  const index = parseHTML(readFileSync('.next/server/app/blog.html', 'utf8')).document;
  assert.ok(index.querySelector(`a[href="/blog/${slug}"]`));
  assert.match(readFileSync('.next/server/app/sitemap.xml.body', 'utf8'), new RegExp(route));
  assert.match(readFileSync('public/rss.xml', 'utf8'), new RegExp(route));
});
