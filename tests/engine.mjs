// Run with:  node tests/engine.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './load-engine.mjs';

const E=loadEngine(['GEOMS','BANK','ANALYSIS','analyzeCase','analysisFor','speciesKey','canon','lig']);
let fails=0;
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);   // arrays from the vm context have another prototype
const test=(name,fn)=>{try{fn();console.log('ok   '+name);}catch(e){fails++;console.log('FAIL '+name+'\n     '+e.message.split('\n').slice(0,6).join('\n     '));}};
const here=path.dirname(fileURLToPath(import.meta.url));

test('every bank formula is unchanged (counts, names, point groups)',()=>{
  const golden=JSON.parse(fs.readFileSync(path.join(here,'golden-bank.json'),'utf8'));
  const now=E.BANK.map(c=>{const A=E.ANALYSIS[c.id];return [c.id,A.stereo,A.geometric,A.pairs,
    A.isomers.map(i=>[i.label,i.sym.plain,i.chiral?1:0,i.trans,i.chir||''].join('|'))];}).sort((a,b)=>a[0]<b[0]?-1:1);
  assert.equal(now.length,golden.length);
  const bad=now.filter((r,i)=>JSON.stringify(r)!==JSON.stringify(golden[i])).map(r=>r[0]);
  same(bad,[],'changed: '+bad.slice(0,5).join(', '));
});

test('tetrahedral R/S works with non-contiguous letters (was hard-coded to A-D)',()=>{
  const A=E.analyzeCase({id:'t1',geom:'Td',mono:'ACDH',chel:[]});
  assert.equal(A.stereo,2); same(A.isomers.map(i=>i.chir).sort(),['R','S']);
});

test('naming hook: lbl renames ligands in isomer names, default is identity',()=>{
  const plain=E.analyzeCase({id:'n1',geom:'Oh',mono:'AAAABB',chel:[]});
  const named=E.analyzeCase({id:'n2',geom:'Oh',mono:'AAAABB',chel:[]},x=>({A:'NH₃',B:'NO₂'}[x]||x));
  same(plain.isomers.map(i=>i.label).sort(),['cis','trans']);
  assert.equal(named.stereo,plain.stereo);
  const t=E.analyzeCase({id:'n3',geom:'Oh',mono:'AABBCC',chel:[]},x=>({A:'NH₃',B:'NO₂',C:'Cl'}[x]));
  assert.ok(t.isomers.some(i=>/NO₂<sub>2<\/sub> trans/.test(i.label)),t.isomers.map(i=>i.label).join(' / '));
  assert.ok(!t.isomers.some(i=>/\b[ABC]<sub>/.test(i.label)));
});

test('analysisFor reuses the bank entry and caches new formulas',()=>{
  const a=E.analysisFor('Oh','AAAABB',[]); assert.equal(a.stereo,2);
  assert.equal(E.analysisFor('Oh','AAAABB',[]),a);
});

console.log(fails?`\n${fails} failed`:'\nall passed'); process.exit(fails?1:0);
