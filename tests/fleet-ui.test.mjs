import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, Module } from 'node:module';
import { fileURLToPath } from 'node:url';
import swc from 'next/dist/build/swc/index.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export function renderFleet(data,error,now){
  const file=fileURLToPath(new URL('../components/AdminFleetPanel.tsx',import.meta.url));
  const compiled=swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}}).code;
  const mod=new Module(file);mod.filename=file;mod.require=createRequire(file);mod._compile(compiled,file);
  return renderToStaticMarkup(React.createElement(mod.exports.FleetView,{data,error,now}));
}
const at='2026-10-29T09:00:00.000Z';
const session={schemaVersion:1,hostId:'gimle',sessionId:'a'.repeat(32),label:'Morning research',state:'blocked',observedAt:at,receivedAt:at,lastToolCompletedAt:null,startedAt:at,sequence:0};
const data={schemaVersion:1,readAt:at,hosts:[{id:'gimle',lastReceivedAt:at,sessions:[session]},{id:'macbook',lastReceivedAt:null,sessions:[]}]};
test('static markup shows recognizable labels, references, stale/ended/never-seen and retained failure (not browser proof)',()=>{
  const html=renderFleet(data,true,Date.parse(at)+121000);
  for(const value of ['Morning research','aaaaaaaa','blocked','stale','Never seen','Fleet source unavailable','Source observed','Backend received','Latest completed tool reported','not task progress','Copenhagen time'])assert.ok(html.includes(value),value);
  assert.doesNotMatch(html,/OSC|Herdr|<input|<button|animate-/);
  assert.match(renderFleet({...data,hosts:[{...data.hosts[0],sessions:[{...session,state:'ended'}]},data.hosts[1]]},false,Date.now()),/ended/);
  assert.match(renderFleet(null,false,0),/Checking fleet source/);assert.match(renderFleet(null,true,0),/No fleet observation/);
});
test('shipping source uses authenticated mount and Supabase store, not prototype transport',()=>{
  const dashboard=readFileSync(new URL('../components/AdminDashboard.tsx',import.meta.url),'utf8');
  assert.match(dashboard,/key=\{session.user.id\} token=\{session.access_token\}/);
  const route=readFileSync(new URL('../app/api/admin/fleet/route.ts',import.meta.url),'utf8');
  assert.match(route,/fleet-store/);assert.match(route,/fleetResponse\(req, adminUser/);assert.doesNotMatch(route,/fleet-source/);
});
