# Structural isomerism: architecture plan

Status: **all four phases are built**; phase 4 is only the denticity half (see below). Phases 0 to 2 have headless tests; phase 3 is quiz and Builder UI, checked in a browser. Numbers below were first produced by a throwaway prototype against the unmodified engine, and are now asserted by `node tests/engine.mjs`.

| Phase | State |
|---|---|
| 0 Test harness, `rsLabel` hardening, naming hook, skin plumbing | done |
| 1 Abstract ambidentate letters: solver, lowering, family panel, tagged labels, Compare stamp | done |
| 2 Ionisation / hydrate pools, named presets (NO₂/ONO, SCN/NCS, CN/NC), typed linkage pairs in the finder, deep links | done (see below for what was narrowed) |
| 3 Quiz question (total isomers), Builder hook | done |
| 4 κ¹/κ² denticity within the sphere model | done |
| 4b Ambidentate chelate ends | not planned |
| 4c True coordination-number change (needs 5-coordinate shapes, which are fluxional by Berry pseudorotation) | not planned: five-coordinate shapes were built and then removed to keep the rigid-body scope, see [five-coordinate-berry-plan.md](five-coordinate-berry-plan.md) |

### Phase 4: denticity, what was built

- **Inside the existing sphere model.** A ligand marked "may bond κ¹ or κ²" bonds through one atom (one site) or two (a symmetric chelate, two sites). The pool solver now counts, per ligand, how many copies are κ¹ and how many κ²; the sphere must still total the shape's sites, so another ligand has to give way. `structuralFamily(base, amb, {outside, mobile, chelate})`.
- **Worked example, tested:** [M(X)₂(NH₃)₄] on an octahedron, X κ¹ or κ², NH₃ allowed to give way: 4 inner spheres (2 + 2 + 3 + 1 = 8 stereoisomers): [MA₄X₂], [M(κ²-X)A₃X], [M(κ²-X)₂A₂] (trans, Δ, Λ), [M(κ²-X)A₄].
- κ¹ and κ² donors are treated as different environments (a κ¹ ligand has a free arm), as ambidentate donors are. A ligand is either ambidentate or κ¹/κ² in one run, not both.
- **Not done, deliberately:** a κ¹→κ² change that adds a bond with nothing leaving changes the coordination number. That needs 5-coordinate shapes, which the app does not have, and is a separate tool. Ambidentate chelate ends are also not covered.

### Phase 3: what was built

- **One new quiz question, "how many isomers in total (structural and stereo)?"**, off unless the "+ structural: ambidentate ligand" chip is chosen, like the N–H cases. There is deliberately no "how many linkage isomers?" question: the total is what exams ask, and the explanation after each answer breaks it into binding forms anyway.
- A question picks a formula with a monodentate ligand that appears at least twice (so mixed binding forms exist), and makes it ambidentate. Half the time it is abstract (x and y), half the time it is named (nitrite, thiocyanate, cyanide) in the gloss. The answer is the family's stereoisomer total.
- Hints are specific to the likely slips: the base count (always bonded one way), the number of binding forms, and the naive "forms × base count" product.
- After answering, every isomer is drawn in a row per binding form, with donor atoms marked. The full-size viewer works for these too.
- **Builder:** its result line gets "Complicate this ⇢", which opens the panel for the drawn formula over the Builder.
- Checked in a browser over 150 generated questions: the answer equals the engine total, the number of drawn isomers equals the answer, and the answer choices are unique and include it.

### Phase 2: what was built, and what was narrowed

- **One function, two independent complications.** `structuralFamily(base, amb, {outside, mobile})`: ligands may bond through several donors (`amb`), and spare copies outside the sphere may swap in (`outside` and `mobile`). Each inner-sphere composition is a group with its own binding forms and its own matrix. The panel shows both complications together, so they compose.
- **Pool, not a tab.** Ionisation and hydrate need more species than sites (CrCl₃·6H₂O is nine ligands for six sites), so the panel has a pool table (copies in the sphere, spare copies outside, may swap). It starts from the formula you opened, and the new ligand is a spare letter.
- **Presets** over the abstract donors: nitrite, thiocyanate and cyanide. Named ligands are drawn donor atom first, with the donor atom bold and underlined. This replaced the plan's idea of anchoring the bond at the donor glyph, which does not read well for vertical bonds.
- **Finder:** typing a formula that spells an ambidentate both ways (`[Co(NH3)4(NO2)(ONO)]`, `M(NO2)3(NH3)3`) shows a "Linkage isomers" card that opens the family with that form marked "your formula".
- **Deep links:** `#x?g=Oh&m=AAAABB&c=&l=B&p=SCN&o=C1&s=BC` opens the panel in a given state (geometry, monodentate letters, chelates, ambidentate letters, preset, spare copies, swappable ligands). The panel keeps the address in step with its state. This also fixed an existing bug: on a phone, `#<formula id>` links never worked, because starting the phone layout rewrote the address before it was read.
- **Narrowed:** typed ionisation formulas such as `[Co(NH3)5Br]SO4` are not recognised. They need an outer-sphere grammar in the parser and real charges for counter-ions, which is a feature of its own. Ionisation and hydrate stay abstract (letters, no charges or conductivity); only the three ambidentate ligands have names.

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

