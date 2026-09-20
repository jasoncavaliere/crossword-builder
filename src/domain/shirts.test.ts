import { describe, expect, it } from 'vitest'
import {
  BODY_LABELS,
  BODY_TYPES,
  buildCollarPath,
  buildShirtPath,
  CANVAS,
  FABRICS,
  SHIRT_SPECS,
} from './shirts'

/** Every coordinate pair mentioned in a path string. */
const pointsIn = (path: string): [number, number][] => {
  const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
  const pairs: [number, number][] = []
  for (let i = 0; i + 1 < numbers.length; i += 2) pairs.push([numbers[i], numbers[i + 1]])
  return pairs
}

describe('shirt specs', () => {
  it('covers all three body types with labels', () => {
    for (const type of BODY_TYPES) {
      expect(SHIRT_SPECS[type]).toBeDefined()
      expect(BODY_LABELS[type]).toBeTruthy()
    }
  })

  it('gives an adult male the broadest shoulders and a child the narrowest', () => {
    expect(SHIRT_SPECS.adultMale.shoulderHalf).toBeGreaterThan(SHIRT_SPECS.adultFemale.shoulderHalf)
    expect(SHIRT_SPECS.adultFemale.shoulderHalf).toBeGreaterThan(
      SHIRT_SPECS.childFemale.shoulderHalf,
    )
  })

  it('makes the child shirt the shortest', () => {
    expect(SHIRT_SPECS.childFemale.hemY).toBeLessThan(SHIRT_SPECS.adultFemale.hemY)
    expect(SHIRT_SPECS.adultFemale.hemY).toBeLessThan(SHIRT_SPECS.adultMale.hemY)
  })

  it('tapers the female shirt at the waist, unlike the straight male cut', () => {
    const female = SHIRT_SPECS.adultFemale
    const male = SHIRT_SPECS.adultMale
    expect(female.chestHalf - female.waistHalf).toBeGreaterThan(male.chestHalf - male.waistHalf)
  })

  it('gives the female shirt a deeper neckline', () => {
    expect(SHIRT_SPECS.adultFemale.neckDepth).toBeGreaterThan(SHIRT_SPECS.adultMale.neckDepth)
  })

  it('keeps the sleeves wider than the shoulders, or there is no sleeve', () => {
    for (const type of BODY_TYPES) {
      const spec = SHIRT_SPECS[type]
      expect(spec.sleeveHalf).toBeGreaterThan(spec.shoulderHalf)
    }
  })
})

describe('buildShirtPath', () => {
  it('produces a closed path for every body type', () => {
    for (const type of BODY_TYPES) {
      const path = buildShirtPath(SHIRT_SPECS[type])
      expect(path.startsWith('M ')).toBe(true)
      expect(path.trim().endsWith('Z')).toBe(true)
    }
  })

  it('stays inside the canvas', () => {
    for (const type of BODY_TYPES) {
      for (const [x, y] of pointsIn(buildShirtPath(SHIRT_SPECS[type]))) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(CANVAS.width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(CANVAS.height)
      }
    }
  })

  it('draws a different silhouette per body type', () => {
    const paths = BODY_TYPES.map((type) => buildShirtPath(SHIRT_SPECS[type]))
    expect(new Set(paths).size).toBe(BODY_TYPES.length)
  })

  it('closes the collar path too', () => {
    for (const type of BODY_TYPES) {
      expect(buildCollarPath(SHIRT_SPECS[type]).trim().endsWith('Z')).toBe(true)
    }
  })
})

describe('print areas', () => {
  it('sits on the chest, below the collar and above the hem', () => {
    for (const type of BODY_TYPES) {
      const spec = SHIRT_SPECS[type]
      const print = spec.printArea
      // 60 is the shoulder line the specs are measured from.
      expect(print.y).toBeGreaterThan(60 + spec.neckDepth)
      expect(print.y + print.height).toBeLessThan(60 + spec.hemY)
    }
  })

  it('stays within the chest width, so nothing prints onto a sleeve', () => {
    for (const type of BODY_TYPES) {
      const spec = SHIRT_SPECS[type]
      const print = spec.printArea
      expect(print.x).toBeGreaterThan(CANVAS.width / 2 - spec.chestHalf)
      expect(print.x + print.width).toBeLessThan(CANVAS.width / 2 + spec.chestHalf)
    }
  })

  it('scales the print area down with the body', () => {
    expect(SHIRT_SPECS.childFemale.printArea.width).toBeLessThan(
      SHIRT_SPECS.adultFemale.printArea.width,
    )
    expect(SHIRT_SPECS.adultFemale.printArea.width).toBeLessThan(
      SHIRT_SPECS.adultMale.printArea.width,
    )
  })
})

describe('fabrics', () => {
  it('pairs every cloth with an ink of the opposite lightness', () => {
    const lightness = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114
    }

    for (const fabric of FABRICS) {
      // The mockup exists to catch a design that will not show on the shirt,
      // so a fabric whose ink does not contrast would defeat it.
      expect(Math.abs(lightness(fabric.cloth) - lightness(fabric.ink))).toBeGreaterThan(90)
    }
  })
})
