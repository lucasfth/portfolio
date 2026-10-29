import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
  const disclosure=[...document.querySelectorAll('details')].find(node=>/Ended sessions/.test(node.querySelector('summary').textContent));assert.ok(disclosure);assert.equal(disclosure.hasAttribute('open'),false);assert.match(disclosure.querySelector('summary').textContent,/Ended sessions.*1/);
  assert.ok(document.querySelector('[aria-hidden="true"].bg-accent'));assert.ok(document.querySelector('[aria-hidden="true"].bg-\\(--syntax-peach\\)'));
  const stale=renderFleet(model,true,Date.parse(at)+121000);
  assert.ok(stale.includes('Last reported: Running tools'));assert.ok(stale.includes('stale'));assert.ok(stale.includes('Showing last received values'));
  for(const state of ['idle','error','unknown','ended']){const html=renderFleet({...data,hosts:[{...data.hosts[0],sessions:[{...session,state}]},data.hosts[1]]},false,Date.parse(at));assert.ok(html.includes(state==='error'?'bg-(--syntax-red)':state==='unknown'?'bg-amber-400':'bg-muted-foreground'));}
  const malicious=renderFleet({...data,hosts:[{...data.hosts[0],sessions:[{...session,label:'<img src=x onerror=alert(1)>'}]},data.hosts[1]]},false,Date.parse(at));assert.ok(!parseHTML(malicious).document.querySelector('img'));
});

test('compiled fleet status text meets 4.5 contrast on page/card while decorative accents preserve exact Hugi palette', async()=>{
  const [{parseHTML},{default:postcss},{default:tailwind}]=await Promise.all([import('linkedom'),import('postcss'),import('@tailwindcss/postcss')]);
  const css=process.env.FLEET_TEST_BUILT_CSS==='1'
    ? {root:postcss.parse(readdirSync('.next/static',{recursive:true}).filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/'+f,'utf8')).join('\n'))}
    : await postcss([tailwind()]).process(readFileSync(new URL('../app/globals.css',import.meta.url),'utf8'),{from:fileURLToPath(new URL('../app/globals.css',import.meta.url))});
  const tokens={dark:{},light:{}};const utilities=new Map();let bodyBackground;
  css.root.walkDecls(decl=>{
    if(!decl.parent.selector?.includes(':root'))return;
    let light=false;for(let parent=decl.parent;parent;parent=parent.parent){if(parent.type==='atrule'&&parent.name==='media'&&/prefers-color-scheme:\s*light/.test(parent.params))light=true;}
    tokens[light?'light':'dark'][decl.prop]=decl.value;
  });
  css.root.walkRules(rule=>{
    const declarations=Object.fromEntries(rule.nodes.filter(node=>node.type==='decl').map(node=>[node.prop,node.value]));
    utilities.set(rule.selector.replace(/\\(.)/g,'$1'),declarations);
    if(rule.selector==='body')bodyBackground=declarations['background-color'];
  });
  const resolve=(value,mode)=>{
    const variable=value?.match(/^var\((--[\w-]+)\)$/)?.[1];
    const result=variable?(tokens[mode][variable]??tokens.dark[variable]):value;
    assert.match(result??'',/^#[\da-f]{6}$/i,`compiled ${mode} color ${value}`);return result;
  };
  const property=(node,name)=>{
    const values=[...node.classList].map(cls=>utilities.get('.'+cls)?.[name]).filter(Boolean);
    assert.equal(values.length,1,`one explicit ${name} on ${node.className}`);return values[0];
  };
  const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>{const c=parseInt(v,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  const ratios={};
  const cases=[
    ['working',0,at,'Responding','bg-accent','#89b4fa','#1e66f5'],
    ['working',2,at,'Running tools','bg-(--syntax-peach)','#fab387','#fe640b'],
    ['error',0,null,'Error','bg-(--syntax-red)','#f38ba8','#d20f39'],
    ['idle',0,null,'Idle','bg-muted-foreground','#a6adc8','#6c6f85'],
    ['unknown',0,null,'Unknown','bg-amber-400','#f9e2af','#df8e1d'],
    ['ended',0,null,'Ended','bg-muted-foreground','#a6adc8','#6c6f85'],
    ['blocked',0,null,'Blocked','bg-amber-400','#f9e2af','#df8e1d'],
    ['done',0,null,'Done (reported)','bg-muted-foreground','#a6adc8','#6c6f85'],
    ['working',undefined,undefined,'Working (legacy observation)','bg-accent','#89b4fa','#1e66f5'],
  ];
  for(const [state,toolsInFlight,workingSince,label,tone,dark,light] of cases){
    const model={...data,hosts:[{...data.hosts[0],sessions:[{...session,state,toolsInFlight,workingSince}]},data.hosts[1]]};
    for(const [age,ageLabel] of [[0,''],[121000,'stale'],[-31000,'clock-skew']]){
      const qualification=state==='ended'?'':ageLabel;
      const {document}=parseHTML('<html><body>'+renderFleet(model,false,Date.parse(at)+age)+'</body></html>');
      const row=document.querySelector('li');const status=row.querySelector('p > span');
      assert.equal(status.textContent,(qualification?'Last reported: ':'')+label);
      if(qualification)assert.ok(row.textContent.includes(qualification));
      for(const mode of ['light','dark']){
        const foreground=resolve(property(status,'color'),mode);
        for(const [surface,value] of [['page',bodyBackground],['card',utilities.get('.bg-card')?.['background-color']]]){
          const background=resolve(value,mode);
          assert.equal(background,mode==='dark'?(surface==='page'?'#1e1e2e':'#181825'):(surface==='page'?'#eff1f5':'#e6e9ef'));
          const ratio=contrast(foreground,background);
          assert.ok(ratio>=4.5,`${label} ${qualification} ${mode} on ${surface}: ${foreground}/${background} = ${ratio.toFixed(3)} must be >=4.5`);
          ratios[mode+' '+surface]=Number(ratio.toFixed(3));
        }
        assert.equal(foreground,mode==='dark'?'#cdd6f4':'#4c4f69');
      }
      assert.ok(status.classList.contains('text-foreground'));
      const swatch=status.querySelector('[aria-hidden="true"]');assert.ok(swatch,'decorative activity swatch');
      assert.equal(swatch.textContent,'');assert.equal(swatch.childElementCount,0);
      assert.ok(swatch.classList.contains('size-2'));assert.ok(swatch.classList.contains('inline-block'));
      assert.ok(swatch.classList.contains(qualification?'bg-muted-foreground':tone));
      assert.equal(property(swatch,'width'),'calc(var(--spacing) * 2)');
      assert.equal(property(swatch,'height'),'calc(var(--spacing) * 2)');
      assert.equal(resolve(property(swatch,'background-color'),'dark'),qualification?'#a6adc8':dark);
      assert.equal(resolve(property(swatch,'background-color'),'light'),qualification?'#6c6f85':light);
    }
  }
  console.log('Status text contrast (all states/qualifications): '+JSON.stringify(ratios));
});
