import { useMemo } from 'react'
import { indexOf, type Placement, type Puzzle } from '../domain/types'

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

export interface GridViewProps {
  readonly puzzle: Puzzle
  /** Draw the answer key over the grid, so the puzzle's owner can help a stuck solver. Where the key goes in the *exported* artifact is still open. */
  readonly showAnswers: boolean
  /** Draw each cell's box. With it off the letters sit straight on the page background. */
  readonly showBorders: boolean
  /** Extra pixels between adjacent cells. */
  readonly letterSpacing: number
  /** Pixels of breathing room around the letter, inside its own cell. */
  readonly cellPadding: number
  readonly onToggleCell: (row: number, col: number) => void
}

/**
 * The puzzle preview, as SVG.
 *
 * SVG rather than a DOM grid because a print-ready vector export is the first
 * planned output, so the preview and the export can eventually share geometry.
 */
export default function GridView({
  puzzle,
  showAnswers,
  showBorders,
  letterSpacing,
  cellPadding,
  onToggleCell,
}: GridViewProps) {
  const { mask, letters, placements } = puzzle

  // Two independent dials. Padding sets how much room the letter gets inside
  // its box; spacing sets how far apart the boxes sit. Changing one must not
  // move the other, which is why the box is derived rather than fixed.
  const box = GLYPH + 2 * cellPadding
  const pitch = box + letterSpacing
  const inset = letterSpacing / 2

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
          onClick={() => onToggleCell(row, col)}
          className="ws-cell"
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
            />
          )}
          {inPlay && (
            <text
              x={col * pitch + pitch / 2}
              y={row * pitch + pitch / 2}
              className={highlighted ? 'ws-letter ws-letter-answer' : 'ws-letter'}
            >
              {letters[at]}
            </text>
          )}
        </g>,
      )
    }
  }

  const gridWidth = mask.width * pitch

  return (
    <svg
      className="ws-grid"
      viewBox={`0 0 ${gridWidth} ${mask.height * pitch}`}
      // Sized in real pixels so widening the spacing visibly grows the grid,
      // and capped so a large one still scales down to the panel.
      style={{ width: gridWidth, maxWidth: '100%' }}
      role="grid"
      aria-label="Word search preview"
    >
      {cells}
      {showAnswers &&
        placements.map((placement) => (
          <AnswerLine key={placement.key} placement={placement} pitch={pitch} />
        ))}
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
