const LOGIN = 'lucasfth';
const key = value => String(value ?? '').toLowerCase();
const unique = (items, field) => [...new Map(items.map(item => [key(item[field]), item])).values()];

export function relevantPull(pull) {
  return key(pull.author) === LOGIN || pull.assignees.some(login => key(login) === LOGIN) || pull.reviewers.some(login => key(login) === LOGIN);
}

export function githubScope(group, all = false) {
  const pulls = group.repositories.flatMap(repo => repo.openPulls).filter(pull => all || relevantPull(pull));
  return { pulls: pulls.length, reviews: pulls.filter(pull => pull.reviewers.some(login => key(login) === LOGIN)).length, complete: group.repositoriesComplete && group.repositories.every(repo => repo.pullsComplete) };
}

// Ten repositories per request, at most 100 open PRs per repository. Larger
// connections remain explicitly partial rather than presenting exact totals.
const QUERY = `query DashboardRepositories($ids: [ID!]!, $since: GitTimestamp!) {
  nodes(ids: $ids) { ... on Repository {
    id nameWithOwner
    pullRequests(first: 100, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      totalCount pageInfo { hasNextPage }
      nodes { number title url state author { login } assignees(first: 100) { nodes { login } pageInfo { hasNextPage } }
        reviewRequests(first: 100) { nodes { requestedReviewer { ... on User { login } } } pageInfo { hasNextPage } } }
    }
    issues(first: 6, orderBy: {field: UPDATED_AT, direction: DESC}, filterBy: {createdBy: "lucasfth"}) {
      pageInfo { hasNextPage } nodes { number title url state updatedAt }
    }
    defaultBranchRef { target { ... on Commit { history(first: 6, since: $since) {
      pageInfo { hasNextPage } nodes { oid messageHeadline url committedDate author { name } }
    } } } }
  } }
}`;

