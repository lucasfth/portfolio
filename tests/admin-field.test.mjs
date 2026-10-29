import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { parseHTML } from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

test('ASCII text field reserves measured wrapped height, rebuilds on resize/fonts and cleans up', async () => {
  const file = process.cwd() + '/components/AdminField.tsx';
  assert.ok(existsSync(file), 'a measured text field must replace heterogeneous panel-child reveals');
  const source = readFileSync(file, 'utf8');
  const compiled = swc.transformSync(source, { filename: file, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' }, module: { type: 'commonjs' } }).code;
  const mod = new Module(file); mod.filename = file;
  const require = createRequire(file);
  const calls = [];
  mod.require = name => name === '@/components/TerminalReveal' ? { __esModule: true, default: props => { calls.push(props); return React.createElement('div', { className: 'terminal-reveal' }, props.children); } } : require(name);
  mod._compile(compiled, file);
  const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>');
  const prior = Object.fromEntries(['window', 'document', 'ResizeObserver', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, globalThis[k]]));
  let resize, observed, disconnected = false, height = 60;
  const fonts = new EventTarget(); fonts.ready = Promise.resolve(); Object.defineProperty(document, 'fonts', { value: fonts });
  window.HTMLElement.prototype.getBoundingClientRect = () => ({ height, width: 240 });
  globalThis.window = window; globalThis.document = document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class { constructor(fn) { resize = fn; } observe(node) { observed = node; assert.ok(node.isConnected); } disconnect() { disconnected = true; } };
  const root = createRoot(document.querySelector('#root'));
  try {
    const render = props => act(async () => root.render(React.createElement(mod.exports.default, props)));
    await render({ text: 'Long wrapped fetched text '.repeat(20), loading: true });
    const field = document.querySelector('.admin-field');
    assert.equal(field.style.minHeight, '60px');
    assert.equal(field.getAttribute('data-loading'), 'true');
    assert.equal(calls.at(-1).loadingLoop, true);
    height = 120; await act(async () => resize());
    assert.equal(field.style.minHeight, '120px');
    assert.equal(observed, field); assert.ok(observed.isConnected);
    height = 80; await act(async () => resize());
    assert.equal(field.style.minHeight, '80px');
    assert.equal(document.querySelector('.admin-field'), observed);
    assert.ok(observed.isConnected, 'observer must survive repeated measurement updates');
    height = 140; await act(async () => fonts.dispatchEvent(new Event('loadingdone')));
    assert.equal(field.style.minHeight, '140px');
    await render({ text: '<script>not markup</script>', loading: false });
    assert.equal(document.querySelector('script'), null);
    assert.ok(document.body.textContent.includes('<script>not markup</script>'));
    assert.equal(calls.at(-1).loading, false);
    await act(async () => root.unmount()); assert.ok(disconnected);
  } finally { Object.assign(globalThis, prior); }
});

test('field-only overlay is contained, wraps long tokens and leaves reduced-motion loading readable', () => {
  const css = readFileSync('app/globals.css', 'utf8');
  assert.match(css, /\.admin-field\s*\{[^}]*position:\s*relative[^}]*overflow:\s*clip[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.admin-field \.terminal-reveal\s*\{[^}]*position:\s*relative/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.admin-field\[data-loading="true"\]:has\(\.ar-overlay canvas\) \.admin-field-text\s*\{\s*visibility:\s*visible/);
});
