# Phone UI: progressive disclosure plan

Status: implemented (see **Outcome** at the end for what changed from this plan).

Goal: on a phone, show what the student needs *now* and put the rest one tap away, so each screen needs little or no scrolling. Desktop and tablet are untouched: every change is scoped to `body.mobile`.

Measured at 390×844 (iPhone-class), Chromium, with the top bar (54px) and tab bar (60px) already taking 114px. The viewport left for content is about 730px.

## What is already good (keep)

- Explore home is three rows. Nothing to hide.
- The molecule sheet already has `peek / half / full` states (`#xSheet`).
- Compare fits one screen in portrait. Build fits one screen.
- The skill map is hidden until asked for.

So this is not a "hide everything" job. Three screens are the problem.

## Where the scroll actually is

| Screen | Content height vs ~730px visible | What is eating it |
|---|---|---|
| Learn → quiz, fresh question | 1096px (1.5 screens) | `#filters` block alone is 258px (about 20 chips), sitting under the keypad |
| Learn → quiz, after answering | 1606px (2.2 screens) | question card stays at full size above the results; filters still there; "Next question" is at the very bottom |
| Explore → isomer list (e.g. M(AA)₂B₂) | 892px | 5-line insight paragraph + ligand chips + tally pills push the first isomer row down to y≈290; "one substitution away" and "complicate" sections follow |
| Explore → molecule, `half` | n/a | stage does not shrink with the sheet, so the FAB row covers the molecule |

Two redundancies found on the way:
- The case insight paragraph is shown on the list screen **and again** in the molecule sheet (`xInfoHTML` → `iso.caseRef.insight`).
- Settings are duplicated: "Answer by" is in the quiz card and in More; the Compare "More tools" sheet repeats four toggles (link rotation, live mirror, snap, colour labels) that live in More.

## Rule for what gets hidden

Hide if it is **configuration**, **reference read once per formula**, or **a duplicate**.
Never hide: the thing needed to answer a question, the feedback after answering, the isomer drawings, or the primary next action.

This matters because the explanations are the teaching payload. Hiding them saves scroll but costs a tap and some discoverability, so they get collapsed (one line stays visible), not removed.

## Three mechanisms (reuse what exists)

1. **Sheet** for settings. The code already has `.msheet`, `openSheet()` and `closeSheets()`, and `placeElements()` / `MOVES` already moves shared desktop elements into phone hosts. Add `['#filters', '#qSettingsBody']` to `MOVES` and the quiz filters follow the same path. Desktop is unaffected.
2. **Inline disclosure** for reading material: native `<details class="dis">` styled in the sketch look. No new JS needed for open/close. Persist the open/closed choice per section in `localStorage` (same try/catch pattern as `seen()` / `markSeen()`), so a student who opens a section keeps it open.
3. **Sticky action bar** for the one primary action when it would otherwise be below the fold.

## Changes, by screen

### Learn → quiz (biggest win)
- **Filters → "Practice settings" sheet.** One summary chip row in the card ("Octahedral · stereoisomers · real ligands ✎") opens the sheet. Saves about 258px; fresh question drops from 1096px to roughly 830px.
- **Remove "Answer by" from the card**, or move it into the same sheet. It already exists in More.
- **After answering, collapse the question card** to one line (formula, your answer, ✓/✗). Results start at the top with no scrolling.
- **Pin "Next question →"** above the tab bar once answered, so it is never below the fold.
- **Ligand gloss** (e.g. the terpy line): **decided: collapsed by default**, so students who already know the ligand can test themselves. Show a "What is terpy? ▾" tap target only; the gloss (denticity, donor atoms, rigidity hints) appears on tap. Remember the open state per session only, so it does not become permanently open after one curious tap.
- Keep the keypad. It is the input, and 240px is its honest cost.

### Explore → isomer list
- **Insight paragraph:** collapse or clamp; see the open question below.
- **Ligand chips + tally pills → one summary line** ("2 geometric · 1 enantiomeric pair · 3 total").
- **"One substitution away" and "Complicate this" → collapsed disclosures** with counts in the header ("Related formulas (4) ▾").
- Effect: isomer rows start near y≈150 instead of 290, and the list should fit about one screen. Estimate, to be measured.

### Explore → molecule
- **Bug fix first:** make `#xStage` end where the sheet starts (or recentre the molecule above the sheet) so the FAB row never covers the molecule in `half`.
- **Remove the duplicated insight** from `xInfoHTML` (it stays on the list screen).
- FAB row: six buttons with labels is about 70px over the drawing. Lower priority and less certain: icon-only after first use, and let double-tap reset (already in the tour) replace the reset button. Do this last, and only if testing shows the row still gets in the way.

