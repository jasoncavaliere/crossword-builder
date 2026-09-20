import type { Difficulty } from './domain/directions'
import type { ShapeName } from './domain/shapes'
import type { Puzzle, WordEntry } from './domain/types'
import type { VerifyResult } from './domain/verify'

/**
 * The console half of the verifier, exposed on `window` so edge cases can be
 * driven by hand from devtools rather than only through the UI.
 */
export interface WsbConsoleApi {
  state(): {
    shape: ShapeName
    width: number
    height: number
    difficulty: Difficulty
    seed: number
    words: readonly WordEntry[]
    puzzle: Puzzle
  }
  puzzle(): Puzzle
  verify(): VerifyResult
  /** The grid as plain text, for eyeballing in the console. */
  grid(): string
}

declare global {
  interface Window {
    wsb: WsbConsoleApi
  }
}
