# Isomer Sketchbook: an interactive 3D viewer and quiz for coordination complex isomers

**Isomer Sketchbook** is a free, browser-based tool for learning **isomerism in coordination chemistry**. It draws every **stereoisomer** of a transition-metal complex the way an exam paper draws it (wedges, hashes, chelate rings), and you can rotate each one in 3D with a finger or mouse. You can count **geometric (cis/trans, fac/mer) and optical isomers**, check whether two structures are **enantiomers**, and practise with an isomer-counting quiz.

**Open it:** https://voidory.github.io/isomers/

No install, no account, and it works offline once loaded. It runs on phones, tablets and desktops.

## Who it is for

Students and teachers of inorganic chemistry: A-level, IB, AP Chemistry and first- and second-year university courses. It covers the isomer questions on transition-metal complexes that come up in exams, and lets you check your answers.

## What you can do

### Explore every isomer of a complex in 3D
- Every isomer of the common **octahedral**, **square-planar** and **tetrahedral** formulas: 239 of them, from MA₄B₂ and MA₃B₃ to chelates such as M(AA)₃ and tetradentate ligands.
- The **point group** and symmetry elements of each isomer, and whether it is **chiral** or achiral, with Δ/Λ and R/S labels.
- Search by abstract formula (`MA2B2`, `M(AA)2B2`, `M(ABA)merC3`) or by a real complex (`[Co(en)2Cl2]+`, `Pt(NH3)2Cl2`, `[Co(dien)Cl3]`). Filter by shape, ligand denticity and kind of isomerism. Press `/` to search.

### Compare two structures: identical, enantiomers or diastereomers?
- Put two drawings side by side. The app says whether they are the same compound, **enantiomers** (non-superimposable mirror images) or **diastereomers**.
- **Superimpose** turns one molecule onto the other, so you can see it match, or see where it fails.
- A live **mirror plane** shows any molecule's mirror image as you turn it.

### Build a structure from an exam drawing
Place the ligands on a drawn octahedron, square plane or tetrahedron. The app identifies which isomer you have drawn.

### Structural isomers: linkage, ionisation, hydrate and denticity
**Complicate this** shows a structural isomer beside the original, with the change marked. It only offers ligands that genuinely show the behaviour:
- **Linkage isomers:** nitrite (NO₂⁻ nitro / ONO⁻ nitrito), thiocyanate (SCN / NCS), cyanide (CN / NC).
- **Ionisation isomers:** Cl⁻, Br⁻, I⁻, NO₃⁻ or SO₄²⁻ trading places with a counter-ion, as in [Co(NH₃)₅Br]SO₄ and [Co(NH₃)₅(SO₄)]Br.
- **Hydrate (solvate) isomers:** water inside or outside the sphere, as in the CrCl₃·6H₂O series.
- **Denticity (κ¹/κ²) isomers:** nitrate, acetate, carbonate or sulfate bonding through one oxygen or two.

### Coordination isomers and bridged dimers
Under **Salts & bridged dimers** in the formula list:
- **Coordination isomers:** textbook pairs such as [Co(NH₃)₆][Cr(CN)₆] / [Cr(NH₃)₆][Co(CN)₆] and [Co(en)₃][Cr(ox)₃] / [Cr(en)₃][Co(ox)₃], where the two metals swap their whole ligand sets. The cation sits in Viewport 1 and the anion in Viewport 2; the count is the number of salts times every pairing of a cation stereoisomer with an anion stereoisomer. A series where swapping changes nothing ([Pt(NH₃)₄][PtCl₄]) is included to show that case.
- **Bridged dimers, simple cases only:** a single-atom or rigid straight bridge (μ-OH, μ-O, μ-pyrazine) that turns freely adds no isomerism, so each half is an ordinary complex with the bridge as one more ligand (ringed in the drawing), and the count is the number of pairings of half stereoisomers (unordered when the halves are identical). Three examples are named compounds; three are marked as illustrations of the counting rule.

