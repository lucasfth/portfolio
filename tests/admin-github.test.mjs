import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { collectGithub, createGithubCache, githubScope, relevantPull } from '../lib/admin/github.mjs';
import { retainSuccessfulPayload, panelPayloadResult } from '../lib/admin/dashboard-state.mjs';

const repo = (i, owner = 'lucasfth') => ({ full_name: `${owner}/repo-${i}`, node_id: `${owner}-${i}` });
const connection = nodes => ({ nodes, totalCount: nodes.length, pageInfo: { hasNextPage: false } });
const pull = (number, author = 'someone', assignees = [], reviewers = []) => ({ number, author: { login: author }, title: `PR ${number}`, state: 'OPEN', url: `https://github.com/example/repo/pull/${number}`, assignees: connection(assignees.map(login => ({ login }))), reviewRequests: connection(reviewers.map(login => ({ requestedReviewer: { login } }))) });
function fixture({ repoCount = 1, organizations = [], override } = {}) {
  const calls = [];
  const request = async (path, body) => {
    calls.push({ path, body });
    if (override) { const result = await override(path, body); if (result !== undefined) return result; }
    if (path === '/user') return { login: 'lucasfth' };
    const url = new URL(path, 'https://api.github.com');
    const page = Number(url.searchParams.get('page'));
    const paginate = list => list.slice((page - 1) * 100, page * 100);
    if (url.pathname === '/user/memberships/orgs') return paginate(organizations.map(login => ({ state: 'active', organization: { login } })));
    if (url.pathname === '/user/repos') return paginate(Array.from({ length: repoCount }, (_, i) => repo(i)));
    if (url.pathname.startsWith('/orgs/')) return [repo(1, url.pathname.split('/')[2])];
    if (path === '/graphql') return { data: { nodes: body.variables.ids.map(id => ({ id, pullRequests: connection([]), issues: connection([]), defaultBranchRef: null })) } };
    throw new Error(`Unexpected fixture request: ${path}`);
  };
  return { request, calls };
}

test('repository discovery surfaces all 25 repositories, not the old twelve/twenty cap', async () => {
  const f = fixture({ repoCount: 25, organizations: ['not-hardcoded'] });
  const result = await collectGithub(f);
  assert.equal(result.groups[0].repositories.length, 25);
  assert.deepEqual(result.groups.map(g => g.owner), ['lucasfth', 'not-hardcoded']);
  assert.equal(result.coverage, 'complete');
  assert.equal(f.calls.filter(c => c.path === '/graphql').length, 3);
  assert.ok(f.calls.filter(c => c.body).every(c => c.body.variables.ids.length <= 10));
});

test('membership and repository pagination follow every bounded page and deduplicate', async () => {
  const f = fixture({ repoCount: 101, organizations: Array.from({ length: 101 }, (_, i) => `org-${i}`), override: path => path.includes('/orgs/org-0/repos') ? [repo(1, 'org-0'), repo(1, 'org-0')] : undefined });
  const result = await collectGithub({ ...f, maxRequests: 200 });
  assert.equal(result.groups.length, 102);
  assert.equal(result.groups[0].repositories.length, 101);
  assert.equal(result.groups[1].repositories.length, 1);
  assert.equal(result.coverage, 'complete');
  assert.ok(f.calls.some(c => c.path.includes('/memberships/orgs') && c.path.endsWith('page=2')));
  assert.ok(f.calls.some(c => c.path.includes('/user/repos') && c.path.endsWith('page=2')));
});

test('page caps label lower bounds without silently removing loaded repositories', async () => {
  const result = await collectGithub({ ...fixture({ repoCount: 101 }), maxPages: 1 });
  assert.equal(result.groups[0].repositories.length, 100);
  assert.equal(result.coverage, 'partial');
  assert.equal(githubScope(result.groups[0]).complete, false);
  assert.match(result.limitations.join(' '), /Pagination limit/);
});

test('wrong configured principal cannot masquerade as Lucas membership', async () => {
  const f = fixture({ override: path => path === '/user' ? { login: 'other-principal' } : undefined });
  const result = await collectGithub(f);
  assert.equal(result.status, 'error');
  assert.equal(result.coverage, 'unavailable');
  assert.equal(f.calls.length, 1);
  assert.match(result.message, /not lucasfth/);
});

for (const status of [401, 403, 404, 500]) test(`membership HTTP ${status} is partial, never empty success`, async () => {
  const f = fixture({ override: path => { if (path.includes('/memberships/')) throw Object.assign(new Error('secret upstream detail'), { status }); } });
  const result = await collectGithub(f);
  assert.equal(result.coverage, 'partial');
  assert.match(result.limitations.join(' '), /membership discovery incomplete/);
  assert.doesNotMatch(JSON.stringify(result), /secret upstream detail/);
});

