import test from 'node:test';
import assert from 'node:assert/strict';
import { stockDetail, weatherDetail, financeDetail, scheduledJobDetail } from '../lib/admin/detail-content.mjs';
const text = value => JSON.stringify(value);

test('quote details preserve closes without inventing dates, show source and missing values', () => {
  const model = stockDetail({ symbol: 'TEST', name: 'Example', currency: 'DKK', price: 42, prevClose: 40, changePct: 5, closes: [38, NaN, 40, 42], at: '2026-10-30T08:00:00Z' }, 'Refresh failed');
  assert.deepEqual(model.history, [38, 40, 42]);
  assert.match(text(model), /Yahoo Finance/);
  assert.match(text(model), /Copenhagen time/);
  assert.match(text(model), /Refresh failed/);
  assert.match(text(model), /dates are not supplied/);
  assert.doesNotMatch(text(stockDetail({ symbol: 'X', closes: [] })), /NaN|undefined|Invalid Date/);
});

test('weather labels units and source dates; missing forecast remains unknown, not zero', () => {
  const model = weatherDetail({ current: { desc: 'Rain', temp: 8, feels: 6, wind: 20, precip: 2, bike: false, waterproof: true }, today: { mint: 5, max: 9, uv: 0, sunrise: '07:00 AM', sunset: '04:30 PM', precipHours: 3 } });
  assert.match(text(model), /20 km\/h/);
  assert.match(text(model), /2 mm/);
  assert.match(text(model), /forecast intervals/);
  assert.match(text(model), /wttr.in/);
  assert.match(text(weatherDetail({})), /Unknown/);
});

test('finance includes nested accounts, historical assumptions and source limitations, not arbitrary fields', () => {
  const model = financeDetail({ currency: 'DKK', total: 100, mixedDates: true, simIncluded: false, nordea: { balance: 80, accounts: [{ name: 'Savings', balance: 80, source: 'bank', lastSync: null }], status: 'ok' }, saxo: { total: 20, investments: 15, cash: 5, asOf: '2026-10-29', liveSync: false }, estimate: { total: 150, currency: 'DKK', additionalSavings: 50, asOf: '2026-01-01', assumptions: ['Historical savings assumption'] }, limitations: ['Partial coverage'], token: 'DO-NOT-RENDER' });
  assert.match(text(model), /Savings/);
  assert.match(text(model), /Historical savings assumption/);
  assert.match(text(model), /Partial coverage/);
  assert.match(text(model), /not net worth/);
  assert.match(text(model), /Mixed source dates/);
  assert.doesNotMatch(text(model), /DO-NOT-RENDER/);
});

test('scheduled job details use allowlist, retain safe reference and withhold raw details', () => {
  const model = scheduledJobDetail({ name: 'Nightly', enabled: false, status: 'failed', kind: 'information', summary: 'Source unavailable', reference: 'run-safe', referenceType: 'run', details: '/private/token=secret' }, ['Scheduler receipts only']);
  assert.match(text(model), /run-safe/);
  assert.match(text(model), /Paused/);
  assert.match(text(model), /withheld for safety/);
  assert.match(text(model), /Scheduler receipts only/);
  assert.doesNotMatch(text(model), /private\/|token=secret/);
});
