import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import swc from 'next/dist/build/swc/index.js';

// Shipping handler compiled with only external publisher/cache dependencies injected.
// This proves ordering and denial behavior, not deployed Next cache invalidation.
const file = fileURLToPath(new URL('../app/api/radar/publish/route.ts', import.meta.url));
function handler(publish, revalidate) {
  const code = swc.transformSync(readFileSync(file, 'utf8'), {filename:file,jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}}).code;
  const native = createRequire(file), mod = new Module(file); mod.filename = file;
  mod.require = name => name === 'server-only' ? {} : name === '@/lib/radar/publisher' ? {publishRadarRequest:publish} : name === 'next/cache' ? {revalidatePath:revalidate} : native(name);
  mod._compile(code,file); return mod.exports.POST;
}
test('successful Supabase publication invalidates only the public Radar page after commit', async () => {
  const events = [], request = {};
  const post = handler(async value => {assert.equal(value,request);events.push('published');return new Response(null,{status:204});}, path => events.push(path));
  assert.equal((await post(request)).status,204);
  assert.deepEqual(events,['published','/radar']);
});
test('denied, invalid and failed publications never invalidate the last-good page', async () => {
  for(const status of [400,401,413,503]) {
    let calls=0;
    const post = handler(async()=>new Response(null,{status}),()=>calls++);
    assert.equal((await post({})).status,status); assert.equal(calls,0);
  }
});
