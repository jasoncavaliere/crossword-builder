# crossword-builder

A standalone crossword puzzle builder that runs entirely in the browser. Design a puzzle,
then export it print-ready.

This started as a way to put crossword puzzles on t-shirts for a trip.

> **Status: scaffold.** The application shell, tooling, and deployment are in place. There
> is no puzzle logic yet - no grid model, no generation, no export. Those land as separate
> issues.

## Stack

- [React](https://react.dev) 19 + TypeScript, built with [Vite](https://vite.dev) 8
- [NeonBlade UI](https://neonbladeui.com) for components
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) for tests
- ESLint 10 (flat config) + Prettier
- Client-only: no backend, no database. Deployed as a static site to GitHub Pages.

## Prerequisites

- Node.js 22 or newer (the CI workflows pin 22)
- npm 10 or newer

## Getting started

```bash
npm ci        # install exactly what the lockfile pins
npm run dev   # http://localhost:5173
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Typecheck the project references, then emit a production bundle to `dist/`. |
| `npm run preview` | Serve the built `dist/` locally, to check the production build. |
| `npm run lint` | Run ESLint over the project. |
| `npm run typecheck` | Run the TypeScript compiler with no emit. |
| `npm test` | Run the Vitest suite once, non-watch. |

## Adding a NeonBlade component

NeonBlade UI is a copy-in registry rather than an installed package: the CLI downloads a
component's source into this repository, and those files are committed.

```bash
npx neonblade add                    # list the available components
npx neonblade add corner-cut-button  # copy one in
```

The CLI prompts for an output path. Accept the default `src/components`, which puts files
at `src/components/neonblade-ui/<component>/`. Each component imports its own CSS, so
importing the component is enough.

**Telemetry.** The NeonBlade CLI reports which components you add, and it is **on by
default**. Turn it off once per machine:

```bash
npx neonblade telemetry disable
```

Or set `NEONBLADE_TELEMETRY=false` in the environment for a single call:

```bash
NEONBLADE_TELEMETRY=false npx neonblade add badge
```

## Deployment

Two GitHub Actions workflows:

- **`.github/workflows/ci.yml`** runs on every pull request against `main`: install, lint,
  typecheck, test, build. A failure in any step fails the check.
- **`.github/workflows/deploy-pages.yml`** runs on every push to `main`: it builds the site
  and publishes it to GitHub Pages.

The site is served as a *project* page at
`https://jasoncavaliere.github.io/crossword-builder/`, so `vite.config.ts` sets `base` to
`/crossword-builder/` for production builds while leaving dev at the root.

**One-time setup:** GitHub Pages must be enabled for the repository with the source set to
**GitHub Actions** (Settings > Pages > Source). The deploy workflow cannot enable it.
