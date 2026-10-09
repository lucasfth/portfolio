#!/usr/bin/env node
const defaults = { base: 'https://lucashanson.dk', timeout: 10_000 };

function usage() {
  return `Usage:
  node cli/index.mjs list [--base URL] [--timeout MS]
  node cli/index.mjs read <path> [--base URL] [--timeout MS]

Read public portfolio content only. Paths must be local, for example /about.`;
}

function fail(message, code = 1) {
  console.error(`Error: ${message}`);
  process.exitCode = code;
}

function parse(args) {
  const options = { ...defaults };
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--base' || arg === '--timeout') {
      const value = args[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      options[arg.slice(2)] = arg === '--timeout' ? Number(value) : value;
    } else if (arg.startsWith('-')) throw new Error(`unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (!Number.isSafeInteger(options.timeout) || options.timeout < 1) throw new Error('--timeout must be a positive integer');
  let base;
  try { base = new URL(options.base); } catch { throw new Error('--base must be an absolute URL'); }
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('--base must be an unauthenticated http(s) URL');
  base.pathname = base.pathname.replace(/\/$/, '');
  base.search = '';
  base.hash = '';
  return { command: positional.shift(), positional, ...options, base: base.href.replace(/\/$/, '') };
}

async function request(url, options, timeout) {
  const signal = AbortSignal.timeout(timeout);
  try { return await fetch(url, { ...options, signal, redirect: 'error' }); }
  catch (error) {
    if (error.name === 'TimeoutError') throw new Error(`request timed out after ${timeout}ms`);
    throw new Error(`request failed: ${error.message}`);
  }
}

async function main() {
  let parsed;
  try { parsed = parse(process.argv.slice(2)); } catch (error) { fail(`${error.message}\n\n${usage()}`, 2); return; }
  if (parsed.help || !parsed.command) { console.log(usage()); return; }
  try {
    if (parsed.command === 'list') {
      if (parsed.positional.length) throw new Error('list takes no arguments');
      const response = await request(`${parsed.base}/mcp`, {
        method: 'POST',
        headers: { Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_pages', arguments: {} } }),
      }, parsed.timeout);
      const body = await response.text();
      if (!response.ok) throw new Error(`server returned ${response.status}: ${body.slice(0, 200)}`);
      const message = JSON.parse(body);
      if (message.error) throw new Error(`MCP error ${message.error.code}: ${message.error.message}`);
      const pages = JSON.parse(message.result?.content?.[0]?.text);
      if (!Array.isArray(pages) || !pages.every(page => typeof page?.path === 'string' && typeof page?.title === 'string')) throw new Error('server returned an invalid page list');
      for (const page of pages) console.log(`${page.path}\t${page.title}`);
      return;
    }
    if (parsed.command === 'read') {
      const [path] = parsed.positional;
      if (!path || parsed.positional.length !== 1 || !/^\/(?!\/)[^?#]*$/.test(path)) throw new Error('read requires one local path such as /about');
      const response = await request(`${parsed.base}${path.endsWith('.md') ? path : `${path}.md`}`, { headers: { Accept: 'text/markdown' } }, parsed.timeout);
      const body = await response.text();
      if (!response.ok) throw new Error(`server returned ${response.status}: ${body.slice(0, 200)}`);
      process.stdout.write(body);
      return;
    }
    throw new Error(`unknown command: ${parsed.command}`);
  } catch (error) { fail(error.message); }
}

await main();
