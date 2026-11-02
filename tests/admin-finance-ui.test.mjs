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
test('cohorts require explicit age/sex and default wealth falls back to a real published option',()=>{
 const html=render('DanishComparison',{finance:{peers}});
 assert.match(html,/<option value="FGB1" selected="">Bank deposits/);
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
