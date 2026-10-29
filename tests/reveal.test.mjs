import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('overlay glyphs override inherited transparent text fill', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.ar-overlay\s*>\s*span\s*\{[^}]*-webkit-text-fill-color:\s*currentColor/);
});

test('title reveal starts without lazy-import or body-font delay', () => {
  const source = readFileSync('components/TerminalReveal.tsx', 'utf8');
  assert.match(source, /useLayoutEffect\(/);
  assert.match(source, /import \{ createAsciiReveal, presets \} from "ascii-reveal\/core"/);
  assert.doesNotMatch(source, /document\.fonts\.ready|import\("ascii-reveal/);
});

test('subheadings reveal on entry and hero image excludes its caption', () => {
  const source = readFileSync('components/TerminalReveal.tsx', 'utf8');
  assert.match(source, /h1, \[data-terminal-heading\], \[data-terminal-media\]/);
  assert.match(source, /observer\?\.unobserve/);
  assert.match(source, /observer\?\.disconnect/);
  const hero = readFileSync('components/Hero.tsx', 'utf8');
  assert.match(hero, /className="hero-frame" data-terminal-media/);
  assert.match(hero, /className="hero-image-label" data-ascii="skip"/);
});

test('additional motion stays opt-in and limited', () => {
  const aperture = readFileSync('app/aperture/page.tsx', 'utf8');
  assert.match(aperture, /reveal=\{i < 4\}/);
  assert.doesNotMatch(aperture, /<Reveal/);
  const heading = readFileSync('components/SectionHeading.tsx', 'utf8');
  assert.match(heading, /data-terminal-heading/);
  assert.doesNotMatch(heading, /<Reveal/);
  const preview = readFileSync('components/ProjectShowcase.tsx', 'utf8');
  assert.match(preview, /<span data-ascii="skip">Explore project/);
});

test('project and blog covers opt in without animating article bodies', () => {
  for (const path of ['components/ProjectCard.tsx', 'app/blog/[postId]/page.tsx', 'app/projects/[projectId]/page.tsx']) {
    const source = readFileSync(path, 'utf8');
    // Cover attributes may span lines; require the opt-in and relative class on the same div.
    assert.match(source, /<div\s+data-terminal-media\s+[^>]*className="relative/);
    assert.doesNotMatch(source, /<article[^>]*data-terminal-media/);
  }
  assert.doesNotMatch(readFileSync('app/projects/page.tsx', 'utf8'), /<Reveal/);
});

test('short introductory subheaders explicitly opt in', () => {
  for (const path of ['components/Hero.tsx', 'components/PageHero.tsx', 'components/SectionHeading.tsx']) {
    assert.match(readFileSync(path, 'utf8'), /<p\s+data-terminal-heading/);
  }
});

test('short reveals hold each glyph longer', () => {
  const source = readFileSync('components/TerminalReveal.tsx', 'utf8');
  assert.match(source, /tick: 120/);
  assert.match(source, /speed: 2/);
  // ascii-reveal v0.3.0 switched the default duration to "fast"; cinematic restores the pre-0.3 pacing.
  assert.match(source, /duration: "cinematic"/);
});

test('navbar wordmark cannot wrap or shrink', () => {
  const source = readFileSync('components/Header.tsx', 'utf8');
  assert.match(source, /shrink-0 items-center/);
  assert.match(source, /whitespace-nowrap text-lg font-semibold tracking-tight/);
  assert.match(source, /hidden lg:flex/);
});
