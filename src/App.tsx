import CornerCutButton from './components/neonblade-ui/corner-cut-button'
import NeonGlow from './components/neonblade-ui/neon-glow'
import './App.css'

export default function App() {
  return (
    <main className="app-shell">
      <h1 className="app-title">
        {/* gradientGlow is required for the halo: a multi-colour NeonGlow
            suppresses its glow unless this or glowColor is set. */}
        <NeonGlow colors={['cyan', 'pink']} glowIntensity="strong" gradientGlow>
          Word Search Builder
        </NeonGlow>
      </h1>

      <p className="app-tagline">Design a word search in the browser and export it print-ready.</p>

      {/* hoverEffect="none" because the button is disabled until there is a
          puzzle to build; the vendored CSS has no :disabled guard of its own. */}
      <CornerCutButton color="cyan" size="lg" variant="outline" hoverEffect="none" disabled>
        Start a puzzle
      </CornerCutButton>

      <p className="app-status">Scaffold only. Puzzle building lands in a later change.</p>
    </main>
  )
}
