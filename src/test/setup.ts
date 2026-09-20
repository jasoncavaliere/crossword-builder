import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

/**
 * The studio saves every change to localStorage, so without this a test that
 * moves a slider leaves that value behind and the next test's fresh render
 * restores it instead of the defaults. Cheap to clear, and the alternative is
 * order-dependent tests that pass alone and fail in a suite.
 */
beforeEach(() => {
  try {
    window.localStorage.clear()
  } catch {
    // Not every environment provides it; the app copes without it too.
  }
})
