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

test('FF-001: hourly null row never poisons successful cache; the next valid provider fetch succeeds',async t=>{
  const source=sources();let providerCalls=0;
  t.mock.method(globalThis,'fetch',async()=>{
    providerCalls++;const body=fixture();if(providerCalls===1)body.weather[0].hourly=[null];
    return Response.json(body);
  });
  const first=await source.fetchWeather();assert.equal(first.status,'error');assert.equal(first.category,'provider-shape');
  const second=await source.fetchWeather();assert.equal(second.status,'ok');assert.equal(providerCalls,2);
  await source.fetchWeather();assert.equal(providerCalls,2,'only validated result is cached');
});
test('FF-001: reject malformed nested precipitation, description and astronomy before caching; recover on the next call',async t=>{
  const mutations=[
    body=>{body.weather[0].hourly={};},
    body=>{body.weather[0].hourly=[{precipMM:'bad'}];},
    body=>{body.weather[0].hourly=[{precipMM:null}];},
    body=>{body.weather[0].hourly=[{precipMM:{}}];},
    body=>{body.weather[0].hourly=[{precipMM:-1}];},
    body=>{body.current_condition[0].weatherDesc={};},
    body=>{body.current_condition[0].weatherDesc=[null];},
    body=>{body.current_condition[0].weatherDesc=[{value:{}}];},
    body=>{body.weather[0].astronomy={};},
    body=>{body.weather[0].astronomy=[null];},
    body=>{body.weather[0].astronomy=[{sunrise:{},sunset:'17:00'}];},
    body=>{body.weather[0].astronomy=[{sunrise:'08:00',sunset:5}];},
  ];
  for(const mutate of mutations) {
    const source=sources();let providerCalls=0;
    t.mock.method(globalThis,'fetch',async()=>{const body=fixture();if(++providerCalls===1)mutate(body);return Response.json(body);});
    const first=await source.fetchWeather();assert.equal(first.status,'error');assert.equal(first.category,'provider-shape');
    assert.doesNotMatch(JSON.stringify(first),/https?:|Weather shape/);
    assert.equal((await source.fetchWeather()).status,'ok');assert.equal(providerCalls,2);
  }
});
test('FF-001: normalize valid nested values and absent optional fields before caching',async t=>{
  const source=sources();let providerCalls=0;const body=fixture();
  body.weather[0].hourly=[{}, {precipMM:'0'}, {precipMM:'0.3'}, {precipMM:2}];
  body.weather[0].astronomy=[{sunrise:'08:00 AM',sunset:'05:00 PM'}];
  t.mock.method(globalThis,'fetch',async()=>{providerCalls++;return Response.json(body);});
  const value=await source.fetchWeather();assert.equal(value.status,'ok');
  assert.equal(value.today.precipHours,2);assert.equal(value.current.desc,'Clear');
  assert.equal(value.today.sunrise,'08:00 AM');assert.equal(value.today.sunset,'05:00 PM');
  assert.deepEqual((await source.fetchWeather()).today,value.today);assert.equal(providerCalls,1);
  const optionalSource=sources();const optional=fixture();delete optional.current_condition[0].weatherDesc;delete optional.weather[0].hourly;delete optional.weather[0].astronomy;
  t.mock.method(globalThis,'fetch',async()=>Response.json(optional));
  const empty=await optionalSource.fetchWeather();assert.equal(empty.status,'ok');
  assert.equal(empty.current.desc,'Unknown');assert.equal(empty.today.precipHours,0);assert.equal(empty.today.sunrise,'');assert.equal(empty.today.sunset,'');
});
