import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyVisitHash, statsDay, sanitizePath } from '../lib/stats/identity.ts';
import { sendVisit } from '../lib/stats/beacon.ts';

test('Copenhagen midnight rotates identity, UTC midnight does not', () => {
  const hash = time => dailyVisitHash('192.0.2.1', 'test-secret', new Date(time));
  assert.equal(statsDay(new Date('2026-10-17T22:01:00Z')), '2026-10-18');
  assert.notEqual(hash('2026-10-17T21:59:00Z'), hash('2026-10-17T22:01:00Z'));
  assert.equal(hash('2026-10-17T23:59:00Z'), hash('2026-10-18T00:01:00Z'));
  assert.equal(statsDay(new Date('2026-12-17T23:01:00Z')), '2026-12-18');
  assert.equal(statsDay(new Date('2026-10-25T01:30:00Z')), '2026-10-25');
});
test('same address deduplicates, different addresses differ, invalid IP is excluded', () => {
  assert.equal(dailyVisitHash('2001:db8::1', 'key'), dailyVisitHash('2001:0db8:0:0:0:0:0:1', 'key'));
  assert.notEqual(dailyVisitHash('192.0.2.1', 'key'), dailyVisitHash('192.0.2.2', 'key'));
  assert.equal(dailyVisitHash('invalid', 'key'), null);
  assert.equal(dailyVisitHash(null, 'key'), null);
});
test('paths reject suffix junk, query strings, controls, and oversize values', () => {
  for (const path of ['/', '/blog/test', '/photos/a%20b']) assert.equal(sanitizePath(path), path);
  for (const path of ['/ok<script>', '/?email=private', '/bad\n', '/' + 'a'.repeat(201), null]) assert.equal(sanitizePath(path), null);
});
test('503 retries, success throttles, blocked/corrupt storage still sends, parallel call coalesces', async () => {
  let calls = 0;
  let status = 503;
  let saved = '{}';
  global.window = {
    localStorage: { getItem: () => saved, setItem: (_, v) => { saved = v; } },
    fetch: async () => { calls++; return { ok: status === 204 }; },
  };
  assert.equal(await sendVisit('/retry-test', null), false);
  assert.equal(saved, '{}');
  status = 204;
  assert.equal(await sendVisit('/retry-test', null), true);
  await sendVisit('/retry-test', null);
  assert.equal(calls, 2);
  saved = 'null';
  await sendVisit('/corrupt-test', null);
  window.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  await sendVisit('/blocked-test', null);
  await Promise.all([sendVisit('/parallel-test', null), sendVisit('/parallel-test', null)]);
  assert.equal(calls, 5);
});
