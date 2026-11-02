import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import {renderToStaticMarkup} from 'react-dom/server';
import swc from 'next/dist/build/swc/index.js';

function financePanel() {
  const file=fileURLToPath(new URL('../components/AdminDashboard.tsx',import.meta.url));
  const req=createRequire(file),mod=new Module(file);mod.filename=file;
  mod.require=id=>id.startsWith('@/lib/admin/')&&id.endsWith('.mjs')?req(`../lib/admin/${id.split('/').at(-1)}`):id.startsWith('@/')?{}:req(id);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code+'\nexports.panel=FinancePanel;',file);
  return mod.exports.panel;
}
function find(node,predicate) {
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}
  return null;
}
const observedAt='2026-02-01T09:00:00Z',attemptedAt='2026-02-03T12:00:00Z';
const base={schemaVersion:1,currency:'DKK',generatedAt:'2026-02-03T12:01:00Z',total:1000,mixedDates:true,simIncluded:false,nordea:{balance:0,status:'ok',accounts:[],lastSync:null},saxo:{total:1000,cash:0,investments:1000,asOf:'2026-02-01',mode:'live_openapi',liveSync:false},limitations:[]};
test('overview and real Saxo click distinguish retained/observed source dates from report assembly and Actual matching',()=>{
  const Panel=financePanel();
  for(const status of ['retained','observed']) {
    let detail;const opener={};
    const finance={...base,saxo:{...base.saxo,freshness:{status,observedAt,attemptedAt,quoteTimeVerified:false,diagnostic:'unavailable'},reconciliation:{status:'pending',writesEnabled:false,verified:false,reason:'DO-NOT-ECHO https://private.invalid'}}};
    const tree=Panel({finance,error:null,refreshing:false,openDetail:(d,node)=>{detail=d;assert.equal(node,opener);}});
    const card=find(tree,n=>n.props?.['aria-label']==='Open Saxo account details');
    const html=renderToStaticMarkup(card);
    assert.match(html,/Source observation/);assert.match(html,/2026-02-01T09:00:00Z/);
    assert.doesNotMatch(html,/2026-02-03T12:01/);
    assert.match(html,/Not yet checked against Actual/);assert.match(html,/Saxo updates to Actual are disabled/);
    assert.match(html,status==='retained'?/not refreshed/:/Read succeeded/);
    assert.doesNotMatch(html,/DO-NOT-ECHO|private\.invalid|Live sync/);
    card.props.onClick({currentTarget:opener});
    const section=detail.sections.find(s=>s.title.startsWith('Saxo'));
    assert.match(section.notes.join(' '),/Not yet checked against Actual/);
    assert.match(section.notes.join(' '),/Saxo updates to Actual are disabled/);
    assert.match(section.notes.join(' '),/Market quote time is not verified/);
    assert.match(section.fields.find(([k])=>k==='Source observation')[1],/1 Feb 2026/);
    assert.match(section.fields.find(([k])=>k==='Last read attempt')[1],/3 Feb 2026/);
    assert.doesNotMatch(JSON.stringify(section),/DO-NOT-ECHO|private\.invalid|Live sync/);
  }
});
test('manual, legacy LIVE, missing and invalid freshness remain honest without inventing current observation or write permission',()=>{
  const Panel=financePanel();
  for(const saxo of [{...base.saxo,mode:'manual_statement'},{...base.saxo,liveSync:true},{...base.saxo,freshness:{status:'retained',observedAt:null,attemptedAt},reconciliation:{status:'pending',writesEnabled:false}},{...base.saxo,freshness:{status:'unknown',observedAt:'invalid'}}]) {
    let detail;const tree=Panel({finance:{...base,saxo},error:null,refreshing:false,openDetail:d=>detail=d});
    const card=find(tree,n=>n.props?.['aria-label']==='Open Saxo account details');
    assert.doesNotThrow(()=>renderToStaticMarkup(card));card.props.onClick({currentTarget:{}});
    const section=detail.sections.find(s=>s.title.startsWith('Saxo'));
    assert.ok(section.fields.some(([k,v])=>k==='Source date'&&v==='2026-02-01'));
    assert.doesNotMatch(JSON.stringify(section),/Invalid Date|undefined|reconciled successfully/);
    if(saxo.mode==='manual_statement')assert.match(section.notes.join(' '),/Manual statement/);
    if(!saxo.reconciliation)assert.doesNotMatch(section.notes.join(' '),/updates to Actual are disabled/);
  }
});

test('retained manual statement also warns the latest read was unavailable in overview and detail',()=>{
  let detail;const tree=financePanel()({finance:{...base,saxo:{...base.saxo,mode:'manual_statement',freshness:{status:'retained',observedAt:null,attemptedAt}}},error:null,refreshing:false,openDetail:d=>detail=d});
  const card=find(tree,n=>n.props?.['aria-label']==='Open Saxo account details');
  assert.match(renderToStaticMarkup(card),/not refreshed/);
  card.props.onClick({currentTarget:{}});
  const section=detail.sections.find(s=>s.title.startsWith('Saxo'));
  assert.match(section.notes.join(' '),/latest read was unavailable/);
  assert.equal(section.fields.find(([k])=>k==='Source observation')[1],'Unknown');
  assert.ok(section.fields.some(([k,v])=>k==='Source date'&&v==='2026-02-01'));
});
