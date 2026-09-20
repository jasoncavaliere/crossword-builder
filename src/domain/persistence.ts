import { DIFFICULTIES, type Difficulty } from './directions'
import { SHAPE_NAMES, type ShapeName } from './shapes'

const STORAGE_KEY = 'word-search-builder/studio'

/**
 * Bumped whenever the saved shape changes incompatibly. A payload from an older
 * version is discarded rather than migrated: this is a puzzle draft, not data
 * worth a migration path, and silently restoring half a state is worse than
 * starting clean.
 */
const VERSION = 1

/** Everything the studio needs to come back exactly as it was left. */
export interface StudioState {
  shape: ShapeName
  width: number
  height: number
  difficulty: Difficulty
  seed: number
  wordsText: string
  /** Per-cell shape edits, as [.."row,col", inPlay] pairs. */
  overrides: [string, boolean][]
  showBorders: boolean
  letterSpacing: number
  cellPadding: number
}

interface Stored extends StudioState {
  v: number
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * Validate a parsed payload field by field.
 *
 * Anything in localStorage is untrusted: it can be hand-edited, left behind by
 * an older build, or corrupted. A bad field must not be able to crash the app
 * on load, so a payload that fails any check is discarded whole.
 */
function parse(raw: string): StudioState | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Partial<Stored>

  if (candidate.v !== VERSION) return null
  if (!SHAPE_NAMES.includes(candidate.shape as ShapeName)) return null
  if (!Object.keys(DIFFICULTIES).includes(candidate.difficulty as string)) return null
  if (!isFiniteNumber(candidate.width) || !isFiniteNumber(candidate.height)) return null
  if (!isFiniteNumber(candidate.seed)) return null
  if (!isFiniteNumber(candidate.letterSpacing) || !isFiniteNumber(candidate.cellPadding))
    return null
  if (typeof candidate.wordsText !== 'string') return null
  if (typeof candidate.showBorders !== 'boolean') return null
  if (!Array.isArray(candidate.overrides)) return null

  const overrides = candidate.overrides.filter(
    (entry): entry is [string, boolean] =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'string' &&
      typeof entry[1] === 'boolean',
  )

  return {
    shape: candidate.shape as ShapeName,
    width: candidate.width,
    height: candidate.height,
    difficulty: candidate.difficulty as Difficulty,
    seed: candidate.seed,
    wordsText: candidate.wordsText,
    overrides,
    showBorders: candidate.showBorders,
    letterSpacing: candidate.letterSpacing,
    cellPadding: candidate.cellPadding,
  }
}

/**
 * Read the saved draft, or null when there is none.
 *
 * Every access is guarded: localStorage throws outright in some privacy modes
 * rather than returning empty, and a builder that cannot open is a worse
 * outcome than one that forgets.
 */
export function loadState(): StudioState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw === null ? null : parse(raw)
  } catch {
    return null
  }
}

export function saveState(state: StudioState): void {
  try {
    const payload: Stored = { v: VERSION, ...state }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded, or storage blocked. Losing the draft is acceptable;
    // interrupting the author is not.
  }
}

export function clearState(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing useful to do, and nothing worth interrupting for.
  }
}
