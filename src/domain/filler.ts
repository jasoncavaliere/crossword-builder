import type { Rng } from './rng'

/**
 * Relative letter frequencies in English text.
 *
 * Uniform random filler is a tell: rare letters turn up far too often, so any
 * run that looks like a word stands out and the puzzle solves itself. Drawing
 * from a realistic distribution makes the filler read as plausible text.
 */
const LETTER_FREQUENCIES: readonly (readonly [string, number])[] = [
  ['E', 12.702],
  ['T', 9.056],
  ['A', 8.167],
  ['O', 7.507],
  ['I', 6.966],
  ['N', 6.749],
  ['S', 6.327],
  ['H', 6.094],
  ['R', 5.987],
  ['D', 4.253],
  ['L', 4.025],
  ['C', 2.782],
  ['U', 2.758],
  ['M', 2.406],
  ['W', 2.36],
  ['F', 2.228],
  ['G', 2.015],
  ['Y', 1.974],
  ['P', 1.929],
  ['B', 1.492],
  ['V', 0.978],
  ['K', 0.772],
  ['J', 0.153],
  ['X', 0.15],
  ['Q', 0.095],
  ['Z', 0.074],
]

const TOTAL_WEIGHT = LETTER_FREQUENCIES.reduce((sum, [, weight]) => sum + weight, 0)

/**
 * One filler letter, drawn from the English distribution.
 *
 * Kept as a standalone function so the strategy stays swappable - sampling from
 * the word list instead is still an open question in docs/decisions.md.
 */
export function randomFillerLetter(rng: Rng): string {
  let roll = rng.next() * TOTAL_WEIGHT
  for (const [letter, weight] of LETTER_FREQUENCIES) {
    roll -= weight
    if (roll <= 0) return letter
  }
  // Only reachable through floating point drift at the very top of the range.
  return LETTER_FREQUENCIES[0][0]
}
