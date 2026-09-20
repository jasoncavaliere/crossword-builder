import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

/** The preview grid only. The shirt mockup renders the same cells, so a
 *  document-wide query would count both. */
const preview = () => document.querySelector('.ws-preview') as HTMLElement

describe('App', () => {
  beforeEach(() => {
    render(<App />)
  })

  it('renders the product name as the page heading', () => {
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Word Search Builder')
  })

  it('renders a tagline describing what the app does', () => {
    expect(
      screen.getByText(/design a word search in the browser and export it print-ready/i),
    ).toBeInTheDocument()
  })

  it('renders the NeonBlade call to action', () => {
    expect(screen.getByRole('button', { name: /verify puzzle/i })).toBeInTheDocument()
  })

  it('builds the call to action from the NeonBlade component, not plain markup', () => {
    // Guards the swap case: text and role assertions alone would still pass if the
    // component were replaced by a bare <button>, which is how the unstyled-CTA
    // regression stayed invisible before.
    const button = screen.getByRole('button', { name: /verify puzzle/i })
    expect(button.className).toMatch(/\bccb-/)
    // Layout and typography come from Tailwind utilities, so their presence is
    // what distinguishes a real NeonBlade render from bare markup.
    expect(button.className).toMatch(/\bpx-10\b/)
    expect(button.parentElement?.className).toMatch(/\binline-flex\b/)
  })

  it('renders the heading through NeonGlow rather than as plain text', () => {
    const glow = screen.getByRole('heading', { level: 1 }).querySelector('span')
    expect(glow).not.toBeNull()
    expect(glow?.getAttribute('style')).toMatch(/linear-gradient/)
  })
})

describe('the studio', () => {
  beforeEach(() => {
    render(<App />)
  })

  it('renders a grid preview on first load, with no interaction needed', () => {
    const grid = screen.getByRole('grid', { name: /word search preview/i })
    expect(within(grid).getAllByRole('gridcell').length).toBe(14 * 14)
  })

  it('offers every shape and difficulty as a control', () => {
    for (const shape of ['Rectangle', 'Heart', 'Circle', 'Diamond', 'Star', 'Mickey Ears']) {
      expect(screen.getByRole('button', { name: shape })).toBeInTheDocument()
    }
    for (const level of ['easy', 'classic', 'hard']) {
      expect(screen.getByRole('button', { name: level })).toBeInTheDocument()
    }
  })

  it('starts on Classic, and says which directions that means', () => {
    expect(screen.getByRole('button', { name: 'classic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/directions: E, S, SE, NE/i)).toBeInTheDocument()
  })

  it('regenerates when the shape changes, dropping cells out of play', async () => {
    const countLettered = () =>
      screen
        .getAllByRole('gridcell')
        .filter((cell) => !/outside the shape/.test(cell.getAttribute('aria-label') ?? '')).length

    const asRectangle = countLettered()
    await userEvent.click(screen.getByRole('button', { name: 'Circle' }))

    expect(countLettered()).toBeLessThan(asRectangle)
  })

  it('regenerates when the size changes', () => {
    expect(screen.getAllByRole('gridcell')).toHaveLength(14 * 14)

    // A range input is set, not typed into.
    fireEvent.change(screen.getByLabelText(/width/i), { target: { value: '10' } })

    expect(screen.getAllByRole('gridcell')).toHaveLength(10 * 14)
  })

  it('verifies the generated puzzle and reports a pass', async () => {
    await userEvent.click(screen.getByRole('button', { name: /verify puzzle/i }))

    expect(screen.getByText(/this is a valid word search/i)).toBeInTheDocument()
    expect(screen.getByText(/every hidden word is findable/i)).toBeInTheDocument()
    expect(screen.queryByText(/^FAIL/)).not.toBeInTheDocument()
  })

  it('clears a stale verification once the puzzle changes underneath it', async () => {
    await userEvent.click(screen.getByRole('button', { name: /verify puzzle/i }))
    expect(screen.getByText(/this is a valid word search/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /re-roll/i }))

    // A PASS left on screen next to a puzzle that has since regenerated would
    // be a claim about a grid that no longer exists.
    expect(screen.queryByText(/this is a valid word search/i)).not.toBeInTheDocument()
  })

  it('exposes the verifier on window for console use', () => {
    expect(typeof window.wsb.verify).toBe('function')
    expect(window.wsb.verify().ok).toBe(true)
    expect(window.wsb.grid().split('\n')).toHaveLength(14)
  })
})

describe('highlighting answers', () => {
  beforeEach(() => {
    render(<App />)
  })

  it('draws no answer overlay until it is asked for', () => {
    expect(preview().querySelectorAll('.ws-answer-line')).toHaveLength(0)
  })

  it('draws one overlay per hidden word when turned on', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    const placed = window.wsb.puzzle().placements.length
    expect(placed).toBeGreaterThan(0)
    expect(preview().querySelectorAll('.ws-answer-line')).toHaveLength(placed)
  })

  it('tints the cells belonging to an answer, not the whole grid', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    const tinted = preview().querySelectorAll('.ws-cell-answer').length
    const inPlay = window.wsb.puzzle().mask.cells.filter(Boolean).length
    expect(tinted).toBeGreaterThan(0)
    expect(tinted).toBeLessThan(inPlay)
  })

  it('flips its label so the button says what it will do next', async () => {
    const button = screen.getByRole('button', { name: /highlight answers/i })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(button)

    const pressed = screen.getByRole('button', { name: /hide answers/i })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')
  })

  it('turns the overlay back off', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))
    await userEvent.click(screen.getByRole('button', { name: /hide answers/i }))

    expect(preview().querySelectorAll('.ws-answer-line')).toHaveLength(0)
  })

  it('keeps the highlight on while the puzzle is re-rolled', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))
    await userEvent.click(screen.getByRole('button', { name: /re-roll/i }))

    // Unlike a verification result, the highlight is a view preference rather
    // than a claim about a specific grid, so it survives regeneration.
    expect(preview().querySelectorAll('.ws-answer-line').length).toBeGreaterThan(0)
  })
})

