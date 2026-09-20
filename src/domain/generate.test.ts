import { describe, expect, it } from 'vitest'
import { directionsFor } from './directions'
import { generatePuzzle, longestRun } from './generate'
import { createRng } from './rng'
import { buildMask } from './shapes'
import { indexOf, isInPlay, type Puzzle } from './types'
import { parseWordList } from './words'

const WORDS = parseWordList('FERRY\nMARKET\nSNORKEL\nHAMMOCK\nPOSTCARD')
const classic = directionsFor('classic')

function generate(
  options: { width?: number; height?: number; seed?: number; words?: typeof WORDS } = {},
) {
  const { width = 16, height = 16, seed = 1, words = WORDS } = options
  return generatePuzzle({
    mask: buildMask('rectangle', width, height),
    words,
    dirs: classic,
    rng: createRng(seed),
  })
}

/** Read a placed word back off the grid, which is what a solver would do. */
function readBack(puzzle: Puzzle, placementIndex: number): string {
  const placement = puzzle.placements[placementIndex]
  const [dr, dc] = placement.dir
  let out = ''
  for (let i = 0; i < placement.key.length; i++) {
    const at = indexOf(puzzle.mask, placement.row + dr * i, placement.col + dc * i)
    out += puzzle.letters[at] ?? '?'
  }
  return out
}

describe('longestRun', () => {
  it('is the width of a rectangle when travelling east', () => {
    expect(longestRun(buildMask('rectangle', 12, 5), [[0, 1]])).toBe(12)
  })

  it('is the height when travelling south', () => {
    expect(longestRun(buildMask('rectangle', 12, 5), [[1, 0]])).toBe(5)
  })

  it('shrinks when the shape carves cells away', () => {
    const rect = longestRun(buildMask('rectangle', 15, 15), classic)
    const star = longestRun(buildMask('star', 15, 15), classic)
    expect(star).toBeLessThan(rect)
  })
})

describe('generatePuzzle', () => {
  it('is deterministic for a given seed', () => {
    expect(generate({ seed: 7 }).letters).toEqual(generate({ seed: 7 }).letters)
  })

  it('produces a different grid for a different seed', () => {
    expect(generate({ seed: 7 }).letters).not.toEqual(generate({ seed: 8 }).letters)
  })

  it('places every word when there is room', () => {
    const puzzle = generate()
    expect(puzzle.unplaced).toEqual([])
    expect(puzzle.placements).toHaveLength(WORDS.length)
  })

  it('writes each word into the grid so it reads back correctly', () => {
    const puzzle = generate()
    puzzle.placements.forEach((placement, i) => {
      expect(readBack(puzzle, i)).toBe(placement.key)
    })
  })

  it('fills every in-play cell and leaves masked-out cells empty', () => {
    const puzzle = generatePuzzle({
      mask: buildMask('heart', 15, 15),
      words: WORDS,
      dirs: classic,
      rng: createRng(3),
    })

    for (let row = 0; row < puzzle.mask.height; row++) {
      for (let col = 0; col < puzzle.mask.width; col++) {
        const letter = puzzle.letters[indexOf(puzzle.mask, row, col)]
        if (isInPlay(puzzle.mask, row, col)) expect(letter).toMatch(/^[A-Z]$/)
        else expect(letter).toBeNull()
      }
    }
  })

  it('keeps every word inside the shape', () => {
    const puzzle = generatePuzzle({
      mask: buildMask('diamond', 17, 17),
      words: WORDS,
      dirs: classic,
      rng: createRng(5),
    })

    for (const placement of puzzle.placements) {
      const [dr, dc] = placement.dir
      for (let i = 0; i < placement.key.length; i++) {
        expect(isInPlay(puzzle.mask, placement.row + dr * i, placement.col + dc * i)).toBe(true)
      }
    }
  })

  it('only ever uses directions from the set it was given', () => {
    const eastOnly = generatePuzzle({
      mask: buildMask('rectangle', 16, 16),
      words: WORDS,
      dirs: [[0, 1]],
      rng: createRng(2),
    })
    for (const placement of eastOnly.placements) {
      expect(placement.dir).toEqual([0, 1])
    }
  })

  it('reports a word too long for the shape rather than dropping it silently', () => {
    const words = parseWordList('ENCYCLOPEDIA')
    const puzzle = generate({ width: 6, height: 6, words })

    expect(puzzle.placements).toHaveLength(0)
    expect(puzzle.unplaced).toHaveLength(1)
    expect(puzzle.unplaced[0].reason).toBe('too-long')
    expect(puzzle.unplaced[0].longestRun).toBe(6)
  })

  it('still renders a complete grid when some words cannot be placed', () => {
    const words = parseWordList('ENCYCLOPEDIA\nFERRY')
    const puzzle = generate({ width: 7, height: 7, words })

    expect(puzzle.unplaced.length).toBeGreaterThan(0)
    expect(puzzle.letters.every((letter) => letter !== null)).toBe(true)
  })

  it('accounts for every word exactly once', () => {
    const puzzle = generate({ width: 8, height: 8 })
    expect(puzzle.placements.length + puzzle.unplaced.length).toBe(WORDS.length)
  })

  it('reports words in the order they were entered, not longest first', () => {
    const puzzle = generate()
    expect(puzzle.placements.map((p) => p.key)).toEqual(WORDS.map((w) => w.key))
  })
})
