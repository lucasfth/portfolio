import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import swc from 'next/dist/build/swc/index.js';

function sources() {
  const file=fileURLToPath(new URL('../lib/admin/sources.ts',import.meta.url));
  const req=createRequire(file),mod=new Module(file);mod.filename=file;
  mod.require=id=>id==='server-only'?{}:id.startsWith('@/')?{}:req(id);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}}).code,file);
  return mod.exports;
}
const fixture=()=>({current_condition:[{temp_C:'8',FeelsLikeC:'6',windspeedKmph:'10',precipMM:'0',weatherDesc:[{value:'Clear'}]}],weather:[{mintempC:'3',maxtempC:'9',uvIndex:'1',hourly:[],astronomy:[]}]});
test('shipping weather source uses a provider deadline below the complete 10s consumer budget',async t=>{
  const source=sources();let budget,calls=0;
  t.mock.method(AbortSignal,'timeout',ms=>{budget=ms;return new AbortController().signal;});
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json(fixture());});
  const first=await source.fetchWeather();assert.equal(first.status,'ok');assert.equal(first.current.temp,8);
  assert.equal(budget,6000);assert.ok(budget<10000);
  await source.fetchWeather();assert.equal(calls,1,'successful provider reads retain existing cache behavior');
});
test('shipping weather source exposes allowlisted timeout/HTTP/shape/transport categories, no raw errors and recovers',async t=>{
  for(const [expected,reply] of [
    ['timeout',()=>{throw new DOMException('DO-NOT-ECHO https://private.invalid','TimeoutError');}],
    ['provider-http',()=>new Response('DO-NOT-ECHO',{status:503})],
    ['provider-shape',()=>new Response('not-json')],
    ['provider-shape',()=>Response.json({})],
    ['provider-shape',()=>Response.json({...fixture(),current_condition:[{temp_C:'bad'}]})],
    ['transport',()=>{throw new TypeError('DO-NOT-ECHO https://private.invalid');}],
  ]) {
    const source=sources();let fail=true;
    t.mock.method(globalThis,'fetch',async()=>fail?reply():Response.json(fixture()));
    const result=await source.fetchWeather();
    assert.equal(result.status,'error');assert.equal(result.category,expected);
    assert.doesNotMatch(JSON.stringify(result),/DO-NOT-ECHO|https?:|503|wttr/);
    fail=false;assert.equal((await source.fetchWeather()).status,'ok','failed/malformed data must not poison cache');
  }
});
