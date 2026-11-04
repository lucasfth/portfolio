import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
function traces(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?traces(join(dir,e.name)):e.name.endsWith('.nft.json')?[join(dir,e.name)]:[]);}
test('built traces restrict sentence-model assets to game validation functions',()=>{
  const found=traces('.next/server');assert.ok(found.length>20,'run a real build before this check');
  for(const trace of found){
    const models=JSON.parse(readFileSync(trace,'utf8')).files.filter(f=>f.includes('/lib/game/sentence-model/'));
    if(/\/api\/game\/(play|scores)\/route\.js\.nft\.json$/.test(trace))assert.ok(models.some(f=>f.endsWith('model_q8.onnx')),trace);
    else assert.equal(models.length,0,`${trace} must not carry the game model`);
  }
});
