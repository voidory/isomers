// Run with:  node tests/engine.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './load-engine.mjs';

const E=loadEngine(['GEOMS','BANK','ANALYSIS','analyzeCase','analysisFor','speciesKey','canon','lig','structuralFamily','isoById']);
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

/* ---- structural layer: golden numbers, checked first against a throwaway prototype ---- */
const fam=(geom,mono,chel,...letters)=>E.structuralFamily({geom,mono,chel},letters.map(letter=>({letter})));
const cells=F=>F.rows.map(r=>r.cells.map(c=>c.length));
const golden=[
  ['Oh [M(NH3)4(NO2)2]',     fam('Oh','AAAABB',[],'B'),                3,  6, [[1,1,1],[1,1,1]]],
  ['Oh [M(NH3)3(NO2)3]',     fam('Oh','AAABBB',[],'B'),                4, 10, [[1,1,1,1],[1,2,2,1]]],
  ['Oh [M(en)2(NCS)2]',      fam('Oh','BB',['AA','AA'],'B'),           3,  9, [[1,1,1],[1,1,1],[1,1,1]]],
  ['Td [M(SCN)2XY]',         fam('Td','AABC',[],'A'),                  3,  4, [[1,2,1]]],
  ['SP [M(SCN)2L2]',         fam('SP','AABB',[],'A'),                  3,  6, [[1,1,1],[1,1,1]]],
  ['SP [M(SCN)2LY]',         fam('SP','AABC',[],'A'),                  3,  7, [[1,1,1],[1,2,1]]],
];
for(const [name,F,forms,stereo,mat] of golden) test('family '+name+': '+forms+' forms, '+stereo+' stereoisomers',()=>{
  assert.equal(F.tally.forms,forms); assert.equal(F.tally.stereo,stereo);
  if(mat.length===F.rows.length) same(cells(F),mat);
});

test('family invariants over the whole bank (every monodentate letter, two donors)',()=>{
  const keys=new Set(E.BANK.map(c=>c.geom+':'+E.speciesKey(c.mono||'',c.chel||[]))); let nFam=0, nVar=0;
  for(const c of E.BANK){
    for(const X of new Set(c.mono||'')){
      const F=E.structuralFamily({geom:c.geom,mono:c.mono||'',chel:c.chel||[]},[{letter:X}]); nFam++;
      if(F.tooMany) continue;
      nVar+=F.variants.length;
      assert.equal(F.tally.stereo,F.variants.reduce((t,v)=>t+v.A.stereo,0));
      for(const v of F.variants){
        assert.ok(v.cells.every(x=>x.parent),'projection not total: '+c.id+' '+v.id);                 // every child maps to a parent isomer
        assert.ok(keys.has(c.geom+':'+E.speciesKey(v.formula.mono,v.formula.chel)),'child not in bank: '+v.id);
      }
      // each parent isomer's children, counted across forms, equal the family total
      assert.equal(F.rows.reduce((t,r)=>t+r.cells.reduce((u,x)=>u+x.length,0),0),F.tally.stereo);
    }}
  assert.ok(nFam>=250&&nVar>=600,nFam+' families, '+nVar+' forms');
});

test('linkage can switch chirality on: tetrahedral mixed S/N, never square planar',()=>{
  const td=fam('Td','AABC',[],'A'); assert.equal(td.newChiral.length,2); assert.equal(td.parent.pairs,0);
  for(const c of E.BANK.filter(c=>c.geom==='SP')) for(const X of new Set(c.mono||'')){
    const F=E.structuralFamily({geom:'SP',mono:c.mono||'',chel:c.chel||[]},[{letter:X}]); assert.equal(F.newChiral?.length||0,0);}
});

test('variants name their ligands, and two ambidentate letters multiply',()=>{
  const F=fam('Oh','AABBCC',[],'A','B'); assert.equal(F.tally.forms,9);
  assert.ok(F.variants.some(v=>/A<sup>x<\/sup>/.test(v.title)&&/B<sup>y<\/sup>/.test(v.title)),F.variants[0].title);
  assert.ok(F.variants.some(v=>v.A.isomers.some(i=>/A<sup>x<\/sup><sub>2<\/sub> trans/.test(i.label))),'names carry the donor tag');
  assert.ok(E.structuralFamily({geom:'Oh',mono:'AAAABB',chel:[]},[{letter:'B',donors:[{id:'1',tag:'1'},{id:'2',tag:'2'},{id:'3',tag:'3'}]}]).tally.forms===6);   // C(2+2,2)
  assert.throws(()=>fam('Oh','AAAABB',[],'Z'));
});

console.log(fails?`\n${fails} failed`:'\nall passed'); process.exit(fails?1:0);
