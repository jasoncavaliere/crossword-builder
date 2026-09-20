# Decision log

What has been settled, what is deliberately still open, and what is planned. Kept so that a
new session - human or Claude - can pick the project up without re-litigating anything.

Last updated: 2026-09-20, after the first studio screen.

## The pivot (2026-09-20)

This project was scoped and scaffolded as a **crossword** builder. That was a mistake: the
intent all along was a **word search** builder. It was caught before any domain code
existed, so the cost was documentation and copy only - the scaffold, tooling, CI and
deployment all carried over untouched.

What the pivot changed, beyond names:

- **Clues are gone.** A word search hands the solver the words. That deletes the clue
  model, the numbering scheme, and the across/down split.
- **Interlocking is gone.** Crossword entries must interlock; word search entries may
  overlap where letters agree but are never required to. Generation drops from a
  backtracking constraint solve to a greedy randomized placement with retries.
- **The old central question dissolved.** "Auto-pack vs manual placement vs NYT-style
  autofill" was the crossword project's blocking question. Word search is auto-placement by
  nature, so it is simply answered and is recorded as settled below.
- **Arbitrary shapes got cheaper.** Without an interlocking constraint, a masked lattice is
  easy, so the original t-shirt shape ambition survives intact and starts on day one.

Anything in the repo still referring to crosswords, clues, or black squares is a leftover
and should be fixed.

## How this project is being built

The remaining work is being done as a **series of interactive Claude Code sessions**, one
chunk at a time, with the author in the loop. That shapes a few things:

- **Open questions below are answered in conversation, not guessed.** A session that hits
  one should ask rather than pick. They are listed here precisely so they can be answered
  quickly and then written down.
- **Each chunk becomes an issue first**, with classified acceptance criteria, and lands via
  its own PR. See the workflow conventions in `CLAUDE.md`.
- **This file is the handoff.** When a decision gets made in a session, record it here in
  the same sitting - an answer that lives only in a chat transcript is lost.

## Settled

| Decision                                                          | Rationale                                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The product is a **word search** builder                          | Corrected 2026-09-20, before any domain code existed. See the pivot note above.                                                                                                                                               |
| Client-only, no backend or database                               | The output is a printable artifact, not shared state. Removes hosting cost and an entire class of work.                                                                                                                       |
| Static site on GitHub Pages, served under `/word-search-builder/` | Free, no infrastructure. The subpath is why `vite.config.ts` mode-gates `base`.                                                                                                                                               |
| React + TypeScript on Vite                                        | Familiar, fast, and the component library targets React.                                                                                                                                                                      |
| NeonBlade UI for components                                       | Chosen for the look. It is a copy-in registry and it requires Tailwind - see `CLAUDE.md`.                                                                                                                                     |
| Tailwind                                                          | Not a preference. NeonBlade components are authored against it and render unstyled without it.                                                                                                                                |
| ESLint + Prettier over the template's oxlint                      | The scaffold's acceptance criteria named ESLint and Prettier.                                                                                                                                                                 |
| No client-side routing yet                                        | One page needs none, and adding it now would commit to a URL shape before there is a second screen. It lands with whatever screen comes next.                                                                                 |
| **Grid is a masked lattice, from day one**                        | Cells opt in; a rectangle is just "mask all on". Non-rectangular shapes were the original t-shirt ambition and word search makes them cheap.                                                                                  |
| **No clues - a word list is only words**                          | Definitional to word search. Removes the clue, numbering and across/down models entirely.                                                                                                                                     |
| **Allowed directions are per-puzzle and author-configurable**     | The generator takes a direction set; difficulty presets are named subsets of it. Barely more work than hardcoding, and it is the builder's job.                                                                               |
| **Overlap allowed where letters agree, never required**           | Distinguishes word search from crossword and is why placement is greedy-with-retries, not a constraint solve.                                                                                                                 |
| Scaffold models nothing about puzzles                             | Any model committed before the pivot would have been the wrong product entirely - which is exactly what nearly happened.                                                                                                      |
| **One studio screen, regenerating live**                          | Shape, size, difficulty and words are all dials on the same screen; any change regenerates the preview. The seed is an input like any other, so a preview is reproducible and `Re-roll` is an explicit act rather than magic. |
| **Shape is a preset rasterized into W x H, plus per-cell edits**  | A shape is a function `(w, h) -> mask`, not stored geometry, so resizing re-rasterizes rather than stretching. Clicking a cell overrides one bit on top.                                                                      |
| **Unplaceable words: generate anyway, then report**               | With live regeneration the author is always one slider from an impossible grid, so the preview must still render. The report distinguishes `too-long` (reshape) from `no-fit` (re-roll).                                      |
| **Filler letters are English frequency-weighted**                 | Uniform random is a tell: rare letters cluster and any word-shaped run stands out. The strategy is a single swappable function.                                                                                               |
| **Words are entered as a pasted block, one per line**             | Fastest to build and to test in bulk. Each entry keeps `raw` for the printed list and a normalized A-Z `key` for the grid, so "New York" prints properly and hides as NEWYORK.                                                |
| **Duplicate words are dropped at parse time**                     | Hiding the same word twice makes the answer key ambiguous. "New York", "newyork" and "NEW-YORK" are one word once normalized.                                                                                                 |
| **The verifier re-solves the grid independently**                 | It reads the rendered letters rather than trusting the generator's own placement records, which is the only way it can catch a generator that reports a placement it never wrote. Exposed as a panel and as `window.wsb`.     |

