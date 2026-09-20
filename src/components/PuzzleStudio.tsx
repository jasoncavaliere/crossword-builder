import { useCallback, useEffect, useMemo, useState } from 'react'
import { DIFFICULTY_ORDER, directionsFor, nameOf, type Difficulty } from '../domain/directions'
import { generatePuzzle } from '../domain/generate'
import {
  PADDING_DEFAULT,
  PADDING_MAX,
  PADDING_MIN,
  SPACING_MAX,
  SPACING_MIN,
} from '../domain/geometry'
import { createRng } from '../domain/rng'
import { applyOverrides, buildMask, cellKey, SHAPE_LABELS, SHAPE_NAMES } from '../domain/shapes'
import type { ShapeName } from '../domain/shapes'
import type { Puzzle } from '../domain/types'
import { clearState, loadState, saveState, type StudioState } from '../domain/persistence'
import { BODY_LABELS, BODY_TYPES, FABRICS, type BodyType } from '../domain/shirts'
import { parseWordList } from '../domain/words'
import { verifyPuzzle, type VerifyResult } from '../domain/verify'
import GridView from './GridView'
import ShirtMockup from './ShirtMockup'
import VerifyPanel from './VerifyPanel'

const DEFAULT_WORDS = [
  'Passport',
  'Sunscreen',
  'Boarding pass',
  'Hammock',
  'Snorkel',
  'Espresso',
  'Postcard',
  'Ferry',
  'Market',
  'Sandals',
].join('\n')

const SIZE_MIN = 5
const SIZE_MAX = 28

/** Keystrokes should not each trigger a full regeneration. */
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}

