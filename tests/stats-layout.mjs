// Browser regression runner for the production build; no database credentials required.
// Start Next on 3100, run `node tests/stats-layout.mjs`, then open
// http://localhost:3101/__stats-layout in the approved browser. The page reports
// PASS/FAIL and this server writes the same measurements to STATS_LAYOUT_REPORT.
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';

const upstream = 'http://127.0.0.1:3100';
const fixture = process.env.STATS_LAYOUT_FIXTURE
  ? JSON.parse(await readFile(process.env.STATS_LAYOUT_FIXTURE, 'utf8')) : {
  total: 475, last_1h: 9, last_7d: 379, unique_today: 3,
  first_visit: '2026-10-17T19:33:00Z',
  hourly_48h: Array.from({ length: 48 }, (_, i) => ({
    hour: new Date(Date.now() - (47 - i) * 3600000).toISOString(), count: i % 11,
  })),
  top_paths: [{ name: '/', count: 170 }, { name: '/blog/' + 'long-path-'.repeat(20), count: 1234567 }],
  top_referrers: [{ name: 'portfolio-f5j9mcgpz-lucasfths-projects.vercel.app', count: 4 }],
  top_regions: [{ name: 'Copenhagen', count: 255 }],
  visitor_kinds: { agent: 31, human: 444 },
};

function browserChecks() {
  const results = [];
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const rect = element => element.getBoundingClientRect();
  async function run(frame, theme) {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    // Exercise the actual responsive CSS inside a real viewport. Override only
    // colour-scheme media rules, since nested frames inherit the browser theme.
    for (const sheet of doc.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule.conditionText === '(prefers-color-scheme: light)') {
          rule.media.mediaText = theme === 'light' ? 'all' : 'not all';
        }
      }
    }
    const deadline = Date.now() + 15000;
    while (!doc.querySelector('ol') || !doc.body.textContent.includes('updated ')) {
      check(Date.now() < deadline, 'StatsLive did not load the fixture');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await doc.fonts.ready;
    const targetWidth = Number(frame.dataset.width);
    // Compensate for this site's 10px custom scrollbar, without changing app CSS.
    frame.width = String(targetWidth + win.innerWidth - doc.documentElement.clientWidth);
    await new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));
    const width = doc.documentElement.clientWidth;
    const offenders = [...doc.querySelectorAll('*')].filter(element => rect(element).right > width + 1)
      .map(element => ({ tag: element.tagName, class: element.className,
        text: element.textContent.trim().slice(0, 90), right: rect(element).right }));
    frame.diagnostics = { documentWidth: doc.documentElement.scrollWidth, offenders,
      lists: [...doc.querySelectorAll('ol')].map(list => ({ heading: list.previousElementSibling.textContent,
        left: rect(list).left, right: rect(list).right })) };
    check(width === targetWidth, `expected ${targetWidth}px content viewport, got ${width}`);
    check(offenders.length === 0, 'elements beyond viewport: ' + JSON.stringify(offenders));
    check(doc.documentElement.scrollWidth <= width, 'document horizontal overflow: ' + JSON.stringify(offenders));
    check(doc.body.scrollWidth <= width, 'body horizontal overflow (even if hidden): ' + JSON.stringify(offenders));
    const chart = doc.querySelector('[role="img"]');
    const bounds = rect(chart);
    const metadata = chart.previousElementSibling;
    const heading = metadata.querySelector('h2');
    const range = metadata.querySelector('p');
    check(range.textContent.includes('Cph'), 'chart timezone missing');
    check(rect(range).right <= bounds.right + 1, 'chart metadata outside chart');
    if (width < 640) {
      check(rect(range).top >= rect(heading).bottom - 1, 'mobile chart metadata must be below the heading');
      check(Math.abs(rect(range).left - bounds.left) <= 1, 'mobile chart metadata must align left');
    }
    const lists = [...doc.querySelectorAll('ol')];
    check(lists.length === 3, 'expected three ranked lists');
    for (const list of lists) {
      const listBounds = rect(list);
      check(listBounds.left >= bounds.left - 1 && listBounds.right <= bounds.right + 1, 'ranked list exceeds chart gutters');
      for (const row of list.querySelectorAll('li')) {
        const [name, value] = row.querySelectorAll('span');
        check(rect(value).right <= listBounds.right + 1, 'count outside list');
        check(rect(name).right + 8 <= rect(value).left, 'name overlaps count');
        check(value.scrollWidth <= value.clientWidth + 1, 'count clipped');
      }
    }
    check(doc.body.textContent.includes('Copenhagen'), 'region label missing');
    if (document.body.dataset.stress === 'true') {
      check(doc.body.textContent.includes('1,234,567'), 'large count semantics changed');
      check([...doc.querySelectorAll('span[title]')].some(node => node.title === '/blog/' + 'long-path-'.repeat(20)), 'long-path stress case missing');
    }
    check(chart.children.length === 48, '48 hourly buckets changed');
    return { width, innerWidth: win.innerWidth, theme, offenders, documentWidth: doc.documentElement.scrollWidth,
      bodyWidth: doc.body.scrollWidth, chart: [bounds.left, bounds.right],
      listRight: lists.map(list => rect(list).right), status: 'PASS' };
  }
  window.addEventListener('load', async () => {
    for (const frame of document.querySelectorAll('iframe')) {
      const theme = frame.dataset.theme;
      try { results.push(await run(frame, theme)); }
      catch (error) { results.push({ width: Number(frame.width), theme, status: 'FAIL', ...frame.diagnostics, error: error.message }); }
    }
    const summary = results.every(result => result.status === 'PASS') ? 'PASS' : 'FAIL';
    document.querySelector('pre').textContent = summary + '\n' + JSON.stringify(results, null, 2);
    document.title = summary + ' stats layout';
    await fetch('/__stats-layout/report', { method: 'POST', body: JSON.stringify({ summary, results }) });
    let desktop = false;
    document.querySelector('#charts').addEventListener('click', () => {
      document.querySelector('pre').hidden = true;
      for (const frame of document.querySelectorAll('iframe')) {
        frame.parentElement.style.display = (Number(frame.dataset.width) === 1280) === desktop ? 'inline-block' : 'none';
        if (desktop) frame.height = '500';
        const chart = frame.contentDocument.querySelector('[role="img"]');
        frame.contentWindow.scrollTo(0, chart.getBoundingClientRect().top + frame.contentWindow.scrollY - 80);
      }
      desktop = !desktop;
    });
  });
}