### 4.1 Binding modes: abstract first, names as presets

The core is **abstract**: a monodentate letter X becomes ambidentate with d donor atoms (x, y, z), drawn X<sup>x</sup>, X<sup>y</sup>. This is what `structuralFamily` implements (phase 1) and it is chemistry-free by design. Named ligands are a thin layer on top, still to come (phase 2): a preset is just a list of modes with display text.

```js
const SPECIES = {   // phase 2: presets over the abstract modes
  NO2: {name:'nitrite', charge:-1, modes:[{id:'N', iupac:'nitrito-κN', text:'NO₂'}, {id:'O', iupac:'nitrito-κO', text:'ONO'}]},
  SCN: {name:'thiocyanate', charge:-1, modes:[{id:'S',text:'SCN'},{id:'N',text:'NCS'}]},
};
```

`parseFormula` (`NAMED_MONO`) already tokenises `NO2`, `ONO`, `SCN`, `NCS` as separate monodentates, so typing `[Co(NH3)4(NO2)(ONO)]` already lands on the correct child formula. Phase 2 only needs to recognise them as one species, which lets the finder offer "see the linkage family". Long labels will need width-aware bond clearance in `drawMolecule`; the one-character tags of phase 1 fit inside the existing clearance.

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

## 5. Small changes to existing code (done in phases 0 and 1)

All backward compatible, and each checkable against the 248 existing labels staying byte-identical.

1. `rsLabel`: use the four distinct labels in sorted order instead of the literals `A`–`D`.
2. Name builders (`monoParts`, `nameIso`, `transPairs`, the `toward` helper in `analyzeCase`) take an optional `lbl(letter)` hook so variant names read "NO₂ trans, ONO cis" instead of "B trans, C cis". Default is identity. This is better than regex post-processing, because names contain letters inside ordinary words.
3. R/S on tetrahedral variants: the app's convention is hypothetical priorities A > B > C > D. Under a skin the letters are arbitrary, so keep the existing caveat or fall back to the I/II labels. Do not imply real CIP.
4. `drawMolecule` and `View.load`: skin support as in 4.5.
5. Add `/*ENGINE-BEGIN*/ … /*ENGINE-END*/` markers around section 1 and the structural layer so a test can slice them out. `isoById` and `analysisFor` moved inside them.
6. Added in phase 1: `formulaHTML`/`ligHTML` take the same `lbl` hook; variant cases carry a `titleHTML` and a `family` id; Compare says "structural isomers" for two binding forms of one family instead of "not isomers".

## 6. UI

- **Entry point (built):** a "Complicate it" block in the Explore case body, beside the existing "One substitution away" list (which is already a one-step version of this idea; `MODE_SWAPS` and the N–H modes are earlier "complications" in the same spirit). On a phone it is one more screen type on the `M.stack`, not a new tab: the tab bar is already five wide. On desktop, a modal like the Builder and Inspector.
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

## 9. Decisions

Made in this plan, with reasons above: families are a computed view and never added to the bank or finder; two-level counts; recognise typed `NO2`/`ONO` pairs; defer coordination isomerism.

Settled with the owner:

1. **Abstract mode is the core.** "Make B ambidentate" (donors shown as B<sub>x</sub> / B<sub>y</sub>) is what the solver, lowering and panel are built around. The chemistry catalogue (NO₂, SCN, ...) is a set of presets and display names on top of it, not a separate path.
2. **The model counts what connectivity allows, and nothing more.** No HSAB or other stability preference, no nitrito syn/anti rotamers, no κ²-O,O nitrito, no bent-versus-linear M–SCN. The panel says so in one line, as the N–H notes already do.
3. **Vocabulary is tightened.** *Structural* means a different atom or species is bonded to the metal; *stereo* means the same bonds in a different arrangement. The panel states this up front. The square-planar MABCD note in the app (`sp-mabcd`) has been reworded to match.
