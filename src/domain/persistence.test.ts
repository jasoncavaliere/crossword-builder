import { beforeEach, describe, expect, it } from 'vitest'
import { clearState, loadState, saveState, type StudioState } from './persistence'

const KEY = 'word-search-builder/studio'

const sample: StudioState = {
  shape: 'heart',
  width: 17,
  height: 15,
  difficulty: 'hard',
  seed: 42,
  wordsText: 'FERRY\nMARKET',
  overrides: [['3,4', false]],
  showBorders: false,
  letterSpacing: 6,
  cellPadding: 2,
}

describe('persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('returns null when nothing has been saved', () => {
    expect(loadState()).toBeNull()
  })

  it('round-trips a full state', () => {
    saveState(sample)
    expect(loadState()).toEqual(sample)
  })

  it('clears what it saved', () => {
    saveState(sample)
    clearState()
    expect(loadState()).toBeNull()
  })

  // Everything below is untrusted input: localStorage can be hand-edited, left
  // over from an older build, or truncated. None of it may crash the app.

  it('discards text that is not JSON', () => {
    window.localStorage.setItem(KEY, 'not json {')
    expect(loadState()).toBeNull()
  })

  it('discards a payload from a different version', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...sample, v: 99 }))
    expect(loadState()).toBeNull()
  })

  it('discards a payload with no version at all', () => {
    window.localStorage.setItem(KEY, JSON.stringify(sample))
    expect(loadState()).toBeNull()
  })

  it('discards an unknown shape rather than rendering nothing', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...sample, v: 1, shape: 'dodecahedron' }))
    expect(loadState()).toBeNull()
  })

  it('discards an unknown difficulty', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...sample, v: 1, difficulty: 'nightmare' }))
    expect(loadState()).toBeNull()
  })

  it('discards a non-numeric size', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...sample, v: 1, width: 'wide' }))
    expect(loadState()).toBeNull()
  })

  it('discards NaN, which survives JSON as null', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ ...sample, v: 1, seed: NaN }))
    expect(loadState()).toBeNull()
  })

  it('discards a null payload', () => {
    window.localStorage.setItem(KEY, 'null')
    expect(loadState()).toBeNull()
  })

  it('drops malformed override entries but keeps the good ones', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...sample, v: 1, overrides: [['1,1', true], 'nope', ['2,2'], [3, false]] }),
    )
    expect(loadState()?.overrides).toEqual([['1,1', true]])
  })
})
