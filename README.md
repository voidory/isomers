# Isomer Sketchbook

Coordination-compound isomers drawn the way an exam paper draws them, which you can turn in 3-D with your finger or mouse.

**Open it:** https://voidory.github.io/isomers/

**Scope:** a clean rigid-body model. Every complex is an idealised, fixed polyhedron (octahedron, square plane or tetrahedron), and the app counts *configurations*: which donor sits at which vertex, up to rotation. It does not model conformers (chelate-ring pucker, chain twists), N–H configurations at coordinated amines, strain, or fluxional molecules. Trien and cyclam are therefore the generic chain and macrocycle formulas, without N–H stereocentres. Five-coordinate shapes were tried and taken out for that reason (see `docs/five-coordinate-berry-plan.md`).

- **Explore** every isomer of the common octahedral, square-planar and tetrahedral formulas, with point groups and chirality.
- **Find** a formula by typing it, abstractly (`MA2B2`, `M(AA)2B2`, `M(ABA)merC3`) or as a real complex (`[Co(en)2Cl2]+`, `Pt(NH3)2Cl2`, `[Co(dien)Cl3]`), or filter by shape, ligand denticity and kind of isomerism. Press `/` to search; link straight to a formula with `index.html#<id>`.
- **Compare** two drawings and test whether they superimpose, with a live mirror image.
- **Build** a structure from an exam drawing and see which isomer it is.
- **Complicate** an isomer: show a linkage, ionisation, hydrate or κ¹/κ² variant beside it, marked as altered (dashed frame, ringed ligand, the ion outside the sphere written under it). Only ligands that really show the behaviour are offered: nitrite, thiocyanate and cyanide for linkage; Cl⁻, Br⁻, I⁻, NO₃⁻, SO₄²⁻ and water for ionisation and hydrate; nitrate, acetate, carbonate and sulfate for κ¹/κ². Typing `[Co(NH3)4(NO2)(ONO)]` offers the linkage forms.
- **Learn**: the quiz plus lessons. The quiz asks about real, exam-style complexes such as [Co(en)₂Cl₂]⁺ by default: each abstract ligand is played by a real ligand of the same symmetry type (en, ox, gly, dien, terpy, tacn, trien, tren, cyclam, porphyrin, NH₃, Cl⁻ …), so the counts are unchanged. A switch brings back the abstract letters (MA₄B₂). It counts stereoisomers, geometric isomers or enantiomer pairs, and optionally the total when one ligand is ambidentate. Lessons is a scaffold of small modules (a ligand glossary and a key to abstract formulas so far; more are planned), linkable as `#learn/<id>`.

The whole app is the single file `index.html`. It needs no server and works offline once loaded.

Tests (no dependencies): `node tests/engine.mjs` checks the chemistry engine against a snapshot of every formula's counts and names.
