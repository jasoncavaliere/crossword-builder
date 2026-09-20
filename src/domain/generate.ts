import { randomFillerLetter } from './filler'
import { shuffled, type Rng } from './rng'
import { indexOf, isInPlay, type Mask, type Placement, type Puzzle } from './types'
import type { UnplacedWord, Vec2, WordEntry } from './types'

export interface GenerateOptions {
  readonly mask: Mask
  readonly words: readonly WordEntry[]
  readonly dirs: readonly Vec2[]
  readonly rng: Rng
}

/** A candidate position for a word: where it starts and which way it runs. */
interface Candidate {
  readonly row: number
  readonly col: number
  readonly dir: Vec2
}

/**
 * The longest unbroken run of in-play cells, over the allowed directions.
 *
 * Used to tell "this word can never fit in this shape" apart from "it fits, but
 * every position collided this time". The author needs that distinction: the
 * first means resize or reshape, the second means re-roll.
 */
export function longestRun(mask: Mask, dirs: readonly Vec2[]): number {
  let best = 0

  for (const [dr, dc] of dirs) {
    for (let row = 0; row < mask.height; row++) {
      for (let col = 0; col < mask.width; col++) {
        // Only start counting at the beginning of a run, so each run is
        // measured once rather than once per cell.
        if (isInPlay(mask, row - dr, col - dc)) continue

        let length = 0
        let r = row
        let c = col
        while (isInPlay(mask, r, c)) {
          length++
          r += dr
          c += dc
        }
        if (length > best) best = length
      }
    }
  }

  return best
}

/**
 * Every position where `key` fits the shape and agrees with the letters already
 * on the grid. Overlap is allowed exactly where the letters match, which is what
 * makes a word search interlock without requiring it to.
 */
function candidatesFor(
  key: string,
  mask: Mask,
  letters: readonly (string | null)[],
  dirs: readonly Vec2[],
): Candidate[] {
  const found: Candidate[] = []

  for (const dir of dirs) {
    const [dr, dc] = dir
    for (let row = 0; row < mask.height; row++) {
      for (let col = 0; col < mask.width; col++) {
        let fits = true

        for (let i = 0; i < key.length; i++) {
          const r = row + dr * i
          const c = col + dc * i
          if (!isInPlay(mask, r, c)) {
            fits = false
            break
          }
          const existing = letters[indexOf(mask, r, c)]
          if (existing !== null && existing !== key[i]) {
            fits = false
            break
          }
        }

        if (fits) found.push({ row, col, dir })
      }
    }
  }

  return found
}

/**
 * Build a puzzle: place what fits, report what does not, then fill the rest.
 *
 * Words go in longest first. A long word has the fewest legal positions, so
 * placing it while the grid is empty is far more likely to succeed than trying
 * to squeeze it in after the short words have fragmented the space.
 *
 * Placement failure is a normal outcome here, not an exception. With live
 * regeneration the author is constantly one slider away from an impossible
 * grid, and the preview still has to render.
 */
export function generatePuzzle({ mask, words, dirs, rng }: GenerateOptions): Puzzle {
  const letters: (string | null)[] = new Array(mask.width * mask.height).fill(null)
  const placements: Placement[] = []
  const unplaced: UnplacedWord[] = []

  const maxRun = longestRun(mask, dirs)
  const byLengthDesc = [...words].sort((a, b) => b.key.length - a.key.length)

  for (const word of byLengthDesc) {
    if (word.key.length > maxRun) {
      unplaced.push({ ...word, reason: 'too-long', longestRun: maxRun })
      continue
    }

    const candidates = candidatesFor(word.key, mask, letters, dirs)
    if (candidates.length === 0) {
      unplaced.push({ ...word, reason: 'no-fit', longestRun: maxRun })
      continue
    }

    // Pick uniformly among legal positions rather than scanning for the first
    // one, otherwise every word crowds into the top-left corner.
    const chosen = shuffled(rng, candidates)[0]
    const [dr, dc] = chosen.dir
    for (let i = 0; i < word.key.length; i++) {
      letters[indexOf(mask, chosen.row + dr * i, chosen.col + dc * i)] = word.key[i]
    }

    placements.push({
      key: word.key,
      raw: word.raw,
      row: chosen.row,
      col: chosen.col,
      dir: chosen.dir,
    })
  }

  for (let row = 0; row < mask.height; row++) {
    for (let col = 0; col < mask.width; col++) {
      const at = indexOf(mask, row, col)
      if (!mask.cells[at]) continue
      if (letters[at] === null) letters[at] = randomFillerLetter(rng)
    }
  }

  // Report in the author's original order, not longest-first.
  const order = new Map(words.map((word, i) => [word.key, i]))
  placements.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))
  unplaced.sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0))

  return { mask, letters, placements, unplaced }
}
