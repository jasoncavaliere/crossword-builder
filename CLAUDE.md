# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser-only crossword puzzle builder, deployed as a static site to GitHub Pages. The
end product is a puzzle that can be handed to a print shop - it began as a way to put
crosswords on t-shirts.

As of the scaffold (#1) there is **no crossword domain code at all**: no grid model, no
cell/word/clue types, no generation, no solving, no export, no persistence, no routing.
That is deliberate, not an omission. See "Product direction" below before adding any.

## Commands

```bash
npm ci               # install exactly what the lockfile pins
npm run dev          # Vite dev server on :5173, served at /
npm run build        # tsc -b && vite build -> dist/
npm run preview      # serve the built site, at /crossword-builder/
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
`vite`). `base` is mode-gated - `/crossword-builder/` in production because Pages serves
this as a project page, `/` in dev. Change one and you break either the deployed site or
the dev server, so verify both: `npm run build` then grep `dist/index.html` for the asset
paths, and `npm run dev` for the root case.

**TypeScript is a project-references build** (`tsconfig.json` references `tsconfig.app.json`
and `tsconfig.node.json`). `strict` and the `types` array live in `tsconfig.app.json`.
`verbatimModuleSyntax` is on, which matters a great deal for vendored components - see
below.

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

Two files, two jobs.

- `src/App.test.tsx` renders the app and asserts user-visible content. It also asserts the
  CTA carries its `ccb-*` classes and Tailwind layout utilities, and that the heading
  renders through NeonGlow. Those assertions exist because text-and-role assertions alone
  would pass against plain markup, which is exactly how the unstyled-component bug hid.
- `src/styling.test.ts` guards the Tailwind wiring itself: the `@import`, the Vite plugin,
  the `index.css` import from `main.tsx`, and the dependencies.

When adding a test for rendered styling, remember jsdom does not apply stylesheets. Assert
on class names or inline styles, or check the built CSS in `dist/`.

**Demonstrate red before green.** Every guard in this repo was verified by breaking the
thing it guards and watching that specific test fail. A test that passes against a removed
feature is worse than no test, because it reports safety that is not there.

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
squares or rectangles), arbitrary sizes, arbitrary word and clue sets. Do not introduce a
fixed grid model, a fixed board size, or a square-only assumption. Planned export targets
are SVG (print-ready vector), PDF (grid plus clue list), and JSON (save and reload a
puzzle). Persistence is client-only - `localStorage` plus JSON import/export. There is no
backend and none is planned.

The puzzle construction model is **an open question, deliberately unanswered**: word-list
auto-packing versus manual placement versus a hybrid. Do not pick one unilaterally.

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
