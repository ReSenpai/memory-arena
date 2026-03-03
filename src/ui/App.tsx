import { StatsPanel } from './StatsPanel'
import { RequestQueue } from './RequestQueue'
import { GameControls } from './GameControls'
import './App.css'

/**
 * Главный компонент — трёхпанельный layout:
 * Слева: статистика | Центр: визуализация памяти (placeholder) | Справа: запросы
 */
export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Memory Arena</h1>
        <GameControls />
      </header>

      <main className="app-main">
        <aside className="panel panel-left">
          <StatsPanel />
        </aside>

        <section className="panel panel-center">
          <h2>Память</h2>
          <div className="memory-placeholder">
            Canvas будет здесь (Checkpoint 12)
          </div>
        </section>

        <aside className="panel panel-right">
          <RequestQueue />
        </aside>
      </main>
    </div>
  )
}
