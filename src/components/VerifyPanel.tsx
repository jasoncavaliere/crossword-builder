import CornerCutButton from './neonblade-ui/corner-cut-button'
import type { VerifyResult } from '../domain/verify'

export interface VerifyPanelProps {
  readonly result: VerifyResult | null
  readonly onVerify: () => void
  readonly showAnswers: boolean
  readonly onToggleAnswers: () => void
}

/**
 * The verifier's report.
 *
 * Deliberately shows the individual checks rather than one pass/fail: when a
 * puzzle is wrong, which rule it broke is the whole diagnostic.
 */
export default function VerifyPanel({
  result,
  onVerify,
  showAnswers,
  onToggleAnswers,
}: VerifyPanelProps) {
  return (
    <section className="ws-panel">
      <div className="ws-panel-head">
        <h2 className="ws-panel-title">Verify</h2>
        <div className="ws-button-row">
          <CornerCutButton color="cyan" size="lg" variant="outline" onClick={onVerify}>
            Verify puzzle
          </CornerCutButton>
          {/* Pink to match the highlight it turns on, so the control and its
              effect read as the same thing. */}
          <CornerCutButton
            color="pink"
            size="lg"
            variant={showAnswers ? 'solid' : 'outline'}
            onClick={onToggleAnswers}
            aria-pressed={showAnswers}
          >
            {showAnswers ? 'Hide answers' : 'Highlight answers'}
          </CornerCutButton>
        </div>
      </div>

      {result === null ? (
        <p className="ws-hint">
          Re-solves the rendered grid from scratch rather than trusting the generator. Also on the
          console as <code>wsb.verify()</code>.
        </p>
      ) : (
        <>
          <p className={result.ok ? 'ws-verdict ws-verdict-pass' : 'ws-verdict ws-verdict-fail'}>
            {result.ok ? 'PASS - this is a valid word search' : 'FAIL - see below'}
          </p>
          <ul className="ws-checks">
            {result.checks.map((check) => (
              <li
                key={check.name}
                className={check.ok ? 'ws-check ws-check-ok' : 'ws-check ws-check-bad'}
              >
                <span className="ws-check-mark">{check.ok ? 'PASS' : 'FAIL'}</span>
                <span className="ws-check-body">
                  <strong>{check.name}</strong>
                  <em>{check.detail}</em>
                </span>
              </li>
            ))}
          </ul>
          {result.duplicates.length > 0 && (
            <p className="ws-hint">
              Appears more than once by chance:{' '}
              {result.duplicates.map((d) => `${d.key} (${d.occurrences}x)`).join(', ')}. Not a
              failure, but it makes the answer key ambiguous - open question 2.
            </p>
          )}
        </>
      )}
    </section>
  )
}
