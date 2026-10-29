import test from 'node:test';
import assert from 'node:assert/strict';
import { producerHost, reportResponse } from '../lib/admin/fleet-receiver.ts';
const now=Date.parse('2026-10-29T09:00:00.000Z');
const tokens={gimle:'synthetic-gimle-token-0000000000000000',macbook:'synthetic-macbook-token-00000000000000'};
const payload=()=>({schemaVersion:1,hostId:'gimle',sessionId:'a'.repeat(32),label:'Research session',state:'working',observedAt:new Date(now).toISOString(),lastToolCompletedAt:null,startedAt:new Date(now-1000).toISOString(),sequence:0});
const req=(authorization,body=JSON.stringify(payload()),headers={})=>new Request('https://example.test/api/admin/fleet/report',{method:'POST',headers:{...(authorization===null?{}:{authorization}),'content-type':'application/json',...headers},body});

test('producer auth is dedicated, host-bound, fails closed and precedes stream/storage', async()=>{
  for(const header of [null,'Basic abc','bearer '+tokens.gimle,'Bearer bad','Bearer synthetic-admin-token','Bearer '+tokens.macbook]) {
    let writes=0; const response=await reportResponse(req(header),tokens,async()=>{writes++;return 'accepted'},now);
    assert.equal(response.status,header==='Bearer '+tokens.macbook?403:401); assert.equal(writes,0);
  }
  assert.equal(producerHost('Bearer '+tokens.gimle,tokens),'gimle');
  assert.equal(producerHost('Bearer '+tokens.gimle,{gimle:tokens.gimle,macbook:tokens.gimle}),null);
  assert.equal(producerHost('Bearer '+tokens.gimle,{}),null);
  let pulled=false;
  const request={headers:new Headers(),body:{getReader(){pulled=true;throw Error('must not read')}}};
  assert.equal((await reportResponse(request,tokens,async()=>{throw Error()},now)).status,401);assert.equal(pulled,false);
});

test('stream byte limit, exact content, auth status and storage errors stay honest',async()=>{
  let writes=0;const store=async()=>{writes++;return 'accepted'};
  assert.equal((await reportResponse(req('Bearer '+tokens.gimle),tokens,store,now)).status,202);assert.equal(writes,1);
  for(const [body,status] of [['x'.repeat(8193),413],['{',400],[JSON.stringify({...payload(),raw:'SECRET'}),400]])assert.equal((await reportResponse(req('Bearer '+tokens.gimle,body),tokens,store,now)).status,status);
  const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array(4096));c.enqueue(new Uint8Array(4097));c.close()}});
  const streamed=new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer '+tokens.gimle,'content-type':'application/json'},body:stream,duplex:'half'});
  assert.equal((await reportResponse(streamed,tokens,store,now)).status,413);
  for(const [outcome,status]of[['stale',409],['limited',429],['accepted',202]])assert.equal((await reportResponse(req('Bearer '+tokens.gimle),tokens,async()=>outcome,now)).status,status);
  const failed=await reportResponse(req('Bearer '+tokens.gimle),tokens,async()=>{throw Error('SECRET db')},now);
  assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/SECRET/);
});