export async function collectGithub({ request, now = Date.now(), maxRequests = 60, maxPages = 10, deadlineMs = 8_500 }) {
  const started = Date.now();
  let calls = 0;
  let halted = false;
  const limitations = new Set();
  const groups = [];
  const since = new Date(now - 24 * 3600_000).toISOString();
  const empty = () => ({ status: 'error', message: [...limitations].join(' '), windowHours: 24, groups, commits: [], openPulls: [], issues: [], coverage: 'unavailable' });
  async function call(path, body) {
    if (halted) throw new Error('GitHub rate limited; coverage incomplete.');
    if (calls >= maxRequests || Date.now() - started >= deadlineMs) throw new Error('Request budget reached; coverage incomplete.');
    calls++;
    const signal = AbortSignal.timeout(Math.max(1, Math.min(8000, deadlineMs - (Date.now() - started))));
    try {
      return await Promise.race([
        request(path, body, signal),
        new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
      ]);
    }
    catch (error) {
      if (error?.status === 429 || (error?.status === 403 && error?.rateLimited)) { halted = true; throw new Error('GitHub rate limited; coverage incomplete.'); }
      throw new Error(error?.status ? `GitHub HTTP ${error.status}; source unavailable.` : 'GitHub request failed; source unavailable.');
    }
  }
  async function pages(path) {
    const items = [];
    for (let page = 1; page <= maxPages; page++) {
      try {
        const data = await call(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        if (!Array.isArray(data)) throw new Error('Invalid GitHub response; source unavailable.');
        items.push(...data);
        if (data.length < 100) return { items, complete: true };
      } catch (error) { limitations.add(error.message); return { items, complete: false }; }
    }
    limitations.add('Pagination limit reached; coverage incomplete.');
    return { items, complete: false };
  }
  let identity;
  try { identity = await call('/user'); } catch (error) { limitations.add(error.message); return empty(); }
  if (key(identity?.login) !== LOGIN) {
    limitations.add('Configured GitHub identity is not lucasfth; membership discovery unavailable.');
    return empty();
  }
  const memberships = await pages('/user/memberships/orgs?state=active');
  const validMemberships = memberships.items.every(m => m?.state === 'active' && typeof m.organization?.login === 'string');
  if (!validMemberships) { memberships.complete = false; limitations.add('Invalid organization membership response.'); }
  const orgs = unique(memberships.items.filter(m => m?.state === 'active' && typeof m.organization?.login === 'string').map(m => ({ login: m.organization.login })), 'login');
  if (!memberships.complete) limitations.add('Organization membership discovery incomplete.');
  const owners = [{ login: LOGIN, personal: true }, ...orgs.map(org => ({ ...org, personal: false }))];
  const seen = new Set();
  for (const owner of owners) {
    const listed = await pages(owner.personal ? '/user/repos?affiliation=owner&sort=full_name' : `/orgs/${encodeURIComponent(owner.login)}/repos?type=all&sort=full_name`);
    const group = { owner: owner.login, personal: owner.personal, repositoriesComplete: listed.complete, repositories: [], limitations: [] };
    if (!listed.complete) group.limitations.push('Repository discovery incomplete; counts are lower bounds.');
    for (const repo of listed.items) {
      if (typeof repo?.full_name !== 'string' || typeof repo?.node_id !== 'string' || key(repo.full_name.split('/')[0]) !== key(owner.login)) {
        group.repositoriesComplete = false;
        group.limitations.push('Invalid repository entry; discovery incomplete.');
        continue;
      }
      if (seen.has(key(repo.full_name))) continue;
      seen.add(key(repo.full_name));
      group.repositories.push({ name: repo.full_name, id: repo.node_id, pullsComplete: false, activityComplete: false, openPulls: [], commits: [], issues: [] });
    }
    groups.push(group);
  }
  const repositories = groups.flatMap(group => group.repositories);
  let readableRepositories = 0;
  for (let offset = 0; offset < repositories.length; offset += 10) {
    const batch = repositories.slice(offset, offset + 10);
    let response;
    try { response = await call('/graphql', { query: QUERY, variables: { ids: batch.map(repo => repo.id), since } }); }
    catch (error) { limitations.add(error.message); continue; }
    if (!response || typeof response !== 'object') { limitations.add('Some GitHub repository sources unavailable.'); continue; }
    if (response?.errors?.length) {
      limitations.add('Some GitHub repository sources unavailable.');
      if (response.errors.some(error => error.type === 'RATE_LIMITED' || error.extensions?.code === 'RATE_LIMITED')) { halted = true; limitations.add('GitHub rate limited; coverage incomplete.'); }
    }
    for (const repo of batch) {
      const node = response?.data?.nodes?.find(node => node?.id === repo.id);
      const pulls = node?.pullRequests;
      const history = node?.defaultBranchRef?.target?.history;
      const validPulls = Array.isArray(pulls?.nodes);
      const validIssues = Array.isArray(node?.issues?.nodes);
      const validHistory = Boolean(node && (node.defaultBranchRef === null || Array.isArray(history?.nodes)));
      if (validPulls || validIssues || validHistory) readableRepositories++;
      if (!validPulls) limitations.add('Some GitHub PR sources unavailable.');
      else {
        const relationshipsComplete = pulls.nodes.every(p => p && p.assignees?.pageInfo?.hasNextPage === false && p.reviewRequests?.pageInfo?.hasNextPage === false && Array.isArray(p.assignees.nodes) && p.assignees.nodes.every(a => a && typeof a.login === 'string') && Array.isArray(p.reviewRequests.nodes) && p.reviewRequests.nodes.every(r => r && r.requestedReviewer));
        repo.pullsComplete = !response.errors?.length && pulls.pageInfo?.hasNextPage === false && pulls.totalCount === pulls.nodes.length && relationshipsComplete;
        repo.openPulls = unique(pulls.nodes.filter(Boolean), 'number').map(p => ({ repo: repo.name, number: p.number, title: p.title, url: p.url, state: p.state, author: p.author?.login ?? '', assignees: (p.assignees?.nodes ?? []).filter(a => a && typeof a.login === 'string').map(a => a.login), reviewers: (p.reviewRequests?.nodes ?? []).flatMap(r => r?.requestedReviewer?.login ? [r.requestedReviewer.login] : []) }));
      }
      const activityItemsValid = (history?.nodes ?? []).every(c => c && typeof c.oid === 'string') && (node?.issues?.nodes ?? []).every(i => i && typeof i.number === 'number');
      repo.activityComplete = !response.errors?.length && validIssues && validHistory && activityItemsValid;
      repo.commits = (history?.nodes ?? []).filter(c => c && typeof c.oid === 'string').map(c => ({ repo: repo.name, sha: c.oid.slice(0, 7), message: c.messageHeadline, author: c.author?.name ?? '', url: c.url, committed: c.committedDate }));
      repo.issues = (node?.issues?.nodes ?? []).filter(i => i && i.updatedAt >= since).map(i => ({ repo: repo.name, number: i.number, title: i.title, url: i.url, state: i.state }));
    }
  }
  for (const group of groups) {
    if (group.repositories.some(repo => !repo.pullsComplete)) group.limitations.push('Open PR/review coverage incomplete; counts are lower bounds.');
    if (group.repositories.some(repo => !repo.activityComplete)) group.limitations.push('Some commit/issue sources unavailable.');
  }
  if ((repositories.length > 0 && readableRepositories === 0) || (repositories.length === 0 && !groups.some(group => group.repositoriesComplete))) {
    limitations.add('GitHub repository sources unavailable.');
    return empty();
  }
  const partial = !memberships.complete || limitations.size > 0 || groups.some(group => group.limitations.length);
  return { status: 'ok', coverage: partial ? 'partial' : 'complete', message: partial ? 'Partial GitHub coverage; see source notices.' : undefined, limitations: [...limitations], windowHours: 24, groups, commits: repositories.flatMap(repo => repo.commits), openPulls: repositories.flatMap(repo => repo.openPulls).filter(relevantPull), issues: repositories.flatMap(repo => repo.issues) };
}

// Cache only complete/partial successes, never rate-limited or unavailable
// responses. Share the in-flight request to prevent refresh stampedes.
export function createGithubCache(collect, now = Date.now) {
  let hit;
  let flight;
  return async () => {
    if (hit && now() - hit.at < 120_000) return hit.value;
    if (flight) return flight;
    flight = collect().then(value => {
      const rateLimited = value.limitations?.some(message => message.includes('rate limited'));
      if (value.status === 'ok' && !rateLimited) hit = { value, at: now() };
      return value;
    });
    try { return await flight; } finally { flight = undefined; }
  };
}
