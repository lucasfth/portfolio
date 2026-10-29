import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGithub, createGithubCache } from '../lib/admin/github.mjs';
import { fetchJsonWithRetry } from '../lib/admin/fetch-json-with-retry.mjs';

// Mock scheduling, not a production latency claim. Exercise the real consumer
// helper and collector together; response JSON remains under its timeout.
test('slow successful GitHub flight is delivered within the first client timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  const request = async (path, body, signal) => {
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 1900);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
    if (path === '/user') return { login: 'lucasfth' };
    if (path.includes('/memberships/')) return [];
    if (path.startsWith('/user/repos')) return [{ full_name: 'lucasfth/repo', node_id: 'repo' }];
    return { data: { nodes: [{ id: body.variables.ids[0], pullRequests: { nodes: [], totalCount: 0, pageInfo: { hasNextPage: false } }, issues: { nodes: [] }, defaultBranchRef: null }] } };
  };
  const cached = createGithubCache(() => collectGithub({ request }));
  globalThis.fetch = async (_url, { signal }) => {
    attempts++;
    const value = await Promise.race([cached(), new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))]);
    return new Response(JSON.stringify(value));
  };
  try {
    let settled = false;
    const result = fetchJsonWithRetry('/api/admin/github', {}).then(value => { settled = true; return value; });
    for (let i = 0; i < 40 && !settled; i++) {
      t.mock.timers.tick(250);
      for (let j = 0; j < 30; j++) await Promise.resolve();
    }
    assert.equal(settled, true);
    assert.equal((await result).body.coverage, 'complete');
    assert.equal(attempts, 1);
    assert.ok(Date.now() < 10_000);
  } finally { globalThis.fetch = originalFetch; t.mock.timers.reset(); }
});

test('collector aborts an in-flight upstream call at the shared remaining deadline', async () => {
  let observedSignal;
  // AbortSignal.timeout is unref'd; keep the real event loop alive for this check.
  const keepAlive = setTimeout(() => {}, 1000);
  const result = await collectGithub({ deadlineMs: 15, request: async (_path, _body, signal) => {
    observedSignal = signal;
    return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  } });
  clearTimeout(keepAlive);
  assert.equal(result.status, 'error');
  assert.equal(observedSignal.aborted, true);
});
