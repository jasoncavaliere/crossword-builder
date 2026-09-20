import { render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: /start a puzzle/i })).toBeInTheDocument()
  })

  it('builds the call to action from the NeonBlade component, not plain markup', () => {
    // Guards the swap case: text and role assertions alone would still pass if the
    // component were replaced by a bare <button>, which is how the unstyled-CTA
    // regression stayed invisible before.
    const button = screen.getByRole('button', { name: /start a puzzle/i })
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
