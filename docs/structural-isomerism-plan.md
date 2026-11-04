# Structural isomerism: architecture plan

Status: proposal. Nothing in `index.html` has changed. Numbers below were produced by a throwaway prototype run against the unmodified engine (loaded headlessly in Node), not worked out by hand.

## 1. The idea in one paragraph

Linkage, ionisation and hydrate isomerism are all the same operation seen from the stereo engine's side: **decide which species bind through which atoms, then hand the resulting ligand set to the existing enumerator.** Once the choice is made, `[Co(NH3)4(NO2)(ONO)]` is just MA₄BC to the engine, with B and C happening to be called nitro and nitrito. So the structural layer is a thin *front end* that sits above `analyzeCase` and never enumerates a polyhedron itself. The geometric/optical engine stays the single source of truth for every count.

The user-facing function ("add a complication to a geometry and watch the isomers multiply") is a **family view**: one base formula, one complication, a table of *binding assignments × geometrical isomers*, with each cell a count and a link into the existing viewports.

## 2. What the prototype established

All with the current engine, no edits:

| Base (geometry) | Complication | Structural forms | Stereoisomers in total | Base had |
|---|---|---|---|---|
| [M(NH₃)₄(NO₂)₂] (Oh) | NO₂ ambidentate | 3 (NN, NO, OO) | 6 | 2 |
| [M(NH₃)₃(NO₂)₃] (Oh) | same | 4 | **10** (fac 4, mer 6) | 2 |
| [M(en)₂(NCS)₂] (Oh) | SCN ambidentate | 3 | 9 (3 enantiomeric pairs) | 3 |
| [M(SCN)₂XY] (Td) | same | 3 | 4 | 1 |
| [M(SCN)₂LY] (SP) | same | 3 | 7 | 2 |
| CrCl₃·6H₂O (Oh) | Cl in or out of sphere | 4 | 6 | n/a |

Four things in that table shape the design.

1. **It is not a product.** mer-MA₃B₃ splits into 1, 2, 2, 1 children across the four assignments, fac into 1, 1, 1, 1. A "×3" rule of thumb is wrong, and showing why is the teaching payoff of the matrix view.
2. **Geometry changes the answer.** On a tetrahedron, mixed S/N binding in [M(SCN)₂XY] *switches chirality on* (the mixed form is MABCD with four different donor environments: one enantiomeric pair; the parent is achiral). On a square it never can, because the plane is always a mirror. This is the strongest argument for keeping the feature geometry-aware, and it ties structural isomerism directly to the app's optical focus.
3. **The projection is total.** Forgetting which atom binds (merge the split letters back) maps every child isomer onto exactly one parent isomer, checked for every family above. So the matrix is well defined: rows are the parent's isomers, columns are binding assignments.
4. **Nothing new needs enumerating.** Of 372 monodentate-letter splits over all 248 bank formulas, 0 were missing from the bank. Families are a *view over the existing bank*, not new content, so the finder, quiz and counts do not grow.

One engine coupling surfaced: `rsLabel` (line 1137) reads letters `A`–`D` literally, so a split that leaves a gap in the alphabet (A, C, D, H) crashes it. The lowering step must allocate letters contiguously from A. A one-line hardening of `rsLabel` is also worth doing.

## 3. Scope: which "structural" isomerisms fit

| Type | Fits a single-metal polyhedron engine? | Plan |
|---|---|---|
| Linkage (NO₂/ONO, SCN/NCS, DMSO S/O, ...) | Yes, directly | Phase 1 |
| Ionisation, hydrate/solvate | Yes, as a choice of inner-sphere composition at fixed coordination number | Phase 2 |
| Denticity (κ¹ vs κ², e.g. acetate, sulfate) | Yes, same solver, if the total still fills the sites | Phase 4 |
| Ambidentate end of a chelate | Yes, same relabelling, needs pattern handling | Phase 4 |
| Coordination isomerism ([Co(NH₃)₆][Cr(CN)₆]) | **No.** Needs two metal centres and a salt-level object | Defer; separate design |
| Polymerisation, bridging position | No (different formula multiple; multi-metal) | Out |
| Ligand isomerism (pn vs tn) | Technically yes but adds nothing geometric | Out |

I would push back on trying to cover "all structural isomerism". Half the textbook list is not about one coordination sphere, and forcing it in would mean a second engine. Linkage plus ionisation/hydrate is the part that composes with what exists, and it is also the part exams ask.

## 4. Architecture

New code lives in one new section of `index.html`, between the engine (section 1) and the drawing code (section 2). The app remains a single offline file, as the README promises.

```
 species catalogue ─▶ pool ─▶ solver ─▶ lowering ─▶ analysisFor() ─▶ family result ─▶ UI
 (data)               (input)  (CN-constrained   (letters,      (existing,        (matrix,
                               mode assignment)   skin)          cached)           tally)
```

### 4.1 Species catalogue (data only)

