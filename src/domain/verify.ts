import { nameOf } from './directions'
import { indexOf, isInPlay, type Placement, type Puzzle, type Vec2, type WordEntry } from './types'

export interface CheckResult {
  readonly name: string
  readonly ok: boolean
  readonly detail: string
}

export interface VerifyResult {
  readonly ok: boolean
  readonly checks: readonly CheckResult[]
  /** Words found more than once in the grid. Informational, not a failure. */
  readonly duplicates: readonly { key: string; occurrences: number }[]
}

/**
 * Every position at which `key` can be read off the grid, searching the allowed
 * directions.
 *
 * This deliberately ignores the generator's placement records and reads only the
 * rendered letters, because the whole point of the verifier is to catch a
 * generator that reports a placement it did not actually write.
 */
export function findOccurrences(puzzle: Puzzle, key: string, dirs: readonly Vec2[]): Placement[] {
  const { mask, letters } = puzzle
  const hits: Placement[] = []
  if (key.length === 0) return hits

  for (const dir of dirs) {
    const [dr, dc] = dir
    for (let row = 0; row < mask.height; row++) {
      for (let col = 0; col < mask.width; col++) {
        let matches = true

        for (let i = 0; i < key.length; i++) {
          const r = row + dr * i
          const c = col + dc * i
          if (!isInPlay(mask, r, c) || letters[indexOf(mask, r, c)] !== key[i]) {
            matches = false
            break
          }
        }

        if (matches) hits.push({ key, raw: key, row, col, dir })
      }
    }
  }

  return hits
}

/**
 * Check a generated puzzle against the rules of a word search.
 *
 * The headline check is the independent re-solve: every word the generator
 * claims to have hidden has to actually be readable in the grid. The remaining
 * checks cover the ways a placement can be malformed even when the letters
 * happen to line up.
 */
export function verifyPuzzle(
  puzzle: Puzzle,
  words: readonly WordEntry[],
  dirs: readonly Vec2[],
): VerifyResult {
  const { mask, letters, placements, unplaced } = puzzle
  const checks: CheckResult[] = []
  const allowed = new Set(dirs.map((dir) => `${dir[0]},${dir[1]}`))

  // 1. The re-solve. Read each claimed word back out of the grid.
  const missing: string[] = []
  const duplicates: { key: string; occurrences: number }[] = []
  for (const placement of placements) {
    const hits = findOccurrences(puzzle, placement.key, dirs)
    if (hits.length === 0) missing.push(placement.key)
    else if (hits.length > 1) duplicates.push({ key: placement.key, occurrences: hits.length })
  }
  checks.push({
    name: 'Every hidden word is findable',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `${placements.length} of ${placements.length} re-solved from the grid`
        : `not findable: ${missing.join(', ')}`,
  })

  // 2. No word may run outside the shape.
  const escaping: string[] = []
  for (const placement of placements) {
    const [dr, dc] = placement.dir
    for (let i = 0; i < placement.key.length; i++) {
      if (!isInPlay(mask, placement.row + dr * i, placement.col + dc * i)) {
        escaping.push(placement.key)
        break
      }
    }
  }
  checks.push({
    name: 'Every word stays inside the shape',
    ok: escaping.length === 0,
    detail:
      escaping.length === 0
        ? 'no word crosses a masked-out cell'
        : `outside the mask: ${escaping.join(', ')}`,
  })

  // 3. Directions must come from the active difficulty.
  const offDirection = placements.filter((p) => !allowed.has(`${p.dir[0]},${p.dir[1]}`))
  checks.push({
    name: 'Every direction is allowed',
    ok: offDirection.length === 0,
    detail:
      offDirection.length === 0
        ? `all within ${dirs.map(nameOf).join(', ')}`
        : `disallowed: ${offDirection.map((p) => `${p.key} (${nameOf(p.dir)})`).join(', ')}`,
  })

  // 4. Overlaps have to agree with what is actually on the grid.
  const mismatched: string[] = []
  for (const placement of placements) {
    const [dr, dc] = placement.dir
    for (let i = 0; i < placement.key.length; i++) {
      const r = placement.row + dr * i
      const c = placement.col + dc * i
      if (!isInPlay(mask, r, c)) break
      if (letters[indexOf(mask, r, c)] !== placement.key[i]) {
        mismatched.push(placement.key)
        break
      }
    }
  }
  checks.push({
    name: 'Overlapping letters agree',
    ok: mismatched.length === 0,
    detail:
      mismatched.length === 0
        ? 'every shared cell carries one consistent letter'
        : `contradicted: ${mismatched.join(', ')}`,
  })

  // 5. The rendered grid has to be complete: a letter in every in-play cell and
  //    nothing at all outside the shape.
  let emptyInPlay = 0
  let letteredOutside = 0
  for (let i = 0; i < mask.cells.length; i++) {
    const letter = letters[i]
    if (mask.cells[i]) {
      if (letter === null || !/^[A-Z]$/.test(letter)) emptyInPlay++
    } else if (letter !== null) {
      letteredOutside++
    }
  }
  checks.push({
    name: 'The grid is completely filled',
    ok: emptyInPlay === 0 && letteredOutside === 0,
    detail:
      emptyInPlay === 0 && letteredOutside === 0
        ? `${mask.cells.filter(Boolean).length} cells in play, all lettered`
        : `${emptyInPlay} in-play cells blank, ${letteredOutside} letters outside the shape`,
  })

  // 6. Every word entered is accounted for, exactly once.
  const accounted = new Set([...placements.map((p) => p.key), ...unplaced.map((u) => u.key)])
  const lost = words.filter((word) => !accounted.has(word.key))
  const total = placements.length + unplaced.length
  checks.push({
    name: 'Every word is accounted for',
    ok: lost.length === 0 && total === words.length,
    detail:
      lost.length === 0 && total === words.length
        ? `${placements.length} placed, ${unplaced.length} reported unplaceable`
        : `unaccounted: ${lost.map((w) => w.key).join(', ') || `${total} vs ${words.length}`}`,
  })

  return { ok: checks.every((check) => check.ok), checks, duplicates }
}
