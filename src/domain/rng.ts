/**
 * A seeded random source.
 *
 * Generation is randomized, so every generator takes this as a parameter rather
 * than reaching for Math.random. That is what makes a placement test
 * reproducible instead of flaky, and it is why the UI can offer a seed box.
 */
export interface Rng {
  /** A float in [0, 1). */
  next(): number
}

/** mulberry32: small, fast, and good enough for puzzle layout. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng.next() * maxExclusive)
}

/** Fisher-Yates, returning a new array. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