test('rate limit is retained as the stop reason, no further network calls or misleading budget message', async () => {
  const f = fixture({ override: path => { if (path.includes('/memberships/')) throw Object.assign(new Error(), { status: 429 }); } });
  const result = await collectGithub(f);
  assert.equal(f.calls.length, 2);
  assert.equal(result.coverage, 'unavailable');
  assert.match(result.message, /rate limited/);
  assert.doesNotMatch(result.message, /Request budget/);
});

test('repo listing page errors preserve earlier repositories with partial counts', async () => {
  const f = fixture({ repoCount: 101, override: path => { if (path.includes('/user/repos') && path.endsWith('page=2')) throw Object.assign(new Error(), { status: 500 }); } });
  const result = await collectGithub(f);
  assert.equal(result.groups[0].repositories.length, 100);
  assert.equal(result.groups[0].repositoriesComplete, false);
  assert.equal(result.coverage, 'partial');
});

test('network concurrency is one and the total request budget is enforced', async () => {
  let running = 0, peak = 0;
  const f = fixture({ repoCount: 25 });
  const result = await collectGithub({ maxRequests: 4, request: async (...args) => { running++; peak = Math.max(peak, running); try { return await f.request(...args); } finally { running--; } } });
  assert.equal(peak, 1);
  assert.equal(f.calls.length, 4);
  assert.equal(result.coverage, 'partial');
  assert.equal(result.groups[0].repositories.length, 25);
});

test('authored, assigned and explicitly requested reviews form a deduplicated union; All is section-scoped', async () => {
  const pulls = [pull(1, 'LucasFth'), pull(2, 'other', ['LUCASFTH']), pull(3, 'other', [], ['lucasfth']), pull(4), pull(3, 'other', [], ['lucasfth'])];
  const f = fixture({ organizations: ['organization'], override: (path, body) => path === '/graphql' ? { data: { nodes: body.variables.ids.map(id => ({ id, pullRequests: connection(pulls), issues: connection([]), defaultBranchRef: null })) } } : undefined });
  const result = await collectGithub(f);
  const personal = result.groups[0];
  assert.equal(personal.repositories[0].openPulls.length, 4);
  assert.deepEqual(personal.repositories[0].openPulls.filter(relevantPull).map(p => p.number), [1, 2, 3]);
  assert.deepEqual(githubScope(personal), { pulls: 3, reviews: 1, complete: true });
  assert.deepEqual(githubScope(personal, true), { pulls: 4, reviews: 1, complete: true });
  assert.equal(result.openPulls.length, 6);
});

for (const response of [null, {}, { errors: [{ type: 'RATE_LIMITED' }] }, { data: { nodes: [null] } }]) test(`all invalid GraphQL batches ${JSON.stringify(response)} are unavailable not rejected`, async () => {
  const result = await collectGithub(fixture({ override: path => path === '/graphql' ? response : undefined }));
  assert.equal(result.status, 'error');
  assert.equal(result.coverage, 'unavailable');
  assert.match(result.message, /unavailable/);
  assert.equal(result.groups[0].repositories[0].pullsComplete, false);
});

test('PR and reviewer pagination limits never produce complete counts', async () => {
  const p = pull(1);
  p.reviewRequests.pageInfo.hasNextPage = true;
  const result = await collectGithub(fixture({ override: (path, body) => path === '/graphql' ? { data: { nodes: [{ id: body.variables.ids[0], pullRequests: { ...connection([p]), pageInfo: { hasNextPage: true } }, issues: connection([]), defaultBranchRef: null }] } } : undefined }));
  assert.equal(result.coverage, 'partial');
  assert.equal(githubScope(result.groups[0]).complete, false);
});

test('initial null, stale error retained values and new partial successes', async () => {
  const good = await collectGithub(fixture());
  const partial = { ...good, coverage: 'partial' };
  assert.equal(retainSuccessfulPayload(null, { status: 'error' }), null);
  assert.equal(retainSuccessfulPayload(good, { status: 'error' }), good);
  assert.equal(retainSuccessfulPayload(good, partial), partial);
  assert.equal(panelPayloadResult(good, null).error, 'Request failed');
});

test('cache retries errors and rate limits, caches successes for two minutes, single-flights', async () => {
  const ok = await collectGithub(fixture());
  for (const bad of [{ status: 'error' }, { ...ok, coverage: 'partial', limitations: ['GitHub rate limited; coverage incomplete.'] }]) {
    let calls = 0, now = 0;
    const fetchGithub = createGithubCache(async () => ++calls === 1 ? bad : ok, () => now);
    assert.equal(await fetchGithub(), bad);
    assert.equal(await fetchGithub(), ok);
    await Promise.all([fetchGithub(), fetchGithub()]);
    assert.equal(calls, 2);
    now = 120001;
    await Promise.all([fetchGithub(), fetchGithub()]);
    assert.equal(calls, 3);
  }
});

test('dashboard top-line and panel metadata qualify partial scoped counts', () => {
  const source = readFileSync('components/AdminDashboard.tsx', 'utf8');
  assert.equal((source.match(/github!?\.coverage === "complete" \? "" : "at least "/g) ?? []).length, 2);
  assert.match(source, /github!?\.openPulls.length\} PRs for lucasfth/);
  assert.match(readFileSync('lib/admin/sources.ts', 'utf8'), /export const fetchGithub = createGithubCache/);
});

