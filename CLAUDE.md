# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-only **word search** builder, deployed as a static site to GitHub Pages. The end
product is a puzzle that can be handed to a print shop - it began as a way to put word
searches on t-shirts.

> **This project was a crossword builder until 2026-09-20.** It was renamed and re-scoped
> before any domain code existed. If you find a stray reference to crosswords, clues, or
> black squares anywhere in this repo, it is a leftover and it is wrong - fix it. The
> product has no clues and no interlocking requirement.

The studio screen exists: shape, size, difficulty and a word list, regenerating a preview
live, with a verifier, browser-printing, a t-shirt mockup, and drafts saved to
`localStorage`. Still absent: file export (SVG/PDF/JSON) and routing.

## Commands

```bash
npm ci               # install exactly what the lockfile pins
npm run dev          # Vite dev server on :5173, served at /
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve the built site, at /word-search-builder/
npm run lint         # eslint .
npm run format       # prettier --write .
npm run format:check # prettier --check .   (CI runs this; it fails the PR)
npm run typecheck    # tsc -b --noEmit
npm test             # vitest run (non-watch)
```

Running a subset of tests:

```bash
npx vitest run src/App.test.tsx              # one file
npx vitest run -t 'renders the tagline'      # one test by name
npx vitest                                   # watch mode
```

Node 22+ / npm 10+. Both workflows pin Node 22.

## Architecture

Small enough to read end to end, so only the non-obvious parts are worth stating.

**`vite.config.ts` carries three concerns at once:** the React plugin, the Tailwind
plugin, and the Vitest config (hence `defineConfig` is imported from `vitest/config`, not
`vite`). `base` is mode-gated - `/word-search-builder/` in production because Pages serves
this as a project page, `/` in dev. Change one and you break either the deployed site or
the dev server, so verify both: `npm run build` then grep `dist/index.html` for the asset
paths, and `npm run dev` for the root case.

**`src/domain/` is pure and React-free**, and that separation is load-bearing: it is what
lets the generator be tested against a seeded RNG with no rendering involved.

| Module          | Responsibility                                                                 |
| --------------- | ------------------------------------------------------------------------------ |
| `types.ts`      | `Mask`, `WordEntry`, `Placement`, `Puzzle`, plus `isInPlay` and index helpers. |
| `directions.ts` | The eight vectors and the difficulty subsets.                                  |
| `rng.ts`        | Seeded mulberry32. Every randomized function takes an `Rng` parameter.         |
| `shapes.ts`     | Shape presets as `(w, h) -> Mask`, plus per-cell overrides.                    |
| `words.ts`      | Normalization (`New York` -> `NEWYORK`) and pasted-list parsing.               |
| `filler.ts`     | English frequency-weighted filler letters.                                     |
| `generate.ts`   | Greedy randomized placement, longest word first, then filler.                  |
| `verify.ts`     | Independent re-solve and rule checks.                                          |

**The verifier does not trust the generator.** `verify.ts` reads the rendered letters back
out of the grid rather than believing the placement records, because a generator that
reports a placement it never wrote is exactly the bug worth catching. Keep it that way: if
you ever make it consult `puzzle.placements` to decide whether a word is findable, it stops
being evidence of anything.

**The console API is the same code as the panel.** `window.wsb` (`verify()`, `state()`,
`puzzle()`, `grid()`) is wired in `PuzzleStudio` and calls the same functions the UI does,
so the two can never disagree. `wsb.grid()` prints the grid as text, which is the fastest
way to eyeball a shape.

**Printing is CSS, not a second render.** `@media print` in `src/App.css` hides the app
chrome so the existing preview SVG is what reaches the paper. Do not build a separate print
component: two renderers would drift, and the whole point is that what was approved is what
prints. jsdom does not evaluate `@media print`, so those rules are guarded by reading the
stylesheet in `src/styling.test.ts` - a rendering test cannot see them.

