import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Module,createRequire} from 'node:module';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {parseHTML} from 'linkedom';
import swc from 'next/dist/build/swc/index.js';

function load(name,overrides){const file=process.cwd()+`/components/${name}.tsx`;const code=swc.transformSync(readFileSync(file,'utf8'),{filename:file,jsc:{parser:{syntax:'typescript',tsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}}).code;const mod=new Module(file);mod.filename=file;const req=createRequire(file);mod.require=id=>id in overrides?overrides[id]:req(id);mod._compile(code,file);return mod.exports.default;}

async function fixture(run) {
 const {window,document}=parseHTML('<html><body><div id="root"></div></body></html>');
 const keys=['window','document','ResizeObserver','IntersectionObserver','IS_REACT_ACT_ENVIRONMENT'];const previous=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 Object.assign(globalThis,{window,document,IS_REACT_ACT_ENVIRONMENT:true});
 let width=240,height=40,creates=0,destroys=0,reveals=0;const observed=[];
 const motion=new EventTarget();motion.matches=false;window.matchMedia=()=>motion;window.innerHeight=900;
 const fonts=new EventTarget();fonts.ready=new Promise(()=>{});Object.defineProperty(document,'fonts',{value:fonts});
 window.HTMLElement.prototype.getBoundingClientRect=()=>({width,height,top:10,bottom:10+height});
 window.HTMLCanvasElement.prototype.getContext=()=>({});
 globalThis.ResizeObserver=class{constructor(fn){this.fn=fn;observed.push(this)}observe(node){this.node=node;assert.ok(node.isConnected)}disconnect(){this.closed=true}};
 globalThis.IntersectionObserver=class{observe(){}unobserve(){}disconnect(){}};
 const core={presets:{terminal:{}},createAsciiReveal:()=>{creates++;return {destroy(){destroys++},shimmer(){},async reveal(){reveals++}}}};
 const Terminal=load('TerminalReveal',{'next/navigation':{usePathname:()=>'/admin'},'ascii-reveal/core':core});
 const Field=load('AdminField',{'@/components/TerminalReveal':{__esModule:true,default:Terminal}});
 const root=createRoot(document.querySelector('#root'));
 const render=loading=>act(async()=>root.render(React.createElement(Field,{text:'A stable text field',loading})));
 const resize=async(w,h)=>{width=w;height=h;await act(async()=>observed.filter(o=>!o.closed).forEach(o=>o.fn()));};
 try{await run({window,document,motion,render,resize,stats:()=>({creates,destroys,reveals}),observed});}
 finally{await act(async()=>root.unmount());assert.equal(destroys,creates);Object.assign(globalThis,previous);}
}

test('real field and reveal restart loading controller once per geometry change; completed text never replays',()=>fixture(async({render,resize,stats,observed})=>{
 await render(true);const before=stats().creates;
 await resize(320,60);assert.equal(stats().creates,before+1);const active=stats().creates;
 await render(true);await resize(320,60);assert.equal(stats().creates,active,'same props/geometry must not recreate');
 await resize(390,80);assert.equal(stats().creates,active+1);assert.ok(observed.find(o=>!o.closed).node.isConnected);
 await render(false);const settled=stats();await resize(410,100);
 assert.equal(stats().creates,settled.creates,'loaded last-good text must not replay on resize');assert.equal(stats().reveals,settled.reveals);
}));

test('reduced motion at mount skips controllers; enabling it mid-shimmer destroys the active controller',()=>fixture(async({motion,render,stats})=>{
 motion.matches=true;await render(true);assert.equal(stats().creates,0);
 await act(async()=>{motion.matches=false;motion.dispatchEvent(new Event('change'));});
 assert.ok(stats().creates>0);assert.equal(stats().destroys,0);
 await act(async()=>{motion.matches=true;motion.dispatchEvent(new Event('change'));});
 assert.equal(stats().destroys,stats().creates);
}));

test('failed canvas skips loading enhancement, retaining named readable source fallback',()=>fixture(async({window,document,render,stats})=>{
 window.HTMLCanvasElement.prototype.getContext=()=>null;
 await render(true);assert.equal(stats().creates,0);
 assert.equal(document.querySelector('.admin-field-text').textContent,'A stable text field');
 assert.notEqual(document.querySelector('.admin-field-text').getAttribute('aria-hidden'),'true');
 assert.doesNotMatch(readFileSync('app/globals.css','utf8'),/\.admin-field\[data-loading="true"\] \.admin-field-text\s*\{\s*visibility:\s*hidden/);
}));
