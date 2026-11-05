// Run with:  node tests/engine.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEngine} from './load-engine.mjs';

const E=loadEngine(['GEOMS','BANK','ANALYSIS','analyzeCase','analysisFor','speciesKey','canon','lig','structuralFamily','isoById','AMBIDENTATE','VETTED','cxPlan','cxAvailable','ionPartners','vettedIon','spareLetter','monoLetters','cxBaseGroup','realize','realizable','REAL','famOf','skillsOf','itemDiff','classifyError','skillState','masteryOf','pickCandidate','candidateWeight','famLocked','validateProgress','mergeEvents','PRACTICE','TYPE_W','ionChoice','SX_SALTS','SX_DIMERS','sxComplex','sxSaltInfo','sxDimerInfo']);
let fails=0;
const same=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);   // arrays from the vm context have another prototype
const test=(name,fn)=>{try{fn();console.log('ok   '+name);}catch(e){fails++;console.log('FAIL '+name+'\n     '+e.message.split('\n').slice(0,6).join('\n     '));}};
const here=path.dirname(fileURLToPath(import.meta.url));

test('every original bank formula is unchanged (counts, names, point groups)',()=>{
  const golden=JSON.parse(fs.readFileSync(path.join(here,'golden-bank.json'),'utf8')), byId=new Map(E.BANK.map(c=>[c.id,c]));
  const bad=[]; for(const g of golden){const c=byId.get(g[0]); if(!c){bad.push(g[0]+' missing');continue;}
    const A=E.ANALYSIS[c.id], r=[c.id,A.stereo,A.geometric,A.pairs,A.isomers.map(i=>[i.label,i.sym.plain,i.chiral?1:0,i.trans,i.chir||''].join('|'))];
    if(JSON.stringify(r)!==JSON.stringify(g)) bad.push(g[0]);}
  same(bad,[],'changed: '+bad.slice(0,5).join(', ')); assert.equal(golden.length,239);
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
  assert.ok(nFam>=240&&nVar>=600,nFam+' families, '+nVar+' forms');
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


/* ---- complications offered on the visualisation page: vetted ligands only ---- */
const cx=(kind,geom,mono,chel,sel)=>{const base={geom,mono,chel},plan=E.cxPlan(kind,base,sel);
  return {plan,F:E.structuralFamily(base,plan.amb,plan.opts)};};
test('vetted lists: only real ligands, nothing abstract; water trades only with a halide',()=>{
  same(E.VETTED.link,['NO2','SCN','CN']); assert.ok(E.VETTED.link.every(k=>E.AMBIDENTATE[k]));
  same(E.VETTED.ion.map(x=>x.key),['Cl','Br','I','NO3','SO4']); same(E.VETTED.kap.map(x=>x.key),['NO3','OAc','CO3','SO4']);
  same(E.ionPartners('H2O'),['Cl','Br','I']); assert.ok(E.ionPartners('Cl').includes('H2O')&&!E.ionPartners('Cl').includes('Cl'));
  assert.ok(!E.ionPartners('SO4').includes('H2O')&&E.ionPartners('SO4').includes('Br'));
  for(const k of ['NO3','SO4','Cl','Br','I','H2O']){const x=E.vettedIon(k); assert.ok(x&&x.text&&x.html&&x.name);}
});
test('availability: linkage needs a monodentate, ionisation a spare letter, k1/k2 a second ligand to give way',()=>{
  const b=(geom,mono,chel=[])=>({geom,mono,chel});
  assert.ok(E.cxAvailable('link',b('Oh','AAAAAB'))&&E.cxAvailable('ion',b('Oh','AAAAAB'))&&E.cxAvailable('kap',b('Oh','AAAAAB')));
  assert.ok(!E.cxAvailable('kap',b('Oh','AAAAAA'))&&E.cxAvailable('link',b('Oh','AAAAAA')));
  assert.ok(!E.cxAvailable('link',b('Oh','',['AA','AA','AA'])));                       // no monodentate at all
  assert.equal(E.spareLetter(b('Oh','ABCDEF')),'G');                                    // letters up to H exist, so a spare is always found
});
test('linkage: nitrite on one ligand of MA4B2, named, with the altered flag on the non-default donor',()=>{
  const {plan,F}=cx('link','Oh','AAAABB',[],{letter:'B',ident:'NO2'});
  assert.equal(plan.kind,'link'); assert.equal(F.groups.length,1); assert.equal(F.variants.length,3);
  const sk=F.variants.map(v=>Object.values(v.skin).filter(x=>x.alt).length);
  same(sk.slice().sort(),[0,1,1]);                                                      // per ligand letter: N,N none · N,O the O-bound one · O,O its one letter
  assert.ok(F.variants.every(v=>v.A.c.kind==='link'));
  assert.ok(F.variants.some(v=>Object.values(v.skin).some(x=>x.text==='ONO'&&x.alt)));
  same(plan.baseNames,{B:{html:'NO<sub>2</sub>',text:'NO₂'}});
});
test('ionisation: [M(NH3)5Br]·SO4 against [M(NH3)5(SO4)]·Br, with the outside ion named',()=>{
  const {plan,F}=cx('ion','Oh','AAAAAB',[],{letter:'B',ident:'Br',spare:'SO4',n:1});
  assert.equal(plan.kind,'ion'); assert.equal(F.groups.length,2); assert.equal(F.tally.stereo,2);
  const base=E.cxBaseGroup(F,{geom:'Oh',mono:'AAAAAB',chel:[]}), other=F.groups.find(g=>g!==base);
  assert.ok(base&&other); assert.ok(F.groups[0].parent===F.groups[1].parent,'both are the same abstract formula, which is why the base is found by composition'); assert.equal(base.outerText,'SO₄'); assert.equal(other.outerText,'Br');
  assert.ok(/SO<sub>4<\/sub>/.test(other.innerFormula)&&/Br/.test(base.innerFormula));
  const ov=other.variants[0]; assert.ok(Object.values(ov.skin).some(x=>x.text==='SO₄'&&x.alt));   // the ligand brought in is marked
  assert.ok(Object.values(base.variants[0].skin).every(x=>!x.alt));                               // the base composition is not altered
});
test('hydrate: water against a halide gives the classic CrCl3.6H2O set (4 spheres, 6 stereoisomers)',()=>{
  const {plan,F}=cx('ion','Oh','AAAAAA',[],{letter:'A',ident:'H2O',spare:'Cl',n:3});
  assert.equal(plan.kind,'hydrate'); assert.equal(F.groups.length,4); assert.equal(F.tally.stereo,6);
  assert.ok(F.variants.every(v=>v.A.c.kind==='hydrate'));
  assert.ok(F.groups.some(g=>g.outerText==='3Cl')&&F.groups.some(g=>g.outerText==='3H₂O'));
});
test('k1/k2: nitrate bonds through one atom or two and another ligand gives way; the k2 ligand is marked and tagged',()=>{
  const {plan,F}=cx('kap','Oh','AAAABB',[],{letter:'B',ident:'NO3'});
  assert.equal(plan.kind,'kap'); assert.equal(F.groups.length,3);                       // 2 x k1 · k2 + k1 · 2 x k2
  const base=E.cxBaseGroup(F,{geom:'Oh',mono:'AAAABB',chel:[]}); assert.ok(base&&base.outerText==='');
  const alt=F.variants.flatMap(v=>Object.values(v.skin)).filter(x=>x.alt);
  assert.ok(alt.length>0&&alt.every(x=>x.tag==='κ²'&&x.text==='NO₃'));
  assert.ok(F.groups.every(g=>g.variants[0].A.stereo>0));
});
test('choices outside the vetted lists are refused with a short message',()=>{
  const b={geom:'Oh',mono:'AAAAAB',chel:[]}, bad=(k,sel,re)=>assert.throws(()=>E.cxPlan(k,b,sel),re);
  bad('link',{letter:'B',ident:'Cl'},/linkage/); bad('link',{letter:'Z',ident:'NO2'},/not in this formula/);
  bad('ion',{letter:'B',ident:'SO4',spare:'H2O'},/trade places/); bad('ion',{letter:'B',ident:'Cl',spare:'Cl'},/trade places/); bad('ion',{letter:'B',ident:'XYZ',spare:'Cl'},/trade places/);
  bad('kap',{letter:'B',ident:'Cl'},/one atom or two/);
  assert.throws(()=>E.cxPlan('kap',{geom:'Oh',mono:'AAAAAA',chel:[]},{letter:'A',ident:'NO3'}),/give way/);
  assert.throws(()=>E.cxPlan('nope',b,{letter:'B'}),/Unknown/);
});
test('unnamed families are unchanged by the new options (no names, no alt flags except on later donors)',()=>{
  const F=fam('Oh','AAAABB',[],'B');
  assert.ok(F.variants.every(v=>Object.values(v.skin).every(x=>x.text==='A'||x.text==='B'||x.text.startsWith('B'))));
  assert.ok(F.groups.every(g=>g.outerText===''));
});


/* ---- real ligands for exam-style quiz formulas ---- */
test('real ligands: every realizable formula keeps its counts, gets distinct ligands, unique names and an integer charge',()=>{
  let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const ok=E.BANK.filter(E.realizable); assert.ok(ok.length>=100,ok.length+' realizable');
  for(const c of ok) for(let k=0;k<4;k++){
    const R=E.realize(c,rnd); assert.ok(R,c.id);
    const A=E.analyzeCase({...c,id:'real:'+c.id+':'+k},R.lbl), A0=E.ANALYSIS[c.id];
    assert.equal(A.stereo,A0.stereo,c.id); assert.equal(A.geometric,A0.geometric,c.id); assert.equal(A.pairs,A0.pairs,c.id);
    assert.equal(new Set(A.isomers.map(i=>i.label)).size,new Set(A0.isomers.map(i=>i.label)).size,c.id+' names stay distinct');
    assert.equal(new Set(R.parts.map(p=>p.r.key)).size,R.parts.length,c.id+' one real ligand per abstract ligand');
    assert.ok(Number.isInteger(R.charge)&&R.html.startsWith('['+R.metal),c.id);
    assert.ok(E.REAL.metals[c.geom].some(([m,o])=>m===R.metal&&o===R.ox));
  }
});
test('real ligands: a ligand keeps its symmetry type, and unknown types are left to the abstract mode',()=>{
  for(const [p,list] of Object.entries(E.REAL.chel)) for(const r of list){
    const L=p.split(':')[0]; assert.equal(r.donors.length,L.length,r.key);
    for(let i=0;i<L.length;i++) for(let j=0;j<L.length;j++) if(L[i]===L[j]) assert.equal(r.donors[i],r.donors[j],r.key+': equivalent donors are the same element');}
  assert.ok(!E.realizable({geom:'Oh',mono:'DDD',chel:['ABC:x']}),'an unsymmetrical tridentate has no listed real ligand');
  assert.equal(E.realize({geom:'Oh',mono:'DDD',chel:['ABC:x']}),null);
  const R=E.realize({geom:'Oh',mono:'AAAABB',chel:[]},Math.random,{B:{key:'NO2',html:'NO<sub>2</sub>',text:'NO₂',charge:-1,donors:['N'],w:1}});
  assert.ok(/NO<sub>2<\/sub>/.test(R.html)&&R.names.B.text==='NO₂');
});


/* ---- adaptive practice ---- */
const DAY=86400000, NOW=Date.UTC(2026,10,5);
const cases=E.BANK.filter(c=>new Set((c.mono||'')+(c.chel||[]).map(x=>E.lig(x).L).join('')).size>1);
const ev=(c,o,over={})=>({t:NOW,c:c.id,ty:'stereo',o,m:'type',e:'',l:'real',...over});
const cand=(c,t='stereo')=>{const A=E.ANALYSIS[c.id];return {c,t,fam:E.famOf(c),skills:E.skillsOf(c,A,t),diff:E.itemDiff(A,t)};};
const rng=seed=>()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
test('skills: every question exercises four skills, and difficulty grows with structure',()=>{
  for(const c of cases.slice(0,40)){const s=E.skillsOf(c,E.ANALYSIS[c.id],'stereo'); assert.equal(s.length,4); assert.ok(/^geom:/.test(s[0])&&/^lig:/.test(s[1])&&/^chir:(yes|no)$/.test(s[2])&&s[3]==='type:stereo');}
  const easy=E.ANALYSIS['sp-ma2b2'], hard=E.ANALYSIS['oh-mabcdef'];
  assert.ok(E.itemDiff(hard,'stereo')>E.itemDiff(easy,'stereo')+0.2);
  for(const c of cases) for(const t of ['stereo','geometric','pairs','total','ion']){const d=E.itemDiff(E.ANALYSIS[c.id],t); assert.ok(d>=0&&d<=1);}
});
test('mastery: successes raise it, failures lower it, no evidence is neutral, and evidence is weighted by how the answer went',()=>{
  const c=cases[0], m=evs=>E.masteryOf(E.skillState(evs,NOW)['geom:'+c.geom]);
  assert.equal(E.masteryOf(undefined),0.5);
  const good=m([ev(c,'first'),ev(c,'first'),ev(c,'first')]), bad=m([ev(c,'reveal'),ev(c,'reveal'),ev(c,'reveal')]);
  assert.ok(good>0.7&&bad<0.3);
  assert.ok(m([ev(c,'retry')])<m([ev(c,'first')])&&m([ev(c,'retry')])>m([ev(c,'reveal')]));
  assert.ok(m([ev(c,'first',{m:'mc'})])<m([ev(c,'first')]),'a multiple-choice hit counts for a little less (guessing)');
});
test('forgetting: evidence halves each half-life, so an old success fades towards neutral',()=>{
  const c=cases[0], k='geom:'+c.geom, e0=ev(c,'first',{t:NOW});
  const now=E.skillState([e0],NOW)[k], later=E.skillState([e0],NOW+7*DAY)[k], far=E.skillState([e0],NOW+70*DAY)[k];
  assert.ok(Math.abs(later.s-now.s/2)<1e-9);
  assert.ok(E.masteryOf(far)<E.masteryOf(later)&&E.masteryOf(later)<E.masteryOf(now)&&E.masteryOf(far)>0.5);
});
test('misconceptions: the wrong answer is named, and chirality mistakes also count against the chirality skill',()=>{
  const A=E.ANALYSIS['oh-maa2b2'];   // 2 geometric, 3 stereo, 1 pair
  assert.equal(E.classifyError('stereo',A,A.geometric,A.stereo),'geo-for-stereo');
  assert.equal(E.classifyError('geometric',A,A.stereo,A.geometric),'stereo-for-geo');
  assert.equal(E.classifyError('stereo',A,A.stereo-2,A.stereo),'low'); assert.equal(E.classifyError('stereo',A,A.stereo+2,A.stereo),'high');
  assert.equal(E.classifyError('pairs',A,A.pairs+1,A.pairs),'pairs-high'); assert.equal(E.classifyError('pairs',A,0,A.pairs),'pairs-low');
  assert.equal(E.classifyError('total',A,A.stereo,20,4),'total-forgot-forms'); assert.equal(E.classifyError('total',A,4,20,4),'total-forms-only');
  const c=E.BANK.find(x=>x.id==='oh-maa2b2'), plain=E.skillState([ev(c,'retry')],NOW)['chir:yes'], diag=E.skillState([ev(c,'retry',{e:'geo-for-stereo'})],NOW)['chir:yes'];
  assert.ok(E.masteryOf(diag)<E.masteryOf(plain));
});
test('ionisation question: a choice exists for every formula with a spare letter, and the total is the sum over its spheres',()=>{
  let n=0; let seed=7; const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  for(const c of E.BANK){ if(!E.monoLetters(c).length||!E.spareLetter(c)) continue;
    const q=E.ionChoice(c,rnd); if(!q) continue; n++;
    assert.ok(q.F.groups.length>1); assert.equal(q.F.tally.stereo,q.F.variants.reduce((t,v)=>t+v.A.stereo,0));
    assert.ok(q.F.groups.some(g=>E.cxBaseGroup(q.F,c)===g),'the base sphere is one of them: '+c.id);}
  assert.ok(n>100,'only '+n);
  assert.equal(E.classifyError('ion',E.ANALYSIS['oh-maa2b2'],E.ANALYSIS['oh-maa2b2'].stereo,20,3),'ion-forgot-swaps');
  assert.equal(E.classifyError('ion',E.ANALYSIS['oh-maa2b2'],3.5,20,3.5),'ion-spheres-only');
});
test('salts and dimers: ions are neutral together, charges of dimers add up, and the counts are what the textbook says',()=>{
  const want={'co-cr-nh3-cn':2,'co-cr-en-ox':8,'cu-pt':2,'pt-pt':1};
  for(const f of E.SX_SALTS){const I=E.sxSaltInfo(f); assert.equal(I.total,want[f.id],f.id);
    for(const x of I.salts) assert.equal(x.charge[0]+x.charge[1],0,'not neutral: '+x.title);}
  const w={'co-oh':1,'ru-o':1,'ru-pz':1,'co-oh-cl':3,'co-en-oh':6,'co-en-nh3':3};
  for(const f of E.SX_DIMERS){const D=E.sxDimerInfo(f); assert.equal(D.total,w[f.id],f.id);
    const [a,b]=f.halves; let q=0; for(const h of f.halves) q+=h.l.reduce((t,x)=>t+({NH3:0,CN:-1,Cl:-1,H2O:0,OH:-1,O:-2,NH2:-1,pz:0,en:0,ox:-2})[x[0]]*x[1],0);
    const ox={'co-oh':6,'ru-o':8,'ru-pz':5,'co-oh-cl':6,'co-en-oh':6,'co-en-nh3':6}[f.id], bridges=f.halves[0].l.filter(x=>x[2]).map(x=>({OH:-1,O:-2,pz:0})[x[0]]).reduce((t,x)=>t+x,0);
    assert.equal(ox+q-bridges,f.charge,'charge of '+f.id);}
  assert.equal(E.sxComplex(E.SX_SALTS[1].members[0][0]).stereo,2); assert.equal(E.sxComplex(E.SX_SALTS[1].members[0][0]).A.pairs,1);
});
test('selection: a weak skill is practised more, at a comparable difficulty, and the pick is never degenerate',()=>{
  // strong on everything except chiral pairs
  const S={}; const strong=()=>({s:8,f:0,t:NOW}), weak=()=>({s:0.5,f:5,t:NOW});
  for(const g of ['Oh','Td','SP']) S['geom:'+g]=strong(); for(const f of Object.keys({m:1,b:1,t1:1,t2b:1,t3:1,qc:1,qt:1,qr:1})) S['lig:'+f]=strong();
  for(const t of ['stereo','geometric','pairs','total','ion']) S['type:'+t]=strong(); S['chir:no']=strong(); S['chir:yes']=weak();
  const cs=cases.filter(c=>E.ANALYSIS[c.id].stereo<=12).map(c=>cand(c)); const r=rng(5); let chir=0, n=600;
  for(let i=0;i<n;i++){const p=E.pickCandidate(cs,S,{recent:[]},r); if(E.ANALYSIS[p.c.id].pairs>0) chir++;}
  const base=cs.filter(x=>E.ANALYSIS[x.c.id].pairs>0).length/cs.length;
  assert.ok(chir/n>base+0.15,'chiral share '+(chir/n).toFixed(2)+' vs '+base.toFixed(2)+' in the bank');
  assert.ok(chir/n<0.97,'other questions still appear');
});
test('selection: a new learner meets simple families first; unlocking follows evidence; one family is not repeated once known',()=>{
  const empty={}; assert.ok(!E.famLocked('m',empty),'monodentate is never locked');
  assert.ok(E.famLocked('b',empty)&&E.famLocked('t1',empty)&&E.famLocked('qc',empty));
  const ok={'lig:m':{s:6,f:1,t:NOW}}; assert.ok(!E.famLocked('b',ok)&&E.famLocked('t1',ok));
  const ok2={...ok,'lig:b':{s:6,f:1,t:NOW}}; assert.ok(!E.famLocked('t1',ok2)&&E.famLocked('qc',ok2));
  // a beginner's draw is dominated by monodentate and bidentate formulas
  const cs=cases.map(c=>cand(c)), r=rng(9); let simple=0; for(let i=0;i<400;i++){const f=E.pickCandidate(cs,{},{recent:[]},r).fam; if(f==='m'||f==='b') simple++;}
  assert.ok(simple/400>0.55,'beginner simple share '+simple/400);
  // interleaving: after two questions of a family that is known, that family is drawn less often
  const known={'lig:b':{s:6,f:1,t:NOW}}, sameFam=cs.filter(x=>x.fam==='b'), mixed=cs.filter(x=>x.fam==='b'||x.fam==='t1');
  const w1=E.candidateWeight(mixed.find(x=>x.fam==='b'),known,{recent:[]}), w2=E.candidateWeight(mixed.find(x=>x.fam==='b'),known,{recent:['b','b']});
  assert.ok(w2<w1*0.5);
  const unseen={}, w3=E.candidateWeight(mixed.find(x=>x.fam==='b'),unseen,{recent:['b','b']}), w4=E.candidateWeight(mixed.find(x=>x.fam==='b'),unseen,{recent:[]});
  assert.ok(Math.abs(w3-w4)<1e-12,'a brand-new family is met in a block');
});
test('progress files: validated field by field, merged by union, duplicates dropped',()=>{
  const c=cases[0], good=ev(c,'first',{t:NOW-5*DAY});
  const v=E.validateProgress({app:'isomer-sketchbook',v:1,events:[good,{...good,t:NOW-4*DAY,e:'low'}]},NOW); assert.ok(v.ok); assert.equal(v.events.length,2); assert.equal(v.rejected,0);
  const bad=[null,5,'x',{...good,c:'nope'},{...good,ty:'weird'},{...good,o:'maybe'},{...good,t:'soon'},{...good,t:NOW+30*DAY},{...good,e:'<img src=x onerror=alert(1)>'},{...good,m:'telepathy'},{...good,c:{toString:1}}];
  const w=E.validateProgress({events:bad},NOW); assert.equal(w.events.length,0); assert.equal(w.rejected,bad.length);
  assert.ok(!E.validateProgress({events:'x'},NOW).ok&&!E.validateProgress(null,NOW).ok&&!E.validateProgress({app:'other',events:[good]},NOW).ok);
  assert.equal(JSON.stringify(Object.keys(v.events[0]).sort()),JSON.stringify(['c','e','l','m','o','t','ty']),'only known fields survive');
  const m=E.mergeEvents(v.events,[v.events[1],{...good,t:NOW-9*DAY}]); assert.equal(m.length,3); assert.ok(m[0].t<m[1].t&&m[1].t<m[2].t);
  const many=Array.from({length:E.PRACTICE.maxEvents+50},(_,i)=>({...good,t:NOW-i*1000})); assert.equal(E.mergeEvents(many,[]).length,E.PRACTICE.maxEvents);
});

console.log(fails?`\n${fails} failed`:'\nall passed'); process.exit(fails?1:0);
