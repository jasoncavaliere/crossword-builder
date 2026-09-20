import {
  BODY_LABELS,
  buildCollarPath,
  buildShirtPath,
  CANVAS,
  SHIRT_SPECS,
  type BodyType,
  type Fabric,
} from '../domain/shirts'
import { gridMetrics } from '../domain/geometry'
import type { Puzzle } from '../domain/types'
import { GridCells } from './GridView'

export interface ShirtMockupProps {
  readonly puzzle: Puzzle
  readonly bodyType: BodyType
  readonly fabric: Fabric
  readonly showBorders: boolean
  readonly letterSpacing: number
  readonly cellPadding: number
}

/**
 * A mock print of the puzzle on a shirt.
 *
 * The grid is the same `GridCells` the preview uses, scaled into the chest area
 * by a nested `<svg>`. Redrawing it here would let the mockup drift from the
 * thing being approved, which would defeat the point of having one.
 */
export default function ShirtMockup({
  puzzle,
  bodyType,
  fabric,
  showBorders,
  letterSpacing,
  cellPadding,
}: ShirtMockupProps) {
  const spec = SHIRT_SPECS[bodyType]
  const print = spec.printArea
  const grid = gridMetrics(puzzle.mask, letterSpacing, cellPadding)

  return (
    <svg
      className="ws-shirt"
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      role="img"
      aria-label={`${BODY_LABELS[bodyType]} t-shirt in ${fabric.name}, with the puzzle printed on the chest`}
    >
      <path d={buildShirtPath(spec)} className="ws-shirt-body" style={{ fill: fabric.cloth }} />
      <path d={buildCollarPath(spec)} className="ws-shirt-collar" style={{ fill: fabric.ink }} />

      {/* The individual cells are decoration here, not content: the preview
          above already exposes the grid, and repeating several hundred cells
          in the accessibility tree would bury it. */}
      <svg
        x={print.x}
        y={print.y}
        width={print.width}
        height={print.height}
        viewBox={`0 0 ${grid.width} ${grid.height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <GridCells
          puzzle={puzzle}
          showAnswers={false}
          showBorders={showBorders}
          letterSpacing={letterSpacing}
          cellPadding={cellPadding}
          ink={fabric.ink}
        />
      </svg>
    </svg>
  )
}
