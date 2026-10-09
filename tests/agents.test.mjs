import assert from 'node:assert/strict';
import test from 'node:test';
import { wantsMarkdown } from '../lib/accept.ts';
import htmlParser from 'next/dist/compiled/node-html-parser/index.js';

// Measure text only. This helper is not an HTML sanitizer.
function contentText(html) {
 const document=htmlParser.parse(html);
 for(const node of document.querySelectorAll('script,style')) node.remove();
 return document.structuredText.replace(/\s+/g,' ').trim();
}
test('HTML text measurement excludes scripts and styles regardless of case',()=>{
 assert.equal(contentText('<H1>Title</H1><SCRIPT>hidden</SCRIPT><style>hidden</style><p>Hello &amp; goodbye</p>'),'Title Hello & goodbye');
 assert.equal(contentText('<p>Visible</p><ScRiPt>unclosed'),'Visible');
});
test('Accept quality negotiation',()=>{
 for(const value of ['text/markdown','text/html;q=0.2,text/markdown']) assert.equal(wantsMarkdown(value),true);
 for(const value of ['','*/*','text/html','text/markdown;q=0','text/html,text/markdown;q=0.5','text/markdown;q=0.5,*/*;q=1','text/markdown;q=0.5,text/*;q=1','text/html;q=0,text/markdown;q=0,*/*;q=1']) assert.equal(wantsMarkdown(value),false);
});
const base=process.env.TEST_BASE_URL;
test('public endpoints and MCP', {skip:!base},async()=>{
 for(const path of ['/','/about','/contact','/privacy','/developers','/projects','/blog','/aperture','/bitcoin','/missing-test','/blog/missing-test']) {
  for(const accept of ['text/markdown','text/html']) {
   const r=await fetch(base+path,{headers:{accept}}), body=await r.text();
   assert.equal(r.status,path.includes('missing-test')?404:200,path);
   assert.match(r.headers.get('content-type'),accept==='text/html'?/^text\/html/:/^text\/markdown/);
   if(accept==='text/markdown'){assert.match(r.headers.get('vary'),/accept/i); assert.match(body,/^# /); assert.ok(body.length>20); if(r.status===404) assert.match(body,/llms.txt/);}
   else if(path.includes('missing-test')) { assert.match(body, /name="viewport"/); assert.match(body, /_next\/static\/.*?\.css/); }
   else if(path==='/') {
    assert.match(body,/application\/ld\+json/);
    const data=JSON.parse(body.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);assert.equal(data['@type'],'Person');
    const text=contentText(body);
    assert.ok(text.length>=500);assert.ok(text.length/body.length>=0.05,`ratio ${text.length/body.length}`);assert.equal((body.match(/<h1\b/g)||[]).length,1);
   }
  }
 }
 for(const path of ['/index.md','/about.md','/llms.txt','/robots.txt','/sitemap.xml','/api/search']) assert.equal((await fetch(base+path)).status,200,path);
 for(const id of ["nature","snow","uni","urban"]) { const r=await fetch(base+"/api/gallery-preview?id="+id);assert.equal(r.status,200);assert.ok((await r.json()).length>=3); }
 assert.equal((await fetch(base+"/api/gallery-preview?id=../private")).status,404);
 for(const path of ["/about","/contact","/privacy"]) { const html=await(await fetch(base+path)).text();assert.ok(contentText(html).length>=500); }
 const search=await(await fetch(base+'/api/search')).json();assert.ok(search.some(p=>p.searchText?.includes('Hermes')));
 const rpc=(message,extra={})=>fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18',...extra},body:JSON.stringify(message)});
 assert.equal((await(await rpc({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'test',version:'1'}}})).json()).result.protocolVersion,'2025-06-18');
 assert.equal((await rpc({jsonrpc:'2.0',method:'notifications/initialized'})).status,202);
 for (const accept of ['application/json;q=0,text/event-stream;q=0','application/json,text/event-stream;q=0']) assert.equal((await rpc({jsonrpc:'2.0',id:8,method:'ping'},{Accept:accept})).status,406);
 assert.equal((await rpc({jsonrpc:'2.0',id:9,method:'ping'},{Accept:'Application/JSON, Text/Event-Stream'})).status,200);
 for(const params of [{protocolVersion:'2025-06-18',capabilities:[],clientInfo:[]},{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{}}]) assert.equal((await(await rpc({jsonrpc:'2.0',id:10,method:'initialize',params})).json()).error.code,-32602);
 const tools=await(await rpc({jsonrpc:'2.0',id:2,method:'tools/list'})).json();assert.deepEqual(tools.result.tools.map(t=>t.name),['list_pages','read_page']);
 const list=await(await rpc({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_pages',arguments:{}}})).json();
 for(const page of JSON.parse(list.result.content[0].text)){
  const r=await fetch(base+page.path,{headers:{Accept:'text/markdown'}});assert.equal(r.status,200,page.path);
  const result=await(await rpc({jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'read_page',arguments:{path:page.path}}})).json();assert.equal(result.result.content[0].text,await r.text());
 }
 assert.equal((await rpc({jsonrpc:'2.0',id:6,method:'ping'},{'MCP-Protocol-Version':'2025-03-26'})).status,200);
 assert.equal((await rpc({jsonrpc:'2.0',id:7,method:'ping'},{'MCP-Protocol-Version':''})).status,200);
 assert.equal((await fetch(base+'/mcp')).status,405);
 assert.equal((await rpc({jsonrpc:'2.0',id:5,method:'ping'},{Origin:'https://attacker.example'})).status,403);
 assert.equal((await rpc({jsonrpc:'2.0',id:5,method:'ping'},{'MCP-Protocol-Version':'wrong'})).status,400);
});