A species has *binding modes*. A mode says what it donates through and how it will be drawn.

```js
const SPECIES = {
  NO2: {name:'nitrite', charge:-1, modes:[
         {id:'N', iupac:'nitrito-κN', trad:'nitro',   text:'NO₂', donor:0},
         {id:'O', iupac:'nitrito-κO', trad:'nitrito', text:'ONO', donor:0}]},
  SCN: {name:'thiocyanate', charge:-1, modes:[{id:'S',text:'SCN',donor:0},{id:'N',text:'NCS',donor:0}]},
  H2O: {charge:0, modes:[{id:'O',text:'H₂O',donor:0}]},  Cl:{...}, NH3:{...},
};
```

- Also include `NCS`/`SCN`, `NO2`/`ONO`, `NC`/`CN` as aliases. `parseFormula` (line 1862) already tokenises these as separate monodentates, so typing `[Co(NH3)4(NO2)(ONO)]` *already* lands on the correct child formula. The layer just needs to recognise them as one species, which is what lets the finder offer "see the linkage family".
- An **abstract** mode must exist too: "make B ambidentate" with donors shown as B<sub>x</sub> / B<sub>y</sub>. This is the version that matches the request literally (complicate any geometry/formula), and chemistry names are presets on top of it.

### 4.2 Pool and solver

```js
Pool = { geom, species:[{id, copies, mayLeave:false, modes:[...]}] }
```

One rule covers every phase: **choose a mode for each copy so the donors bound total exactly `GEOMS[geom].n`, treating identical copies as a multiset.**

| Complication | What varies |
|---|---|
| Linkage | κN vs κO for a monodentate |
| Ionisation / hydrate | `outer` vs bound, for species flagged `mayLeave` |
| Denticity (later) | κ¹ vs κ² |

`assign(pool)` returns assignments. For k copies and d modes there are C(k+d−1, d−1) multisets, so [M(NH₃)₃(NO₂)₃] gives 4, not 8. Mixed N/O is one form, because the copies are indistinguishable. The geometry enters here for ionisation and hydrate, since the coordination number decides which splits fit. Guard the combinatorics (cap at about 200 assignments, with a message) because composed complications multiply.

### 4.3 Lowering

`lower(assignment) → {mono, chel, letterOf, skin}`.

- Allocate engine letters contiguously from `A`, in a canonical order, so `speciesKey` dedupes.
- `letterOf` records which (species, mode) each letter stands for.
- **Two assignments can lower to the same engine formula** (NN and OO both give MA₄B₂) yet are different compounds. They share one analysis but must stay separate variants. Do not key variants by `speciesKey`; key them by the assignment.

### 4.4 Evaluation and the family result

```js
evaluate(assignment) → { assignment, A: analysisFor(geom, mono, chel), skin, outer, charge }
family(pool) → { variants[], parent?, matrix?, tally:{forms, geometric, pairs, stereo} }
```

- `analysisFor` (line 2177) already analyses and caches arbitrary formulas for the Builder. Reuse it as is; register new isomers in `isoById` as it does.
- `parent` exists only when every assignment differs by a monodentate donor choice (pure linkage). It is the lowering with all modes of a species merged into one letter. For each child isomer, merge the letters back, take `canon(cfg, G.rots)`, and look it up in the parent's isomers. That is the matrix. For ionisation and hydrate there is no parent (different inner spheres are different formulas), so show a flat list grouped by inner-sphere composition, with charge and counter-ions.
- Keep **two levels of count** and never add them silently: structural forms, then stereoisomers within each. The headline reads "3 linkage forms, 6 stereoisomers", never a bare "6 isomers".

### 4.5 Skin: separating engine letters from what is drawn

Engine labels stay single characters. A `skin` maps each letter to display text, a donor-atom index, and a hue. It rides along on the `disp` object (`{iso, cfg, q, skin}`), and defaults to identity so nothing existing changes.

- `drawMolecule` (line 1677) draws `skin[X].text` instead of `X`. The two linkage forms of one species share a hue family (same ligand, different atom) under "colour ligand labels".
- Label clearance (`clrL`, `clrM`, line 1613) is currently a fixed radius sized for one character. It must become width-aware for `NO₂`/`ONO`/`SCN`. The knock-out circle becomes a pill.
- Show the donor atom: bond terminates at it, and it is set bold/underlined. Chemists write `O₂N–M` on the left and `M–NO₂` on the right; anchoring the donor glyph at the bond tip does this automatically. Fallback if that proves fiddly: centred text with the donor atom accented.
- `mirrorDisp` and `loadInto` must copy `skin`.

## 5. Small changes to existing code

All backward compatible, and each checkable against the 248 existing labels staying byte-identical.

