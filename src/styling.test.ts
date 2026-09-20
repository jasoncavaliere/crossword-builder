import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * NeonBlade components get their layout, spacing and typography from Tailwind
 * utility classes and ship only decorative geometry in their own CSS. If Tailwind
 * is removed, those components render unstyled while the build, the type checker
 * and every rendering test still pass - the failure is entirely silent. These
 * guard that prerequisite explicitly.
 */
describe('Tailwind prerequisite for NeonBlade', () => {
  // Vitest runs with the project root as cwd.
  const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf-8')

  it('imports Tailwind in the global stylesheet', () => {
    expect(read('src/index.css')).toMatch(/@import\s+['"]tailwindcss['"]/)
  })

  it('loads the global stylesheet from the entry point', () => {
    // Tailwind being installed is worth nothing if index.css is never imported:
    // every gate stays green and the whole site ships unstyled.
    expect(read('src/main.tsx')).toMatch(/import\s+['"]\.\/index\.css['"]/)
  })

  it('registers the Tailwind Vite plugin', () => {
    const config = read('vite.config.ts')
    expect(config).toMatch(/from\s+['"]@tailwindcss\/vite['"]/)
    expect(config).toMatch(/tailwindcss\(\)/)
  })

  it('keeps Tailwind in the dependency set', () => {
    const pkg = JSON.parse(read('package.json')) as {
      devDependencies: Record<string, string>
    }
    expect(pkg.devDependencies).toHaveProperty('tailwindcss')
    expect(pkg.devDependencies).toHaveProperty('@tailwindcss/vite')
  })
})

/*
 * The print output is defined entirely in CSS, and jsdom does not evaluate
 * @media print, so no rendering test can observe it. A regression here is
 * invisible until something is actually printed - which, for a design going
 * onto fabric, is the most expensive possible moment to find out. These read
 * the rules directly.
 */
describe('print output', () => {
  const css = readFileSync(join(process.cwd(), 'src/App.css'), 'utf-8')
  const printBlock = css.slice(css.indexOf('@media print'))

  it('has a print block at all', () => {
    expect(css).toMatch(/@media print/)
  })

  it('hides the page chrome, so the puzzle prints rather than the app', () => {
    for (const selector of ['.app-header', '.ws-controls', '.ws-words', '.ws-output']) {
      expect(printBlock).toContain(selector)
    }
  })

  it('forces the letters to black ink', () => {
    // The screen theme is light text on a dark background, which would print as
    // a solid block of toner and is wrong for a transfer.
    expect(printBlock).toMatch(/\.ws-letter\s*\{[^}]*fill:\s*#000/)
  })

  it('prints the page background white', () => {
    expect(printBlock).toMatch(/body\s*\{[^}]*background:\s*#fff/)
  })

  it('never prints the answers', () => {
    expect(printBlock).toMatch(/\.ws-answer-line,\s*\.ws-cell-answer\s*\{[^}]*display:\s*none/)
  })

  it('keeps the print-only word list hidden on screen', () => {
    expect(css).toMatch(/\.ws-print-words\s*\{\s*display:\s*none/)
    expect(printBlock).toMatch(/\.ws-print-words\s*\{[^}]*display:\s*block/)
  })
})
