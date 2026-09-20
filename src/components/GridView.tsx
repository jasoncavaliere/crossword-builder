import { useMemo } from 'react'
import { gridMetrics } from '../domain/geometry'
import { indexOf, type Placement, type Puzzle } from '../domain/types'

export interface GridCellsProps {
  readonly puzzle: Puzzle
  readonly showAnswers: boolean
  readonly showBorders: boolean
  readonly letterSpacing: number
  readonly cellPadding: number
  /** Omitted for a non-interactive rendering, such as the shirt mockup. */
  readonly onToggleCell?: (row: number, col: number) => void
  /** Overrides the themed letter colour, for mockups on coloured fabric. */
  readonly ink?: string
}

/**
 * The grid's contents, without an `<svg>` wrapper.
 *
 * Split out so the same rendering can be embedded in a nested `<svg>` on the
 * shirt mockup. A mockup that redrew the grid its own way would drift from the
 * preview, and the preview is the thing being approved.
 */
export function GridCells({
  puzzle,
  showAnswers,
  showBorders,
  letterSpacing,
  cellPadding,
  onToggleCell,
  ink,
}: GridCellsProps) {
  const { mask, letters, placements } = puzzle
  const { box, pitch } = gridMetrics(mask, letterSpacing, cellPadding)
  const inset = letterSpacing / 2
  const interactive = onToggleCell !== undefined

  // Precompute which cells belong to an answer, so highlighting does not
  // rescan every placement for every cell.
  const answerCells = useMemo(() => {
    const cells = new Set<number>()
    if (!showAnswers) return cells
    for (const placement of placements) {
      const [dr, dc] = placement.dir
      for (let i = 0; i < placement.key.length; i++) {
        cells.add(indexOf(mask, placement.row + dr * i, placement.col + dc * i))
      }
    }
    return cells
  }, [showAnswers, placements, mask])

  const cells = []
  for (let row = 0; row < mask.height; row++) {
    for (let col = 0; col < mask.width; col++) {
      const at = indexOf(mask, row, col)
      const inPlay = mask.cells[at]
      const highlighted = answerCells.has(at)

      // With borders off, only an answer tint is drawn: everything else is
      // meant to read as bare letters on the page background.
      let boxClass: string | null = null
      if (inPlay && highlighted) {
        boxClass = showBorders ? 'ws-cell-box ws-cell-answer' : 'ws-cell-answer ws-cell-bare'
      } else if (inPlay && showBorders) {
        boxClass = 'ws-cell-box'
      }

      cells.push(
        <g
          key={at}
          onClick={interactive ? () => onToggleCell(row, col) : undefined}
          className={interactive ? 'ws-cell' : 'ws-cell ws-cell-static'}
          role="gridcell"
          aria-label={`row ${row + 1} column ${col + 1} ${inPlay ? (letters[at] ?? '') : 'outside the shape'}`}
        >
          {/* A full-pitch transparent hit area. Cells stay clickable with the
              borders hidden, and masked-out cells stay clickable so a carved
              cell can be put back. */}
          <rect
            x={col * pitch}
            y={row * pitch}
            width={pitch}
            height={pitch}
            className="ws-cell-hit"
          />
          {boxClass !== null && (
            <rect
              x={col * pitch + inset}
              y={row * pitch + inset}
              width={box}
              height={box}
              rx={Math.min(4, box / 4)}
              className={boxClass}
              style={ink === undefined ? undefined : { fill: 'none', stroke: ink, opacity: 0.55 }}
            />
          )}
          {inPlay && (
            <text
              x={col * pitch + pitch / 2}
              y={row * pitch + pitch / 2}
              className={highlighted ? 'ws-letter ws-letter-answer' : 'ws-letter'}
              style={ink === undefined ? undefined : { fill: ink }}
            >
              {letters[at]}
            </text>
          )}
        </g>,
      )
    }
  }

  return (
    <>
      {cells}
      {showAnswers &&
        placements.map((placement) => (
          <AnswerLine key={placement.key} placement={placement} pitch={pitch} />
        ))}
    </>
  )
}

export interface GridViewProps extends GridCellsProps {
  readonly onToggleCell: (row: number, col: number) => void
}

/**
 * The puzzle preview, as SVG.
 *
 * SVG rather than a DOM grid because a print-ready vector export is the first
 * planned output, so the preview and the export can eventually share geometry.
 */
export default function GridView(props: GridViewProps) {
  const { width, height } = gridMetrics(props.puzzle.mask, props.letterSpacing, props.cellPadding)

  return (
    <svg
      className="ws-grid"
      viewBox={`0 0 ${width} ${height}`}
      // Sized in real pixels so widening the spacing visibly grows the grid,
      // and capped so a large one still scales down to the panel.
      style={{ width, maxWidth: '100%' }}
      role="grid"
      aria-label="Word search preview"
    >
      <GridCells {...props} />
    </svg>
  )
}

/** A capsule drawn along a hidden word, the way a solver rings one. */
function AnswerLine({
  placement,
  pitch,
}: {
  readonly placement: Placement
  readonly pitch: number
}) {
  const [dr, dc] = placement.dir
  const last = placement.key.length - 1
  return (
    <line
      x1={placement.col * pitch + pitch / 2}
      y1={placement.row * pitch + pitch / 2}
      x2={(placement.col + dc * last) * pitch + pitch / 2}
      y2={(placement.row + dr * last) * pitch + pitch / 2}
      className="ws-answer-line"
    />
  )
}
