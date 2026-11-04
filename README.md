# Isomer Sketchbook

Coordination-compound isomers drawn the way an exam paper draws them, which you can turn in 3-D with your finger or mouse.

**Open it:** https://voidory.github.io/isomers/

**Scope:** a clean rigid-body model. Every complex is an idealised, fixed polyhedron (octahedron, square plane or tetrahedron), and the app counts *configurations*: which donor sits at which vertex, up to rotation. It does not model conformers (chelate-ring pucker, chain twists), N–H configurations at coordinated amines, strain, or fluxional molecules. Trien and cyclam are therefore the generic chain and macrocycle formulas, without N–H stereocentres. Five-coordinate shapes were tried and taken out for that reason (see `docs/five-coordinate-berry-plan.md`).

- **Explore** every isomer of the common octahedral, square-planar and tetrahedral formulas, with point groups and chirality.
- **Find** a formula by typing it, abstractly (`MA2B2`, `M(AA)2B2`, `M(ABA)merC3`) or as a real complex (`[Co(en)2Cl2]+`, `Pt(NH3)2Cl2`, `[Co(dien)Cl3]`), or filter by shape, ligand denticity and kind of isomerism. Press `/` to search; link straight to a formula with `index.html#<id>`.
- **Compare** two drawings and test whether they superimpose, with a live mirror image.
- **Build** a structure from an exam drawing and see which isomer it is.
- **Complicate** a formula: let a ligand bond through more than one atom (linkage isomers, with presets for nitrite, thiocyanate and cyanide), swap places with a copy outside the sphere (ionisation and hydrate isomers), or bond through one atom or two (denticity isomers), and see how the structural isomers multiply the stereoisomers. Typing `[Co(NH3)4(NO2)(ONO)]` offers the linkage family.
- **Quiz** yourself on counting stereoisomers, and (if you switch it on) on the total number of isomers when one ligand can bond through either of two atoms.

The whole app is the single file `index.html`. It needs no server and works offline once loaded.

Tests (no dependencies): `node tests/engine.mjs` checks the chemistry engine against a snapshot of every formula's counts and names.
