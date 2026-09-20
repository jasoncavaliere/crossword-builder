import { describe, expect, it } from 'vitest'
import { normalizeWord, parseWordList } from './words'

describe('normalizeWord', () => {
  it('uppercases', () => {
    expect(normalizeWord('scuba')).toBe('SCUBA')
  })

  it('strips spaces and hyphens, because a cell holds one letter', () => {
    expect(normalizeWord('New York')).toBe('NEWYORK')
    expect(normalizeWord('co-op')).toBe('COOP')
  })

  it('folds accents rather than dropping the letter', () => {
    expect(normalizeWord('café')).toBe('CAFE')
    expect(normalizeWord('naïve')).toBe('NAIVE')
  })

  it('drops anything that is not a letter', () => {
    expect(normalizeWord("it's #1!")).toBe('ITS')
  })

  it('returns empty for input with no letters at all', () => {
    expect(normalizeWord('123 -- !')).toBe('')
  })
})

describe('parseWordList', () => {
  it('keeps the raw form for printing and the key for the grid', () => {
    expect(parseWordList('New York')).toEqual([{ raw: 'New York', key: 'NEWYORK' }])
  })

  it('ignores blank lines and lines with no letters', () => {
    expect(parseWordList('FERRY\n\n   \n123\nMARKET')).toHaveLength(2)
  })

  it('drops duplicates that differ only by formatting', () => {
    const words = parseWordList('New York\nnewyork\nNEW-YORK')
    expect(words).toHaveLength(1)
    expect(words[0].raw).toBe('New York')
  })

  it('preserves the order words were entered in', () => {
    expect(parseWordList('ONE\nTWO\nTHREE').map((w) => w.key)).toEqual(['ONE', 'TWO', 'THREE'])
  })
})
