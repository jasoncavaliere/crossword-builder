import { describe, expect, it } from 'vitest'
import { directionsFor } from './directions'
import { generatePuzzle } from './generate'
import { createRng } from './rng'
import { buildMask } from './shapes'
import { indexOf, type Puzzle } from './types'
import { findOccurrences, verifyPuzzle } from './verify'
import { parseWordList } from './words'

const WORDS = parseWordList('FERRY\nMARKET\nSNORKEL\nHAMMOCK\nPOSTCARD')
const classic = directionsFor('classic')

function goodPuzzle(shape: 'rectangle' | 'heart' = 'rectangle'): Puzzle {
  return generatePuzzle({
    mask: buildMask(shape, 16, 16),
    words: WORDS,
    dirs: classic,
    rng: createRng(11),
  })
}

const failing = (puzzle: Puzzle, words = WORDS) =>
  verifyPuzzle(puzzle, words, classic)
    .checks.filter((check) => !check.ok)
    .map((check) => check.name)

describe('findOccurrences', () => {
  it('finds a word that is really in the grid', () => {
    const puzzle = goodPuzzle()
    expect(findOccurrences(puzzle, puzzle.placements[0].key, classic).length).toBeGreaterThan(0)
  })

  it('does not find a word that is not', () => {
    expect(findOccurrences(goodPuzzle(), 'ZZZZZZZZ', classic)).toEqual([])
  })
})

describe('verifyPuzzle', () => {
  it('passes a well-formed puzzle', () => {
    const result = verifyPuzzle(goodPuzzle(), WORDS, classic)
    expect(result.checks.filter((c) => !c.ok)).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('passes on a non-rectangular shape too', () => {
    expect(verifyPuzzle(goodPuzzle('heart'), WORDS, classic).ok).toBe(true)
  })

  // Each case below breaks one specific rule and asserts the matching check
  // goes red. A verifier that cannot be made to fail is not evidence of
  // anything, so every check here is demonstrated red before it is trusted.

  it('catches a letter tampered with after generation', () => {
    const good = goodPuzzle()
    const placement = good.placements[0]
    const at = indexOf(good.mask, placement.row, placement.col)
    const letters = good.letters.slice()
    letters[at] = letters[at] === 'X' ? 'Q' : 'X'

    const names = failing({ ...good, letters })
    expect(names).toContain('Every hidden word is findable')
    expect(names).toContain('Overlapping letters agree')
  })

  it('catches a placement that claims a word never written to the grid', () => {
    const good = goodPuzzle()
    const tampered: Puzzle = {
      ...good,
      placements: [...good.placements, { key: 'GHOST', raw: 'Ghost', row: 0, col: 0, dir: [0, 1] }],
    }
    expect(failing(tampered)).toContain('Every hidden word is findable')
  })

  it('catches a word running outside the shape', () => {
    const good = generatePuzzle({
      mask: buildMask('diamond', 15, 15),
      words: WORDS,
      dirs: classic,
      rng: createRng(4),
    })
    const tampered: Puzzle = {
      ...good,
      placements: [...good.placements, { key: 'EDGE', raw: 'Edge', row: 0, col: 0, dir: [0, 1] }],
    }
    expect(failing(tampered)).toContain('Every word stays inside the shape')
  })

  it('catches a direction outside the active difficulty', () => {
    const good = goodPuzzle()
    // West is not in Classic.
    const tampered: Puzzle = {
      ...good,
      placements: good.placements.map((p, i) => (i === 0 ? { ...p, dir: [0, -1] as const } : p)),
    }
    expect(failing(tampered)).toContain('Every direction is allowed')
  })

  it('catches a blank cell left inside the shape', () => {
    const good = goodPuzzle()
    const letters = good.letters.slice()
    const blankAt = letters.findIndex((letter, i) => letter !== null && good.mask.cells[i])
    letters[blankAt] = null

    expect(failing({ ...good, letters })).toContain('The grid is completely filled')
  })

  it('catches a letter written outside the shape', () => {
    const good = goodPuzzle('heart')
    const letters = good.letters.slice()
    const outsideAt = good.mask.cells.findIndex((inPlay) => !inPlay)
    letters[outsideAt] = 'X'

    expect(failing({ ...good, letters })).toContain('The grid is completely filled')
  })

  it('catches a word that was silently dropped', () => {
    const good = goodPuzzle()
    const tampered: Puzzle = { ...good, placements: good.placements.slice(1) }
    expect(failing(tampered)).toContain('Every word is accounted for')
  })

  it('counts an unplaceable word as accounted for, not as a failure', () => {
    const words = parseWordList('ENCYCLOPEDIA\nFERRY')
    const puzzle = generatePuzzle({
      mask: buildMask('rectangle', 7, 7),
      words,
      dirs: classic,
      rng: createRng(1),
    })

    expect(puzzle.unplaced.length).toBeGreaterThan(0)
    expect(verifyPuzzle(puzzle, words, classic).ok).toBe(true)
  })

  it('reports an accidental duplicate without calling the puzzle invalid', () => {
    // A 5x5 of nothing but A will contain AA many times over.
    const mask = buildMask('rectangle', 5, 5)
    const puzzle: Puzzle = {
      mask,
      letters: new Array(25).fill('A'),
      placements: [{ key: 'AA', raw: 'Aa', row: 0, col: 0, dir: [0, 1] }],
      unplaced: [],
    }

    const result = verifyPuzzle(puzzle, parseWordList('Aa'), classic)
    expect(result.ok).toBe(true)
    expect(result.duplicates[0].occurrences).toBeGreaterThan(1)
  })
})