describe('presentation controls', () => {
  beforeEach(() => {
    render(<App />)
  })

  const boxes = () => preview().querySelectorAll('.ws-cell-box').length
  const letters = () => preview().querySelectorAll('.ws-letter').length
  const viewBox = () =>
    (preview().querySelector('.ws-grid') as SVGSVGElement)
      .getAttribute('viewBox')!
      .split(' ')
      .map(Number)

  it('draws a box per in-play cell by default', () => {
    expect(boxes()).toBe(window.wsb.puzzle().mask.cells.filter(Boolean).length)
  })

  it('drops every box when cell borders are turned off, keeping the letters', async () => {
    const before = letters()
    expect(before).toBeGreaterThan(0)

    await userEvent.click(screen.getByRole('checkbox', { name: /cell borders/i }))

    expect(boxes()).toBe(0)
    expect(letters()).toBe(before)
  })

  it('keeps cells clickable with the borders hidden', async () => {
    await userEvent.click(screen.getByRole('checkbox', { name: /cell borders/i }))

    // The hit area is what makes carving still work when there is no box to aim at.
    expect(preview().querySelectorAll('.ws-cell-hit').length).toBeGreaterThan(0)
  })

  it('still tints the answer cells with the borders hidden', async () => {
    await userEvent.click(screen.getByRole('checkbox', { name: /cell borders/i }))
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    expect(preview().querySelectorAll('.ws-cell-answer').length).toBeGreaterThan(0)
    expect(boxes()).toBe(0)
  })

  it('spreads the grid out as letter spacing increases', () => {
    const [, , tightWidth] = viewBox()

    fireEvent.change(screen.getByLabelText(/letter spacing/i), { target: { value: '12' } })

    const [, , looseWidth] = viewBox()
    expect(looseWidth).toBeGreaterThan(tightWidth)
  })

  it('separates the boxes rather than inflating them', () => {
    const boxSize = () => Number(preview().querySelector('.ws-cell-box')!.getAttribute('width'))
    const before = boxSize()

    fireEvent.change(screen.getByLabelText(/letter spacing/i), { target: { value: '16' } })

    // The glyph box is fixed; spacing goes into the gap between boxes, which is
    // what makes the control read as padding rather than as a zoom.
    expect(boxSize()).toBe(before)
  })

  it('starts with no extra spacing', () => {
    expect(screen.getByLabelText(/letter spacing/i)).toHaveValue('0')
  })
})

describe('cell padding', () => {
  beforeEach(() => {
    render(<App />)
  })

  const boxSize = () => Number(preview().querySelector('.ws-cell-box')!.getAttribute('width'))
  const pitch = () => {
    const grid = preview().querySelector('.ws-grid') as SVGSVGElement
    const [, , width] = grid.getAttribute('viewBox')!.split(' ').map(Number)
    return width / window.wsb.puzzle().mask.width
  }
  const setRange = (name: RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(name), { target: { value } })

  it('defaults to the padding that reproduces the original 30px box', () => {
    expect(boxSize()).toBe(30)
  })

  it('tightens the space around each letter', () => {
    setRange(/cell padding/i, '0')

    // Padding 0 leaves just the glyph.
    expect(boxSize()).toBe(16)
  })

  it('loosens it again', () => {
    setRange(/cell padding/i, '16')
    expect(boxSize()).toBe(48)
  })

  it('keeps every letter rendered at minimum padding', () => {
    const before = preview().querySelectorAll('.ws-letter').length
    setRange(/cell padding/i, '0')

    expect(preview().querySelectorAll('.ws-letter')).toHaveLength(before)
  })

  it('leaves the gap between cells alone, so the two dials are independent', () => {
    setRange(/letter spacing/i, '10')
    const gapAtDefaultPadding = pitch() - boxSize()

    setRange(/cell padding/i, '0')
    expect(pitch() - boxSize()).toBeCloseTo(gapAtDefaultPadding, 5)

    setRange(/cell padding/i, '16')
    expect(pitch() - boxSize()).toBeCloseTo(gapAtDefaultPadding, 5)
  })

  it('shrinks the whole grid when the padding is reduced', () => {
    const before = pitch()
    setRange(/cell padding/i, '0')

    expect(pitch()).toBeLessThan(before)
  })
})

