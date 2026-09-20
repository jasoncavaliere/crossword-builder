import NeonGlow from './components/neonblade-ui/neon-glow'
import PuzzleStudio from './components/PuzzleStudio'
import './App.css'

export default function App() {
  return (
    <main className="app-shell">
      <header className="app-header">
        <h1 className="app-title">
          {/* gradientGlow is required for the halo: a multi-colour NeonGlow
              suppresses its glow unless this or glowColor is set. */}
          <NeonGlow colors={['cyan', 'pink']} glowIntensity="strong" gradientGlow>
            Word Search Builder
          </NeonGlow>
        </h1>
        <p className="app-tagline">
          Design a word search in the browser and export it print-ready.
        </p>
      </header>

      <PuzzleStudio />
    </main>
  )
}