const frames = [320, 390, 1280].flatMap(width => ['light', 'dark'].map(theme =>
  `<section><h2>${width}px ${theme}</h2><iframe title="${width}px ${theme}" width="${width}" height="1100" data-width="${width}" data-theme="${theme}" src="/stats"></iframe></section>`)).join('');
const page = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Running stats layout</title>
<style>body{font:14px monospace;margin:16px}iframe{display:block;border:0}section{display:inline-block;vertical-align:top;margin:0 12px 24px 0}pre{white-space:pre-wrap}</style><body data-stress="${!process.env.STATS_LAYOUT_FIXTURE}">
<h1>Actual /stats: responsive regression matrix</h1><button id="charts">Show charts and lists</button><pre>Running…</pre>${frames}
<script>(${browserChecks.toString()})()</script></html>`;

http.createServer(async (req, res) => {
  try {
    if (req.url === '/__stats-layout') {
      res.writeHead(200, { 'content-type': 'text/html' }); res.end(page); return;
    }
    if (req.url === '/__stats-layout/report' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 20000) throw Error('report too large'); }
      const report = JSON.parse(body);
      if (process.env.STATS_LAYOUT_REPORT) await writeFile(process.env.STATS_LAYOUT_REPORT, JSON.stringify(report, null, 2));
      console.log(JSON.stringify(report));
      res.writeHead(204); res.end(); return;
    }
    if (req.url === '/api/stats/overview') {
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(fixture)); return;
    }
    // Never write test visits or other API data to the upstream.
    if (req.method !== 'GET') { res.writeHead(204); res.end(); return; }
    const response = await fetch(upstream + req.url, { redirect: 'manual' });
    res.writeHead(response.status, { 'content-type': response.headers.get('content-type') || 'application/octet-stream' });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(String(error)); }
}).listen(3101, '127.0.0.1', () => console.log('Stats layout: http://localhost:3101/__stats-layout'));