export default function PuzzleStudio() {
  // Read once, lazily, so a returning author lands back where they left off
  // without the defaults flashing up first.
  const [restored] = useState(() => loadState())

  const [shape, setShape] = useState<ShapeName>(restored?.shape ?? 'rectangle')
  const [width, setWidth] = useState(restored?.width ?? 14)
  const [height, setHeight] = useState(restored?.height ?? 14)
  const [difficulty, setDifficulty] = useState<Difficulty>(restored?.difficulty ?? 'classic')
  const [seed, setSeed] = useState(restored?.seed ?? 1)
  const [wordsText, setWordsText] = useState(restored?.wordsText ?? DEFAULT_WORDS)
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    () => new Map(restored?.overrides ?? []),
  )
  const [showAnswers, setShowAnswers] = useState(false)
  const [showBorders, setShowBorders] = useState(restored?.showBorders ?? true)
  const [letterSpacing, setLetterSpacing] = useState(restored?.letterSpacing ?? 0)
  const [cellPadding, setCellPadding] = useState(restored?.cellPadding ?? PADDING_DEFAULT)
  const [bodyType, setBodyType] = useState<BodyType>('adultMale')
  const [fabricIndex, setFabricIndex] = useState(0)
  const [includeWordList, setIncludeWordList] = useState(true)
  // Derived from the load, not from the save effect: reporting "saved" by
  // setting state inside that effect would cascade a render on every keystroke.
  const [restoredNotice, setRestoredNotice] = useState(restored !== null)
  // Stored with the puzzle it describes, so a result can never outlive its grid.
  const [verification, setVerification] = useState<{
    puzzle: Puzzle
    result: VerifyResult
  } | null>(null)

  const debouncedWords = useDebounced(wordsText, 150)
  const words = useMemo(() => parseWordList(debouncedWords), [debouncedWords])
  const dirs = useMemo(() => directionsFor(difficulty), [difficulty])
  const mask = useMemo(
    () => applyOverrides(buildMask(shape, width, height), overrides),
    [shape, width, height, overrides],
  )

  // The puzzle is a pure function of the controls, so any change to a dial
  // regenerates it. The seed is one of those inputs, which is what makes a
  // preview reproducible and "Re-roll" meaningful rather than magic.
  const puzzle = useMemo(
    () => generatePuzzle({ mask, words, dirs, rng: createRng(seed) }),
    [mask, words, dirs, seed],
  )

  // A PASS shown next to a puzzle that has since regenerated would be a claim
  // about a grid that no longer exists. Deriving this rather than clearing it
  // in an effect means there is no render in which the stale result is visible.
  const currentVerification = verification?.puzzle === puzzle ? verification.result : null

  // Saved on every change rather than behind a button: this is a draft, and an
  // author who closes the tab did not decide to discard their work.
  useEffect(() => {
    const state: StudioState = {
      shape,
      width,
      height,
      difficulty,
      seed,
      wordsText,
      overrides: [...overrides],
      showBorders,
      letterSpacing,
      cellPadding,
    }
    saveState(state)
  }, [
    shape,
    width,
    height,
    difficulty,
    seed,
    wordsText,
    overrides,
    showBorders,
    letterSpacing,
    cellPadding,
  ])

  const runVerify = useCallback(() => {
    const result = verifyPuzzle(puzzle, words, dirs)
    setVerification({ puzzle, result })
    return result
  }, [puzzle, words, dirs])

  const resetShape = useCallback(() => setOverrides(new Map()), [])

  // Clears the saved draft as well as the live state, so "start over" does not
  // come back on the next visit.
  const startOver = useCallback(() => {
    clearState()
    setRestoredNotice(false)
    setShape('rectangle')
    setWidth(14)
    setHeight(14)
    setDifficulty('classic')
    setSeed(1)
    setWordsText(DEFAULT_WORDS)
    setOverrides(new Map())
    setShowBorders(true)
    setLetterSpacing(0)
    setCellPadding(PADDING_DEFAULT)
  }, [])

  const toggleCell = useCallback(
    (row: number, col: number) => {
      setOverrides((previous) => {
        const next = new Map(previous)
        const key = cellKey(row, col)
        const base = buildMask(shape, width, height)
        const current = next.get(key) ?? base.cells[row * base.width + col]
        next.set(key, !current)
        return next
      })
    },
    [shape, width, height],
  )

  // The console half of the verifier. Same functions the panel uses, so the two
  // can never disagree.
  useEffect(() => {
    window.wsb = {
      state: () => ({ shape, width, height, difficulty, seed, words, puzzle }),
      puzzle: () => puzzle,
      verify: () => verifyPuzzle(puzzle, words, dirs),
      grid: () => {
        const lines: string[] = []
        for (let row = 0; row < puzzle.mask.height; row++) {
          const cells: string[] = []
          for (let col = 0; col < puzzle.mask.width; col++) {
            const at = row * puzzle.mask.width + col
            cells.push(puzzle.mask.cells[at] ? (puzzle.letters[at] ?? '?') : '.')
          }
          lines.push(cells.join(' '))
        }
        return lines.join('\n')
      },
    }
  }, [shape, width, height, difficulty, seed, words, puzzle, dirs])

  const inPlayCells = mask.cells.filter(Boolean).length

  return (
    <div className="ws-studio">
      <section className="ws-panel ws-controls">
        <h2 className="ws-panel-title">Shape</h2>
        <div className="ws-chip-row">
          {SHAPE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className={name === shape ? 'ws-chip ws-chip-on' : 'ws-chip'}
              aria-pressed={name === shape}
              onClick={() => setShape(name)}
            >
              {SHAPE_LABELS[name]}
            </button>
          ))}
        </div>

        <label className="ws-slider">
          <span>
            Width <strong>{width}</strong>
          </span>
          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
          />
        </label>

        <label className="ws-slider">
          <span>
            Height <strong>{height}</strong>
          </span>
          <input
            type="range"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
          />
        </label>

        <label className="ws-slider">
          <span>
            Letter spacing <strong>{letterSpacing}px</strong>
          </span>
          <input
            type="range"
            min={SPACING_MIN}
            max={SPACING_MAX}
            value={letterSpacing}
            onChange={(event) => setLetterSpacing(Number(event.target.value))}
          />
        </label>

        <label className="ws-slider">
          <span>
            Cell padding <strong>{cellPadding}px</strong>
          </span>
          <input
            type="range"
            min={PADDING_MIN}
            max={PADDING_MAX}
            value={cellPadding}
            onChange={(event) => setCellPadding(Number(event.target.value))}
          />
        </label>

        <label className="ws-toggle">
          <input
            type="checkbox"
            checked={showBorders}
            onChange={(event) => setShowBorders(event.target.checked)}
          />
          Cell borders
        </label>

        <h2 className="ws-panel-title">Difficulty</h2>
        <div className="ws-chip-row">
          {DIFFICULTY_ORDER.map((level) => (
            <button
              key={level}
              type="button"
              className={level === difficulty ? 'ws-chip ws-chip-on' : 'ws-chip'}
              aria-pressed={level === difficulty}
              onClick={() => setDifficulty(level)}
            >
              {level}
            </button>
          ))}
        </div>
        <p className="ws-hint">Directions: {dirs.map(nameOf).join(', ')}</p>

        <div className="ws-button-row">
          <button type="button" className="ws-button" onClick={() => setSeed((s) => s + 1)}>
            Re-roll
          </button>
          <button
            type="button"
            className="ws-button"
            onClick={resetShape}
            disabled={overrides.size === 0}
          >
            Reset edits
          </button>
        </div>
        <div className="ws-button-row">
          <button type="button" className="ws-button" onClick={startOver}>
            Start over
          </button>
        </div>
        <p className="ws-hint">
          Seed {seed}. Click any cell in the preview to carve it in or out of the shape.
        </p>
        <p className="ws-hint">
          {restoredNotice
            ? 'Restored from your last session. Changes keep saving automatically.'
            : 'Changes save automatically and come back when you reopen this page.'}
        </p>
      </section>

      <section className="ws-panel ws-preview">
        <h2 className="ws-panel-title">Preview</h2>
        <GridView
          puzzle={puzzle}
          showAnswers={showAnswers}
          showBorders={showBorders}
          letterSpacing={letterSpacing}
          cellPadding={cellPadding}
          onToggleCell={toggleCell}
        />
        <p className="ws-hint">
          {inPlayCells} cells in play, {puzzle.placements.length} of {words.length} words hidden.
        </p>
      </section>

      <section className="ws-panel ws-words">
        <h2 className="ws-panel-title">Words</h2>
        <textarea
          className="ws-textarea"
          value={wordsText}
          spellCheck={false}
          onChange={(event) => setWordsText(event.target.value)}
          aria-label="Word list, one per line"
          rows={12}
        />
        <p className="ws-hint">
          One per line. Spaces, hyphens and accents are stripped for the grid.
        </p>

        {puzzle.unplaced.length > 0 && (
          <div className="ws-unplaced">
            <strong>
              {puzzle.unplaced.length} {puzzle.unplaced.length === 1 ? 'word' : 'words'} did not fit
            </strong>
            <ul>
              {puzzle.unplaced.map((word) => (
                <li key={word.key}>
                  {word.raw} ({word.key.length}){' '}
                  {word.reason === 'too-long'
                    ? `- longest run in this shape is ${word.longestRun}`
                    : '- no free path; try Re-roll or a bigger grid'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="ws-panel ws-panel-wide ws-output">
        <div className="ws-panel-head">
          <h2 className="ws-panel-title">Print and preview on a shirt</h2>
          <div className="ws-button-row">
            <label className="ws-toggle">
              <input
                type="checkbox"
                checked={includeWordList}
                onChange={(event) => setIncludeWordList(event.target.checked)}
              />
              Include word list
            </label>
            <button type="button" className="ws-button" onClick={() => window.print()}>
              Print puzzle
            </button>
          </div>
        </div>

        <div className="ws-output-body">
          <div className="ws-output-controls">
            <h3 className="ws-panel-title">Body</h3>
            <div className="ws-chip-row">
              {BODY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={type === bodyType ? 'ws-chip ws-chip-on' : 'ws-chip'}
                  aria-pressed={type === bodyType}
                  onClick={() => setBodyType(type)}
                >
                  {BODY_LABELS[type]}
                </button>
              ))}
            </div>

            <h3 className="ws-panel-title">Fabric</h3>
            <div className="ws-chip-row">
              {FABRICS.map((option, index) => (
                <button
                  key={option.name}
                  type="button"
                  className={index === fabricIndex ? 'ws-chip ws-chip-on' : 'ws-chip'}
                  aria-pressed={index === fabricIndex}
                  onClick={() => setFabricIndex(index)}
                >
                  <span className="ws-swatch" style={{ background: option.cloth }} />
                  {option.name}
                </button>
              ))}
            </div>

            <p className="ws-hint">
              Printing outputs the puzzle only, not the page. Answers are never printed.
            </p>
          </div>

          <ShirtMockup
            puzzle={puzzle}
            bodyType={bodyType}
            fabric={FABRICS[fabricIndex]}
            showBorders={showBorders}
            letterSpacing={letterSpacing}
            cellPadding={cellPadding}
          />
        </div>
      </section>

      {/* Screen-hidden, print-only. The on-screen list is a textarea, which
          prints as a scrolled box rather than as a readable list. */}
      {includeWordList && (
        <section className="ws-print-words">
          <h2>Words to find</h2>
          <ul>
            {words.map((word) => (
              <li key={word.key}>{word.raw}</li>
            ))}
          </ul>
        </section>
      )}

      <VerifyPanel
        result={currentVerification}
        onVerify={runVerify}
        showAnswers={showAnswers}
        onToggleAnswers={() => setShowAnswers((shown) => !shown)}
      />
    </div>
  )
}
