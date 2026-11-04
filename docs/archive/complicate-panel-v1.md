# Complicate panel, version 1 (archived)

This is the original "Complicate this formula" panel: a large sheet with three sections (linkage, ionisation/hydrate,
κ¹/κ²), a binding-form **matrix table** (how many stereoisomers each base isomer splits into, per form), tallies and
short explanations. It was replaced by a compact strip under the viewports that shows the altered molecule beside the
base one, because for a visualisation app it was too much explanation.

It is kept here on purpose, as the starting point for a future **learning view** (the counting tables). It is **not**
part of the app. The counting engine it sat on (`structuralFamily`, in `index.html`) is unchanged and still produces
everything this panel displayed: `F.groups[].rows` is the matrix, `F.tally` the totals, `F.newChiral` the new-chirality
note.

* Last version of the whole app that contains this panel working: commit `9005621` (`git show 9005621:index.html`).
* To bring it back: paste the HTML where `#family` was (just before `<div class="pop" id="pop">`), the CSS next to the
  other panel styles, and the JS as section 3c. It needs `monoLetters`, `countOf`, `spareLetter`, `famLinkHTML`,
  `closeBuilder`, `loadInto`, `setLive`, `mTab`, `isMobile`, `setHash`, `analysisFor`, `AMBIDENTATE`, `GEOMS`,
  `formulaHTML` and `ANALYSIS`, all still in the app. The viewport "marking" and the vetted ligand tables in the new
  code are independent of it.
* The old deep-link format (`#x?g=..&m=..&l=..&p=..&k=..&o=..&s=..`) belonged to this panel; it was never released.

## HTML

```html
<div class="modal" id="family" hidden>
  <div class="isheet fsheet sketch" role="dialog" aria-label="Complicate this formula">
    <div class="bhead"><h3 id="fTitle"></h3><button class="btn" id="fClose">✕ close</button></div>
    <div id="fBody"></div>
  </div>
</div>
```

## CSS

```css
.fsheet{width:min(980px,100%)}
.fvocab{font-size:13.5px;color:var(--ink2);margin:0;line-height:1.4}
.fctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.fctl .lab{font-family:var(--hand);font-size:13px;color:var(--ink2)}
.fctl .btn.on{background:var(--hl);color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink),2px 2px 0 var(--ink)}
.ftally{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;font-size:15px}
.ftally .big{font-family:var(--hand);font-size:22px}
.fwhy{font-size:14px;line-height:1.45;margin:0}
.fmat-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
table.fmat{border-collapse:collapse;font-size:14px}
.fmat th,.fmat td{border:1.5px solid var(--ink3);padding:3px 9px;text-align:center;white-space:nowrap}
.fmat th{font-family:var(--hand);font-weight:normal;font-size:13px;background:var(--paper)}
.fmat td.rowh{text-align:left}
.fmat td.n0{color:var(--ink3)}
.fmat td.n2{background:#fff6cc;font-weight:bold}
.fmat tr.tot td{border-top:2px solid var(--ink);font-family:var(--hand)}
.fsec{display:flex;flex-direction:column;gap:5px;border-top:1.5px dashed var(--grid2);padding-top:6px}
.fsec-h{font-family:var(--hand);font-size:16px}.fsec-h small{font-size:12.5px;color:var(--ink2);margin-left:6px}
.fnote{font-size:12.5px;color:var(--ink2)}
.fgroup-h{margin-top:6px}.fgroup-h .xf{font-family:var(--hand);font-size:17px}
.famlink{border-color:var(--violet);background:#f6efff}.famlink:hover{background:#e7d9ff}
.fform{border-top:1.5px dashed var(--grid2);padding-top:6px}
.fform-h{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline}
.fform-h .xf{font-family:var(--hand);font-size:17px}
.fform-h small{color:var(--ink2);font-size:12.5px}
```

## JavaScript (section 3c)

