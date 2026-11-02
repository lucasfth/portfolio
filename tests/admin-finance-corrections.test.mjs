import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire, Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

// Shipping JSX/callbacks with deterministic state; no external I/O or financial data.
function workspace() {
  const file=fileURLToPath(new URL('../components/AdminFinanceWorkspace.tsx',import.meta.url));
  const req=createRequire(file), mod=new Module(file); mod.filename=file;
  const state=[]; let cursor=0;
  mod.require=name=>name==='react'?{...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}];}}:name==='@/lib/admin/finance.mjs'?req('../lib/admin/finance.mjs'):req(name);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code,file);
  return {render(name,props){cursor=0;return mod.exports[name](props);}};
}
function findAll(node,predicate) {
  if(!node||typeof node!=='object')return [];
  return [...(predicate(node)?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>findAll(child,predicate))];
}
const documentOf=tree=>parseHTML(renderToStaticMarkup(tree)).document;
function change(tree,label,value) {
  const field=findAll(tree,n=>n.type==='label'&&findAll(n,c=>c.type==='span'&&c.props.children===label).length)[0];
  assert.ok(field,`missing field: ${label}`);
  findAll(field,n=>n.type==='input')[0].props.onChange({target:{value}});
}
const outcomes=tree=>[...documentOf(tree).querySelectorAll('article[aria-label$=" scenario"]')].map(n=>n.textContent);

test('FE1-001: three simultaneous separately adjustable scenarios share capital and recover from invalid inputs',()=>{
  const app=workspace(), props={startingCapital:1000};
  let tree=app.render('Future',props);
  const before=outcomes(tree);
  assert.equal(before.length,3,'conservative/base/optimistic outcomes must all be visible');
  for(const [i,label] of ['Conservative','Base','Optimistic'].entries())assert.match(before[i],new RegExp(label));
  change(tree,'Conservative annual return · %','1');
  tree=app.render('Future',props);
  const after=outcomes(tree);
  assert.notEqual(after[0],before[0]);assert.deepEqual(after.slice(1),before.slice(1));
  change(tree,'Monthly addition · DKK','4000');
  tree=app.render('Future',props);
  outcomes(tree).forEach((value,i)=>assert.notEqual(value,after[i]));
  change(tree,'Base annual return · %','');
  tree=app.render('Future',props);
  assert.match(documentOf(tree).querySelector('[role="status"]').textContent,/Enter valid finite assumptions/);
  assert.equal(outcomes(tree).length,0,'do not show stale or partial outcomes as a valid comparison');
  change(tree,'Base annual return · %','5');
  tree=app.render('Future',props);assert.equal(outcomes(tree).length,3);
  change(tree,'Horizon · years','1.5');
  assert.equal(outcomes(app.render('Future',props)).length,0);
});

const performance={status:'available',method:'provider_time_weighted',currency:'DKK',returnUnit:'fraction',cashFlowsComplete:true,from:'2026-01-01',through:'2026-02-01',series:[{date:'2026-01-01',value:.1},{date:'2026-01-02',value:.12},{date:'2026-02-01',value:.21}],accountValues:[{date:'2026-01-01',value:1000},{date:'2026-01-02',value:1200},{date:'2026-02-01',value:1320}],cashFlows:[{date:'2026-01-02',value:100}],securityTransfers:[],limitations:[]};
const benchmark={id:'synthetic',name:'Synthetic total return',currency:'DKK',returnType:'total_return',source:'Synthetic fixture',dividendTreatment:'Reinvested',fxTreatment:'DKK',points:[{date:'2026-01-01',level:100},{date:'2026-01-02',level:102},{date:'2026-02-01',level:110}],limitations:[]};
const finance={total:1000,saxo:{total:1000,cash:0,investments:1000},investments:{performance,history:[]},benchmarks:{series:[benchmark]}};
test('FE1-002: scenario, complete-flow and matched-return charts retain accessible numeric tables',()=>{
  const future=documentOf(workspace().render('Future',{startingCapital:1000}));
  const chart=future.querySelector('svg[aria-label^="Scenario comparison"]');
  assert.ok(chart,'scenario comparison chart');assert.equal(chart.querySelectorAll('polyline').length,3);
  assert.equal(future.querySelectorAll('table').length,3);
  const populated=documentOf(workspace().render('Investments',{finance}));
  const flow=populated.querySelector('svg[aria-label^="Capital, gain/loss and account value"]');
  assert.ok(flow,'complete-flow chart');assert.equal(flow.querySelectorAll('polyline').length,3);
  const matched=populated.querySelector('svg[aria-label^="Matched total returns"]');
  assert.ok(matched,'matched return chart');assert.equal(matched.querySelectorAll('polyline').length,2);
  const lines=[...matched.querySelectorAll('polyline')].map(line=>line.getAttribute('points').split(' '));
  assert.equal(lines[0][0],lines[1][0],'both start at zero on the same scale');
  assert.match(populated.querySelector('table').textContent,/Capital \+ net additions/);
  assert.equal(populated.querySelectorAll('table').length,2);
  for(const bad of [{...performance,cashFlowsComplete:false},{...performance,securityTransfers:undefined}]) {
    const doc=documentOf(workspace().render('Investments',{finance:{...finance,investments:{performance:bad}}}));
    assert.equal(doc.querySelector('svg[aria-label^="Capital, gain/loss and account value"]'),null);
  }
  const noOverlap={...benchmark,points:[{date:'2025-01-01',level:100}]};
  const doc=documentOf(workspace().render('Investments',{finance:{...finance,benchmarks:{series:[noOverlap]}}}));
  assert.equal(doc.querySelector('svg[aria-label^="Matched total returns"]'),null);
});

