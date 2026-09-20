import type { Mask } from './types'

/**
 * The letter itself, at the font size `.ws-letter` renders. Everything else is
 * measured outwards from this, which keeps the two spacing dials independent:
 *
 *   box   = GLYPH + 2 * cellPadding   <- room around the letter, inside its cell
 *   pitch = box + letterSpacing       <- gap between one cell and the next
 */
const GLYPH = 16

export const SPACING_MIN = 0
export const SPACING_MAX = 20

export const PADDING_MIN = 0
export const PADDING_MAX = 16
/** Reproduces the original fixed 30px box, so the default look is unchanged. */
export const PADDING_DEFAULT = 7

export interface GridMetrics {
  readonly box: number
  readonly pitch: number
  readonly width: number
  readonly height: number
}

export function gridMetrics(mask: Mask, letterSpacing: number, cellPadding: number): GridMetrics {
  const box = GLYPH + 2 * cellPadding
  const pitch = box + letterSpacing
  return { box, pitch, width: mask.width * pitch, height: mask.height * pitch }
}
