import type { Vec2 } from './types'

/**
 * The eight candidate directions a word may run. Row increases downward, so
 * N is negative and S is positive.
 */
export const DIRECTIONS = {
  E: [0, 1],
  W: [0, -1],
  S: [1, 0],
  N: [-1, 0],
  SE: [1, 1],
  SW: [1, -1],
  NE: [-1, 1],
  NW: [-1, -1],
} as const satisfies Record<string, Vec2>

export type DirectionName = keyof typeof DIRECTIONS

/**
 * Difficulty is nothing more than a named subset of the directions. Keeping it
 * that way is why adding a custom direction picker later costs nothing.
 */
export const DIFFICULTIES = {
  easy: ['E', 'S'],
  classic: ['E', 'S', 'SE', 'NE'],
  hard: ['E', 'W', 'S', 'N', 'SE', 'SW', 'NE', 'NW'],
} as const satisfies Record<string, readonly DirectionName[]>

export type Difficulty = keyof typeof DIFFICULTIES

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['easy', 'classic', 'hard']

export function directionsFor(difficulty: Difficulty): Vec2[] {
  return DIFFICULTIES[difficulty].map((name) => DIRECTIONS[name])
}

/** The name of a direction vector, for verifier reports. */
export function nameOf(dir: Vec2): DirectionName | 'unknown' {
  for (const [name, vec] of Object.entries(DIRECTIONS)) {
    if (vec[0] === dir[0] && vec[1] === dir[1]) return name as DirectionName
  }
  return 'unknown'
}
