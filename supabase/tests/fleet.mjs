// Requires an explicitly provided isolated database; never loads .env or production URLs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { safeLabel, validateFleet } from '../../lib/admin/fleet.ts';
const url=process.env.FLEET_TEST_DATABASE_URL;
if(!url)throw Error('Set FLEET_TEST_DATABASE_URL to an isolated migrated test database');
const psql=process.env.FLEET_TEST_PSQL || 'psql';
export function sql(query){return execFileSync(psql,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',url,'-c',query],{encoding:'utf8'}).trim()}
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const report=(change={})=>({schemaVersion:1,hostId:'gimle',sessionId:'a'.repeat(32),label:'Research session',state:'working',observedAt:new Date().toISOString(),lastToolCompletedAt:null,startedAt:new Date(Date.now()-1000).toISOString(),sequence:0,...change});
const query=p=>`set role service_role; select public.fleet_report(${literal(JSON.stringify(p))}::jsonb);`;
const send=p=>sql(query(p));
const reset=()=>sql("truncate public.fleet_sessions; update public.fleet_hosts set last_received_at=null, attempts=0,window_started_at=clock_timestamp();");

test('SQL and TS independently enforce identical trimmed ASCII label bounds',()=>{
 const allowed='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ._-';
 const cases=[
  ['Admin feature',true],['Pi session abc012ef',true],[allowed,true],
  ['a',true],['.',true],['_',true],['-',true],['a'.repeat(80),true],
  ['',false],[' ',false],[' padded',false],['trailing ',false],['a'.repeat(81),false],
  ...['é','中','🐦','\u0301','\u202e','\u200b','\u2028','\u2029','\u00a0','\ufeff'].map(c=>['x'+c+'y',false]),
  ...Array.from({length:255},(_,i)=>{const c=String.fromCharCode(i+1);return ['x'+c+'y',allowed.includes(c)]}),
 ];
 // PostgreSQL UTF-8 cannot represent NUL or unpaired surrogates; TS rejects them separately.
 for(const [value,expected]of cases){
  assert.equal(safeLabel(value),expected,JSON.stringify(value));
  assert.equal(sql(`select public.fleet_safe_label(${literal(value)});`),expected?'t':'f',JSON.stringify(value));
 }
 assert.equal(sql('select public.fleet_safe_label(null);'),'f');
 console.log(`SQL/TS ASCII contract: ${cases.length} independently expected labels plus SQL NULL passed`);
});

test('SQL RLS and RPC grants deny anon/nonadmin browser reads and all writes',()=>{
 for(const role of ['anon','authenticated']){
  for(const statement of ['select * from public.fleet_sessions','select * from public.fleet_hosts','select public.fleet_snapshot()',`select public.fleet_report('{}'::jsonb)`,'delete from public.fleet_sessions'])assert.throws(()=>sql(`set role ${role}; ${statement}`));
 }
 assert.equal(sql("select relrowsecurity from pg_class where oid='public.fleet_sessions'::regclass"),'t');
});

test('SQL RPC rejects malformed payload and unsafe clocks without modifying storage',()=>{
 reset();const p=report();
 for(const changed of [{...p,label:' padded '},{...p,label:'x\u202e'},{...p,label:'é'},{...p,label:'🐦'},{...p,label:'path/name'},{...p,label:'a'.repeat(81)},{...p,raw:'SECRET'},{...p,sequence:null},{...p,observedAt:null},{...p,hostId:'neo'},{...p,sequence:9007199254740992},{...p,observedAt:new Date(Date.now()+60000).toISOString()},{...p,startedAt:new Date(Date.now()-367*86400000).toISOString()}])assert.throws(()=>send(changed));
 assert.equal(sql('select count(*) from public.fleet_sessions'),'0');
});

test('atomic latest rows: sequence/restart ordering, retained completed tool, ended finality',()=>{
 reset();const p=report({lastToolCompletedAt:new Date(Date.now()-2000).toISOString()});
 assert.equal(send(p),'accepted');assert.equal(send(p),'stale');
 assert.equal(send({...p,sequence:1,lastToolCompletedAt:null}),'accepted');
 let data=validateFleet(JSON.parse(sql('set role service_role; select public.fleet_snapshot();')));
 assert.equal(data.hosts.find(h=>h.id==='gimle').sessions[0].lastToolCompletedAt,p.lastToolCompletedAt);
 assert.equal(send({...p,sequence:2,state:'ended'}),'accepted');
 assert.equal(send({...p,sequence:3}),'stale');
 const next={...p,startedAt:new Date(Date.parse(p.startedAt)+100).toISOString(),sequence:0};
 assert.equal(send(next),'accepted');assert.equal(send({...p,sequence:999}),'stale');
});

test('database rate window, row cap, pruning and previous host receipt survive empty retention',()=>{
 reset();const p=report();
 sql("update public.fleet_hosts set attempts=240 where host_id='gimle'");assert.equal(send(p),'limited');
 sql("update public.fleet_hosts set window_started_at=clock_timestamp()-interval '61 seconds' where host_id='gimle'");assert.equal(send(p),'accepted');
 for(let i=1;i<64;i++)assert.equal(send({...p,sessionId:i.toString(16).padStart(32,'0')}),'accepted');
 assert.equal(send({...p,sessionId:'b'.repeat(32)}),'limited');
 sql("update public.fleet_sessions set received_at=clock_timestamp()-interval '8 days'");
 const data=validateFleet(JSON.parse(sql('set role service_role; select public.fleet_snapshot();')));
 const host=data.hosts.find(h=>h.id==='gimle');assert.equal(host.sessions.length,0);assert.ok(host.lastReceivedAt);
 assert.equal(send({...p,state:'ended'}),'accepted');
 sql("update public.fleet_sessions set received_at=clock_timestamp()-interval '25 hours'");
 assert.equal(JSON.parse(sql('set role service_role; select public.fleet_snapshot();')).hosts.find(h=>h.id==='gimle').sessions.length,0);
});

test('parallel database callers cannot overwrite newer sequence or exceed rate budget',async()=>{
 reset();const p=report();const exec=promisify(execFile);
 const run=async v=>(await exec(psql,['-X','-qAt','-v','ON_ERROR_STOP=1','-d',url,'-c',query(v)])).stdout.trim();
 await Promise.all(Array.from({length:20},(_,i)=>run({...p,sequence:i})));
 assert.equal(sql("select sequence from public.fleet_sessions where host_id='gimle'"),'19');
 sql("update public.fleet_hosts set attempts=239 where host_id='gimle'");
 const outcomes=await Promise.all([run({...p,sequence:20}),run({...p,sequence:21}),run({...p,sequence:22})]);
 assert.equal(outcomes.filter(x=>x==='accepted').length,1);assert.equal(outcomes.filter(x=>x==='limited').length,2);
});
