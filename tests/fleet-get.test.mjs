import test from 'node:test';
import assert from 'node:assert/strict';
import { fleetResponse } from '../lib/admin/fleet-response.ts';
const data={schemaVersion:1,readAt:new Date().toISOString(),hosts:[{id:'gimle',lastReceivedAt:null,sessions:[]},{id:'macbook',lastReceivedAt:null,sessions:[]}]};
test('GET auth matrix authorizes before DB read, tokens never grant reads, retains generic failure',async()=>{
  let reads=0; const read=async()=>{reads++;return data};
  for(const authorization of [null,'Basic x','Bearer invalid','Bearer synthetic-producer-gimle','Bearer synthetic-nonadmin']){
    const req=new Request('https://example.test/api/admin/fleet',{headers:authorization?{authorization}:{}});
    const result=await fleetResponse(req,async r=>r.headers.get('authorization')==='Bearer synthetic-admin'?'admin':null,read);
    assert.equal(result.status,401);assert.equal(reads,0);
  }
  const allowed=await fleetResponse(new Request('https://example.test',{headers:{authorization:'Bearer synthetic-admin'}}),async()=> 'admin',read);
  assert.equal(allowed.status,200); assert.deepEqual(await allowed.json(),data);assert.equal(reads,1);
  const failed=await fleetResponse({},async()=> 'admin',async()=>{throw Error('SECRET DB')});
  assert.equal(failed.status,503);assert.deepEqual(await failed.json(),{error:'Fleet unavailable'});
  for(const response of [allowed,failed])assert.equal(response.headers.get('cache-control'),'private, no-store');
});