test('all GraphQL reads failing retain last good data and are not cached', async () => {
  const good = await collectGithub(fixture());
  let fail = true;
  const f = fixture({ override: path => { if (fail && path === '/graphql') throw Object.assign(new Error(), { status: 500 }); } });
  const fetchGithub = createGithubCache(() => collectGithub(f));
  const failed = await fetchGithub();
  assert.equal(failed.status, 'error');
  assert.equal(failed.coverage, 'unavailable');
  assert.equal(retainSuccessfulPayload(good, failed), good);
  fail = false;
  assert.equal((await fetchGithub()).coverage, 'complete');
});

test('one valid repository plus one failed batch is partial, preserving independent activity', async () => {
  const f = fixture({ repoCount: 11, override: (path, body) => {
    if (path !== '/graphql') return;
    if (body.variables.ids.includes('lucasfth-10')) throw Object.assign(new Error(), { status: 500 });
  } });
  const result = await collectGithub(f);
  assert.equal(result.status, 'ok');
  assert.equal(result.coverage, 'partial');
  assert.equal(result.groups[0].repositories.filter(repo => repo.pullsComplete).length, 10);
});

test('unavailable PR connection does not discard independent issue/commit data', async () => {
  const result = await collectGithub(fixture({ override: (path, body) => path === '/graphql' ? { data: { nodes: [{ id: body.variables.ids[0], pullRequests: null, issues: connection([{ number: 9, title: 'Recent issue', url: 'https://github.com/example/repo/issues/9', state: 'OPEN', updatedAt: new Date().toISOString() }]), defaultBranchRef: { target: { history: connection([{ oid: 'abcdef0123', messageHeadline: 'Surviving commit', url: 'https://github.com/example/repo/commit/abcdef', committedDate: new Date().toISOString(), author: { name: 'Lucas' } }]) } } }] } } : undefined }));
  assert.equal(result.status, 'ok');
  assert.equal(result.coverage, 'partial');
  assert.equal(result.issues.length, 1);
  assert.equal(result.commits.length, 1);
  assert.equal(result.groups[0].repositories[0].pullsComplete, false);
});

for (const field of ['commits', 'issues', 'assignees', 'reviewRequests']) test(`nullable ${field} preserves siblings with partial coverage`, async () => {
  const p = pull(1, 'lucasfth', ['lucasfth'], ['lucasfth']);
  const history = connection([{ oid: '123456789', messageHeadline: 'Commit', url: 'https://github.com/example/repo/commit/123', committedDate: new Date().toISOString(), author: { name: 'Lucas' } }]);
  const issues = connection([{ number: 9, title: 'Issue', url: 'https://github.com/example/repo/issues/9', state: 'OPEN', updatedAt: new Date().toISOString() }]);
  if (field === 'commits') history.nodes.push(null);
  if (field === 'issues') issues.nodes.push(null);
  if (field === 'assignees') p.assignees.nodes.push(null);
  if (field === 'reviewRequests') p.reviewRequests.nodes.push(null);
  const result = await collectGithub(fixture({ override: (path, body) => path === '/graphql' ? { data: { nodes: [{ id: body.variables.ids[0], pullRequests: connection([p]), issues, defaultBranchRef: { target: { history } } }] } } : undefined }));
  assert.equal(result.status, 'ok');
  assert.equal(result.coverage, 'partial');
  assert.equal(result.commits.length, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.openPulls.length, 1);
});

test('all repository discovery fails as unavailable, valid empty account succeeds', async () => {
  const failed = await collectGithub(fixture({ override: path => { if (path.startsWith('/user/repos')) throw Object.assign(new Error(), { status: 500 }); } }));
  assert.equal(failed.status, 'error');
  assert.equal(failed.coverage, 'unavailable');
  const empty = await collectGithub(fixture({ repoCount: 0 }));
  assert.equal(empty.status, 'ok');
  assert.equal(empty.coverage, 'complete');
});

test('GitHub source errors retain data with separate visible metadata; partial successes are not stale', async () => {
  const { githubRefreshErrorFor } = await import('../lib/admin/dashboard-state.mjs');
  const unavailable = { status: 'error', coverage: 'unavailable', message: 'GitHub membership unavailable.' };
  const previous = { status: 'ok', groups: [] };
  assert.equal(retainSuccessfulPayload(previous, unavailable), previous);
  assert.equal(githubRefreshErrorFor(unavailable), unavailable.message);
  assert.equal(retainSuccessfulPayload(null, unavailable), null);
  assert.equal(githubRefreshErrorFor(null), 'Request failed');
  assert.equal(githubRefreshErrorFor({ status: 'error', message: 123 }), 'Request failed');
  assert.equal(githubRefreshErrorFor({ status: 'ok', coverage: 'partial', message: 'Partial coverage.' }), null);
});
