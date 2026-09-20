import NeonGlow from './components/neonblade-ui/neon-glow'
import CornerCutButton from './components/neonblade-ui/corner-cut-button'
import './App.css'

export default function App() {
  return (
    <main className="app-shell">
      <h1 className="app-title">
        <NeonGlow colors={['cyan', 'pink']} glowIntensity="strong">
          Crossword Builder
        </NeonGlow>
      </h1>

      <p className="app-tagline">Design a crossword in the browser and export it print-ready.</p>

      <CornerCutButton color="cyan" size="lg" variant="outline" disabled>
        Start a puzzle
      </CornerCutButton>

      <p className="app-status">Scaffold only. Puzzle building lands in a later change.</p>
    </main>
  )
}
