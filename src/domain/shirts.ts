/**
 * T-shirt mockup geometry.
 *
 * A body type is a set of measurements, not a hand-drawn path, so the three
 * silhouettes stay consistent with each other and a fourth is a data change.
 * All coordinates live in a 400 x 460 box.
 */
export const BODY_TYPES = ['adultMale', 'adultFemale', 'childFemale'] as const
export type BodyType = (typeof BODY_TYPES)[number]

export const BODY_LABELS: Record<BodyType, string> = {
  adultMale: 'Adult male',
  adultFemale: 'Adult female',
  childFemale: 'Child female',
}

export const CANVAS = { width: 400, height: 460 } as const

/** A rectangle on the chest, where the design is printed. */
export interface PrintArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ShirtSpec {
  /** Half-widths, measured from the centre line. */
  neckHalf: number
  neckDepth: number
  shoulderHalf: number
  sleeveHalf: number
  sleeveDrop: number
  chestHalf: number
  armpitY: number
  waistHalf: number
  waistY: number
  hemHalf: number
  hemY: number
  printArea: PrintArea
}

const TOP = 60
const CX = CANVAS.width / 2

export const SHIRT_SPECS: Record<BodyType, ShirtSpec> = {
  // Broad shoulders, straight side seam, longest body.
  adultMale: {
    neckHalf: 34,
    neckDepth: 24,
    shoulderHalf: 116,
    sleeveHalf: 150,
    sleeveDrop: 100,
    chestHalf: 112,
    armpitY: 112,
    waistHalf: 108,
    waistY: 250,
    hemHalf: 110,
    hemY: 372,
    printArea: { x: CX - 78, y: TOP + 118, width: 156, height: 176 },
  },

  // Narrower shoulders, a deeper neckline and a taper at the waist.
  adultFemale: {
    neckHalf: 33,
    neckDepth: 38,
    shoulderHalf: 98,
    sleeveHalf: 128,
    sleeveDrop: 84,
    chestHalf: 96,
    armpitY: 102,
    waistHalf: 78,
    waistY: 236,
    hemHalf: 94,
    hemY: 350,
    printArea: { x: CX - 66, y: TOP + 112, width: 132, height: 152 },
  },

  // Smaller all round, and proportionally wider and shorter than an adult's.
  childFemale: {
    neckHalf: 29,
    neckDepth: 30,
    shoulderHalf: 84,
    sleeveHalf: 112,
    sleeveDrop: 72,
    chestHalf: 82,
    armpitY: 88,
    waistHalf: 74,
    waistY: 186,
    hemHalf: 86,
    hemY: 286,
    printArea: { x: CX - 56, y: TOP + 94, width: 112, height: 124 },
  },
}

/**
 * The shirt outline as an SVG path.
 *
 * Drawn clockwise from the left shoulder: out over the sleeve, in to the
 * armpit, down the side seam, across the hem, back up the far side, then the
 * neckline scoop closes it.
 */
export function buildShirtPath(spec: ShirtSpec): string {
  const {
    neckHalf,
    neckDepth,
    shoulderHalf,
    sleeveHalf,
    sleeveDrop,
    chestHalf,
    armpitY,
    waistHalf,
    waistY,
    hemHalf,
    hemY,
  } = spec

  const sleeveTop = TOP + 16
  const sleeveBottom = TOP + sleeveDrop
  const armpit = TOP + armpitY
  const waist = TOP + waistY
  const hem = TOP + hemY

  return [
    `M ${CX - shoulderHalf} ${TOP}`,
    // Left sleeve.
    `L ${CX - sleeveHalf} ${sleeveTop}`,
    `L ${CX - sleeveHalf + 10} ${sleeveBottom}`,
    `L ${CX - chestHalf} ${armpit}`,
    // Left side seam, curving through the waist.
    `Q ${CX - waistHalf} ${waist} ${CX - hemHalf} ${hem}`,
    // Hem, with a slight sag.
    `Q ${CX} ${hem + 14} ${CX + hemHalf} ${hem}`,
    // Right side seam back up.
    `Q ${CX + waistHalf} ${waist} ${CX + chestHalf} ${armpit}`,
    // Right sleeve.
    `L ${CX + sleeveHalf - 10} ${sleeveBottom}`,
    `L ${CX + sleeveHalf} ${sleeveTop}`,
    `L ${CX + shoulderHalf} ${TOP}`,
    // Shoulder in to the neck, the scoop, then out to the far shoulder.
    `L ${CX + neckHalf} ${TOP}`,
    `Q ${CX} ${TOP + neckDepth * 1.7} ${CX - neckHalf} ${TOP}`,
    'Z',
  ].join(' ')
}

/** The collar, drawn as a band just outside the neckline. */
export function buildCollarPath(spec: ShirtSpec): string {
  const { neckHalf, neckDepth } = spec
  const outer = neckHalf + 8
  return [
    `M ${CX - outer} ${TOP}`,
    `Q ${CX} ${TOP + (neckDepth + 9) * 1.7} ${CX + outer} ${TOP}`,
    `L ${CX + neckHalf} ${TOP}`,
    `Q ${CX} ${TOP + neckDepth * 1.7} ${CX - neckHalf} ${TOP}`,
    'Z',
  ].join(' ')
}

/**
 * Fabric options, each pairing a cloth colour with the ink that reads on it.
 *
 * Ink is bound to the fabric rather than chosen separately: the point of the
 * mockup is to catch a design that will not show on the shirt, and letting the
 * two be set independently would let the author preview something unprintable.
 */
export interface Fabric {
  readonly name: string
  readonly cloth: string
  readonly ink: string
}

export const FABRICS: readonly Fabric[] = [
  { name: 'White', cloth: '#f4f4f1', ink: '#14161a' },
  { name: 'Heather', cloth: '#b6bcc4', ink: '#1a1d22' },
  { name: 'Navy', cloth: '#1e2a45', ink: '#eef2f8' },
  { name: 'Black', cloth: '#16181c', ink: '#eef2f8' },
]
