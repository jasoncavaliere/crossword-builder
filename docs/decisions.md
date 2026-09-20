# Decision log

What has been settled, what is deliberately still open, and what is planned. Kept so that a
new session - human or Claude - can pick the project up without re-litigating anything.

Last updated: 2026-09-20, after the scaffold (#1).

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

| Decision                                                        | Rationale                                                                                                                                     |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Client-only, no backend or database                             | The output is a printable artifact, not shared state. Removes hosting cost and an entire class of work.                                       |
| Static site on GitHub Pages, served under `/crossword-builder/` | Free, no infrastructure. The subpath is why `vite.config.ts` mode-gates `base`.                                                               |
| React + TypeScript on Vite                                      | Familiar, fast, and the component library targets React.                                                                                      |
| NeonBlade UI for components                                     | Chosen for the look. It is a copy-in registry and it requires Tailwind - see `CLAUDE.md`.                                                     |
| Tailwind                                                        | Not a preference. NeonBlade components are authored against it and render unstyled without it.                                                |
| ESLint + Prettier over the template's oxlint                    | The scaffold's acceptance criteria named ESLint and Prettier.                                                                                 |
| No client-side routing yet                                      | One page needs none, and adding it now would commit to a URL shape before there is a second screen. It lands with whatever screen comes next. |
| Scaffold models nothing about puzzles                           | Any grid model committed now would likely be wrong, given the customizability goal below.                                                     |

## Open - answer before building the relevant piece

1. **How does a puzzle get constructed?** The central question, deliberately unanswered.
   The candidates considered so far:
   - a word-and-clue list that the app auto-packs into an interlocking grid
   - manual placement, where the author draws blocks and types entries directly
   - manual placement with an optional auto-pack assist
   - classic symmetric NYT-style patterns with dictionary-backed autofill (much larger:
     needs a word corpus and a backtracking filler)

   This determines the core algorithm and most of the data model, so it should be settled
   before any grid work starts.

2. **What does "radically customizable shape" actually mean?** Arbitrary polygon outlines?
   A rectangular lattice with cells masked out? Hex or other tilings? These differ enormously
   in implementation cost, and the answer constrains the grid representation.

3. **What does the t-shirt output need to look like?** Blank grid with numbers only, or grid
   plus clue list? What physical dimensions, and does anything need to be print-shop-specific
   (bleed, colour mode, minimum line weight)?

4. **Is solving in scope at all**, or is this purely a construction tool? Affects whether an
   answer key and a validation pass are needed.

## Planned, not yet scheduled

Export targets, in the order they were prioritized: **SVG** (print-ready vector), **PDF**
(grid plus clue list), **JSON** (save and reload a puzzle for later editing). Persistence is
`localStorage` plus JSON import/export.

## Known follow-ups

Filed during the scaffold, all deferred deliberately:

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

Use `npm run preview` on 4173 instead when the production base path is what needs checking -
that is the mode that catches `/crossword-builder/` mistakes.
