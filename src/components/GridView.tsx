import { useMemo } from 'react'
import { indexOf, type Placement, type Puzzle } from '../domain/types'

const CELL = 30

export interface GridViewProps {
  readonly puzzle: Puzzle
  /** Draw the answer key over the grid, so the puzzle's owner can help a stuck solver. Where the key goes in the *exported* artifact is still open. */
  readonly showAnswers: boolean
  readonly onToggleCell: (row: number, col: number) => void
}

/**
 * The puzzle preview, as SVG.
 *
 * SVG rather than a DOM grid because a print-ready vector export is the first
 * planned output, so the preview and the export can eventually share geometry.
 */
export default function GridView({ puzzle, showAnswers, onToggleCell }: GridViewProps) {
  const { mask, letters, placements } = puzzle

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

  const rows = []
  for (let row = 0; row < mask.height; row++) {
    for (let col = 0; col < mask.width; col++) {
      const at = indexOf(mask, row, col)
      const inPlay = mask.cells[at]
      const highlighted = answerCells.has(at)

      rows.push(
        <g
          key={at}
          onClick={() => onToggleCell(row, col)}
          className="ws-cell"
          role="gridcell"
          aria-label={`row ${row + 1} column ${col + 1} ${inPlay ? (letters[at] ?? '') : 'outside the shape'}`}
        >
          <rect
            x={col * CELL}
            y={row * CELL}
            width={CELL}
            height={CELL}
            rx={4}
            className={
              inPlay ? (highlighted ? 'ws-cell-box ws-cell-answer' : 'ws-cell-box') : 'ws-cell-void'
            }
          />
          {inPlay && (
            <text
              x={col * CELL + CELL / 2}
              y={row * CELL + CELL / 2}
              className={highlighted ? 'ws-letter ws-letter-answer' : 'ws-letter'}
            >
              {letters[at]}
            </text>
          )}
        </g>,
      )
    }
  }

  return (
    <svg
      className="ws-grid"
      viewBox={`0 0 ${mask.width * CELL} ${mask.height * CELL}`}
      width="100%"
      role="grid"
      aria-label="Word search preview"
    >
      {rows}
      {showAnswers &&
        placements.map((placement) => <AnswerLine key={placement.key} placement={placement} />)}
    </svg>
  )
}

/** A capsule drawn along a hidden word, the way a solver rings one. */
function AnswerLine({ placement }: { readonly placement: Placement }) {
  const [dr, dc] = placement.dir
  const last = placement.key.length - 1
  return (
    <line
      x1={placement.col * CELL + CELL / 2}
      y1={placement.row * CELL + CELL / 2}
      x2={(placement.col + dc * last) * CELL + CELL / 2}
      y2={(placement.row + dr * last) * CELL + CELL / 2}
      className="ws-answer-line"
    />
  )
}