**The shirt mockup reuses `GridCells`** rather than drawing its own grid, scaled into the
chest area by a nested `<svg>`. Its cells are `aria-hidden`, which is also what keeps
`getAllByRole('gridcell')` returning only the preview's.

**Anything read back from `localStorage` is untrusted.** `persistence.ts` validates every
field and discards the whole payload on any mismatch, including a version bump. A draft is
not worth a migration path, and half-restoring a state is worse than starting clean.

**Verification results are stored with the puzzle they describe**, and staleness is derived
rather than cleared in an effect. A PASS must never be visible next to a grid that has since
regenerated.

**TypeScript is a project-references build** (`tsconfig.json` references `tsconfig.app.json`
and `tsconfig.node.json`). `strict` and the `types` array live in `tsconfig.app.json`.
`verbatimModuleSyntax` is on, which matters a great deal for vendored components - see
below.

## The domain, as settled so far

Read this before writing a type. These are decided, not open.

**A grid is a lattice plus a mask.** Every cell is either in play (it holds a letter) or
masked out (it is outside the puzzle's shape). A plain rectangle is the special case where
the mask is entirely on. Never write code that assumes rectangularity: the generator asks
"is this cell in play?", it does not assume bounds. Arbitrary shapes are the point, and
word search makes them cheap because words do not have to interlock.

**There are no clues.** A word list is a list of words. The solver is handed the words and
hunts for them. Do not add a clue field, a numbering scheme, or an across/down split -
those are crossword concepts and they do not apply here.

**A placement is a word, a start cell, and a direction vector.** The allowed direction set
is **per puzzle and author-configurable**, not hardcoded. There are eight candidate
vectors:

```
E  (0, 1)    W  (0, -1)    S  (1, 0)     N  (-1, 0)
SE (1, 1)    SW (1, -1)    NE (-1, 1)    NW (-1, -1)
```

Difficulty presets are just named subsets of that set, so they cost nothing extra:

| Preset  | Directions                             |
| ------- | -------------------------------------- |
| Easy    | E, S                                   |
| Classic | E, S, SE, NE                           |
| Hard    | all eight (that is, backwards allowed) |

The generator signature this implies is roughly `place(words, grid, dirs)`. Keep the
direction set a parameter all the way down; do not let a literal `[[0,1],[1,0]]` harden
anywhere.

**Words may overlap where letters agree, but nothing requires it.** Overlap is an
opportunity, not a constraint. This is why word search generation is a greedy randomized
placement with retries rather than the backtracking constraint solve a crossword needs.

**Placement can fail.** A word longer than the shape's longest run, or a list too dense for
the grid, has no valid placement. This is a normal outcome, not an exception to swallow:
the generator reports which words it could not place and the UI has to say so.

**Filler letters** occupy every in-play cell no word claimed. The strategy for choosing
them is an open question below, and it is not cosmetic - it decides difficulty and whether
unintended words show up.

## NeonBlade UI - read this before touching components

[NeonBlade UI](https://neonbladeui.com) is a **copy-in registry**, not an installed
package. `npx neonblade add <name>` downloads a component's source into
`src/components/neonblade-ui/<name>/` and those files are **committed**. You own them.

Three things bite, and all three are silent:

1. **NeonBlade requires Tailwind.** A component's own stylesheet ships only decorative
   geometry - clip paths, keyframes, hover states. Its layout, spacing and typography are
   Tailwind utility classes in the `.tsx`. Without Tailwind those classes resolve to
   nothing: the component renders unstyled while the build, the type checker and every
   rendering test stay green. This shipped once already (#1, caught in review) and is why
   `src/styling.test.ts` exists. Do not remove Tailwind, the `@import 'tailwindcss'` in
   `src/index.css`, or that import from `src/main.tsx`.

2. **Registry sources fail `verbatimModuleSyntax`.** A freshly added component ships React
   type imports as value imports and fails `npm run typecheck` with `TS1484`. The fix is
   mechanical:

   ```diff
   -import React, { ButtonHTMLAttributes, ReactNode } from "react";
   +import React from "react";
   +import type { ButtonHTMLAttributes, ReactNode } from "react";
   ```

   Drop the `React` import entirely if the component never uses it as a value. This is the
   **only** local modification to vendored sources - keep it that way, so a component can
   be re-added and diffed against upstream. `.prettierignore` covers
   `src/components/neonblade-ui` for the same reason.

3. **Some components pull in `three`.** The background components do. Check the manifest
   (`https://neonbladeui-registry.vercel.app/components/<name>/index.json`) before adding
   one; `dependencies: []` is what you want unless a 3D background is genuinely wanted.

The CLI prompts on stdin for an output path and has telemetry **on by default**. To add a
component non-interactively:

```bash
printf '\n' | NEONBLADE_TELEMETRY=false npx neonblade add <name>
```

## Testing

Three groups, three jobs.

- `src/App.test.tsx` renders the app and asserts user-visible content. It also asserts the
  CTA carries its `ccb-*` classes and Tailwind layout utilities, and that the heading
  renders through NeonGlow. Those assertions exist because text-and-role assertions alone
  would pass against plain markup, which is exactly how the unstyled-component bug hid.
- `src/styling.test.ts` guards the Tailwind wiring itself: the `@import`, the Vite plugin,
  the `index.css` import from `main.tsx`, and the dependencies.
- `src/domain/*.test.ts` cover the pure layer. `verify.test.ts` is the one to read first:
  each case breaks one specific rule and asserts the matching check goes red, because a
  verifier that cannot be made to fail proves nothing.

When adding a test for rendered styling, remember jsdom does not apply stylesheets. Assert
on class names or inline styles, or check the built CSS in `dist/`.

**Demonstrate red before green.** Every guard in this repo was verified by breaking the
thing it guards and watching that specific test fail. A test that passes against a removed
feature is worse than no test, because it reports safety that is not there.

**Generation is randomized, so seed it.** Any placement or filler test must run against an
injected, seeded random source, never `Math.random` directly. Take the RNG as a parameter
from the first line of generator code you write - retrofitting it later means rewriting
every test. A flaky generator test is worthless and will get deleted.

## CI and deployment

- `.github/workflows/ci.yml` - on `pull_request` to `main`: install, lint, format:check,
  typecheck, test, build.
- `.github/workflows/deploy-pages.yml` - on push to `main`: build and publish to Pages.
  **This workflow cannot be exercised before merge**, so changes to it are unverifiable
  from a PR. Treat edits to it with corresponding caution.

Pages must be enabled with source **GitHub Actions** (Settings > Pages) for a deploy to
succeed. No workflow token here can set that.

## Product direction - do not foreclose it

Puzzles are intended to be **radically customizable**: arbitrary grid shapes (not just
rectangles), arbitrary sizes, arbitrary word sets. Do not introduce a fixed grid model, a
fixed board size, or a rectangle-only assumption. Planned export targets are SVG
(print-ready vector), PDF (grid plus word list), and JSON (save and reload a puzzle).
Persistence is client-only - `localStorage` plus JSON import/export. There is no backend
and none is planned.

Several product questions remain **deliberately unanswered** - whether unintended words are
policed, what the t-shirt output actually needs, where the answer key goes, and whether
shape authoring grows beyond the presets. They are listed in `docs/decisions.md`. Do not
pick one unilaterally; ask.

## Workflow conventions

Issues drive the work. An issue's acceptance criteria are the contract, and they are
written as a classified checklist - `Functional AC`, `Non-functional AC`, and a
`Scope (not AC)` section. Non-functional criteria name a measure: a metric, a threshold,
and a method. Scope notes are context, never something to "meet".

Work happens on a branch named `<issue-number>-<short-kebab-description>`, and lands via a
PR carrying `Closes #<n>`. Deferred work becomes a filed follow-up issue rather than a TODO
comment - #2 through #6 are examples.

Prose in commits, PRs and issue comments uses plain ASCII: no em dashes, no curly quotes,
no ellipsis characters.
