import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the product name as the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Crossword Builder')
  })

  it('renders a tagline describing what the app does', () => {
    render(<App />)
    expect(
      screen.getByText(/design a crossword in the browser and export it print-ready/i),
    ).toBeInTheDocument()
  })

  it('renders the NeonBlade call to action', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /start a puzzle/i })).toBeInTheDocument()
  })
})
