import test from 'node:test';
import assert from 'node:assert/strict';
import { safeLabel, validateReport, sessionFreshness, validateFleet } from '../lib/admin/fleet.ts';
const now = Date.parse('2026-10-29T09:00:00.000Z');
export const report = () => ({ schemaVersion: 1, hostId: 'gimle', sessionId: 'a'.repeat(32), label: 'Morning research', state: 'working', observedAt: new Date(now).toISOString(), lastToolCompletedAt: null, startedAt: new Date(now - 1000).toISOString(), sequence: 0 });

test('wire v1 is exact, bounded and rejects unsafe labels/clocks', () => {
  assert.deepEqual(validateReport(report(), now), report());
  for (const mutate of [x=>x.raw='SECRET', x=>x.hostId='neo', x=>x.sessionId='path', x=>x.label='unsafe\u202e', x=>x.label='two\nlines', x=>x.label='a'.repeat(81), x=>x.label=' invisible\u200b', x=>x.sequence=-1, x=>x.sequence=Number.MAX_SAFE_INTEGER+1, x=>x.observedAt=new Date(now+31000).toISOString(), x=>x.observedAt=new Date(now-301000).toISOString(), x=>x.startedAt=new Date(now+1).toISOString(), x=>x.lastToolCompletedAt=new Date(now+1).toISOString()]) {
    const x=report(); mutate(x); assert.throws(()=>validateReport(x,now));
  }
});

test('labels use only trimmed nonempty 1-80 character ASCII display text', () => {
  const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ._-';
  const cases = [
    ['Admin feature', true], ['Pi session abc012ef', true], [allowed, true],
    ['a', true], ['.', true], ['_', true], ['-', true], ['a'.repeat(80), true],
    ['', false], [' ', false], [' padded', false], ['trailing ', false], ['a'.repeat(81), false],
    ...['é', '中', '🐦', '\u0301', '\u202e', '\u200b', '\u2028', '\u2029', '\u00a0', '\ufeff', '\ud800', '\udfff'].map(c => ['x' + c + 'y', false]),
    ...Array.from({length: 256}, (_, cp) => ['x' + String.fromCharCode(cp) + 'y', allowed.includes(String.fromCharCode(cp))]),
  ];
  for (const [label, expected] of cases) {
    assert.equal(safeLabel(label), expected, JSON.stringify(label));
    const value = {...report(), label};
    if (expected) assert.deepEqual(validateReport(value, now), value);
    else assert.throws(() => validateReport(value, now));
  }
  for (const value of [null, undefined, 12, {}, []]) assert.equal(safeLabel(value), false);
});

test('retained session freshness separates heartbeat, ended and clock skew', () => {
  const r={...report(), receivedAt:new Date(now).toISOString()};
  assert.equal(sessionFreshness(r,now),'fresh');
  assert.equal(sessionFreshness(r,now+120001),'stale');
  assert.equal(sessionFreshness({...r,state:'ended'},now+120001),'ended');
  assert.equal(sessionFreshness(r,now-31000),'clock-skew');
  const data={schemaVersion:1,readAt:new Date(now).toISOString(),hosts:[{id:'gimle',lastReceivedAt:r.receivedAt,sessions:[r]},{id:'macbook',lastReceivedAt:null,sessions:[]}]};
  assert.deepEqual(validateFleet(data),data);
  assert.throws(()=>validateFleet({...data,raw:'SECRET'}));
  assert.throws(()=>validateFleet({...data,hosts:[data.hosts[0],data.hosts[0]]}));
});
