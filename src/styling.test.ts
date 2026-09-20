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
