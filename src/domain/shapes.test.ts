import { describe, expect, it } from 'vitest'
import { applyOverrides, buildMask, cellKey, SHAPE_NAMES } from './shapes'
import { isInPlay } from './types'

const countInPlay = (cells: readonly boolean[]) => cells.filter(Boolean).length

describe('buildMask', () => {
  it('puts every cell in play for a rectangle', () => {
    const mask = buildMask('rectangle', 6, 4)
    expect(mask.cells).toHaveLength(24)
    expect(countInPlay(mask.cells)).toBe(24)
  })

  it('masks cells out for every non-rectangular shape', () => {
    for (const shape of SHAPE_NAMES) {
      if (shape === 'rectangle') continue
      const mask = buildMask(shape, 16, 16)
      expect(countInPlay(mask.cells), `${shape} should exclude some cells`).toBeLessThan(256)
      expect(countInPlay(mask.cells), `${shape} should keep some cells`).toBeGreaterThan(0)
    }
  })

  it('carves a diamond around the centre', () => {
    const mask = buildMask('diamond', 9, 9)
    expect(isInPlay(mask, 4, 4)).toBe(true) // centre
    expect(isInPlay(mask, 0, 0)).toBe(false) // corner
  })

  it('re-rasterizes on resize rather than scaling, so the ratio holds', () => {
    const small = buildMask('circle', 10, 10)
    const large = buildMask('circle', 20, 20)
    const smallRatio = countInPlay(small.cells) / small.cells.length
    const largeRatio = countInPlay(large.cells) / large.cells.length
    expect(Math.abs(smallRatio - largeRatio)).toBeLessThan(0.1)
  })

  it('never returns an empty grid, even at sizes a shape cannot render', () => {
    for (const shape of SHAPE_NAMES) {
      for (const size of [1, 2, 3]) {
        const mask = buildMask(shape, size, size)
        expect(countInPlay(mask.cells), `${shape} at ${size}x${size}`).toBeGreaterThan(0)
      }
    }
  })

  it('handles a single row or column without dividing by zero', () => {
    const row = buildMask('circle', 7, 1)
    expect(row.cells).toHaveLength(7)
    expect(countInPlay(row.cells)).toBeGreaterThan(0)
  })
})

describe('applyOverrides', () => {
  it('returns the mask untouched when there are none', () => {
    const mask = buildMask('rectangle', 4, 4)
    expect(applyOverrides(mask, new Map())).toBe(mask)
  })

  it('carves a cell out and back in', () => {
    const mask = buildMask('rectangle', 4, 4)
    const carved = applyOverrides(mask, new Map([[cellKey(1, 2), false]]))
    expect(isInPlay(carved, 1, 2)).toBe(false)
    const restored = applyOverrides(carved, new Map([[cellKey(1, 2), true]]))
    expect(isInPlay(restored, 1, 2)).toBe(true)
  })

  it('ignores overrides that fall outside a grid that has shrunk', () => {
    const mask = buildMask('rectangle', 3, 3)
    expect(() => applyOverrides(mask, new Map([[cellKey(9, 9), false]]))).not.toThrow()
    expect(countInPlay(applyOverrides(mask, new Map([[cellKey(9, 9), false]])).cells)).toBe(9)
  })
})