test('FE1-003: real overview Saxo click opens mode-correct provenance details',()=>{
  const file=fileURLToPath(new URL('../components/AdminDashboard.tsx',import.meta.url));
  const req=createRequire(file), mod=new Module(file); mod.filename=file;
  mod.require=id=>id==='@/lib/admin/finance.mjs'?req('../lib/admin/finance.mjs'):id==='@/lib/admin/detail-content.mjs'?req('../lib/admin/detail-content.mjs'):id.startsWith('@/')?{}:req(id);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code+'\nexports.__FinancePanel=FinancePanel;',file);
  for(const mode of ['live_openapi','manual_statement',undefined]) {
    let detail,opener;const buttonNode={};
    const payload={...finance,currency:'DKK',nordea:{balance:0,accounts:[]},limitations:[],saxo:{...finance.saxo,mode,liveSync:mode==='live_openapi',asOf:'2026-02-01'}};
    const tree=mod.exports.__FinancePanel({finance:payload,error:null,refreshing:false,openDetail:(value,node)=>{detail=value;opener=node;}});
    findAll(tree,n=>n.props?.['aria-label']==='Open Saxo account details')[0].props.onClick({currentTarget:buttonNode});
    assert.equal(opener,buttonNode);
    const saxo=detail.sections.find(s=>s.title.startsWith('Saxo'));
    assert.ok(saxo.fields.some(([label,value])=>label==='Source date'&&value==='2026-02-01'));
    if(mode==='live_openapi') {assert.equal(saxo.title,'Saxo LIVE valuation');assert.match(saxo.notes.join(' '),/not a live trading feed/);assert.doesNotMatch(saxo.notes.join(' '),/Manual statement/);}
    else {assert.equal(saxo.title,'Saxo statement');assert.match(saxo.notes.join(' '),/Manual statement snapshot; not a live account balance/);}
  }
});

test('FE1-004: irregular dates use elapsed time; duplicates retain last supplied observation',()=>{
  const rows=[{asOf:'2026-01-01T00:00:00Z',label:'1 Jan',value:100},{asOf:'2026-01-02T00:00:00Z',label:'2 Jan',value:110},{asOf:'2026-02-01T00:00:00Z',label:'1 Feb',value:120}];
  const app=workspace();
  const doc=documentOf(app.render('ValueChart',{rows}));
  const points=doc.querySelector('polyline').getAttribute('points').split(' ').map(p=>p.split(',').map(Number));
  assert.ok(Math.abs((points[1][0]-points[0][0])/(points[2][0]-points[0][0])-1/31)<1e-10,'Jan 2 must be 1/31 of elapsed interval, not midpoint');
  const investment=documentOf(app.render('Investments',{finance:{...finance,investments:{history:rows.map(p=>({asOf:p.asOf,total:p.value,cash:0,investments:p.value,kind:'valuation_snapshot'}))}}}));
  assert.equal(investment.querySelector('svg[aria-label^="Observed valuation"] polyline').getAttribute('points'),doc.querySelector('polyline').getAttribute('points'),'shipping Investments must pass timestamps, not just formatted date labels');
  const duplicate=documentOf(app.render('ValueChart',{rows:[rows[0],rows[1],{...rows[1],value:115},rows[2]]}));
  assert.equal(duplicate.querySelector('polyline').getAttribute('points').split(' ').length,3);
  assert.match(duplicate.toString(),/115/);assert.doesNotMatch(duplicate.toString(),/>DKK\s*110</);
  assert.match(duplicate.toString(),/last supplied observation/);
  for(const invalid of [[],[rows[0],rows[0]],[{asOf:'invalid',label:'Invalid',value:100},rows[0]]]) {
    const empty=documentOf(app.render('ValueChart',{rows:invalid}));
    assert.equal(empty.querySelector('svg'),null);assert.doesNotMatch(empty.toString(),/NaN|Infinity/);
  }
});
