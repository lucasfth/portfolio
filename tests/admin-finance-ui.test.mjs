import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import swc from 'next/dist/build/swc/index.js';
const file=fileURLToPath(new URL('../components/AdminFinanceWorkspace.tsx',import.meta.url));
const req=createRequire(file); const mod=new Module(file);mod.filename=file;
mod.require=name=>name==='@/lib/admin/finance.mjs'?req('../lib/admin/finance.mjs'):req(name);
mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code,file);
const render=(name,props)=>renderToStaticMarkup(React.createElement(mod.exports[name],props));
const peers={status:'available',currency:'DKK',unit:'nominal_DKK',statistic:'median',population:'Entire population',asOf:'2024',publishedAt:'2025-11-27',ageGroups:[{id:'2529',text:'25-29 years'}],sexGroups:[{id:'M',text:'Men'}],wealthTypes:[{id:'FGB1',text:'Bank deposits'}],rows:[{wealthType:'FGB1',age:'2529',sex:'M',year:2024,median:100}],limitations:[]};
test('available peers with missing arrays render safe unavailable state, never throw',()=>{
 for(const field of ['rows','ageGroups','sexGroups','wealthTypes']) {
  const invalid={...peers,[field]:undefined};
  assert.doesNotThrow(()=>render('DanishComparison',{finance:{peers:invalid}}));
  assert.match(render('DanishComparison',{finance:{peers:invalid}}),/cohort observations are not loaded/);
 }
});
test('cohorts without official profile options require explicit selection, not an arbitrary wealth fallback',()=>{
 const html=render('DanishComparison',{finance:{peers}});
 assert.match(html,/Financial-assets default unavailable/);
 assert.doesNotMatch(html,/<option value="FGB1" selected="">/);
 assert.match(html,/Choose both age and sex/);
 assert.doesNotMatch(html,/\b100\b/);
});
test('shipping exports render honest no-data investments and local scenarios',()=>{
 assert.match(render('Investments',{finance:null}),/No verified holdings loaded/);
 assert.match(render('Future',{startingCapital:1000}),/scenario, not forecast/);
 assert.match(render('default',{finance:null,overview:React.createElement('p',null,'Overview fixture')}),/Overview fixture/);
});

test('optional extension array drift cannot crash investment or cohort rendering',()=>{
 for(const finance of [
  {benchmarks:{status:'available',series:'invalid'}},
  {investments:{limitations:'invalid',holdings:{},allocation:[],history:[]}},
  {estimate:{total:100,additionalSavings:10,currency:'DKK'}}
 ]) assert.doesNotThrow(()=>render('Investments',{finance:{total:100,nordea:{balance:20},saxo:{total:80,investments:70,cash:10},...finance}}));
 assert.doesNotThrow(()=>render('DanishComparison',{finance:{peers:{...peers,limitations:'invalid'}}}));
});

test('finance overview shortcut has a rendered section target', async () => {
 const {parseHTML}=await import('linkedom');
 const {document}=parseHTML(render('default',{finance:null,overview:React.createElement('p',null,'Overview fixture')}));
 assert.equal(document.querySelector('#admin-finance')?.getAttribute('aria-label'),'Personal finance');
});

// Synthetic report contract; exercise the real sanitizer and shipping Investments JSX.
test('43 conditional values retain adjacent qualification and qualify allocation without claiming verified prices', async () => {
 const {parseHTML}=await import('linkedom');
 const limitation='Indicative + OkWithConditions is displayed only as CONDITIONAL ESTIMATE. Provider conditions are unspecified, not independently verified; quote freshness is unknown.';
 const holdings=Array.from({length:43},(_,i)=>({name:`Synthetic holding ${i}`,assetType:'Stock',currency:'USD',quantity:2,value:100,valuationStatus:'conditional_estimate',valuationEvidence:{source:'MarketValueInBaseCurrency',priceType:'Indicative',calculationReliability:'OkWithConditions',conditionsKnown:false,quoteTimeVerified:false}}));
 const finance={saxo:{total:4320,cash:20,investments:4300},investments:{holdings,allocationBasis:'broker_total_including_cash',allocation:[{assetType:'Stock',value:4300,percent:4300/4320*100},{assetType:'Cash',value:20,percent:20/4320*100}],valuation:{status:'conditional_estimate',conditionalHoldingCount:43,unresolvedHoldingCount:0,residualValue:0},history:[],limitations:[limitation]}};
 const {document}=parseHTML(render('Investments',{finance}));
 const cells=[...document.querySelectorAll('tbody tr td:last-child')];
 assert.equal(cells.length,43);
 assert.ok(cells.every(cell=>/DKK\s*100/.test(cell.textContent)&&cell.querySelector('span')?.textContent==='CONDITIONAL ESTIMATE'));
 const banners=[...document.querySelectorAll('p[role="status"]')];
 assert.equal(banners.length,1);
 assert.equal(banners[0].textContent,'CONDITIONAL ESTIMATE · Provider-supplied indicative holding values, not verified market prices. Conditions are unspecified; quote freshness is unknown. Allocation includes these estimates; aggregate broker equity is retained independently.');
 assert.equal([...document.querySelectorAll('details li')].filter(li=>li.textContent===limitation).length,1);
 assert.match(document.querySelector('h3').textContent,/includes conditional estimates/);
 assert.doesNotMatch(document.toString(),/Verified Saxo holdings/);
 // Residuals remain unresolved even when individual estimates are displayable.
 const {document:unresolved}=parseHTML(render('Investments',{finance:{...finance,investments:{...finance.investments,valuation:{...finance.investments.valuation,status:'unresolved',residualValue:.01}}}}));
 assert.equal(unresolved.querySelectorAll('meter').length,0);
 assert.match(unresolved.querySelector('[role="status"]').textContent,/Holding valuation is unresolved/);
 assert.equal([...unresolved.querySelectorAll('tbody tr td:last-child span')].filter(n=>n.textContent==='CONDITIONAL ESTIMATE').length,43);
});

test('observed zero and unresolved null never receive conditional badges', async () => {
 const {parseHTML}=await import('linkedom');
 const finance={saxo:{total:100,cash:100,investments:0},investments:{holdings:[{name:'Observed zero',assetType:'Stock',currency:'DKK',value:0,valuationStatus:'observed'},{name:'Unresolved',assetType:'Stock',currency:'DKK',value:null,valuationStatus:'unresolved'}],allocation:[],valuation:{status:'unresolved',residualValue:0,unresolvedHoldingCount:1}}};
 const {document}=parseHTML(render('Investments',{finance}));
 const cells=[...document.querySelectorAll('tbody tr td:last-child')];
 assert.match(cells[0].textContent,/DKK\s*0/);
 assert.equal(cells[1].textContent,'Not valued');
 assert.doesNotMatch(document.toString(),/CONDITIONAL ESTIMATE/);
});
