import type { WordEntry } from './types'

/**
 * Reduce an entered word to the bare letters that go in the grid.
 *
 * A grid cell holds one A-Z letter, so spaces, hyphens, punctuation and accents
 * all have to go. The original text survives as `raw` for the printed list, which
 * is why "New York" can print properly while hiding as NEWYORK.
 */
export function normalizeWord(raw: string): string {
  return raw
    .normalize('NFD') // split accented characters into letter + combining mark
    .replace(/[̀-ͯ]/g, '') // drop the marks, so "cafe" survives as CAFE
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
}

/**
 * Parse a pasted block into word entries, one per line.
 *
 * Blank lines and lines with no letters at all are dropped. Duplicate keys are
 * dropped too: hiding the same word twice would make the answer key ambiguous,
 * and "New York" and "newyork" are the same word once normalized.
 */
export function parseWordList(text: string): WordEntry[] {
  const seen = new Set<string>()
  const entries: WordEntry[] = []

  for (const line of text.split('\n')) {
    const raw = line.trim()
    if (raw === '') continue

    const key = normalizeWord(raw)
    if (key === '' || seen.has(key)) continue

    seen.add(key)
    entries.push({ raw, key })
  }

  return entries
}
