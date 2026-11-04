// Run with:  node tests/engine.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './load-engine.mjs';

const E=loadEngine(['GEOMS','BANK','ANALYSIS','analyzeCase','analysisFor','speciesKey','canon','lig','structuralFamily','isoById','AMBIDENTATE','berrySets','berryMoves','berryOf','berryWhy','permParity','berryStep','berryPose','applyCfg']);
let fails=0;
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);   // arrays from the vm context have another prototype
const test=(name,fn)=>{try{fn();console.log('ok   '+name);}catch(e){fails++;console.log('FAIL '+name+'\n     '+e.message.split('\n').slice(0,6).join('\n     '));}};
const here=path.dirname(fileURLToPath(import.meta.url));

test('every original bank formula is unchanged (counts, names, point groups)',()=>{
  const golden=JSON.parse(fs.readFileSync(path.join(here,'golden-bank.json'),'utf8')), byId=new Map(E.BANK.map(c=>[c.id,c]));
  const bad=[]; for(const g of golden){const c=byId.get(g[0]); if(!c){bad.push(g[0]+' missing');continue;}
    const A=E.ANALYSIS[c.id], r=[c.id,A.stereo,A.geometric,A.pairs,A.isomers.map(i=>[i.label,i.sym.plain,i.chiral?1:0,i.trans,i.chir||''].join('|'))];
    if(JSON.stringify(r)!==JSON.stringify(g)) bad.push(g[0]);}
  same(bad,[],'changed: '+bad.slice(0,5).join(', ')); assert.equal(golden.length,248);
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

/* ---- the trigonal bipyramid: static configurations ---- */
const tbp=E.BANK.filter(c=>c.geom==='TBP');
test('TBP has 39 formulas, all analysable',()=>{ assert.equal(tbp.length,39); assert.ok(tbp.every(c=>E.ANALYSIS[c.id].isomers.length>0)); });
test('TBP static counts for monodentates: 1, 2, 3, 4, 6, 10, 20 (the permutation count 5!/6)',()=>{
  const n=m=>E.analyzeCase({id:'x'+m,geom:'TBP',mono:m,chel:[]}).stereo;
  same(['AAAAA','AAAAB','AAABB','AAABC','AABBC','AABCD','ABCDE'].map(n),[1,2,3,4,6,10,20]);
});
test('TBP chelates span axial-equatorial sites only, symmetrically',()=>{
  same(E.GEOMS.TBP.edges,[[0,2],[0,3],[0,4],[1,2],[1,3],[1,4]]);
  for(const g of ['Td','SP','Oh']) assert.ok(E.GEOMS[g].edges.length>0);
});
test('TBP isomers are named by axial and equatorial occupancy, uniquely',()=>{
  for(const c of tbp){const A=E.ANALYSIS[c.id], seen=new Set();
    for(const grp of A.groups){const l=grp[0].label; assert.ok(!/fac|mer|cis|trans/.test(l.replace(/<[^>]+>/g,'').replace(/trans pairs?/,'')),c.id+': '+l); assert.ok(!seen.has(l),c.id+': duplicate label '+l); seen.add(l);}}
});
test('every TBP formula matches the golden file (counts, names, point groups)',()=>{
  const now=tbp.map(c=>{const A=E.ANALYSIS[c.id];return [c.id,A.stereo,A.geometric,A.pairs,A.isomers.map(i=>[i.label,i.sym.plain,i.chiral?1:0,i.trans,i.chir||''].join('|'))];}).sort((a,b)=>a[0]<b[0]?-1:1);
  const f=path.join(here,'golden-tbp.json'); if(!fs.existsSync(f)||process.env.UPDATE_GOLDEN){fs.writeFileSync(f,JSON.stringify(now));console.log('     (wrote golden-tbp.json)');}
  same(now,JSON.parse(fs.readFileSync(f,'utf8')));
});

test('the structural layer works on the trigonal bipyramid: linkage, ionisation and denticity',()=>{
  let n=0;
  for(const c of tbp){ for(const X of new Set(c.mono||'')){ const base={geom:'TBP',mono:c.mono||'',chel:c.chel||[]};
    for(const F of [E.structuralFamily(base,[{letter:X}]), E.structuralFamily(base,[],{mobile:[...new Set(c.mono)],chelate:[X]})]){
      if(F.tooMany) continue; n++;
      assert.ok(F.variants.every(v=>v.cells.every(x=>x.parent)),'projection total: '+c.id);
      assert.ok(F.groups.every(g=>Object.values(g.inner).reduce((t,k)=>t+k.k1+2*k.k2,0)===F.sites),'sphere full: '+c.id);}}}
  assert.ok(n>20,n+' families');
  const F=E.structuralFamily({geom:'TBP',mono:'AAAAB',chel:[]},[{letter:'A'}]); assert.equal(F.tally.forms,5);
});

/* ---- Berry pseudorotation ---- */
const sizes=B=>B.sets.map(x=>x.isos.length).sort((a,b)=>b-a);
test('Berry moves are derived from the shape: 4-cycles of sites, the double swap followed by a mirror',()=>{
  const G=E.GEOMS.TBP, mv=E.berryMoves(G); assert.equal(mv.length,6);
  assert.ok(mv.every(m=>E.permParity(m.perm)===1));                      // odd: a 4-cycle, not the (even) double swap
  assert.ok(mv.every(m=>m.perm[m.pivot]===m.pivot&&m.perm.filter((x,i)=>x!==i).length===4));
  // an inverse is present for every move (the two senses of a pivot)
  for(const m of mv){const inv=[];m.perm.forEach((j,i)=>inv[j]=i); assert.ok(mv.some(o=>o.pivot===m.pivot&&JSON.stringify(o.perm)===JSON.stringify(inv)));}
  // = the double swap (ax1 u)(ax2 v) then the mirror that swaps the axial pair
  const [a0,a1]=G.axial; for(const p of G.equatorial){const [i,j]=G.equatorial.filter(x=>x!==p);
    const found=[[i,j],[j,i]].some(([u,v])=>{const sw=G.sites.map((_,k)=>k);sw[a0]=u;sw[u]=a0;sw[a1]=v;sw[v]=a1;
      const full=sw.map(x=>x===a0?a1:x===a1?a0:x); return mv.some(m=>m.pivot===p&&JSON.stringify(m.perm)===JSON.stringify(full));});
    assert.ok(found,'pivot '+p);}
  assert.equal(E.berryMoves(E.GEOMS.Oh).length,0);
});
test('Berry path: starts on the trigonal bipyramid, ends turned a quarter, midpoint is a square pyramid',()=>{
  const G=E.GEOMS.TBP, ang=(a,b)=>Math.round(Math.acos(Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])))*180/Math.PI);
  const U=G.sites.map(s=>{const l=Math.hypot(...s);return s.map(x=>x/l);});
  E.berryPose(G,2,0).forEach((v,i)=>assert.ok(v.every((x,k)=>Math.abs(x-U[i][k])<1e-9)));
  const m=E.berryPose(G,2,0.5);   // both pairs 105° from the pivot, 150° apart within a pair, 86° between pairs: C4v
  assert.equal(ang(m[0],m[2]),105); assert.equal(ang(m[3],m[2]),105); assert.equal(ang(m[0],m[1]),150); assert.equal(ang(m[3],m[4]),150);
  assert.equal(ang(m[0],m[3]),86); assert.equal(ang(m[0],m[4]),86);
  const e=E.berryPose(G,2,1); assert.equal(ang(e[3],e[4]),180); assert.equal(ang(e[0],e[1]),120);   // the old equatorial pair is now axial
});
test('Berry sets, monodentates: one set; with five different ligands the 20 configurations are one set that includes mirror images',()=>{
  const B=m=>E.berryOf(E.analyzeCase({id:'b'+m,geom:'TBP',mono:m,chel:[]}));
  same(['AAAAA','AAAAB','AAABB','AAABC','AABBC','AABCD','ABCDE'].map(m=>B(m).sets.length),[1,1,1,1,1,1,1]);
  const R=B('ABCDE'); same(sizes(R),[20]); assert.ok(R.sets[0].racemises&&!R.sets[0].chiral); assert.equal(R.sets[0].racSteps,5);
  // the reaction graph is the Desargues-Levi graph: 20 vertices, 30 edges, every vertex has three neighbours (Merx et al. 2004)
  assert.ok([...R.adj.values()].every(s=>s.size===3)); assert.equal([...R.adj.values()].reduce((t,s)=>t+s.size,0)/2,30);
  assert.ok(B('AABCD').sets[0].racemises&&B('AABBC').sets[0].racemises);
  assert.equal(B('AABCD').blocked,0);
});
test('with no ring in the way, every chiral monodentate configuration racemises',()=>{
  for(const m of ['AABBC','AABCD','ABCDE']){const B=E.berryOf(E.analyzeCase({id:'p'+m,geom:'TBP',mono:m,chel:[]})); assert.ok(B.sets.every(x=>!x.chiral));}
});
test('Berry sets partition the isomers, mirror sets are consistent, and chelate rings always block something',()=>{
  let split=0;
  for(const c of tbp){const A=E.ANALYSIS[c.id],B=E.berryOf(A);
    assert.equal(B.sets.reduce((t,x)=>t+x.isos.length,0),A.isomers.length,c.id);
    assert.equal(new Set(B.sets.flatMap(x=>x.isos.map(i=>i.id))).size,A.isomers.length,c.id);
    for(const x of B.sets) if(x.chiral){assert.notEqual(x.mirror,x.index); assert.equal(B.sets[x.mirror].isos.length,x.isos.length,c.id); assert.equal(B.sets[x.mirror].mirror,x.index);}
    if((c.chel||[]).length){assert.ok(B.blocked>0,c.id+' has no blocked move'); if(B.sets.length>1) split++;}}
  assert.equal(split,15);        // 15 of the 32 chelate formulas keep several sets
});
test('tripodal tetradentate: its one configuration is rigid, every move blocked',()=>{
  const c=tbp.find(c=>(c.chel||[]).some(x=>/:t$/.test(x))&&E.ANALYSIS[c.id].stereo===1), B=E.berryOf(E.ANALYSIS[c.id]);
  assert.ok(B.allBlocked); assert.equal(B.sets.length,1);
  assert.ok(E.berryWhy(E.ANALYSIS[c.id],B).length>=0);
});
test('every TBP formula matches the Berry golden file',()=>{
  const now=tbp.map(c=>{const A=E.ANALYSIS[c.id],B=E.berryOf(A);return [c.id,B.sets.length,sizes(B),B.sets.filter(x=>x.chiral).length,B.sets.filter(x=>x.racemises).length,B.blocked,B.moves];}).sort((a,b)=>a[0]<b[0]?-1:1);
  const f=path.join(here,'golden-berry.json'); if(!fs.existsSync(f)||process.env.UPDATE_GOLDEN){fs.writeFileSync(f,JSON.stringify(now));console.log('     (wrote golden-berry.json)');}
  same(now,JSON.parse(fs.readFileSync(f,'utf8')));
});

console.log(fails?`\n${fails} failed`:'\nall passed'); process.exit(fails?1:0);
