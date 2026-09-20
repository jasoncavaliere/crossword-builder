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

describe('the mickey shape', () => {
  /** Count the separate runs of in-play cells in one row. */
  const runsInRow = (mask: ReturnType<typeof buildMask>, row: number) => {
    let runs = 0
    let previous = false
    for (let col = 0; col < mask.width; col++) {
      const current = isInPlay(mask, row, col)
      if (current && !previous) runs++
      previous = current
    }
    return runs
  }

  it('has two separate lobes near the top, which is what makes it ears', () => {
    const mask = buildMask('mickey', 15, 15)
    const rows = Array.from({ length: mask.height }, (_, row) => runsInRow(mask, row))
    // Without a gap between them the ears would read as one wide blob.
    expect(rows.some((runs) => runs === 2)).toBe(true)
  })

  it('joins into a single head below the ears', () => {
    const mask = buildMask('mickey', 15, 15)
    const bottomHalf = Array.from({ length: Math.floor(mask.height / 2) }, (_, i) =>
      runsInRow(mask, mask.height - 1 - i),
    ).filter((runs) => runs > 0)

    expect(bottomHalf.every((runs) => runs === 1)).toBe(true)
  })

  it('overlaps the ears into the head rather than leaving them as islands', () => {
    // Tangent circles rasterize into a pinched join, which can strand an ear
    // with no run connecting it to the head.
    const mask = buildMask('mickey', 21, 19)
    const twoLobeRows: number[] = []
    for (let row = 0; row < mask.height; row++) {
      if (runsInRow(mask, row) === 2) twoLobeRows.push(row)
    }

    const firstMerged = twoLobeRows[twoLobeRows.length - 1] + 1
    expect(runsInRow(mask, firstMerged)).toBe(1)
  })

  it('is wider across the ears than across the head', () => {
    const mask = buildMask('mickey', 21, 19)
    const widthAt = (row: number) => {
      let count = 0
      for (let col = 0; col < mask.width; col++) if (isInPlay(mask, row, col)) count++
      return count
    }
    const widths = Array.from({ length: mask.height }, (_, row) => widthAt(row))
    const earBand = Math.max(...widths.slice(0, Math.floor(mask.height / 2)))
    const headBand = Math.max(...widths.slice(Math.floor(mask.height / 2)))

    expect(earBand).toBeGreaterThan(headBand)
  })
})
