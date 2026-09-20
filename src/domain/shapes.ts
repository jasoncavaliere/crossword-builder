import type { Mask } from './types'

/**
 * Shape presets.
 *
 * A shape is a function (width, height) -> mask, not stored geometry. That is
 * what lets the width and height dials re-rasterize live: resizing a heart
 * recomputes it rather than stretching a bitmap.
 */
export const SHAPE_NAMES = ['rectangle', 'heart', 'circle', 'diamond', 'star', 'mickey'] as const
export type ShapeName = (typeof SHAPE_NAMES)[number]

export const SHAPE_LABELS: Record<ShapeName, string> = {
  rectangle: 'Rectangle',
  heart: 'Heart',
  circle: 'Circle',
  diamond: 'Diamond',
  star: 'Star',
  mickey: 'Mickey Ears',
}

/**
 * Each shape is an implicit test over normalized coordinates: x and y run from
 * -1 to 1 across the grid, sampled at cell centres. Returning true puts the
 * cell in play.
 */
type ShapeTest = (x: number, y: number) => boolean

const SHAPE_TESTS: Record<ShapeName, ShapeTest> = {
  rectangle: () => true,

  circle: (x, y) => x * x + y * y <= 1,

  diamond: (x, y) => Math.abs(x) + Math.abs(y) <= 1,

  // The classic implicit heart curve. y is negated because row 0 is the top,
  // and the whole thing is scaled to fill the box a little more generously.
  heart: (x, y) => {
    const hx = x * 1.2
    const hy = -y * 1.2 + 0.35
    const t = hx * hx + hy * hy - 1
    return t * t * t - hx * hx * hy * hy * hy <= 0
  },

  // A five-pointed star, as a radius that varies with angle: maximum at each
  // spike, minimum in each valley, linear in between.
  star: (x, y) => {
    const radius = Math.hypot(x, y)
    if (radius === 0) return true

    const spikes = 5
    const outer = 1
    const inner = 0.42

    // Measure from straight up so one spike points at the top of the grid.
    const angle = Math.atan2(x, -y)
    const sector = (2 * Math.PI) / spikes
    const within = (((angle % sector) + sector) % sector) / sector
    const toNearestSpike = 2 * Math.min(within, 1 - within)
    const limit = outer + (inner - outer) * toNearestSpike

    return radius <= limit
  },

  // A head with two ears: three overlapping discs. The ear discs sit close
  // enough that they overlap the head rather than merely touching it - tangent
  // circles rasterize into a pinched join that can break the silhouette, and
  // can leave an ear as an island with no run into the head.
  mickey: (x, y) => {
    const inDisc = (cx: number, cy: number, r: number) =>
      (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r

    // y is negative upward, so the ears carry negative centres.
    return inDisc(0, 0.28, 0.66) || inDisc(-0.55, -0.45, 0.36) || inDisc(0.55, -0.45, 0.36)
  },
}

/**
 * Rasterize a shape into a width x height lattice.
 *
 * Sampling is at cell centres, mapped so the outermost cell centres sit at -1
 * and 1. A single row or column would divide by zero, so those degenerate cases
 * sample down the middle of the axis instead.
 */
export function buildMask(shape: ShapeName, width: number, height: number): Mask {
  const test = SHAPE_TESTS[shape]
  const cells: boolean[] = new Array(width * height)

  for (let row = 0; row < height; row++) {
    const y = height === 1 ? 0 : (row / (height - 1)) * 2 - 1
    for (let col = 0; col < width; col++) {
      const x = width === 1 ? 0 : (col / (width - 1)) * 2 - 1
      cells[row * width + col] = test(x, y)
    }
  }

  // A shape can rasterize to nothing at small sizes (a star at 3x3, say).
  // An empty grid is never a useful preview, so fall back to the full rectangle
  // and let the author size up into the real shape.
  if (!cells.some(Boolean)) cells.fill(true)

  return { width, height, cells }
}

/** Apply the author's per-cell overrides on top of a preset's rasterization. */
export function applyOverrides(mask: Mask, overrides: ReadonlyMap<string, boolean>): Mask {
  if (overrides.size === 0) return mask

  const cells = mask.cells.slice()
  for (const [cellKey, inPlay] of overrides) {
    const [row, col] = cellKey.split(',').map(Number)
    // Overrides are keyed by coordinate and survive resizes, so a saved
    // override can fall outside a grid that has since shrunk. Skip those
    // rather than dropping them - they come back if the grid grows again.
    if (row >= 0 && row < mask.height && col >= 0 && col < mask.width) {
      cells[row * mask.width + col] = inPlay
    }
  }

  return { ...mask, cells }
}

export function cellKey(row: number, col: number): string {
  return `${row},${col}`
}
