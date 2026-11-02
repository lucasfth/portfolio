import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import swc from 'next/dist/build/swc/index.js';

function sources(githubModule) {
  const file=fileURLToPath(new URL('../lib/admin/sources.ts',import.meta.url));
  const req=createRequire(file),mod=new Module(file);mod.filename=file;
  mod.require=id=>id==='server-only'?{}:id==='./github.mjs'&&githubModule?githubModule:id.startsWith('@/')?{}:req(id);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript'}},module:{type:'commonjs'}}).code,file);
  return mod.exports;
}
const now=Date.parse('2026-11-02T00:10:00Z'); // Copenhagen is already Nov 2; tests cannot use the machine's date.
const fixture=()=>({timezone:'Europe/Copenhagen',current:{time:now/1000-300,interval:900,temperature_2m:8,apparent_temperature:6,precipitation:0,weather_code:3,wind_speed_10m:10},current_units:{time:'unixtime',interval:'seconds',temperature_2m:'°C',apparent_temperature:'°C',precipitation:'mm',weather_code:'wmo code',wind_speed_10m:'km/h'},daily:{time:[now/1000-3600],temperature_2m_min:[3],temperature_2m_max:[9],uv_index_max:[1],sunrise:[Date.parse('2026-11-02T06:30:00Z')/1000],sunset:[Date.parse('2026-11-02T15:30:00Z')/1000],precipitation_hours:[2.5]},daily_units:{time:'unixtime',temperature_2m_min:'°C',temperature_2m_max:'°C',uv_index_max:'',sunrise:'unixtime',sunset:'unixtime',precipitation_hours:'h'}});

test('Open-Meteo single bounded request maps units, model source time, Copenhagen date and attribution before caching',async t=>{
  t.mock.method(Date,'now',()=>now);let calls=0,budget,url;
  t.mock.method(AbortSignal,'timeout',ms=>{budget=ms;return new AbortController().signal;});
  t.mock.method(globalThis,'fetch',async input=>{calls++;url=new URL(input);return Response.json(fixture());});
  const source=sources(),first=await source.fetchWeather();
  assert.equal(first.status,'ok');assert.equal(url.host,'api.open-meteo.com');assert.equal(url.searchParams.get('timezone'),'Europe/Copenhagen');assert.equal(url.searchParams.get('timeformat'),'unixtime');
  assert.equal(budget,6000);assert.equal(first.current.temp,8);assert.equal(first.current.wind,10);assert.equal(first.current.desc,'Overcast');
  assert.equal(first.today.precipHours,2.5);assert.equal(first.today.sunrise,'07:30');assert.equal(first.today.sunset,'16:30');assert.equal(first.forecastDate,'2026-11-02');
  assert.equal(first.updated,new Date(now-300000).toISOString());assert.match(first.source,/Open-Meteo/);assert.match(first.freshness,/Model-based/);
  const sourceTime=first.updated;t.mock.method(Date,'now',()=>now+30000);assert.equal((await source.fetchWeather()).updated,sourceTime);assert.equal(calls,1);
});
test('safe unavailable/timeout/HTTP/malformed categories never poison cache; next valid fetch succeeds',async t=>{
  t.mock.method(Date,'now',()=>now);
  const mutations=[
    b=>{b.current=null;},b=>{b.daily=null;},b=>{b.daily.precipitation_hours=[null];},b=>{b.daily.sunrise=[{}];},b=>{b.daily.sunset=[];},b=>{b.daily.time=[null];},b=>{b.current.temperature_2m='8';},b=>{b.current.weather_code={};},b=>{b.current.precipitation=-1;},b=>{b.current.wind_speed_10m=-2;},b=>{b.daily.precipitation_hours=[25];},b=>{b.current_units.wind_speed_10m='m/s';},b=>{b.daily_units.sunrise='iso8601';},b=>{b.timezone='UTC';},b=>{b.daily.time=[now/1000-86400];},b=>{b.current.time=now/1000-7200;},b=>{b.current.time=now/1000+7200;},
  ];
  const cases=[['timeout',()=>{throw new DOMException('PRIVATE https://private.invalid','TimeoutError');}],['transport',()=>{throw new TypeError('PRIVATE');}],['provider-http',()=>new Response('PRIVATE',{status:429})],['provider-http',()=>new Response('PRIVATE',{status:503})],['provider-shape',()=>new Response('not json')],...mutations.map(mutate=>['provider-shape',()=>{const b=fixture();mutate(b);return Response.json(b);}])];
  for(const [category,reply] of cases) {
    const source=sources();let calls=0;
    t.mock.method(globalThis,'fetch',async()=>++calls===1?reply():Response.json(fixture()));
    const first=await source.fetchWeather();assert.equal(first.status,'error');assert.equal(first.category,category);assert.doesNotMatch(JSON.stringify(first),/PRIVATE|https?:|429|503/);
    assert.equal((await source.fetchWeather()).status,'ok');assert.equal(calls,2,'FF-001 equivalent nested null must retry provider');
    await source.fetchWeather();assert.equal(calls,2,'only validated converted payload is cached');
  }
});
test('unknown WMO code is honest Unknown, never raw provider text; summer Copenhagen date/clock use timezone not fixed offset',async t=>{
  const summer=Date.parse('2026-06-01T22:10:00Z');t.mock.method(Date,'now',()=>summer);
  const body=fixture();body.current.time=summer/1000-300;body.current.weather_code=999;body.daily.time=[summer/1000];body.daily.sunrise=[Date.parse('2026-06-02T02:30:00Z')/1000];body.daily.sunset=[Date.parse('2026-06-02T19:30:00Z')/1000];
  t.mock.method(globalThis,'fetch',async()=>Response.json(body));const value=await sources().fetchWeather();
  assert.equal(value.status,'ok');assert.equal(value.current.desc,'Unknown');assert.equal(value.forecastDate,'2026-06-02');assert.equal(value.today.sunrise,'04:30');
});

test('shipping source binds personal env mode without accessing or supplying token values',async t=>{
  // Stub only the collector boundary: no token/env values inspected or changed.
  let selection;const source=sources({createGithubCache:fn=>fn,collectGithub:async options=>{selection=options.scope;return {status:'ok'};}});
  await source.fetchGithub();
  assert.equal(selection,process.env.GITHUB_ADMIN_SCOPE==='personal'?'personal':'all');
  assert.match(readFileSync(new URL('../lib/admin/sources.ts',import.meta.url),'utf8'),/scope: process\.env\.GITHUB_ADMIN_SCOPE === "personal"/);
});
