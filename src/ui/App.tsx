import { ErrorNotification } from './ErrorNotification'
import { StatsBar } from './StatsBar'
import { RequestQueue } from './RequestQueue'
import { GameOverlay } from './GameOverlay'
import { GameControls } from './GameControls'
import { GridCanvas } from './GridCanvas'
import { HelpModal } from './HelpModal'
import { useGameLoop } from './useGameLoop'
import { useGameStore } from '../store/gameStore'
import './App.css'

/**
 * Главный компонент — v2 layout.
 * StatsBar (сверху) → Grid (центр) → RequestQueue (снизу)
 */
export function App() {
  const sessionState = useGameStore((s) => s.sessionState)
  const rotateSelected = useGameStore((s) => s.rotateSelected)

  useGameLoop()

  return (
    <div className="app" onKeyDown={(e) => {
      if (e.key === 'r' || e.key === 'R') rotateSelected()
    }} tabIndex={0}>
      <header className="app-header">
        <h1>Memory Arena v2</h1>
        <div className="header-right">
          <GameControls />
          <HelpModal />
        </div>
      </header>

      {sessionState !== 'idle' && <StatsBar />}

      <main className="app-main-v2">
        {sessionState === 'idle' ? (
          <div className="grid-placeholder">
            <p>Нажмите «Старт» чтобы начать игру</p>
          </div>
        ) : (
          <GridCanvas />
        )}
      </main>

      {sessionState !== 'idle' && <RequestQueue />}

      <GameOverlay />
      <ErrorNotification />
    </div>
  )
}