describe('saving and restoring', () => {
  it('starts from the defaults with nothing saved', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(/changes save automatically/i)).toBeInTheDocument()
  })

  it('brings the whole studio back after a reload', async () => {
    const first = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Mickey Ears' }))
    await userEvent.click(screen.getByRole('button', { name: 'hard' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /cell borders/i }))
    fireEvent.change(screen.getByLabelText(/letter spacing/i), { target: { value: '9' } })
    fireEvent.change(screen.getByLabelText(/cell padding/i), { target: { value: '3' } })
    first.unmount()

    render(<App />)

    expect(screen.getByRole('button', { name: 'Mickey Ears' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'hard' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('checkbox', { name: /cell borders/i })).not.toBeChecked()
    expect(screen.getByLabelText(/letter spacing/i)).toHaveValue('9')
    expect(screen.getByLabelText(/cell padding/i)).toHaveValue('3')
    expect(screen.getByText(/restored from your last session/i)).toBeInTheDocument()
  })

  it('remembers the word list', async () => {
    const first = render(<App />)
    const words = screen.getByLabelText(/word list, one per line/i)
    await userEvent.clear(words)
    await userEvent.type(words, 'CASTLE\nPARADE')
    first.unmount()

    render(<App />)
    expect(screen.getByLabelText(/word list, one per line/i)).toHaveValue('CASTLE\nPARADE')
  })

  it('remembers cells carved out of the shape', async () => {
    const first = render(<App />)
    const cells = within(screen.getByRole('grid')).getAllByRole('gridcell')
    await userEvent.click(cells[0])
    const carvedBefore = preview().querySelectorAll('.ws-letter').length
    first.unmount()

    render(<App />)
    expect(preview().querySelectorAll('.ws-letter')).toHaveLength(carvedBefore)
  })

  it('forgets everything on start over, including the saved copy', async () => {
    const first = render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Star' }))
    first.unmount()

    render(<App />)
    expect(screen.getByRole('button', { name: 'Star' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: /start over/i }))
    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    const third = render(<App />)
    expect(within(third.container).getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('survives a corrupt saved draft rather than failing to open', () => {
    window.localStorage.setItem('word-search-builder/studio', '{"v":1,"shape":"nope"}')

    expect(() => render(<App />)).not.toThrow()
    expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('printing and the shirt mockup', () => {
  beforeEach(() => {
    render(<App />)
  })

  it('offers a print button', () => {
    expect(screen.getByRole('button', { name: /print puzzle/i })).toBeInTheDocument()
  })

  it('asks the browser to print', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)

    await userEvent.click(screen.getByRole('button', { name: /print puzzle/i }))

    expect(print).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('includes a print-only word list, which is not the on-screen textarea', () => {
    const list = document.querySelector('.ws-print-words')!
    expect(list).toBeInTheDocument()
    expect(within(list as HTMLElement).getByText('Passport')).toBeInTheDocument()
  })

  it('drops the word list from the print when asked', async () => {
    await userEvent.click(screen.getByRole('checkbox', { name: /include word list/i }))
    expect(document.querySelector('.ws-print-words')).toBeNull()
  })

  it('renders a shirt for each body type', async () => {
    for (const label of ['Adult male', 'Adult female', 'Child female']) {
      await userEvent.click(screen.getByRole('button', { name: label }))
      expect(screen.getByRole('img', { name: new RegExp(label, 'i') })).toBeInTheDocument()
    }
  })

  it('draws a different silhouette when the body type changes', async () => {
    const outline = () => document.querySelector('.ws-shirt-body')!.getAttribute('d')
    const asAdultMale = outline()

    await userEvent.click(screen.getByRole('button', { name: 'Child female' }))

    expect(outline()).not.toBe(asAdultMale)
  })

  it('prints the puzzle onto the shirt, reusing the preview grid', () => {
    const shirt = document.querySelector('.ws-shirt')!
    const onShirt = shirt.querySelectorAll('.ws-letter').length

    expect(onShirt).toBeGreaterThan(0)
    expect(onShirt).toBe(preview().querySelectorAll('.ws-letter').length)
  })

  it('switches the ink when the fabric goes dark', async () => {
    const inkOf = () =>
      (document.querySelector('.ws-shirt .ws-letter') as SVGTextElement).style.fill
    const onWhite = inkOf()

    await userEvent.click(screen.getByRole('button', { name: /black/i }))

    expect(inkOf()).not.toBe(onWhite)
  })

  it('keeps the mockup out of the accessibility tree, so it does not bury the real grid', () => {
    // Both render gridcells; only the preview's should be reachable.
    const grids = screen.getAllByRole('grid')
    expect(grids).toHaveLength(1)
    expect(screen.getAllByRole('gridcell')).toHaveLength(window.wsb.puzzle().mask.cells.length)
  })

  it('never shows answers on the shirt, whatever the screen is doing', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    expect(preview().querySelectorAll('.ws-answer-line').length).toBeGreaterThan(0)
    expect(document.querySelectorAll('.ws-shirt .ws-answer-line')).toHaveLength(0)
  })
})
