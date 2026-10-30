import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

const file = process.cwd() + '/components/ImageMarquee.tsx';
const items = [{ src: '/a.jpg', alt: 'First photo' }, { src: '/b.jpg', alt: 'Second photo' }];
function mount(t) {
  const frames = new Map(); let nextFrame = 0, cursor = 0, effects = [], tree;
  const hooks = [], refs = [];
  const preference = new EventTarget(); preference.matches = false;
  const globals = { window: { matchMedia: () => preference }, document: Object.assign(new EventTarget(), { hidden: false }),
    IntersectionObserver: class { constructor(fn) { this.fn = fn; } observe() { this.fn([{ isIntersecting: true }]); } disconnect() {} },
    requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id) };
  const restoreGlobals = [];
  for (const [key, value] of Object.entries(globals)) { const descriptor = Object.getOwnPropertyDescriptor(globalThis, key); Object.defineProperty(globalThis, key, { value, configurable: true, writable: true }); restoreGlobals.push(() => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]); }
  const changed = (a, b) => !a || a.some((v, i) => v !== b[i]);
  const react = { ...React,
    useId: () => 'photos',
    useState(initial) { const i = cursor++; hooks[i] ??= { value: initial }; return [hooks[i].value, value => { hooks[i].value = typeof value === 'function' ? value(hooks[i].value) : value; }]; },
    useRef() { const i = cursor++; if (!hooks[i]) { hooks[i] = { current: null }; refs.push(hooks[i]); } return hooks[i]; },
    useEffect(fn, deps) { const i = cursor++; if (changed(hooks[i]?.deps, deps)) effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; }); },
  };
  const code = swc.transformSync(readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } }).code;
  const mod = new Module(file); mod.filename = file; const require = createRequire(file);
  mod.require = name => name === 'react' ? react : name === 'next/image' ? { __esModule: true, default: props => React.createElement('img', props) } : require(name);
  mod._compile(code, file);
  const viewport = { scrollLeft: 0, clientWidth: 300, scrollWidth: 1600 };
  const track = { children: [{ offsetLeft: 0 }, { offsetLeft: 300 }, { offsetLeft: 600 }, { offsetLeft: 900 }] };
  function render() { cursor = 0; effects = []; tree = mod.exports.default({ items, label: 'Nature photos' }); refs[0].current = viewport; refs[1].current = track; effects.forEach(fn => fn()); return tree; }
  function find(predicate, node = tree) { if (!node || typeof node !== 'object') return null; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity).filter(Boolean)) { const result = find(predicate, child); if (result) return result; } return null; }
  function frame(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time)); }
  const unmount = () => { hooks.forEach(hook => hook?.cleanup?.()); hooks.length = 0; }; t.after(() => { unmount(); restoreGlobals.forEach(restore => restore()); });
  render(); render(); render();
  return { render, find, frame, viewport, preference, frames, unmount };
}

test('autoplay advances the real scroller by elapsed time, pauses on manual input and resumes explicitly', t => {
  const app = mount(t);
  app.frame(0); app.frame(1000 / 60); assert.ok(app.viewport.scrollLeft > 0);
  const region = app.find(node => node.props?.role === 'region');
  assert.equal(region.props.onWheel({}), undefined);
  app.render(); const stopped = app.viewport.scrollLeft; app.frame(100); assert.equal(app.viewport.scrollLeft, stopped);
  const button = app.find(node => node.type === 'button'); button.props.onClick(); app.render();
  app.frame(200); app.frame(216); assert.ok(app.viewport.scrollLeft > stopped);
  app.unmount(); assert.equal(app.frames.size, 0);
});

test('reduced motion disables autoplay and hides the duplicate sequence without blocking native controls', t => {
  const app = mount(t); app.preference.matches = true; app.preference.dispatchEvent(new Event('change')); app.render();
  assert.equal(app.frames.size, 0);
  const html = renderToStaticMarkup(app.render()); const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll('[data-marquee-copy="duplicate"]').length, 0);
  assert.equal(document.querySelectorAll('button').length, 0);
  assert.equal(document.querySelector('[role="region"]').getAttribute('tabindex'), '0');
});

test('autoplay pauses for hover, keyboard focus and hidden tabs; wrapping is seamless', t => {
  const app = mount(t); const region = app.find(node => node.props?.role === 'region');
  region.props.onPointerEnter({ pointerType: 'mouse' }); app.render(); assert.equal(app.frames.size, 0);
  region.props.onPointerLeave(); app.render(); assert.equal(app.frames.size, 1);
  region.props.onFocus(); app.render(); assert.equal(app.frames.size, 0);
  region.props.onBlur({ currentTarget: { contains: () => false }, relatedTarget: null }); app.render();
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange')); assert.equal(app.frames.size, 0);
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); assert.equal(app.frames.size, 1);
  region.props.onWheel(); app.render(); app.viewport.scrollLeft = 599.8;
  app.find(node => node.type === 'button').props.onClick(); app.render(); app.frame(0); app.frame(16);
  assert.ok(app.viewport.scrollLeft < 1, 'position wraps exactly one sequence including its trailing gap');
});

test('native strip has no drag physics, intercepted keys or nested gallery-link controls', () => {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /gsap|preventDefault|onDrag|touch-action/);
  assert.match(source, /overflow-x-auto/);
  const home = readFileSync('components/HomeGalleries.tsx', 'utf8');
  assert.doesNotMatch(home, /<Link[\s\S]*<ImageMarquee[\s\S]*<\/Link>/);
});
