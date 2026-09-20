/**
 * Core puzzle types.
 *
 * The one rule that shapes all of these: a grid is a lattice plus a mask, and
 * nothing may assume the mask is full. A plain rectangle is the special case
 * where every cell happens to be in play.
 */

/** A step in the grid, as [rowDelta, colDelta]. */
export type Vec2 = readonly [number, number]

/**
 * Which cells are in play. Row-major, `width * height` entries long; `true`
 * means the cell holds a letter, `false` means it is outside the shape.
 */
export interface Mask {
  readonly width: number
  readonly height: number
  readonly cells: readonly boolean[]
}

/**
 * A word as entered and as hidden. `raw` is what the printed list shows,
 * `key` is the bare A-Z form that goes in the grid. They differ whenever the
 * author types spaces, hyphens or accents.
 */
export interface WordEntry {
  readonly raw: string
  readonly key: string
}

/** One hidden word, pinned to a start cell and a direction. */
export interface Placement {
  readonly key: string
  readonly raw: string
  readonly row: number
  readonly col: number
  readonly dir: Vec2
}

/** Why a word did not make it into the grid. */
export type UnplacedReason =
  /** No run of in-play cells anywhere in the shape is long enough to hold it. */
  | 'too-long'
  /** It fits geometrically, but every candidate position collided with letters already placed. */
  | 'no-fit'

export interface UnplacedWord {
  readonly raw: string
  readonly key: string
  readonly reason: UnplacedReason
  /** The longest run available in this shape, for the 'too-long' message. */
  readonly longestRun: number
}

/**
 * A generated puzzle. `letters` is row-major and parallel to `mask.cells`:
 * a letter where the cell is in play, `null` where it is not.
 */
export interface Puzzle {
  readonly mask: Mask
  readonly letters: readonly (string | null)[]
  readonly placements: readonly Placement[]
  readonly unplaced: readonly UnplacedWord[]
}

/** Row-major index of a cell. */
export function indexOf(mask: Mask, row: number, col: number): number {
  return row * mask.width + col
}

export function inBounds(mask: Mask, row: number, col: number): boolean {
  return row >= 0 && row < mask.height && col >= 0 && col < mask.width
}

/** True when the cell exists and is part of the puzzle's shape. */
export function isInPlay(mask: Mask, row: number, col: number): boolean {
  return inBounds(mask, row, col) && mask.cells[indexOf(mask, row, col)]
}
