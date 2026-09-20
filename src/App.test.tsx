import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

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
    expect(document.querySelectorAll('.ws-answer-line')).toHaveLength(0)
  })

  it('draws one overlay per hidden word when turned on', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    const placed = window.wsb.puzzle().placements.length
    expect(placed).toBeGreaterThan(0)
    expect(document.querySelectorAll('.ws-answer-line')).toHaveLength(placed)
  })

  it('tints the cells belonging to an answer, not the whole grid', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))

    const tinted = document.querySelectorAll('.ws-cell-answer').length
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

    expect(document.querySelectorAll('.ws-answer-line')).toHaveLength(0)
  })

  it('keeps the highlight on while the puzzle is re-rolled', async () => {
    await userEvent.click(screen.getByRole('button', { name: /highlight answers/i }))
    await userEvent.click(screen.getByRole('button', { name: /re-roll/i }))

    // Unlike a verification result, the highlight is a view preference rather
    // than a claim about a specific grid, so it survives regeneration.
    expect(document.querySelectorAll('.ws-answer-line').length).toBeGreaterThan(0)
  })
})
