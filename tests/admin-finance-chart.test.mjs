import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire, Module} from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

function workspace() {
  const file=fileURLToPath(new URL('../components/AdminFinanceWorkspace.tsx',import.meta.url));
  const req=createRequire(file), mod=new Module(file); mod.filename=file;
  const state=[]; let cursor=0;
  mod.require=name=>name==='react'?{...React,useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}];}}:name==='@/lib/admin/finance.mjs'?req('../lib/admin/finance.mjs'):req(name);
  mod._compile(swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code+'\nexports.ComparisonChart=ComparisonChart;',file);
  return {render(name,props){cursor=0;return mod.exports[name](props);}};
}
const documentOf=tree=>parseHTML(renderToStaticMarkup(tree)).document;
function find(node,predicate) {if(!node||typeof node!=='object')return [];return [...(predicate(node)?[node]:[]),...[node.props?.children].flat(Infinity).flatMap(child=>find(child,predicate))];}
const props={label:'Synthetic matched returns',unit:'%',first:'2026-01-01',last:'2026-03-01',series:[{label:'Portfolio',points:[{x:Date.parse('2026-01-01'),value:0},{x:Date.parse('2026-01-10'),value:-5},{x:Date.parse('2026-03-01'),value:12.3456}]},{label:'Benchmark',points:[{x:Date.parse('2026-01-01'),value:0},{x:Date.parse('2026-01-10'),value:-2},{x:Date.parse('2026-03-01'),value:8.9}]}]};

test('chart renders intermediate calendar/percent ticks, zero line and exact end-period figures',()=>{
  const doc=documentOf(workspace().render('ComparisonChart',props));
  assert.ok(doc.querySelectorAll('[data-axis="y"] text').length>=5);
  assert.ok(doc.querySelectorAll('[data-axis="x"] text').length>=4);
  assert.ok(doc.querySelector('[data-zero-reference]'));
  assert.match(doc.querySelector('figure').textContent,/12\.35%/);assert.match(doc.querySelector('figure').textContent,/8\.90%/);
  assert.equal(doc.querySelector('svg').style.minWidth,'');
  const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/\.finance-chart[^}]*min-width:\s*[1-9]/,'no forced plot width');
  assert.match(css,/\.finance-chart-plot > svg\s*\{\s*width: 100%; max-width: 100%;/);
});
test('shipping value lookup supports keyboard and pointer, without interpolation or stale values',()=>{
  const app=workspace();let tree=app.render('ComparisonChart',props);
  const slider=find(tree,n=>n.type==='input'&&n.props.type==='range')[0];assert.ok(slider);
  assert.match(slider.props['aria-valuetext'],/12\.35%/);
  slider.props.onChange({target:{value:'1'}});
  tree=app.render('ComparisonChart',props);
  assert.match(documentOf(tree).querySelector('output').textContent,/10 Jan 2026.*Portfolio.*−5\.00%.*Benchmark.*−2\.00%/);
  const svg=find(tree,n=>n.type==='svg'&&n.props.onPointerMove)[0];assert.ok(svg);
  svg.props.onPointerMove({clientX:720,currentTarget:{getBoundingClientRect:()=>({left:0,width:720})}});
  assert.match(documentOf(app.render('ComparisonChart',props)).querySelector('output').textContent,/12\.35%/);
  const absent={...props,series:[props.series[0],{...props.series[1],points:[props.series[1].points[0]]}]};
  assert.match(documentOf(app.render('ComparisonChart',absent)).querySelector('output').textContent,/No observation/);
});
test('negative and flat ranges stay finite and distinguish years from calendar dates',()=>{
  for(const values of [[-10,-5],[0,0],[100,100]]) {
    const doc=documentOf(workspace().render('ComparisonChart',{...props,series:[{label:'Fixture',points:values.map((value,x)=>({x,value}))}],unit:'DKK',first:'Year 0',last:'Year 1',xAxis:'year'}));
    assert.doesNotMatch(doc.toString(),/NaN|Infinity/);assert.match(doc.querySelector('[data-axis="x"]').textContent,/Yr 0/);assert.match(doc.querySelector('[data-axis="x"]').textContent,/Yr 1/);
    assert.match(doc.querySelector('svg').getAttribute('aria-label'),/Year 0 to Year 1/);assert.match(doc.querySelector('output').textContent,/Year 1/);
    assert.doesNotMatch(doc.querySelector('figure').textContent,/1970/);
  }
});

test('unresolved holdings remain visible without false zero values or allocation percentages',()=>{
  const finance={saxo:{total:1100,cash:100,investments:1000},investments:{holdings:[{name:'Unpriced fixture',currency:'USD',assetType:'Stock',value:null,allocationPercent:null,valuationStatus:'unresolved'}],allocation:[{assetType:'Stock',value:null,percent:null},{assetType:'Unresolved valuation difference',value:1000,percent:null}],valuation:{status:'unresolved',residualValue:1000,unresolvedHoldingCount:1}}};
  const doc=documentOf(workspace().render('Investments',{finance}));
  assert.match(doc.querySelector('table').textContent,/Unpriced fixture.*Not valued/);
  assert.match(doc.querySelector('[role="status"]').textContent,/Unresolved valuation difference/);
  assert.equal(doc.querySelectorAll('meter').length,0);
  assert.doesNotMatch(doc.querySelector('table').textContent,/DKK\s*0/);
});
test('nullable allocation alongside valid allocation only meters valid percentages',()=>{
  const finance={saxo:{total:100,cash:0,investments:100},investments:{holdings:[],allocation:[{assetType:'Known',value:60,percent:60},{assetType:'Unresolved valuation difference',value:40,percent:null}]}};
  const doc=documentOf(workspace().render('Investments',{finance}));
  assert.equal(doc.querySelectorAll('meter').length,1);
  assert.equal(doc.querySelector('meter').getAttribute('value'),'60');
  const row=[...doc.querySelectorAll('li')].find(n=>n.textContent.includes('Unresolved valuation difference'));
  assert.ok(row);assert.doesNotMatch(row.textContent,/%|NaN/);
});

