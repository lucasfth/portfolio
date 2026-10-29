import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';

// Real React component, network-free DOM fixture. This does not simulate a
// browser's layout, native keyboard behavior, or theme rendering.
test('rendered component defaults, section-local All PRs, lower bounds and retained source notices', async () => {
  const temp = mkdtempSync(join(process.cwd(), '.tmp-github-component-'));
  const oldWindow = globalThis.window, oldDocument = globalThis.document, oldAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  try {
    const source = readFileSync('components/AdminGithub.tsx', 'utf8').replace('"@/lib/admin/github.mjs"', '"../lib/admin/github.mjs"').replace('"@/lib/admin/types"', '"../lib/admin/types"');
    const input = join(temp, 'component.tsx');
    writeFileSync(input, source);
    const compiled = spawnSync('node_modules/.bin/tsc', ['--ignoreConfig', '--outDir', join(temp, 'out'), '--rootDir', process.cwd(), '--target', 'ES2022', '--module', 'ESNext', '--moduleResolution', 'bundler', '--jsx', 'react-jsx', '--skipLibCheck', '--allowJs', input], { encoding: 'utf8' });
    // Type-only import is stripped; full project tsc also checks aliases separately.
    assert.equal(compiled.status, 0, `${compiled.stdout}\n${compiled.stderr}`);
    const file = join(temp, 'out', temp.split('/').pop(), 'component.js');
    const moduleFile = join(temp, 'component.mjs');
    writeFileSync(moduleFile, readFileSync(file, 'utf8'));
    const { default: Component } = await import(pathToFileURL(moduleFile).href);
    const pull = (number, author) => ({ repo: 'owner/repo', number, author, assignees: [], reviewers: number === 1 ? ['lucasfth'] : [], title: `PR ${number}`, state: 'OPEN', url: 'https://github.com/example/repo/pull/1' });
    const group = (owner, personal) => ({ owner, personal, repositoriesComplete: true, limitations: [], repositories: [{ id: owner, name: `${owner}/repo`, pullsComplete: true, activityComplete: true, commits: [], issues: [], openPulls: [pull(1, 'lucasfth'), pull(2, 'other')] }] });
    const payload = { status: 'ok', coverage: 'complete', groups: [group('lucasfth', true), group('example-org', false)] };
    const html = renderToStaticMarkup(React.createElement(Component, { payload }));
    const ssr = parseHTML(html).document;
    assert.equal(ssr.querySelectorAll('details').length, 2);
    assert.equal(ssr.querySelectorAll('details[open]').length, 1);
    assert.match(ssr.querySelector('details[open] summary').textContent, /Personal/);
    const { window, document } = parseHTML('<html><body><div id="root"></div></body></html>');
    globalThis.window = window; globalThis.document = document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const root = createRoot(document.querySelector('#root'));
    await act(() => root.render(React.createElement(Component, { payload })));
    const summaries = () => [...document.querySelectorAll('summary')].map(node => node.textContent);
    assert.ok(summaries().every(text => text.includes('1 open PRs')));
    const checkbox = document.querySelector('input');
    checkbox.checked = true;
    await act(() => checkbox.dispatchEvent(new window.Event('click', { bubbles: true })));
    assert.match(summaries()[0], /2 open PRs.*all PRs/);
    assert.match(summaries()[1], /1 open PRs.*for lucasfth/);
    assert.equal(document.querySelectorAll('a').length, 3);
    const partial = { ...payload, coverage: 'partial', limitations: ['Membership discovery incomplete.'], groups: [{ ...payload.groups[0], repositoriesComplete: false, limitations: ['Repository discovery incomplete.'] }] };
    await act(() => root.render(React.createElement(Component, { payload: partial })));
    assert.match(summaries()[0], /at least 2 open PRs/);
    assert.match(document.body.textContent, /Membership discovery incomplete/);
    assert.match(document.body.textContent, /Repository discovery incomplete/);
    await act(() => root.unmount());
  } finally {
    globalThis.window = oldWindow; globalThis.document = oldDocument; globalThis.IS_REACT_ACT_ENVIRONMENT = oldAct;
    rmSync(temp, { recursive: true, force: true });
  }
});