### Compare
- Remove the four duplicated toggles from the "More tools" sheet. Leave its actions (Mirror plane, mirror image to other viewport, Gesture help). Settings live in More only.

### Build
- Step hints (4 lines at step 2) → first-run only, or behind a ⓘ.
- Chelate link / eraser / clear all: three rows → one row of three. Gives the stage about 100px more.

## What I would not do

- **Auto-hide the tab bar on scroll.** It buys 60px but makes navigation unpredictable, and the molecule sheet already uses vertical drags. A permanent 60px bar is the known cost of five destinations.
- **Accordions on quiz feedback.** After a wrong answer the explanation is what the student came for.
- **Hide the keypad behind a tap.** It would turn every answer into two taps.

## Order of work

1. Molecule stage/FAB overlap fix; remove duplicated insight (bugs, small).
2. Quiz: filters sheet, collapse-after-answer, sticky Next.
3. Explore list disclosures.
4. Build hint and palette compaction; Compare/More dedupe.
5. FAB row (optional). Add one line to the README feature list.

## How to check it worked

A throwaway Playwright script (Chromium is available in the environment; not a repo dependency, so the dependency-free promise in the README holds) loading `index.html` at 390×844 and asserting scroll budgets:

| Screen | Now | Target |
|---|---|---|
| Quiz, fresh | 1096px | ≤ ~850px |
| Quiz, after answer, Next visible without scrolling | no | yes |
| M(AA)₂B₂ list | 892px | fits ~730px |
| Molecule `half`, FABs over molecule | overlap | none |

Re-run at 360×640 (small Android) and in landscape, where `body.land` has its own layout and some of these rules need an override. `node tests/engine.mjs` should be unaffected, but run it.

## Decided

- Quiz ligand gloss: collapsed by default (see Learn → quiz above).

## Open question

**Insight paragraph on the Explore list.** It is a hand-written paragraph per formula (36 in the source, e.g. line 1324 for M(AA)₂B₂) explaining *why* the isomer count and symmetry come out as they do. It is about the whole formula, not one isomer, which is why it is redundant on the molecule sheet.

Options for the list screen:
- (a) Clamp to 2 lines with "more". Cheap, but cuts mid-thought (for M(AA)₂B₂ the first two lines cover only trans).
- (b) Collapse behind a question-style label ("Why these 3 isomers? ▾"), remembered globally: once a student opens it, it stays open for later formulas. My pick: it keeps the best teaching text, costs 1 line, and the label invites the tap.
- (c) Leave open (today). Costs about 105px on every formula.

Remove it from the molecule sheet in all cases.

## Outcome

Implemented in `index.html`, all scoped to `body.mobile`. Measured at 390×844 in Chromium:

| Screen | Before | After |
|---|---|---|
| Quiz, fresh question | 1096px | 730px for a monodentate-only question (fits); 730–773px when the ligand notes exist and are opened |
| Quiz, after answering | 1606px, Next at the very bottom | collapsed card, Next pinned above the tab bar |
| M(AA)₂B₂ isomer list | 892px | 730px (fits one screen) |
| Build step 2 (hint closed) | n/a (fit tightly) | 730px (fits), with the stage 20px shorter |
| Molecule sheet at `half` | turn buttons covered the molecule | drawing re-centres above the sheet; no overlap |

Desktop and tablet layouts were checked at 1280×800 and are unchanged. `node tests/engine.mjs` passes.

### Where the implementation differs from the plan above

- **Insight paragraph:** stays open on the list screen (decision: the formula is meant to carry this explanation). Only the duplicate in the molecule sheet was removed.
- **"Complicate this"** stays a visible row. It is a single button, so collapsing it would cost two taps to reach one action. Only "One substitution away (n)" is collapsed, and its open state is remembered.
- **Answer by** moved into the Practice settings sheet and was removed from More, instead of being deleted from the card and left in More.
- **Compare "More" sheet:** only *snap to exam views* and *colour labels* were removed (they are global and live in More). *Mirror between viewports* and *link rotation* stay, because they belong to the Compare screen and are used while looking at it.
- **Ligand gloss** is collapsed on the phone only (the desktop quiz is unchanged). The ambidentate-ligand note in "total" questions stays visible, because it says which ligand is ambidentate, and the question cannot be answered without it. The open/closed state is remembered for the session, not across visits.
- **Build:** the step-2 hint is open the first time and closed afterwards, and the choice is remembered if the student toggles it.
- **Turn-button row on the molecule screen:** not changed (it was marked optional).
- **README:** not changed. These are behaviours, not features someone would search for.