### Learn: an isomer-counting quiz and lessons
- **Quiz:** "How many stereoisomers does … have?", plus geometric isomers, enantiomer pairs, and two optional structural types (off until chosen under "ask about"): **+ linkage isomers** (total isomers when a ligand such as nitrite can bond through either of two atoms) and **+ ionisation isomers** (total isomers when a ligand and a free ion, or water and a halide, can trade places). Two more optional types, **+ coordination isomers** and **+ bridged dimers**, ask for the total over the examples above. All four structural types draw every ion, half or form after you answer.
- **Adaptive practice:** the quiz follows how you have been answering. Each question exercises four skills (shape, ligand family, chiral pairs, question type). How hard a question is comes from its structure, not from the size of the answer: how many arrangements must be found and told apart, how little symmetry they have, what the chelates can do (an unsymmetric chelate has two ends; a flexible tridentate goes fac or mer), whether chirality is present and whether it is hidden (no chelate propeller to see), the extra step a question type adds, and whether real ligands must be decoded first. Each skill's estimate moves by how surprising an answer was, so a hard question answered well counts for more than an easy one, a multiple-choice hit counts for less than a typed one, and a formula answered right recently counts for little until it has been forgotten. Evidence about each skill fades over about a week, so skills you have not practised come back, and ones you keep missing come up more, at a difficulty where you should get roughly three in four right. New ligand families are introduced in order, and a wrong answer is diagnosed (for example, counting geometric instead of stereoisomers also counts against the chirality skill). A **Skill map** button shows where you stand; it is hidden until you ask. **Save progress** downloads a small `isomer-progress.json` and **Load progress** merges one back in, so you can move between devices. Everything stays on your device.
- Questions use **real, exam-style complexes** with real ligands and charges, such as [Co(en)₂Cl₂]⁺, [Pt(NH₃)₂Cl₂] or [Co(trien)(gly)]²⁺. You can switch to **abstract formulas** (MA₄B₂, M(AA)₂B₂) instead.
- After each answer, every isomer is drawn and explained. You can send any of them to the Compare viewports.
- **Lessons:** a ligand glossary (en, ox, bipy, phen, acac, gly, dien, terpy, tacn, trien, tren, cyclam, porphyrin and more) and a guide to reading abstract formulas. More lessons are planned.

## Common questions it answers

| Complex | Isomers |
|---|---|
| [Pt(NH₃)₂Cl₂] (cisplatin / transplatin), square planar MA₂B₂ | 2: cis and trans |
| [Co(NH₃)₄Cl₂]⁺, octahedral MA₄B₂ | 2: cis and trans |
| [Co(NH₃)₃Cl₃], octahedral MA₃B₃ | 2: fac and mer |
| [Co(en)₂Cl₂]⁺, octahedral M(AA)₂B₂ | 3: trans, plus a cis pair of enantiomers (Δ and Λ) |
| [Co(en)₃]³⁺, octahedral M(AA)₃ | 2: the Δ and Λ enantiomers |
| Square-planar MABCD | 3 geometric isomers, none chiral |
| Tetrahedral MABCD | 2: a pair of enantiomers (R and S) |
| Octahedral MA₂B₂C₂ | 6: five geometric isomers, one of them chiral |
| Octahedral MABCDEF | 30: fifteen pairs of enantiomers |

Each one can be opened, turned and checked in the app.

## Scope and limitations

The app uses a clean **rigid-body model**. Every complex is an idealised, fixed polyhedron (octahedron, square plane or tetrahedron), and the app counts *configurations*: which donor atom sits at which vertex, up to rotation. That is how isomers are counted in exams and textbooks.

It does not model:
- **edge- or face-sharing bridges** (di-μ-halido dimers such as Al₂Cl₆, di-μ-hydroxo): two bridges lock the geometry and couple the two halves, which adds isomerism this app does not count. Only freely turning single-bridge dimers are included, pending whether a module needs more
- **partial ligand redistribution** between two complexes, and **polymerisation isomerism** ([Pt(NH₃)₂Cl₂] versus [Pt(NH₃)₄][PtCl₄] and its relatives); coordination isomers here are the whole-set swap only
- **ligand isomerism** (isomeric ligands)
- conformers (chelate-ring pucker, chain twists)
- N–H configurations at coordinated amines
- ring strain
- fluxional molecules

Five-coordinate shapes (trigonal bipyramid and Berry pseudorotation) were built and then removed for that reason; see `docs/five-coordinate-berry-plan.md`. Charge, conductivity and which isomer is more stable are not modelled either.

## For developers

- The whole app is the single file `index.html`, with no build step, no server and no dependencies.
- Link straight to a formula with `index.html#<id>`, and to a lesson with `#learn/<id>`.
- Tests, also dependency-free: `node tests/engine.mjs` checks the isomer-counting engine against a snapshot of every formula's counts and names, and tests the structural-isomer and real-ligand layers.
- Design notes are in `docs/`. An archived counting-table view, kept for a future lesson, is in `docs/archive/`.