### Direction vectors, for reference

```
E  (0, 1)    W  (0, -1)    S  (1, 0)     N  (-1, 0)
SE (1, 1)    SW (1, -1)    NE (-1, 1)    NW (-1, -1)
```

| Preset  | Directions                             |
| ------- | -------------------------------------- |
| Easy    | E, S                                   |
| Classic | E, S, SE, NE                           |
| Hard    | all eight (that is, backwards allowed) |

## Open - answer before building the relevant piece

Four of the original seven were settled while building the studio screen and have moved to
the table above. These remain:

1. **Are unintended words policed?** Filler can accidentally spell a listed word, which makes
   the answer key ambiguous, and it can spell words nobody wants on a t-shirt. The verifier
   now _reports_ accidental duplicates rather than failing on them, so there is real data to
   decide with. Options: keep ignoring it, re-roll the filler until no listed word appears by
   accident, or screen against a blocklist. Cost rises steeply across those three.

2. **What does the t-shirt output need?** Grid plus word list, or grid alone? What physical
   dimensions, and does anything need to be print-shop-specific (bleed, colour mode, minimum
   line weight)? Unanswered since before the pivot, and it blocks the SVG export.

3. **Where does the answer key go in the output?** On screen there is now a "Show answers"
   toggle, but that was built as a prototyping aid. Whether the key belongs in the exported
   PDF as a second page, in a separate file, or nowhere at all is undecided. Nobody wants the
   solution printed on the shirt.

4. **Do shapes beyond the five presets matter?** SVG outline import and a text stencil (type
   initials, get that letterform as the grid) were both considered and deferred. The mask
   model already supports either; only the authoring UI is missing.

## Planned, not yet scheduled

Export targets, in the order they were prioritized: **SVG** (print-ready vector), **PDF**
(grid plus word list), **JSON** (save and reload a puzzle for later editing). Persistence is
`localStorage` plus JSON import/export.

## Known follow-ups

Filed during the scaffold, all deferred deliberately. None are affected by the pivot:

| Issue | Item                                                                |
| ----- | ------------------------------------------------------------------- |
| #2    | Scope the Pages deploy credentials to the deploy job                |
| #3    | Verify `main` before it deploys                                     |
| #4    | Lint JavaScript files, not just TypeScript                          |
| #5    | Pin the Node version the project builds against                     |
| #6    | Upstream NeonGlow colour-handling defects (breaks on non-hex input) |

## Local testing on the dev VM

Development happens on an Azure VM with no public IP on its NIC, reached by direct SSH.
The dev server binds to localhost only, so viewing it needs a tunnel from the workstation:

```bash
ssh -L 5173:localhost:5173 azureuser@<the-usual-host>   # then open http://localhost:5173/
```

Start the dev server with `npm run dev -- --port 5173 --strictPort`. The strict flag matters:
without it Vite silently falls back to 5174 when something already holds 5173, and the tunnel
then shows a stale server from an earlier session rather than the tree being edited. That
happened on 2026-09-20.

Use `npm run preview` on 4173 instead when the production base path is what needs checking -
that is the mode that catches `/word-search-builder/` mistakes.