test('private reference-year defaults arrive after loading; unknown sex is all-sex and reset remains local',()=>{
  const peers={status:'available',currency:'DKK',unit:'nominal_DKK',statistic:'median',asOf:'2024',population:'Entire population',publishedAt:'2025-11-27',ageGroups:[{id:'A',text:'18-24 years'},{id:'B',text:'25-29 years'}],sexGroups:[{id:'MOK',text:'Men and women, total'},{id:'M',text:'Men'}],wealthTypes:[{id:'FGB2020',text:'B. Financial assets, total (2020-definition)'},{id:'NW',text:'Net wealth'}],rows:[{age:'A',sex:'MOK',wealthType:'FGB2020',year:2024,median:100}],limitations:[]};
  const finance={peers,profileDefaults:{selectedAge:'A',selectedSex:null,selectedWealthType:null,ageBasis:'end_of_reference_year',referenceYear:2024,ageAtReferenceYear:24,editable:true,persisted:false}};
  const app=workspace();app.render('DanishComparison',{finance:null});
  let tree=app.render('DanishComparison',{finance});
  let selects=find(tree,n=>n.type==='select');assert.deepEqual(selects.map(n=>n.props.value),['A','MOK','FGB2020']);
  selects[0].props.onChange({target:{value:'B'}});tree=app.render('DanishComparison',{finance});
  assert.equal(find(tree,n=>n.type==='select')[0].props.value,'B');
  const reset=find(tree,n=>n.type==='button'&&n.props.children==='Reset to profile defaults')[0];assert.ok(reset);reset.props.onClick();
  tree=app.render('DanishComparison',{finance});assert.equal(find(tree,n=>n.type==='select')[0].props.value,'A');
  const text=documentOf(tree).querySelector('div').textContent;assert.match(text,/end of.*2024/);assert.match(text,/all.sex.*not supplied/i);assert.match(text,/financial assets/i);
  const unavailable={...finance,peers:{...peers,sexGroups:[{id:'M',text:'Men'}],wealthTypes:[{id:'NW',text:'Net wealth'}]}};
  const missing=app.render('DanishComparison',{finance:unavailable});
  assert.deepEqual(find(missing,n=>n.type==='select').map(n=>n.props.value),['A','','']);
  const copy=documentOf(missing).querySelector('div').textContent;assert.match(copy,/All-sex default unavailable/);assert.match(copy,/Financial-assets default unavailable/);assert.doesNotMatch(copy,/Sex cohort: all-sex default|Default wealth definition: financial assets/);
});
test('genuine zero holding and allocation remain observed zero, never unvalued',()=>{
  const finance={saxo:{total:100,cash:0,investments:100},investments:{holdings:[{name:'Zero fixture',currency:'DKK',assetType:'Stock',value:0,quantity:0}],allocation:[{assetType:'Stock',value:0,percent:0}],valuation:{status:'observed',residualValue:0,unresolvedHoldingCount:0}}};
  const doc=documentOf(workspace().render('Investments',{finance}));
  assert.match(doc.querySelector('table').textContent,/Zero fixture.*DKK\s*0/);
  assert.doesNotMatch(doc.querySelector('table').textContent,/Not valued/);
  assert.match(doc.querySelector('li').textContent,/0\.0%/);assert.equal(doc.querySelector('meter').getAttribute('value'),'0');
});
test('cash-inclusive allocation labels the broker-total denominator, explicit or legacy Cash row',()=>{
  for(const allocationBasis of ['broker_total_including_cash',undefined]){
    const finance={saxo:{total:100,cash:20,investments:80},investments:{allocationBasis,holdings:[],allocation:[{assetType:'Cash',value:20,percent:20},{assetType:'ETF',value:80,percent:80}]}};
    const text=documentOf(workspace().render('Investments',{finance})).querySelector('div').textContent;
    assert.match(text,/Allocation · including broker cash, DKK/);assert.match(text,/Percentage denominator: broker total \(investments \+ cash\)/);assert.doesNotMatch(text,/investments only/);
  }
});
test('year ticks use real whole-year observations and include both endpoints',()=>{
  const doc=documentOf(workspace().render('ComparisonChart',{label:'Scenario',unit:'DKK',xAxis:'year',first:'Year 0',last:'Year 20',series:[{label:'Base',points:Array.from({length:21},(_,x)=>({x,value:100+x}))}]}));
  const ticks=[...doc.querySelectorAll('[data-axis="x"] text')].map(n=>n.textContent);
  assert.equal(ticks[0],'Yr 0');assert.equal(ticks.at(-1),'Yr 20');assert.equal(ticks.length,4);
  for(const tick of ticks)assert.match(tick,/^Yr \d+$/,'do not label invented fractional scenario-year observations');
});
