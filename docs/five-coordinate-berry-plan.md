# Five-coordinate shapes and Berry pseudorotation: architecture plan

Status: **phases 0 to 2 are built** (edge rule and hooks, the static trigonal bipyramid, the Berry layer with its UI and Compare relation), with tests; phases 3 to 5 are not. The four owner decisions in section 7 are settled.

| Phase | State |
|---|---|
| 0 Edge-rule tolerance, descriptor hooks, id-based bank test | done |
| 1 Static TBP: shape, drawing, naming, generator, finder, Builder (kept out of the quiz) | done |
| 2 Berry layer: sets, chirality rule, ring blocking, panel block, Compare relation | done |
| 3 Berry animation | not started |
| 4 Square pyramid shape | not started |
| 5 Variable-coordination-number families (separate decision) | not started |

What changed from the plan while building: moves that put a ring across two equatorial sites are rejected inside `berrySets` (as designed), and the TBP's chelate formulas include tridentate chains in both flexible and mer-only forms. The static counts match the prototype (39 formulas). The Berry-set counts were corrected afterwards (see the note in 2.2): 15 of the 32 chelate formulas keep several sets; the numbers are now asserted by `node tests/engine.mjs`, with golden files `tests/golden-tbp.json` and `tests/golden-berry.json`. Every number below comes from a throwaway prototype run against the real engine, headlessly, with a trigonal bipyramid injected into a copy of it. The prototype is not in the repository.

## 1. The point

A five-coordinate complex is not just a fourth shape. Its trigonal-bipyramidal (TBP) and square-pyramidal forms interconvert by **Berry pseudorotation**: the two axial ligands and two of the three equatorial ligands swap roles, passing through a square pyramid. For most formulas this makes the isomers a static counting of the engine would produce *experimentally indistinguishable*: PF₅ and Fe(CO)₅ show one NMR environment.

So the feature has two layers, and the second is the interesting one:

1. **A static TBP shape**, counted exactly like the other shapes (rotations, point groups, chirality).
2. **A Berry layer** that groups the static isomers into *fluxional sets* (isomers that interconvert by pseudorotation), says which sets are chiral, and says what blocks the motion.

The app's 3-D viewport suits this unusually well: the pseudorotation can be *animated*.

## 2. What the prototype established

### 2.1 The existing engine handles the shape

