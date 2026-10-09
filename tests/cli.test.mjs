import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';

const cli = new URL('../cli/index.mjs', import.meta.url);
function run(...args) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [cli.pathname, ...args]);
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('close', code => resolve({ code, stdout, stderr }));
  });
}

let slow = false;
const server = createServer((request, response) => {
  if (slow) return setTimeout(() => response.end('late'), 100);
  if (request.url === '/mcp' && request.method === 'POST') {
    let body = '';
    request.on('data', chunk => { body += chunk; });
    request.on('end', () => {
      assert.equal(request.headers.accept, 'application/json, text/event-stream');
      assert.equal(request.headers['mcp-protocol-version'], '2025-06-18');
      assert.equal(JSON.parse(body).params.name, 'list_pages');
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: JSON.stringify([{ path: '/about', title: 'About' }]) }] } }));
    });
  } else if (request.url === '/about.md') {
    assert.equal(request.headers.accept, 'text/markdown');
    response.setHeader('Content-Type', 'text/markdown');
    response.end('# About\n');
  } else { response.statusCode = 404; response.end('missing'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

test('list and read use public endpoints via subprocesses', async () => {
  const list = await run('list', '--base', base);
  assert.deepEqual(list, { code: 0, stdout: '/about\tAbout\n', stderr: '' });
  const read = await run('read', '/about', '--base', base);
  assert.deepEqual(read, { code: 0, stdout: '# About\n', stderr: '' });
});

test('help and invalid commands are useful and nonzero where appropriate', async () => {
  assert.match((await run('--help')).stdout, /Usage:/);
  const invalid = await run('read', 'https://example.test', '--base', base);
  assert.equal(invalid.code, 1);
  assert.match(invalid.stderr, /local path/);
  const unknown = await run('remove', '--base', base);
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /unknown command/);
  const badOption = await run('list', '--timeout', 'no');
  assert.equal(badOption.code, 2);
  assert.match(badOption.stderr, /positive integer/);
});

test('HTTP failures and timeouts are nonzero', async () => {
  const missing = await run('read', '/missing', '--base', base);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /server returned 404/);
  slow = true;
  const timedOut = await run('read', '/about', '--base', base, '--timeout', '10');
  slow = false;
  assert.equal(timedOut.code, 1);
  assert.match(timedOut.stderr, /timed out after 10ms/);
});
