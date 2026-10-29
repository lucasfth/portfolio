import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import swc from 'next/dist/build/swc/index.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const at = '2026-10-29T10:00:00.000Z';
function snapshot(label = 'Retained session', time = at) {
  return { schemaVersion: 1, readAt: time, hosts: [
    { id: 'gimle', lastReceivedAt: time, sessions: [{ schemaVersion: 1, hostId: 'gimle', sessionId: 'a'.repeat(32), label, state: 'idle', observedAt: time, receivedAt: time, startedAt: at, lastToolCompletedAt: at, sequence: 1 }] },
    { id: 'macbook', lastReceivedAt: null, sessions: [] },
  ] };
}

// Execute compiled shipping components with deterministic hook/effect lifetimes.
// Only React hooks and external I/O are substituted; JSX, validation and FleetView are real.
function component(name, overrides = {}) {
  const filename = fileURLToPath(new URL(`../components/${name}.tsx`, import.meta.url));
  const code = swc.transformSync(readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } }).code;
  const hooks = []; let cursor = 0, pending = [], updates = 0;
  const changed = (previous, next) => !previous || previous.length !== next.length || previous.some((value, i) => !Object.is(value, next[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!hooks[i]) hooks[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [hooks[i].value, next => { hooks[i].value = typeof next === 'function' ? next(hooks[i].value) : next; updates++; }];
    },
    useRef(value) { const i = cursor++; return hooks[i] ??= { current: value }; },
    useCallback(fn, deps) { const i = cursor++; if (changed(hooks[i]?.deps, deps)) hooks[i] = { value: fn, deps }; return hooks[i].value; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (changed(hooks[i]?.deps, deps)) pending.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
    },
  };
  const nativeRequire = createRequire(filename);
  const mod = new Module(filename); mod.filename = filename;
  mod.require = name => name === 'react' ? react : Object.hasOwn(overrides, name) ? overrides[name] : nativeRequire(name);
  mod._compile(code, filename);
  return {
    render(props = {}) { cursor = 0; pending = []; const element = mod.exports.default(props); pending.forEach(fn => fn()); return element; },
    unmount() { hooks.forEach(hook => hook?.cleanup?.()); hooks.length = 0; },
    get updates() { return updates; },
  };
}
function environment(t) {
  const intervals = new Map(), timeouts = new Map(), requests = []; let id = 0;
  t.mock.method(Date, 'now', () => Date.parse(at));
  t.mock.method(globalThis, 'setInterval', (fn, ms) => { const key = ++id; intervals.set(key, { fn, ms }); return key; });
  t.mock.method(globalThis, 'clearInterval', key => intervals.delete(key));
  t.mock.method(globalThis, 'setTimeout', (fn, ms) => { const key = ++id; timeouts.set(key, { fn, ms }); return key; });
  t.mock.method(globalThis, 'clearTimeout', key => timeouts.delete(key));
  t.mock.method(globalThis, 'fetch', (url, options) => {
    assert.equal(url, '/api/admin/fleet'); assert.equal(options.cache, 'no-store');
    return new Promise((resolve, reject) => requests.push({ options, resolve, reject }));
  });
  return { intervals, timeouts, requests, poll() { [...intervals.values()].find(timer => timer.ms === 30_000).fn(); } };
}
function find(element, predicate) {
  if (!element || typeof element !== 'object') return null;
  if (predicate(element)) return element;
  for (const child of [element.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found; }
  return null;
}
function dashboard() {
  const Fleet = () => null; let onAuth;
  const initial = { access_token: 'OLD', user: { id: 'operator-a', email: 'online@lucashanson.dk' } };
  const sb = {
    auth: {
      getSession: async () => ({ data: { session: initial } }),
      onAuthStateChange(fn) { onAuth = fn; return { data: { subscription: { unsubscribe() {} } } }; },
    },
    from() { return { select() { return { order() { return { limit: async () => ({ data: [], error: null }) }; } }; } }; },
  };
  const app = component('AdminDashboard', {
    '@/lib/admin/browser': { browserSupabase: () => sb },
    '@/components/AdminFleetPanel': Fleet,
    '@/components/TerminalReveal': () => null,
    '@/lib/admin/fetch-json-with-retry.mjs': { fetchJsonWithRetry: async () => ({ response: { ok: false }, body: null }) },
    '@/lib/admin/dashboard-state.mjs': createRequire(import.meta.url)('../lib/admin/dashboard-state.mjs'),
    '@/lib/admin/detail-dialog.mjs': { activateDialog() {}, cronJobDetail: value => value },
  });
  return { app, render: () => find(app.render(), element => element.type === Fleet), auth(token, id = 'operator-a') { onAuth(token ? 'TOKEN_REFRESHED' : 'SIGNED_OUT', token ? { access_token: token, user: { id, email: initial.user.email } } : null); } };
}
function reconcile() {
  let panel, key;
  return {
    render(element) {
      if (!element || key !== element.key) { panel?.unmount(); panel = element ? component('AdminFleetPanel') : null; key = element?.key; }
      return panel?.render(element.props) ?? null;
    },
    unmount() { panel?.unmount(); panel = null; },
    get panel() { return panel; },
  };
}

test('same-user token rotation retains rows, timestamps and warning until the new token succeeds', async t => {
  const env = environment(t), dash = dashboard(), tree = reconcile();
  t.after(() => { tree.unmount(); dash.app.unmount(); });
  assert.equal(dash.render(), null); await settle();
  const first = dash.render(); tree.render(first);
  assert.equal(env.requests[0].options.headers.Authorization, 'Bearer OLD');
  const received = snapshot(); env.requests[0].resolve(Response.json(received)); await settle();
  assert.deepEqual(tree.render(first).props.data, received);
  dash.auth('NEW'); const renewed = dash.render();
  assert.equal(renewed.key, first.key, 'same operator must not remount on token rotation');
  tree.render(renewed);
  assert.equal(env.requests[1].options.headers.Authorization, 'Bearer NEW');
  env.requests[1].resolve(new Response(null, { status: 503 })); await settle();
  const failed = tree.render(renewed);
  assert.deepEqual(failed.props.data, received, 'failed new-token fetch retains every row and timestamp');
  assert.equal(failed.props.error, true);
  const html = renderToStaticMarkup(failed);
  assert.match(html, /Retained session/); assert.match(html, /Showing last received values/);
  dash.auth('NEWER'); const next = dash.render(); tree.render(next);
  assert.equal(tree.render(next).props.error, true, 'warning remains visible while refreshed-token request is pending');
  t.mock.method(Date, 'now', () => Date.parse(at) + 121_000);
  [...env.intervals.values()].find(timer => timer.ms === 1_000).fn();
  const aged = tree.render(next);
  assert.deepEqual(aged.props.data, received); assert.match(renderToStaticMarkup(aged), /Stale/);
  assert.equal(env.requests[2].options.headers.Authorization, 'Bearer NEWER');
  const updated = snapshot('Updated session', '2026-10-29T10:02:01.000Z');
  env.requests[2].resolve(Response.json(updated)); await settle();
  const success = tree.render(next);
  assert.deepEqual(success.props.data, updated); assert.equal(success.props.error, false);
});

test('token restart cancels old requests and timers; late old-token success or failure cannot overwrite new data', async t => {
  const env = environment(t), panel = component('AdminFleetPanel'); t.after(() => panel.unmount());
  panel.render({ token: 'OLD' });
  const oldTimers = [...env.intervals.keys(), ...env.timeouts.keys()];
  panel.render({ token: 'NEW' });
  assert.equal(env.requests[0].options.signal.aborted, true);
  for (const id of oldTimers) assert.equal(env.intervals.has(id) || env.timeouts.has(id), false);
  const current = snapshot('New token data');
  env.requests[1].resolve(Response.json(current)); await settle();
  const before = panel.updates;
  env.requests[0].resolve(Response.json(snapshot('Obsolete old data'))); await settle();
  assert.equal(panel.updates, before); assert.deepEqual(panel.render({ token: 'NEW' }).props.data, current);
  env.poll(); const pending = env.requests[2];
  panel.render({ token: 'NEWEST' });
  env.requests[3].resolve(Response.json(current)); await settle();
  pending.reject(new Error('Late old-token failure')); await settle();
  const view = panel.render({ token: 'NEWEST' });
  assert.equal(view.props.error, false); assert.deepEqual(view.props.data, current);
});

test('actual dashboard user-ID change remounts with no observations; signout unmounts and cancels pending work', async t => {
  const env = environment(t), dash = dashboard(), tree = reconcile();
  t.after(() => { tree.unmount(); dash.app.unmount(); });
  dash.render(); await settle(); const first = dash.render(); tree.render(first);
  env.requests[0].resolve(Response.json(snapshot())); await settle();
  assert.ok(tree.render(first).props.data);
  env.poll(); const pending = env.requests[1], oldPanel = tree.panel;
  dash.auth('OTHER_USER', 'operator-b'); const other = dash.render();
  assert.notEqual(other.key, first.key, 'different user ID must reset even with the same email');
  assert.equal(tree.render(other).props.data, null);
  assert.equal(pending.options.signal.aborted, true);
  const before = oldPanel.updates; pending.resolve(Response.json(snapshot('Leaked old user'))); await settle();
  assert.equal(oldPanel.updates, before); assert.equal(tree.render(other).props.data, null);
  const lastPanel = tree.panel, last = env.requests[2];
  dash.auth(null); assert.equal(tree.render(dash.render()), null); assert.equal(tree.panel, null);
  assert.equal(last.options.signal.aborted, true); assert.equal(env.timeouts.size, 0);
  // The dashboard's unrelated clock remains until its own unmount; the fleet timers are gone.
  assert.deepEqual([...env.intervals.values()].map(timer => timer.ms), [1_000]);
  const updates = lastPanel.updates; last.resolve(Response.json(snapshot())); await settle();
  assert.equal(lastPanel.updates, updates);
  dash.app.unmount(); assert.equal(env.intervals.size, 0);
});

test('pending polling request is aborted on unmount with no late updates or request timers', async t => {
  const env = environment(t), panel = component('AdminFleetPanel');
  panel.render({ token: 'TEST' });
  assert.equal(env.requests.length, 1); assert.equal(env.timeouts.size, 1); assert.equal(env.intervals.size, 2);
  const before = panel.updates; panel.unmount();
  assert.equal(env.requests[0].options.signal.aborted, true);
  assert.equal(env.intervals.size, 0); assert.equal(env.timeouts.size, 0);
  env.requests[0].resolve(Response.json(snapshot())); await settle();
  assert.equal(panel.updates, before); assert.equal(env.requests.length, 1);
});

test('same mounted panel preserves data and existing error across token effect restart', async t => {
  const env = environment(t), panel = component('AdminFleetPanel'); t.after(() => panel.unmount());
  panel.render({ token: 'OLD' }); const received = snapshot();
  env.requests[0].resolve(Response.json(received)); await settle();
  env.poll(); env.requests[1].reject(new Error('Source outage')); await settle();
  assert.equal(panel.render({ token: 'OLD' }).props.error, true);
  panel.render({ token: 'NEW' });
  const pending = panel.render({ token: 'NEW' });
  assert.deepEqual(pending.props.data, received); assert.equal(pending.props.error, true);
  env.requests[2].reject(new Error('Still unavailable')); await settle();
  const failed = panel.render({ token: 'NEW' });
  assert.deepEqual(failed.props.data, received); assert.equal(failed.props.error, true);
});