With one new entry in `GEOMS` (axial at ±y, three equatorial sites 120° apart, one in the mirror plane x = 0 so the engine's σ is a symmetry) and a drawing template, the **unmodified** enumerator, orbit, chirality and point-group code gave the right static counts and groups: D₃h for MA₅, C₃ᵥ and C₂ᵥ for MA₄B, then 3, 4, 6, 10 and 20 stereoisomers for MA₃B₂, MA₃BC, MA₂B₂C, MA₂BCD and MABCDE. These agree with an independent permutation calculation (6 rotations, D₃, so 5! / 6 = 20).

### 2.2 Berry moves, and what they do to the counts

> **Correction (made while building the animation).** Phases 0 to 2 first modelled a Berry move as the double swap (ax₁ eₐ)(ax₂ e_b), an even permutation, and concluded that "Berry moves preserve handedness, so five different ligands split into two mirror-image sets of 10". That was wrong. Writing the animation forced the real motion to be computed from the coordinates, and a rigid motion of the ligands, turned back onto the shape's sites, gives a **4-cycle** (ax₁ eₐ ax₂ e_b), an odd permutation. It equals the double swap followed by a mirror reflection, so the double swap alone produced the *mirror image* of what really happens, and with it the wrong sets. The literature agrees with the corrected version: the 20 isomers form one connected reaction graph (the Desargues–Levi graph, 30 edges) and the enantiomers sit in the same component (Merx et al. 2004; van der Boon et al. 2018). The tables and tests below are the corrected ones.

A Berry move with pivot p (an equatorial site): the two axial ligands swing down to equatorial, the other two equatorial ligands swing up to axial, through a square pyramid with the pivot at its apex. The moves are computed from the shape's coordinates (`berryPose`, `berryPerm`), not typed in. Each move is a rigid motion, so it never changes handedness *while it lasts*, but the chain of moves around different pivots can arrive at the mirror image. Derived from the geometry and applied to each isomer:

| Formula | Static isomers | Berry-linked sets | Notes |
|---|---|---|---|
| MA₄B | 2 | 1 | B axial and B equatorial are one fluxional species |
| MA₃B₂ | 3 | 1 | |
| MA₂B₂C | 6 | 1 | includes a chiral pair, which racemises in 1 move |
| MA₂BCD | 10 | 1 | includes 3 chiral pairs, which racemise (shortest route 2 moves) |
| **MABCDE** | **20** | **1** | **one set that contains all the mirror-image pairs; the shortest route from a configuration to its mirror image is 5 moves** |

The reaction graph for MABCDE is 3-regular on 20 vertices with 30 edges, as in the literature. What a ring does to this is section 2.3.

### 2.3 Chelate rings block moves, and this is forced, not a choice

On the TBP a chelate can span axial–equatorial (90°) but not equatorial–equatorial (120°). A Berry move whose pivot is the equatorial end of a chelate that also has an axial end would put the ring across two equatorial sites. Such an arrangement is not an isomer at all, so the move is excluded by definition. Over the 32 chelate formulas the generator produces, **every one has blocked moves** (2 to 32 blocked isomer-and-move pairs per formula), and 15 of them split into several Berry sets, i.e. their isomers stay separate on this model; the other 17 still collapse to one set. Examples: a tripodal tetradentate such as tren with one extra ligand has its single isomer with every move blocked (1 static, 1 set); trien-type [M(ABBA)X] has a chiral pair that does interconvert (2 static, 1 set that racemises); [M(ABCD)X] keeps 2 sets of 2; [M(ABA)X₂] still forms one set of 2 to 3. That fits the usual picture of tripodal ligands holding a TBP in place, though the app only counts connectivity and does not model the barrier.

### 2.4 Size

The generator yields **39 TBP formulas** (7 monodentate-only with 46 stereoisomers, 32 with chelates with 108; 154 in all) on top of the existing 248. Small, so the finder does not need restructuring.

### 2.5 What breaks (the real work)

Run through the existing code, the TBP exposed four problems, all in the descriptive layer, none in the counting:

- **Chelate edges.** `G.edges` (line 905) takes site pairs with cosine > −0.5. Equatorial sites are exactly −0.5 apart, so floating-point noise put *one* equatorial–equatorial edge in the list and not the other two. This silently broke the symmetry of every chelate placement. Fixed in the prototype with a tolerance (`> -0.5 + 1e-6`), after which TBP edges are exactly the six axial–equatorial pairs and Td, SP, Oh are unaffected.
- **`transOf`** (line 904) is −1 for equatorial sites. Seven places use it (N–H geometry, planar test, `transPairs`, `monoParts`, `nameIso`). On the TBP they produce nonsense such as `A–, A–` for trans pairs.
- **Naming.** `nameIso`/`monoParts` speak octahedral ("fac", "mer", "B₂ trans"). The TBP's D₃h MAAABB "B axial both" came out as "fac, B₂ trans", which is wrong.
- **Generator coverage.** `generateAll` and `MULTI_TYPES` list shapes explicitly; macrocycles and planar-only chains make no sense on a TBP and must be left out.

## 3. Scope

| Piece | Verdict |
|---|---|
| Static TBP shape | **Build** |
| Berry sets view, chirality rule, ring blocking | **Build** (this is the point) |
| Berry animation | Build, after the above |
| Square pyramid as a static shape (C₄ᵥ) | **Build later, as a shape in its own right**, and also as the animation's transition frame. The literature has isolable square-pyramidal forms (section 8) |
| Coordination-number isomers (a ligand's κ¹→κ² adding a bond, so 5 sites become 6) | Unlocked by the above; see section 4.6 |
| Barriers, which form is lower in energy | **Out.** Same stance as the rest of the app: it counts what connectivity allows |
| Other fluxional processes (turnstile, Bartell, Ugi's permutation-group theory generally) | Out |

## 4. Architecture

### 4.1 The TBP shape (the static layer)

New `GEOMS.TBP`, `TEMPLATES.TBP`, `LAYOUTS.TBP`, an icon, and the shape added to `GEO_ORDER`, the Builder's shape buttons, the quiz filters, `generateAll`, and `MULTI_TYPES`.

```js
TBP:{ id:'TBP', name:'Trigonal bipyramidal', sym:'D<sub>3h</sub>',
      sites:[[0,s,0],[0,-s,0],[0,0,s],[s*.866,0,-s/2],[-s*.866,0,-s/2]],   // 0,1 axial; 2,3,4 equatorial
      axial:[0,1], equatorial:[2,3,4], ... }
```

Engine changes, all small and backward compatible, each guarded by the existing bank snapshot:

1. **Edge rule** with a tolerance, as in 2.5.
2. **A per-shape descriptor object**, replacing the scattered `transOf` uses: each shape supplies `G.describe(cfg,lbl)` returning the name and the trans/axial text. Octahedral, tetrahedral and square-planar keep their current code behind it. The TBP's descriptor names isomers by occupancy ("B axial, B equatorial", "B₂ axial"), lists axial ligands separately from equatorial ones, and for chelates names which sites a ring spans. Chiral cases keep the engine's I/II fallback.
3. `transOf` guarded for equatorial sites (−1) wherever it is still read.
4. **Generator:** `MULTI_TYPES.TBP` = bidentate AA/AB; tridentate flexible and mer-type chains; tetradentate chains and tripods. No macrocycles, no planar-only modes. Impossible combinations are dropped as today.
5. **Bank snapshot test:** currently asserts the bank has exactly 248 entries. Change it to compare the 248 existing ids and give the TBP its own golden file, so the existing shapes are still proven unchanged.

### 4.2 The Berry layer

Pure functions over an analysis, in the marked engine region, headlessly testable.

```js
berryMoves(G)            // derived from the geometry: for each equatorial pivot, swap the axial pair with the other two equatorials
berrySets(A)             // → { sets:[{isos, chiral, racemises}], blocked, rule }
```

- Moves come from the shape, not hand-typed: `G.axial` and `G.equatorial` are enough. The two senses of a pivot are inverse moves; both are included.
- A move is applied to each isomer's configuration, rejected if any chelate edge no longer lies on a shape edge (2.3), otherwise canonicalised under the rotations and joined with the isomer it reaches (union-find).
- A set is **chiral** when its mirror image is a different set; it **racemises** when it contains its own mirror image. The UI explanation is generated from this, from the sets and the shortest route to the mirror image, not a fixed sentence.
- `berrySets` knows nothing about drawing, so it also works on the structural layer's variants (each binding form gets its own sets).

### 4.3 UI

- **Finder and Explore:** TBP appears as a fourth shape with its own families (the existing family grouping applies). A formula's case body gets a **"Berry pseudorotation"** block: *20 static isomers → 2 fluxional sets*, the sets listed with their members loadable into the viewports, and the generated reason ("MABCDE: no two ligands identical, so pseudorotation cannot racemise"; "chelate ring blocks 8 of 12 moves").
- **Compare:** a new relation between two static isomers of the same formula, alongside "identical", "enantiomers" and "diastereomers": **"interconvert by Berry pseudorotation"** when they share a set, with the diastereomer text kept for the static difference. The existing stamp code branches on `key`/`mirrorKey`, so this is one more branch.
- **Builder:** TBP as a shape button, with a layout that looks like a textbook axial/equatorial drawing.
- **Quiz:** unchanged. Berry is not what exams count; leave it out unless the owner asks.
- **Vocabulary for the five-coordinate shapes:** the static count is called **configurations**, the Berry count **fluxional sets** (observable species), e.g. *20 configurations → 2 fluxional sets*. Isomers are defined by structure, not by how fast they interconvert, so the shapes' configurations are still isomers; the new words just say which count corresponds to something one could observe or separate. The other shapes keep "stereoisomers".
- **Presentation default:** show both numbers side by side. Leading with the static count alone would repeat the counts that are observably wrong for most TBP formulas; leading with the Berry count alone would hide the shape's real isomers.

### 4.4 Animation

The viewport rotates a rigid molecule; Berry needs the sites themselves to move.

- **Path.** Put the pivot on the C₂ axis (+z). The initially equatorial pair sits at (±sin β, 0, cos β); the initially axial pair at (0, ±sin γ, cos γ). Run β: 120° → 100° → 90° and γ: 90° → 100° → 120°. At the midpoint both pairs are 160° apart and 100° from the pivot (the other angle is 88°): a square pyramid. At the end the roles have swapped. I checked these angles by arithmetic; the animation itself is not prototyped.
- **Rendering.** `drawMolecule` takes site positions from `G.unit`. Add an optional `disp.unit` override (same shape as the skin override already added), used for bonds, wedges, hashes and chelate bridges. Labels, halos and clearance code stay untouched.
- **Controller.** A `View.berry(pivot)` that interpolates, then on completion replaces `disp.cfg` with the permuted configuration, re-seats the orientation so the picture is continuous, and clears the override. A "Berry" button appears in the viewport tools for TBP isomers only; disabled, with the reason, when rings block every pivot.
- **Risk.** Chelate bridges are drawn from the site positions, so mid-path they need to stay readable; this is the part to prototype first.

### 4.5 The square pyramid (later): a shape, and the transition frame

A static C₄ᵥ shape with an apex and four basal sites, chelate edges apex–basal and adjacent basal–basal. It has two roles:

- **A shape in its own right.** The literature has square-pyramidal five-coordinate complexes that are stable and isolable, including one compound isolated as *both* a square-pyramidal and a trigonal-bipyramidal form (section 8). The app already names this relation: two shapes for one formula are "polytopal (allogon) isomers" in the Compare stamp, and that wording is kept. For the same formula, a TBP isomer and an SPy isomer are polytopal isomers of each other; that the two interconvert is shown as the Berry relation, not hidden.
- **The transition frame** in the animation (4.4).

Each SPy configuration joins two TBP isomers (the apical ligand is the pivot; either basal trans pair can open to become axial), giving a bipartite graph between the two shapes, which the Berry layer exposes. As elsewhere, the model says nothing about which is lower in energy, and the panel says so; section 8 shows that either can be the minimum.

**Labelling.** The square pyramid carries a short note wherever the shape is named (shape list, Explore panel, Builder): *an idealised shape, often a transition state or intermediate on the Berry path, but stable in some complexes.* It is deliberately not tagged as less real than the trigonal bipyramid, which is equally idealised: most TBP configurations also collapse into fluxional sets, and real five-coordinate structures lie on a continuum between the two (section 8).

### 4.6 Coordination-number isomers (what this unlocks)

The structural layer holds the number of sites fixed because each shape has a fixed number. With TBP and square pyramid present, the shape can follow the site count: 4 → Td or SP, 5 → TBP or SPy, 6 → Oh. The pool solver can then drop its "sphere is full" rule and let each inner composition choose its shape. That is exactly the case skipped earlier: [M(κ¹-X)A₄] (five sites) against [M(κ²-X)A₄] (six), compared across shapes, with Berry sets inside the five-coordinate members. It is a modest change to `structuralFamily` once the shapes exist, but it is a separate decision and is not part of this plan's build phases.

## 5. Verification

- **No regression:** the existing 248 bank entries stay byte-identical (the snapshot test, adapted as in 4.1).
- **TBP golden file:** the 39 formulas' counts and names.
- **Static counts:** 1, 2, 3, 4, 6, 10, 20 for the monodentate formulas, as above.
- **Berry invariants:** every move maps isomers to isomers or is rejected; the sets partition the isomers; the set of a chiral isomer's mirror image is the mirror set; for monodentate formulas the number of sets is 1, and for five different ligands the reaction graph is 3-regular with 30 edges; every move is a 4-cycle (odd), equal to the double swap followed by the axial mirror (checked, not assumed).
- **Ring rule:** every chelate formula either has a set count and blocked count equal to the prototype's, or the test fails.
- **Animation:** the path's endpoints are the TBP before and after, to numerical tolerance; the midpoint is a C₄ᵥ pyramid.

## 6. Phasing

| Phase | Deliverable | Risk |
|---|---|---|
| 0 | Edge-rule tolerance, `G.describe` refactor, test restructuring. No behaviour change. | Low, proven by the snapshot |
| 1 | Static TBP: shape, drawing, naming, generator, finder, Builder | Naming is the work |
| 2 | Berry layer and its UI (sets, chirality rule, ring blocking, Compare stamp) | Low; the maths is prototyped |
| 3 | Animation | Chelate bridges mid-path |
| 4 | Square pyramid shape | Moderate; more descriptors |
| 5 (separate decision) | Variable-coordination-number families | Presentation, not engine |

Stopping after phase 2 is a complete, useful feature.

## 7. Decisions (settled)

1. **Berry view.** Both numbers shown together, static first (consistent with the other shapes), with the Berry reading one tap away.
2. **Ring blocking.** Kept: a ring may not end up spanning two equatorial sites. Stated in the panel, no switch.
3. **Square pyramid.** A shape in its own right (phase 4) and the animation frame, on the evidence in section 8.
4. **Quiz.** Nothing for the quiz. The Berry view is an explore feature, for interest.

## 8. Literature behind decision 3

The question was whether a square-pyramidal form is ever a stable, isolable structure, and not only a transition state of the Berry path. It is:

- Dicyanotris(5-methyl-5H-dibenzophosphole)nickel(II) was isolated as **two allogon isomers** from different solvents: one tetragonal-pyramidal (a phosphole ligand at the apex, cyanides bent away at 141°), one trigonal-bipyramidal (axial cyanides at 176°). Powell, H. M. et al., *J. Chem. Soc. A*, 1971, DOI 10.1039/j19710001803.
- A large chromium–nickel–cyanide cluster contains square-pyramidal and trigonal-bipyramidal [Ni(CN)₅]³⁻ units together. Sokol, J. J. et al., *Angew. Chem. Int. Ed.*, 2001, DOI 10.1002/1521-3773(20010105)40:1<236::aid-anie236>3.0.co;2-c.
- Copper(II) generally stabilises an elongated square pyramid, slightly preferred to a compressed trigonal bipyramid; the surface is flat and packing can shift it. Reinen, D. et al., 1989, DOI 10.1016/0301-0104(89)80126-0.
- Berry pseudorotation observed directly: in a five-coordinate ruthenium complex two square-pyramidal isomers exchange through a trigonal-bipyramidal intermediate, a barrier of about 2 kcal/mol and a time constant of a few picoseconds. Porter, T. M. et al., *Chem. Sci.*, 2018, DOI 10.1039/c8sc03258k.

Two cautions follow and belong in the panel's wording. First, isolation in a crystal is not the same as being separate in solution: the same complexes can exchange in solution on very short timescales. Second, an ideal square pyramid is the exception: most complexes sit between the two shapes on a continuum (Blackman, A. G. et al., *Dalton Trans.*, 2020, DOI 10.1039/d0dt02985h). The app's idealised shapes are the two ends of that continuum, which is consistent with how it treats every other shape.

I searched for the classic report of both [Ni(CN)₅]³⁻ shapes in one crystal and could not confirm it, so it is not cited.
