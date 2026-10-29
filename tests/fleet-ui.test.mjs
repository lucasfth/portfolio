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
  for(const value of ['Morning research','aaaaaaaa','Blocked','stale','Never seen','Fleet source unavailable','Source observed','Backend received','Latest completed tool reported','not task progress','Copenhagen time'])assert.ok(html.includes(value),value);
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

test('compiled fleet activity is event-backed, stable active-first, semantic and ended disclosure accessible', async()=>{
  const {parseHTML}=await import('linkedom');
  const live={...session,label:'Active session',state:'working',workingSince:at,toolsInFlight:2};
  const ended={...session,sessionId:'b'.repeat(32),label:'Ended session',state:'ended',workingSince:null,toolsInFlight:0};
  const responding={...live,sessionId:'c'.repeat(32),label:'Responding session',toolsInFlight:0};
  const model={...data,hosts:[{...data.hosts[0],sessions:[ended,live,responding]},data.hosts[1]]};
  const markup=renderFleet(model,false,Date.parse(at));
  const {document}=parseHTML('<html><body>'+markup+'</body></html>');
  assert.match(document.body.textContent,/Running tools/);
  assert.ok(markup.indexOf('Active session')<markup.indexOf('Ended session'));
  assert.ok(markup.indexOf('Active session')<markup.indexOf('Responding session'),'stable same-priority order');
  assert.ok(markup.includes('Working since'));assert.ok(markup.includes('Responding'));
  const disclosure=document.querySelector('details');assert.ok(disclosure);assert.equal(disclosure.hasAttribute('open'),false);assert.match(disclosure.querySelector('summary').textContent,/Ended sessions.*1/);
  assert.ok(document.querySelector('.text-accent'));assert.ok(document.querySelector('[class="text-(--syntax-peach)"]'));
  const stale=renderFleet(model,true,Date.parse(at)+121000);
  assert.ok(stale.includes('Last reported: Running tools'));assert.ok(stale.includes('stale'));assert.ok(stale.includes('Showing last received values'));
  for(const state of ['idle','error','unknown','ended']){const html=renderFleet({...data,hosts:[{...data.hosts[0],sessions:[{...session,state}]},data.hosts[1]]},false,Date.parse(at));assert.ok(html.includes(state==='error'?'text-(--syntax-red)':state==='unknown'?'text-amber-400':'text-muted-foreground'));}
  const malicious=renderFleet({...data,hosts:[{...data.hosts[0],sessions:[{...session,label:'<img src=x onerror=alert(1)>'}]},data.hosts[1]]},false,Date.parse(at));assert.ok(!parseHTML(malicious).document.querySelector('img'));
});

test('compiled fleet labels resolve to Hugi-inspired Mocha and Latte tokens, with stale tones neutral', async()=>{
  const [{parseHTML},{default:postcss},{default:tailwind}]=await Promise.all([import('linkedom'),import('postcss'),import('@tailwindcss/postcss')]);
  const css=await postcss([tailwind()]).process(readFileSync(new URL('../app/globals.css',import.meta.url),'utf8'),{from:fileURLToPath(new URL('../app/globals.css',import.meta.url))});
  const tokens={dark:{},light:{}};const colors=new Map();
  css.root.walkDecls(decl=>{
    if(!decl.parent.selector?.includes(':root'))return;
    let light=false;for(let parent=decl.parent;parent;parent=parent.parent){if(parent.type==='atrule'&&parent.name==='media'&&parent.params.includes('prefers-color-scheme: light'))light=true;}
    tokens[light?'light':'dark'][decl.prop]=decl.value;
  });
  css.root.walkRules(rule=>{
    const color=rule.nodes.find(node=>node.type==='decl'&&node.prop==='color')?.value;
    if(color)colors.set(rule.selector.replace(/\\(.)/g,'$1'),color);
  });
  const cases=[
    ['working',0,at,'Responding','text-accent','#89b4fa','#1e66f5'],
    ['working',2,at,'Running tools','text-(--syntax-peach)','#fab387','#fe640b'],
    ['error',0,null,'Error','text-(--syntax-red)','#f38ba8','#d20f39'],
    ['idle',0,null,'Idle','text-muted-foreground','#a6adc8','#6c6f85'],
    ['unknown',0,null,'Unknown','text-amber-400','#f9e2af','#df8e1d'],
    ['ended',0,null,'Ended','text-muted-foreground','#a6adc8','#6c6f85'],
    ['blocked',0,null,'Blocked','text-amber-400','#f9e2af','#df8e1d'],
    ['done',0,null,'Done (reported)','text-muted-foreground','#a6adc8','#6c6f85'],
    ['working',undefined,undefined,'Working (legacy observation)','text-accent','#89b4fa','#1e66f5'],
  ];
  for(const [state,toolsInFlight,workingSince,label,tone,dark,light] of cases){
    const model={...data,hosts:[{...data.hosts[0],sessions:[{...session,state,toolsInFlight,workingSince}]},data.hosts[1]]};
    for(const [age,ageLabel] of [[0,''],[121000,'stale'],[-31000,'clock-skew']]){
      const qualification=state==='ended'?'':ageLabel;
      const {document}=parseHTML('<html><body>'+renderFleet(model,false,Date.parse(at)+age)+'</body></html>');
      const row=document.querySelector('li');const status=row.querySelector('p > span');
      assert.equal(status.textContent,(qualification?'Last reported: ':'')+label);
      assert.equal(status.className,qualification?'text-muted-foreground':tone,label);
      if(qualification)assert.ok(row.textContent.includes(qualification));
      const variable=colors.get('.'+status.className)?.match(/^var\((--[\w-]+)\)$/)?.[1];
      assert.ok(variable,`compiled CSS utility for ${status.className}`);
      assert.equal(tokens.dark[variable],qualification?'#a6adc8':dark,`${label}: Mocha`);
      assert.equal(tokens.light[variable]??tokens.dark[variable],qualification?'#6c6f85':light,`${label}: Latte`);
    }
  }
});