1. `rsLabel`: use the four distinct labels in sorted order instead of the literals `A`–`D`.
2. Name builders (`monoParts`, `nameIso`, `transPairs`, the `toward` helper in `analyzeCase`) take an optional `lbl(letter)` hook so variant names read "NO₂ trans, ONO cis" instead of "B trans, C cis". Default is identity. This is better than regex post-processing, because names contain letters inside ordinary words.
3. R/S on tetrahedral variants: the app's convention is hypothetical priorities A > B > C > D. Under a skin the letters are arbitrary, so keep the existing caveat or fall back to the I/II labels. Do not imply real CIP.
4. `drawMolecule` and `View.load`: skin support as in 4.5.
5. Add `/*ENGINE-BEGIN*/ … /*ENGINE-END*/` markers around sections 1 and the new layer so a test can slice them out.

## 6. UI

- **Entry point:** a "Complicate this formula" block in the Explore case body, beside the existing "One substitution away" list (which is already a one-step version of this idea; `MODE_SWAPS` and the N–H modes are earlier "complications" in the same spirit). On a phone it is one more screen type on the `M.stack`, not a new tab: the tab bar is already five wide. On desktop, a modal like the Builder and Inspector.
- **Panel contents:** (1) base formula with each ligand a tappable chip: "make ambidentate", "may leave the sphere", "reset"; (2) the tally as a before → after line ("2 → 6 stereoisomers"); (3) the **matrix**, with rows being the base formula's geometrical isomers and columns the binding assignments, each cell a count and a tap-through that loads the isomer into Viewport 1/2 with its skin; (4) a short generated sentence per geometry saying *why* (for example "mixed S/N binding gives four different donor environments, so a tetrahedron becomes chiral").
- **Presets:** [Co(NH₃)₄(NO₂)₂]⁺, [Co(en)₂(NCS)₂]⁺, [Cr(H₂O)₆]Cl₃ and friends, so the panel is useful before anyone types anything.
- **Deep links:** `#x:<geom>:<pool>` alongside the existing `#<case id>`.
- **Builder:** after phase 1, a Builder drawing with a recognised ambidentate gets "this is one of N linkage forms" in its status line.
- **Quiz:** new question types behind a toggle, off by default, using the same pattern as `Q.nh`. Existing "how many stereoisomers" questions are unchanged.

## 7. Phasing

| Phase | Deliverable | Risk |
|---|---|---|
| 0 | Headless test harness (below), `rsLabel` hardening, `lbl` hook, skin plumbing as a no-op | Low; proven by label-identity test |
| 1 | Linkage for monodentate ambidentates: catalogue, solver, lowering, family view, skin drawing, presets | Drawing of long labels is the real work |
| 2 | Pool with `mayLeave`: ionisation and hydrate, charge and counter-ion display, typed-formula recognition, deep links | Chemically defensible defaults for what may leave (anions and water yes, NH₃ no) |
| 3 | Quiz types, Builder status line | Low |
| 4 | κ¹/κ² modes and ambidentate chelate ends; scope a two-sphere "compound" object before attempting coordination isomerism | Pattern handling inside `lig()` strings |

## 8. Verification

The repo has no tests today, and counts are correct "by construction" only as long as nothing disturbs the engine. Add one dependency-free Node script (`tests/engine.mjs`, run with `node`) that slices the marked engine region out of `index.html` and evaluates it. I did exactly this for the prototype in about ten lines. `index.html` stays the only shipped file.

Checks:

- **No regression:** hash of every bank formula's `(count, label, point group)` list is unchanged after phase 0.
- **Golden numbers:** the table in section 2.
- **Invariants:** family total equals the sum of its variants; the projection is total and single-valued; every lowered formula is a bank formula (372/372 today).
- **Bound:** mixed N/O counted once; NN and OO counted as two forms though they share one analysis.

## 9. Decisions I have made, and the ones that are yours

Made, with reasons above: families are a computed view and never added to the bank or finder; two-level counts; recognise typed `NO2`/`ONO` pairs; defer coordination isomerism.

Yours:

1. **Abstract vs named first.** I would build the abstract "make B ambidentate" mode as the core and chemistry names as presets. If you would rather it only ever show real ligands, the catalogue is the whole feature and the abstract mode can be dropped.
2. **Is a model that counts what connectivity allows enough?** Like the N–H family, this ignores stability and extra structure: nitrito syn/anti rotamers, κ²-O,O nitrito, bent versus linear M–SCN, and the HSAB preference that decides which linkage form actually forms. I would state this in the panel, as the N–H notes already do, rather than model it.
3. **Vocabulary.** The existing text for square-planar MABCD says these are "often loosely called structural isomers, but strictly they are geometric". Once the app has a real structural layer, that sentence gets more prominent, not less, so the panel should define *structural* (different atom or species bonded to M) against *stereo* (same bonds, different arrangement) up front.

## 10. Aside, unrelated to the feature

The no-JS fallback in `index.html` (line 544) links to `voidoro.github.io/isomers`, while the README and git remote use `voidory`. That looks like a typo and would send anyone using a preview that disables JavaScript to the wrong address. Not changed here.
