import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Module, createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseHTML } from 'linkedom';
import swc from 'next/dist/build/swc/index.js';
import { stockDetail, financeDetail } from '../lib/admin/detail-content.mjs';
const file = process.cwd() + '/components/AdminDetailDialog.tsx';
const mod = new Module(file); mod.filename = file;
const require = createRequire(file);
mod.require = name => name.includes('detail-dialog.mjs') ? { activateDialog() {} } : require(name);
mod._compile(swc.transformSync(readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } }).code, file);
const render = detail => parseHTML(renderToStaticMarkup(React.createElement(mod.exports.default, { detail, opener: null, onClose() {} }))).document;
test('dialog renders labelled chart, ordered numeric history and explicit currency', () => {
  const doc = render(stockDetail({ symbol: 'TEST', name: 'Test', price: 20, closes: [10, 15, 20], currency: 'DKK' }));
  assert.equal(doc.querySelector('[role="dialog"]').getAttribute('aria-describedby'), 'admin-detail-description');
  assert.ok(doc.querySelector('svg[role="img"] polyline'));
  assert.equal(doc.querySelectorAll('ol li').length, 3);
  assert.match(doc.textContent || doc.toString(), /20 DKK/);
  assert.doesNotMatch(doc.toString(), /NaN|Infinity/);
});
test('empty history has an honest fallback and arbitrary nested secrets never render', () => {
  const doc = render(stockDetail({ symbol: 'X', name: 'X', closes: [] }));
  assert.equal(doc.querySelector('svg'), null);
  assert.match(doc.toString(), /Not enough history/);
  const finance = render(financeDetail({ nordea: { accounts: [{ name: '<script>secret</script>', balance: 0, source: 'bank' }] }, saxo: {}, token: 'DO-NOT-RENDER' }));
  assert.equal(finance.querySelector('script'), null);
  assert.match(finance.toString(), /&lt;script&gt;/);
  assert.doesNotMatch(finance.toString(), /DO-NOT-RENDER/);
});

test('chart includes currency-labelled price ticks and observation-order x ticks without fabricated dates', () => {
  const doc = render(stockDetail({ symbol: 'TEST', name: 'Test', closes: [10, 15, 20], currency: 'DKK' }));
  assert.equal(doc.querySelector('[data-chart-axis="y"]').textContent, 'Price (DKK)');
  assert.equal(doc.querySelector('[data-chart-axis="x"]').textContent, 'Observation · oldest → newest');
  assert.deepEqual([...doc.querySelectorAll('[data-chart-y-tick]')].map(x => x.textContent), ['20', '15', '10']);
  assert.deepEqual([...doc.querySelectorAll('[data-chart-x-tick]')].map(x => x.textContent), ['1', '2', '3']);
  assert.equal(doc.querySelectorAll('svg line').length, 5);
});

test('chart handles flat and negative prices with finite, distinct axis bounds', () => {
  for (const closes of [[10, 10, 10], [0, 0], [-5, -3, -4]]) {
    const doc = render(stockDetail({ symbol: 'X', name: 'Test', closes, currency: 'DKK' }));
    const ticks = [...doc.querySelectorAll('[data-chart-y-tick]')].map(x => x.textContent);
    assert.equal(ticks.length, 3);
    assert.equal(new Set(ticks).size, 3);
    assert.doesNotMatch(doc.toString(), /NaN|Infinity/);
  }
});

test('finance account cards are native dialog triggers and external Actual link stays separate', () => {
  const dashboard = readFileSync('components/AdminDashboard.tsx', 'utf8');
  const panel = dashboard.slice(dashboard.indexOf('function FinancePanel'), dashboard.indexOf('export default function AdminDashboard'));
  assert.match(panel, /<button key=\{label\} type="button" aria-haspopup="dialog"/);
  assert.match(panel, /aria-label=\{`Open \$\{label\} account details`\}/);
  assert.match(panel, /disabled=\{!finance\}/);
  assert.match(panel, /openDetail\(financeDetail\(finance, error\), event.currentTarget\)/);
  assert.doesNotMatch(panel, /Account breakdown and sources/);
  assert.match(panel, /<a href=\{ACTUAL_URL\}/);
});

test('weather model detail has true source time, precipitation hours, safe expired advice and no obsolete provider',async()=>{
  const {weatherDetail}=await import('../lib/admin/detail-content.mjs');
  const {weatherExpired}=await import('../lib/admin/dashboard-state.mjs');
  assert.equal(weatherExpired({updated:'2000-01-01T00:00:00Z'}),true);assert.equal(weatherExpired({}),true);assert.equal(weatherExpired({updated:'invalid'}),true);
  const detail=weatherDetail({source:'Open-Meteo',freshness:'Model-based conditions',updated:'2000-01-01T00:00:00Z',current:{bike:true,waterproof:true},today:{precipHours:2.5}},'timeout');
  assert.match(detail.subtitle,/Open-Meteo.*model time/);assert.match(JSON.stringify(detail),/Forecast precipitation hours/);assert.doesNotMatch(JSON.stringify(detail),/wttr|Wet forecast intervals/);
  assert.equal(detail.sections[0].fields.find(([k])=>k==='Cycling conditions suitable')[1],'Unknown');
});
