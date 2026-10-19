import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const base = process.env.HOME_TEST_URL || 'http://127.0.0.1:4410';
const html = await fetch(base).then((r) => {
  assert.equal(r.status, 200);
  return r.text();
});
// Parse the document as HTML; this is text extraction, not HTML sanitization.
const { document } = parseHTML(html);
for (const node of document.querySelectorAll('script, style')) node.remove();
const text = document.body.textContent.replace(/\s+/g, ' ');
const headings = [...document.querySelectorAll('h2')].map((node) => node.textContent.trim());

test('HTML extraction excludes payloads and reads nested heading text', () => {
  const fixture = parseHTML('<html><body><script>payload</script ><h2><span>Selected</span> projects</h2></body></html>').document;
  for (const node of fixture.querySelectorAll('script, style')) node.remove();
  assert.equal(fixture.body.textContent, 'Selected projects');
  assert.equal(fixture.querySelector('h2').textContent, 'Selected projects');
});

test('selected work precedes the CV without dropping its sections', () => {
  assert.deepEqual(headings.slice(0, 2), ['Selected projects', 'Latest writing']);
  for (const title of ['About me', 'IT Work experience', 'Volunteering', 'Writing', 'Languages', 'Education', 'Aperture']) {
    assert.ok(headings.includes(title), `Missing ${title}`);
  }
});

test('home previews stay concise and link to complete collections', () => {
  const links = [...document.querySelectorAll('a[href]')].map((node) => node.getAttribute('href'));
  const projects = new Set(links.filter((href) => href.startsWith('/projects/')));
  const posts = new Set(links.filter((href) => href.startsWith('/blog/')));
  assert.equal(new Set([...document.querySelectorAll('#projects a[href^="/projects/"]')].map((node) => node.getAttribute('href'))).size, 4);
  assert.equal(posts.size, 3);
  assert.ok(projects.size >= 4);
  assert.ok(links.includes('/projects'));
  assert.ok(links.includes('/blog'));
});

test('hero introduction is not repeated in About', () => {
  const tagline = 'Software engineer and photographer in Copenhagen. CTO at EcoRay.';
  assert.equal(text.split(tagline).length - 1, 1);
  assert.doesNotMatch(text, /Check out my projects here/);
  assert.equal(document.querySelectorAll('h1').length, 1);
});
