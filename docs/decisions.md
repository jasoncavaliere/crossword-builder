# Decision log

What has been settled, what is deliberately still open, and what is planned. Kept so that a
new session - human or Claude - can pick the project up without re-litigating anything.

Last updated: 2026-09-20, at the pivot from crossword to word search.

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

| Decision                                                          | Rationale                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The product is a **word search** builder                          | Corrected 2026-09-20, before any domain code existed. See the pivot note above.                                                                 |
| Client-only, no backend or database                               | The output is a printable artifact, not shared state. Removes hosting cost and an entire class of work.                                         |
| Static site on GitHub Pages, served under `/word-search-builder/` | Free, no infrastructure. The subpath is why `vite.config.ts` mode-gates `base`.                                                                 |
| React + TypeScript on Vite                                        | Familiar, fast, and the component library targets React.                                                                                        |
| NeonBlade UI for components                                       | Chosen for the look. It is a copy-in registry and it requires Tailwind - see `CLAUDE.md`.                                                       |
| Tailwind                                                          | Not a preference. NeonBlade components are authored against it and render unstyled without it.                                                  |
| ESLint + Prettier over the template's oxlint                      | The scaffold's acceptance criteria named ESLint and Prettier.                                                                                   |
| No client-side routing yet                                        | One page needs none, and adding it now would commit to a URL shape before there is a second screen. It lands with whatever screen comes next.   |
| **Grid is a masked lattice, from day one**                        | Cells opt in; a rectangle is just "mask all on". Non-rectangular shapes were the original t-shirt ambition and word search makes them cheap.    |
| **No clues - a word list is only words**                          | Definitional to word search. Removes the clue, numbering and across/down models entirely.                                                       |
| **Allowed directions are per-puzzle and author-configurable**     | The generator takes a direction set; difficulty presets are named subsets of it. Barely more work than hardcoding, and it is the builder's job. |
| **Overlap allowed where letters agree, never required**           | Distinguishes word search from crossword and is why placement is greedy-with-retries, not a constraint solve.                                   |
| Scaffold models nothing about puzzles                             | Any model committed before the pivot would have been the wrong product entirely - which is exactly what nearly happened.                        |

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

1. **What fills the empty cells?** Uniform random letters, English-frequency-weighted
   letters, or letters sampled from the word list itself? This is not cosmetic: uniform
   random is conspicuously easy to scan past, while sampling from the word list makes a
   much harder puzzle. It also interacts directly with question 2.

2. **Are unintended words policed?** Filler can accidentally spell a listed word, which
   makes the answer key wrong, and it can spell words nobody wants on a t-shirt. Options:
   ignore it, re-roll the filler until no listed word appears by accident, or screen
   against a blocklist. Cost rises steeply across those three.

3. **How is the shape mask authored?** Draw cells by hand, choose from preset shapes,
   import an SVG outline, or stencil from typed text? These differ enormously in cost and
   the answer decides what the first real screen looks like.

4. **What does the t-shirt output need?** Grid plus word list, or grid alone? What physical
   dimensions, and does anything need to be print-shop-specific (bleed, colour mode,
   minimum line weight)? Carried over unanswered from before the pivot.

5. **Is the answer key in scope**, and if so where does it go - a toggleable overlay on
   screen, a second page in the PDF, or both? Nobody wants the solution printed on the
   shirt.

6. **What happens to a word that cannot be placed?** A word longer than the shape's longest
   run has no placement at all. Does the UI reject it at entry, report it after generation,
   or grow the grid automatically?

7. **How are word lists entered and normalized?** Typed one at a time, pasted as a block, or
   imported? And what happens to spaces, hyphens, accents and case - a puzzle grid holds
   bare letters, so "NEW YORK" and "co-op" need a normalization rule plus a separate display
   form for the printed list.

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
