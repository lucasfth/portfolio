import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Module,createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

test('real FinancePanel and strip both report FAULT after a failed refresh while showing retained data',()=>{
 const file=process.cwd()+'/components/AdminDashboard.tsx';const code=swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}}).code;
 const mod=new Module(file);mod.filename=file;const require=createRequire(file);
 mod.require=id=>id==='@/components/AdminField'?{__esModule:true,default:({text})=>React.createElement('div',null,text)}:id.startsWith('@/')?{}:require(id);
 mod._compile(code+'\nexports.__Board=Board;exports.__FinancePanel=FinancePanel;',file);
 const finance={generatedAt:'2026-10-29T12:00:00Z',currency:'DKK',total:100,nordea:{balance:100,status:'connected',lastSync:null},saxo:{total:0,asOf:'2026-10-28'},limitations:[]};
 const html=renderToStaticMarkup(React.createElement('div',null,React.createElement(mod.exports.__Board,{cells:[{code:'Finance',state:'error',value:'DKK 100',sub:'partial assets, not net worth',href:'#admin-finance'}]}),React.createElement(mod.exports.__FinancePanel,{finance,error:'HTTP 503',refreshing:false})));
 const {document}=parseHTML(html);
 assert.match(document.querySelector('a').textContent,/FAULT/);
 assert.match(document.querySelector('.admin-panel-header').textContent,/FAULT/);
 assert.match(document.querySelector('#admin-finance').textContent,/DKK\s*100/);
 assert.match(document.querySelector('[role="status"]').textContent,/showing last available data/);
});
