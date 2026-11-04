// Run with:  node tests/engine.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './load-engine.mjs';

const E=loadEngine(['GEOMS','BANK','ANALYSIS','analyzeCase','analysisFor','speciesKey','canon','lig','structuralFamily','isoById','AMBIDENTATE']);
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

/* ---- ionisation and hydrate: which ligands sit inside the sphere ---- */
const pool=(geom,mono,chel,outside,mobile,amb=[])=>E.structuralFamily({geom,mono,chel},amb,{outside,mobile});
test('hydrate isomers CrCl3.6H2O: 4 inner spheres, 6 stereoisomers',()=>{
  const F=pool('Oh','AAAAAA',[],{B:3},['A','B']);             // A = H2O, B = Cl
  assert.equal(F.tally.spheres,4); assert.equal(F.tally.stereo,6);
  same(F.groups.map(g=>g.parent.stereo).sort(),[1,1,2,2]);   // aqua, chloro, dichloro (cis/trans), trichloro (fac/mer)
});
test('ionisation isomers [Co(NH3)5Br]SO4 / [Co(NH3)5(SO4)]Br: 2 inner spheres',()=>{
  const F=pool('Oh','AAAAAB',[],{C:1},['B','C']);            // NH3 stays in; Br and SO4 compete for the sixth site
  assert.equal(F.tally.spheres,2); assert.equal(F.tally.stereo,2);
  assert.ok(F.groups.every(g=>/·/.test(g.innerTitle)),F.groups.map(g=>g.innerTitle).join(' | '));
});
test('MA4B2 with a spare C that may swap in: 2 spheres, 4 stereoisomers',()=>{
  const F=pool('Oh','AAAABB',[],{C:1},['B','C']); assert.equal(F.tally.spheres,2); assert.equal(F.tally.stereo,4);
});
test('a ligand that is not allowed to leave cannot have spares outside; chelates keep their sites',()=>{
  assert.throws(()=>pool('Oh','AAAAAB',[],{C:1},['B']));
  assert.throws(()=>pool('Oh','AAAAAB',[],{B:1},['A']),/./);              // no way to fill six sites
  const F=pool('Oh','BB',['AA','AA'],{C:2},['B','C']); assert.equal(F.sites,2);   // [M(en)2X2] with two spare C
  assert.equal(F.tally.spheres,3);                                          // B2, BC, C2 inside
});
test('linkage and ionisation compose: every sphere gets its own binding forms',()=>{
  const F=pool('Oh','AAAABB',[],{C:1},['B','C'],[{letter:'B'}]);
  assert.equal(F.tally.spheres,2);
  // sphere B2: 3 binding forms; sphere BC: 2 (B bonded x or y)
  same(F.groups.map(g=>g.variants.length).sort(),[2,3]);
  assert.ok(F.variants.every(v=>v.cells.every(x=>x.parent)));
});
test('named ambidentate presets write and draw their own labels',()=>{
  const F=E.structuralFamily({geom:'Oh',mono:'AAAABB',chel:[]},[{letter:'B',donors:E.AMBIDENTATE.NO2.donors}]);
  assert.equal(F.tally.forms,3); assert.ok(F.variants.some(v=>/NO<sub>2<\/sub>/.test(v.title)&&/ONO/.test(v.title)),F.variants.map(v=>v.title).join(' | '));
  const mixed=F.variants.find(v=>/NO₂/.test(JSON.stringify(v.skin))&&/ONO/.test(JSON.stringify(v.skin))); assert.ok(mixed);
  assert.ok(F.variants.every(v=>v.A.isomers.every(i=>!/\bB<sub>/.test(i.label))));
  assert.ok(F.variants.some(v=>v.title.includes('(NO<sub>2</sub>)<sub>2</sub>')),'polyatomic ligand with a count is parenthesised');
});

/* ---- denticity: a ligand bonds through one atom (kappa-1, one site) or two (kappa-2, a chelate, two sites) ---- */
const kappa=(mono,outside,mobile,chelate,amb=[],chel=[])=>E.structuralFamily({geom:'Oh',mono,chel},amb,{outside,mobile,chelate});
test('denticity [M(X)2(NH3)4]: X bonds through one or two atoms, NH3 gives way',()=>{
  const F=kappa('AAAABB',{},['A','B'],['B']);                 // A = NH3, B = X
  assert.equal(F.tally.spheres,4);
  // (k1,k2) of X: 2,0 -> MA4B2 (2) ; 1,1 -> M(AA)A3B (2) ; 0,2 -> M(AA)2A2 (3) ; 0,1 -> M(AA)A4 (1)
  same(F.groups.map(g=>g.parent.stereo).sort(),[1,2,2,3]); assert.equal(F.tally.stereo,8);
  assert.ok(F.groups.every(g=>g.variants.every(v=>v.cells.every(x=>x.parent))));
  assert.ok(F.variants.some(v=>/κ²/.test(v.title)&&/κ¹/.test(v.title)),F.variants.map(v=>v.title).join(' | '));
  assert.ok(F.variants.some(v=>/\(B<sup>κ²<\/sup>\)<sub>2<\/sub>/.test(v.title)),'two kappa-2 copies are written (X^k2)2');
});
test('a kappa-2 ligand needs room: with nothing allowed to leave there is one form',()=>{
  const F=kappa('AAAABB',{},[],['B']); assert.equal(F.tally.spheres,1); assert.equal(F.tally.stereo,2);
});
test('denticity cannot be combined with ambidentate on one ligand, and uses the right site count',()=>{
  assert.throws(()=>kappa('AAAABB',{},['A','B'],['B'],[{letter:'B'}]));
  assert.throws(()=>kappa('AAAABB',{},[],['Z']));
  const F=kappa('AAAABB',{C:1},['A','B','C'],['B']);           // a spare C that can also take a site
  assert.ok(F.tally.spheres>4); assert.equal(F.sites,6);
  for(const g of F.groups){const k=Object.values(g.inner); assert.equal(k.reduce((t,x)=>t+x.k1+2*x.k2,0),6);}   // every sphere is full
});
test('denticity composes with linkage on another ligand',()=>{
  const F=kappa('AAAABB',{},['A','B'],['B'],[{letter:'A'}]);
  assert.ok(F.variants.length>F.groups.length); assert.ok(F.variants.every(v=>v.cells.every(x=>x.parent)));
});

console.log(fails?`\n${fails} failed`:'\nall passed'); process.exit(fails?1:0);