```js
/* =====================================================================
   3c. COMPLICATE — add structural complications to a formula and watch the isomers multiply
   Two independent complications, either or both: (1) a ligand may bond through different donor atoms (linkage isomers);
   (2) ligands may swap with spare copies outside the sphere (ionisation and hydrate isomers).
   ===================================================================== */
const FAM={base:null,caseId:null,letters:new Set(),kappa:new Set(),donors:2,preset:null,pool:false,out:{},swap:new Set(),mark:null,cur:null};
const DONOR_SET=[{id:'x',tag:'x'},{id:'y',tag:'y'},{id:'z',tag:'z'}];
const monoLetters=c=>[...new Set(c.mono||'')];
const countOf=(m,l)=>[...m].filter(x=>x===l).length;
const spareLetter=b=>{const used=new Set((b.mono||'')+(b.chel||[]).map(x=>lig(x).L).join(''));return 'ABCDEFGH'.split('').find(l=>!used.has(l))||null;};
const poolLetters=()=>{const ls=monoLetters(FAM.base),S=FAM.pool?spareLetter(FAM.base):null;return S?[...ls,S]:ls;};
function complicateHTML(c){
  if(!monoLetters(c).length) return '';
  return `<div class="nbr"><div class="nbr-h">Complicate it</div><button class="nbr-row" data-complicate="${c.id}"><span class="xf">Add a structural complication</span><small>Let a ligand bond through more than one atom (linkage isomers), or swap places with a copy outside the sphere (ionisation and hydrate isomers), and see the new isomers appear on top of these stereoisomers.</small></button></div>`;
}
function famDefaults(){
  const b=FAM.base, ls=monoLetters(b);
  FAM.letters=new Set([ls.reduce((best,l)=>countOf(b.mono,l)>=countOf(b.mono,best)?l:best)]);   // the most-repeated ligand: that is where mixed binding forms appear
  Object.assign(FAM,{kappa:new Set(),donors:2,preset:null,pool:false,out:{},swap:new Set(),mark:null});
}
function famPoolOn(forKappa=false){
  const b=FAM.base, ls=monoLetters(b), few=ls.reduce((best,l)=>countOf(b.mono,l)<=countOf(b.mono,best)?l:best), S=spareLetter(b);
  FAM.pool=true;
  if(forKappa){FAM.out={};FAM.swap=new Set(ls);return;}          // denticity: the ligands already there give way to each other, no new one
  FAM.out=S?{[S]:1}:{}; FAM.swap=new Set(S?[few,S]:[few]);
}
function openFamily(arg,init){
  if(typeof arg==='string'){const c=ANALYSIS[arg].c;FAM.caseId=arg;FAM.base={geom:c.geom,mono:c.mono||'',chel:c.chel||[]};}
  else{FAM.caseId=null;FAM.base=arg;}
  famDefaults(); if(init) Object.assign(FAM,init);
  $('#family').hidden=false; renderFamily(); $('#fBody').scrollTop=0;
}
function closeFamily(){if($('#family').hidden)return;$('#family').hidden=true;setHash(FAM.caseId);}
function famHash(){
  const b=FAM.base,p=new URLSearchParams({g:b.geom,m:b.mono,c:b.chel.join(','),l:[...FAM.letters].join('')});
  if(FAM.donors!==2)p.set('d',FAM.donors); if(FAM.preset)p.set('p',FAM.preset); if(FAM.kappa.size)p.set('k',[...FAM.kappa].join(''));
  if(FAM.pool){p.set('o',Object.entries(FAM.out).filter(e=>e[1]>0).map(e=>e[0]+e[1]).join('.'));p.set('s',[...FAM.swap].join(''));}
  return 'x?'+p;
}
function openFamilyFromHash(h){
  const p=new URLSearchParams(h.slice(2)), g=p.get('g'), m=p.get('m')||'', c=(p.get('c')||'').split(',').filter(Boolean);
  if(!GEOMS[g]||!/^[A-H]*$/.test(m)||!c.every(x=>/^[A-H]{2,4}(:[a-z]{1,2})?$/.test(x))) return false;
  const init={}; if(p.has('l')) init.letters=new Set(p.get('l').split('').filter(Boolean));
  if(p.has('k')) init.kappa=new Set(p.get('k').split('').filter(l=>/[A-H]/.test(l)));
  if(p.get('d')==='3') init.donors=3; if(AMBIDENTATE[p.get('p')]) init.preset=p.get('p');
  if(p.has('s')){init.pool=true;init.swap=new Set(p.get('s').split('').filter(Boolean));init.out={};(p.get('o')||'').split('.').filter(Boolean).forEach(t=>init.out[t[0]]=+t.slice(1)||0);}
  openFamily({geom:g,mono:m,chel:c},init); return true;
}
function famLoad(vi,ii,to,pair){
  const v=FAM.cur.variants[vi], iso=v.A.isomers[ii];
  closeFamily(); if(!$('#builder').hidden) closeBuilder(); if(isMobile()) mTab('compare');
  if(pair){setLive(false);loadInto(1,dispOf(iso,v.skin));loadInto(2,dispOf(iso.partner,v.skin));}
  else loadInto(to,dispOf(iso,v.skin));
}
const famDonors=()=>FAM.preset&&FAM.letters.size===1&&FAM.donors===2?AMBIDENTATE[FAM.preset].donors:DONOR_SET.slice(0,FAM.donors);
function matrixHTML(F,g){
  const T=g.variants, mark=v=>FAM.mark&&JSON.stringify(v.pick)===FAM.mark?' <span class="chip live">your formula</span>':'';
  return `<div class="fmat-wrap"><table class="fmat"><thead><tr><th>isomer of ${F.groups.length>1?'this inner sphere':'the base formula'}</th>${T.map(v=>`<th>${v.desc||'—'}${mark(v)}</th>`).join('')}<th>all forms</th></tr></thead><tbody>`+
    g.rows.map(r=>{const tot=r.cells.reduce((t,x)=>t+x.length,0);
      return `<tr><td class="rowh">${r.parent.label} <span class="chip ${r.parent.chiral?'chiral':'achiral'}">${r.parent.chiral?'chiral':'achiral'}</span></td>${r.cells.map(x=>`<td class="${x.length?x.length>1?'n2':'':'n0'}">${x.length||'–'}</td>`).join('')}<td><b>${tot}</b></td></tr>`;}).join('')+
    `<tr class="tot"><td class="rowh">stereoisomers</td>${T.map(v=>`<td>${v.A.stereo}</td>`).join('')}<td><b>${T.reduce((t,v)=>t+v.A.stereo,0)}</b></td></tr></tbody></table></div>`;
}
function renderFamily(){
  const b=FAM.base, A0=analysisFor(b.geom,b.mono,b.chel), pl=poolLetters(), kap=[...FAM.kappa].filter(l=>pl.includes(l)), sel=[...FAM.letters].filter(l=>pl.includes(l)&&!kap.includes(l)), S=FAM.pool?spareLetter(b):null;
  const slot=isMobile()?'slot':'Viewport', ltr=l=>`${l}${countOf(b.mono,l)>1?`<sub>${countOf(b.mono,l)}</sub>`:''}`;
  $('#fTitle').innerHTML=`${formulaHTML({chel:b.chel,mono:b.mono})} <span>${GEOMS[b.geom].name.toLowerCase()}, with complications</span>`;
  const canPreset=sel.length===1&&FAM.donors===2;
  let h=`<p class="fvocab"><b>Structural</b> isomers differ in what is bonded to the metal; <b>stereo</b> isomers have the same bonds and differ in arrangement. Each complication below adds the first kind on top of the second. It is an abstract model: it counts what connectivity allows, and says nothing about which form is stable.</p>
    <div class="fsec"><div class="fsec-h">1 · A ligand bonds through more than one atom <small>linkage isomers</small></div>
    <div class="fctl"><span class="lab">ambidentate:</span>${pl.map(l=>`<button class="btn ${sel.includes(l)?'on':''}" data-famletter="${l}" aria-pressed="${sel.includes(l)}">${ltr(l)}</button>`).join('')}
      <span class="lab" style="margin-left:8px">donor atoms:</span>${[2,3].map(n=>`<button class="btn ${FAM.donors===n&&!(FAM.preset&&canPreset)?'on':''}" data-famdon="${n}">${DONOR_SET.slice(0,n).map(d=>d.tag).join(', ')}</button>`).join('')}
      ${Object.keys(AMBIDENTATE).map(k=>{const a=AMBIDENTATE[k];return `<button class="btn ${FAM.preset===k&&canPreset?'on':''}" data-fampreset="${k}" ${canPreset?'':'disabled'} title="${a.donors.map(d=>d.iupac).join('; ')}">${a.donors.map(d=>d.html).join(' / ')}</button>`;}).join('')}</div>
      ${sel.length>1&&FAM.donors===2?'<small class="fnote">Names are for one ambidentate ligand at a time.</small>':''}${FAM.preset&&canPreset?'<small class="fnote">In the drawings the atom bonded to the metal is <b><u>bold and underlined</u></b>.</small>':''}</div>
    <div class="fsec"><div class="fsec-h">2 · A ligand swaps with a spare copy outside the sphere <small>ionisation and hydrate isomers</small></div>
    <div class="fctl"><button class="btn ${FAM.pool?'on':''}" data-fampool>${FAM.pool?'on':'off'}</button><span class="lab">The sphere keeps exactly ${GEOMS[b.geom].n-b.chel.reduce((t,x)=>t+ligDent(x),0)} monodentate site${GEOMS[b.geom].n-b.chel.reduce((t,x)=>t+ligDent(x),0)===1?'':'s'}, so a ligand leaving means another takes its place.</span></div>`;
  if(FAM.pool){
    h+=`<div class="fmat-wrap"><table class="fmat"><thead><tr><th>ligand</th><th>in sphere</th><th>spare outside</th><th>may swap</th></tr></thead><tbody>`+
      pl.map(l=>{const sw=FAM.swap.has(l),o=FAM.out[l]||0;
        return `<tr><td class="rowh">${l}</td><td>${countOf(b.mono,l)}</td><td><button class="btn step" data-famout="${l}:-1" ${sw&&o>0?'':'disabled'} aria-label="fewer ${l}">−</button> <b>${o}</b> <button class="btn step" data-famout="${l}:1" ${sw&&o<6?'':'disabled'} aria-label="more ${l}">+</button></td><td><input type="checkbox" data-famswap="${l}" ${sw?'checked':''} aria-label="${l} may swap"></td></tr>`;}).join('')+`</tbody></table></div>
      ${S===null?'':`<small class="fnote">${S} is a new ligand: give it spare copies and let it swap to see it compete for a site.</small>`}`;
  }
  h+=`</div>
    <div class="fsec"><div class="fsec-h">3 · A ligand bonds through one atom or two <small>denticity isomers, κ¹ / κ²</small></div>
    <div class="fctl"><span class="lab">may bond κ¹ or κ²:</span>${pl.map(l=>`<button class="btn ${kap.includes(l)?'on':''}" data-famkappa="${l}" aria-pressed="${kap.includes(l)}">${ltr(l)}</button>`).join('')}</div>
    <small class="fnote">A κ² ligand takes two sites and a κ¹ ligand one, and the sphere keeps its ${GEOMS[b.geom].n} sites, so another ligand has to give way: the ones allowed to swap in section 2 do that.${kap.length&&!FAM.pool?' <b>Switch section 2 on first</b>: nothing can make room yet.':''}</small></div>`;
  const spec={amb:sel.map(letter=>({letter,donors:famDonors()})),opts:FAM.pool?{outside:Object.fromEntries(Object.entries(FAM.out).filter(e=>e[1]>0)),mobile:[...FAM.swap],chelate:kap}:{chelate:kap}};
  if(!spec.amb.length&&!FAM.pool&&!kap.length){FAM.cur=null;$('#fBody').innerHTML=h+`<p class="fwhy">Switch a complication on. ${A0.stereo} stereoisomer${A0.stereo>1?'s':''} for now.</p>`;setHash(famHash());return;}
  let F; try{F=structuralFamily(b,spec.amb,spec.opts);}catch(e){FAM.cur=null;$('#fBody').innerHTML=h+`<p class="fwhy">${e.message.replace(/^./,x=>x.toUpperCase())}. Adjust the spare copies or what may swap.</p>`;setHash(famHash());return;}
  FAM.cur=F; setHash(famHash());
  if(F.tooMany){$('#fBody').innerHTML=h+`<p class="fwhy">That makes ${F.tooMany} forms, more than the ${F.cap} this panel will analyse. Switch something off, or use two donor atoms.</p>`;return;}
  const T=F.tally, withAmb=spec.amb.length>0, withKap=kap.length>0;
  h+=`<div class="ftally"><span class="big nw">${A0.stereo} <i class="arr" role="img" aria-label="to"></i> ${T.stereo}</span><span>stereoisomers in total</span>${FAM.pool||withKap?`<span><b>${T.spheres}</b> inner-sphere composition${T.spheres>1?'s':''}</span>`:''}${withAmb?`<span><b>${T.forms}</b> binding form${T.forms>1?'s':''}</span>`:''}<span><b>${T.pairs}</b> enantiomeric pair${T.pairs===1?'':'s'}</span></div>`;
  let why=withAmb?`Each binding form is an ordinary stereo formula, analysed like any other. The table counts how many stereoisomers each isomer splits into: it is not simply a multiple, because ligands that are no longer identical break symmetry differently in different arrangements.`:'';
  if(FAM.pool&&Object.values(FAM.out).some(n=>n>0)) why+=` Each inner-sphere composition is a different compound: <b>ionisation</b> isomers where an anion swaps with one outside, <b>hydrate</b> isomers where water does. Its stereoisomers are counted as usual. Charge and conductivity are not modelled.`;
  if(withKap) why+=` <b>Denticity</b> isomers: the same ligands, but a ligand bonded through two atoms (a chelate, κ²) uses two sites where κ¹ uses one, so the rest of the sphere differs. Each composition is analysed as the ordinary chelate formula it is.`;
  if(F.newChiral.length){const names=[...new Set(F.newChiral.map(x=>x.parent.label))].join(', ');
    why+=` <b>New chirality:</b> where the donor atoms differ, the mirror plane of the achiral isomer (${names}) is lost, so it now exists as an enantiomeric pair.`;}
  else if(b.geom==='SP'&&withAmb) why+=` A square-planar complex stays achiral however the ligands bond: the molecular plane is always a mirror.`;
  h+=`<p class="fwhy">${why}</p>`;
  if(F.groups.length>1){
    h+=`<div class="fmat-wrap"><table class="fmat"><thead><tr><th>inside the sphere</th><th>outside</th>${withAmb?'<th>binding forms</th>':''}<th>geometrical</th><th>enantiomeric pairs</th><th>stereoisomers</th></tr></thead><tbody>`+
      F.groups.map(g=>{const s=g.variants.reduce((t,v)=>[t[0]+v.A.geometric,t[1]+v.A.pairs,t[2]+v.A.stereo],[0,0,0]);
        return `<tr><td class="rowh">${g.innerFormula}</td><td>${g.outer||'—'}</td>${withAmb?`<td>${g.variants.length}</td>`:''}<td>${s[0]}</td><td>${s[1]}</td><td><b>${s[2]}</b></td></tr>`;}).join('')+`</tbody></table></div>`;
  }
  F.groups.forEach(g=>{
    if(withAmb) h+=(F.groups.length>1?`<div class="fgroup-h"><span class="xf">${g.innerTitle}</span></div>`:'')+matrixHTML(F,g);
  });
  const tw=isMobile()?'slot':'Viewport';
  h+=F.variants.map((v,vi)=>{
    const row=iso=>`<div class="iso"><span class="nm" data-fl="${vi}:${iso.idx}:1" title="load into ${tw} 1">${iso.label}</span><span class="chip pg">${iso.sym.html}</span><span class="chip ${iso.chiral?'chiral':'achiral'}">${iso.chiral?'chiral':'achiral'}</span><button class="ld" data-fl="${vi}:${iso.idx}:1" title="Load into ${tw} 1">1</button><button class="ld" data-fl="${vi}:${iso.idx}:2" title="Load into ${tw} 2">2</button></div>`;
    return `<div class="fform"><div class="fform-h"><span class="xf">${v.title}</span><small>${v.desc?v.desc+' · ':''}${v.A.stereo} stereoisomer${v.A.stereo>1?'s':''}${FAM.mark&&JSON.stringify(v.pick)===FAM.mark?' · <b>your formula</b>':''}</small></div>`+
      v.A.groups.map(g=>g.length===1?row(g[0]):`<div class="pairbox"><div class="pairlab"><span>enantiomeric pair</span><button data-flpair="${vi}:${g[0].idx}">compare ⇄</button></div>${row(g[0])}${row(g[1])}</div>`).join('')+`</div>`;}).join('');
  $('#fBody').innerHTML=h;
}
/* a typed formula that spells both ends of an ambidentate ligand (NO2 and ONO) is one of its binding forms */
const FAMLINKS=[];
function famLinkHTML(pf){
  if(!pf||!pf.amb||!pf.amb.length) return '';
  const geoms=pf.dent===6?['Oh']:pf.dent===4?['SP','Td']:[]; let out='';
  for(const a of pf.amb) for(const geom of geoms){
    let F; try{F=structuralFamily({geom,mono:a.mono,chel:a.chel},[{letter:a.letter,donors:AMBIDENTATE[a.key].donors}]);}catch(e){continue;}
    if(F.tooMany||!F.tally.stereo) continue;
    const lk={geom,base:{geom,mono:a.mono,chel:a.chel},letter:a.letter,preset:a.key,mark:JSON.stringify([a.counts])}, k=JSON.stringify(lk);   // one entry per distinct link: both finders render the same ones
    let i=FAMLINKS.findIndex(x=>x.k===k); if(i<0) i=FAMLINKS.push({...lk,k})-1;
    const d=AMBIDENTATE[a.key].donors;
    out+=`<button class="nbr-row famlink" data-famlink="${i}"><span class="xf">${AMBIDENTATE[a.key].name}: ${d[0].html} or ${d[1].html}${pf.dent===4?` · ${GEOMS[geom].name.toLowerCase()}`:''}</span><small>This ligand can bond through either atom. That formula is one of <b>${F.tally.forms}</b> binding forms (<b>${F.tally.stereo}</b> stereoisomers in all). See the linkage family <i class="arr" role="img" aria-label="to"></i></small></button>`;}
  return out?`<div class="fsub">Linkage isomers</div>${out}`:'';
}
function buildFamily(){
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-complicate]'); if(b){openFamily(b.dataset.complicate);return;}
    const l=e.target.closest('[data-famlink]'); if(l){const k=FAMLINKS[+l.dataset.famlink];if(k)openFamily(k.base,{letters:new Set([k.letter]),preset:k.preset,mark:k.mark});}
  });
  $('#fClose').addEventListener('click',closeFamily);
  $('#family').addEventListener('click',e=>{
    if(e.target.id==='family'){closeFamily();return;}
    const t=e.target;
    let x;
    if(x=t.closest('[data-famkappa]')){const l=x.dataset.famkappa;if(FAM.kappa.has(l))FAM.kappa.delete(l);else{if(!FAM.kappa.size&&!FAM.pool){FAM.letters=new Set();FAM.preset=null;famPoolOn(true);}   // first use: show denticity on its own
        FAM.kappa.add(l);FAM.letters.delete(l);if(FAM.letters.size!==1)FAM.preset=null;if(!FAM.pool)famPoolOn(true);}FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-famletter]')){const l=x.dataset.famletter;if(FAM.letters.has(l))FAM.letters.delete(l);else{FAM.letters.add(l);FAM.kappa.delete(l);}if(FAM.letters.size!==1)FAM.preset=null;FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-famdon]')){FAM.donors=+x.dataset.famdon;if(FAM.donors===3)FAM.preset=null;FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-fampreset]')){if(x.disabled)return;FAM.preset=FAM.preset===x.dataset.fampreset?null:x.dataset.fampreset;FAM.mark=null;renderFamily();return;}
    if(t.closest('[data-fampool]')){if(FAM.pool){FAM.pool=false;FAM.out={};FAM.swap=new Set();FAM.letters=new Set([...FAM.letters].filter(l=>monoLetters(FAM.base).includes(l)));FAM.kappa=new Set([...FAM.kappa].filter(l=>monoLetters(FAM.base).includes(l)));}else famPoolOn();FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-famout]')){const [l,d]=x.dataset.famout.split(':');FAM.out[l]=Math.max(0,Math.min(6,(FAM.out[l]||0)+ +d));FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-famswap]')){const l=x.dataset.famswap;if(x.checked)FAM.swap.add(l);else{FAM.swap.delete(l);FAM.out[l]=0;}FAM.mark=null;renderFamily();return;}
    if(x=t.closest('[data-fl]')){const [vi,ii,to]=x.dataset.fl.split(':').map(Number);famLoad(vi,ii,to,false);return;}
    if(x=t.closest('[data-flpair]')){const [vi,ii]=x.dataset.flpair.split(':').map(Number);famLoad(vi,ii,1,true);}
  });
}

```
