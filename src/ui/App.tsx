import { useCallback } from 'react'
import type { MemoryBlock } from '../domain/types'
import { useGameStore } from '../store/gameStore'
import { StatsPanel } from './StatsPanel'
import { RequestQueue } from './RequestQueue'
import { GameControls } from './GameControls'
import { MemoryCanvas } from './MemoryCanvas'
import { ErrorNotification } from './ErrorNotification'
import { GameOverlay } from './GameOverlay'
import { useGameLoop } from './useGameLoop'
import './App.css'

/**
 * Главный компонент — трёхпанельный layout:
 * Слева: статистика | Центр: визуализация памяти | Справа: запросы
 *
 * Связывает GameLoop → Store → UI.
 */
export function App() {
  // Подключаем реальный game loop (тики по таймеру)
  useGameLoop()

  const pendingRequests = useGameStore((s) => s.pendingRequests)
  const allocate = useGameStore((s) => s.allocate)
  const free = useGameStore((s) => s.free)

  /**
   * Клик по блоку на canvas:
   * - Free блок → выполнить первый pending allocate-запрос
   * - Allocated блок → выполнить matching free-запрос для этого блока
   */
  const handleBlockClick = useCallback(
    (block: MemoryBlock) => {
      if (block.state === 'free') {
        const allocReq = pendingRequests.find(
          (r) => r.type === 'allocate',
        )
        if (allocReq) {
          allocate(allocReq.payload.id)
        }
      } else {
        const freeReq = pendingRequests.find(
          (r) =>
            r.type === 'free' && r.payload.blockId === block.id,
        )
        if (freeReq) {
          free(freeReq.payload.id)
        }
      }
    },
    [pendingRequests, allocate, free],
  )

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
          <MemoryCanvas onBlockClick={handleBlockClick} />
        </section>

        <aside className="panel panel-right">
          <RequestQueue />
        </aside>
      </main>

      <ErrorNotification />
      <GameOverlay />
    </div>
  )
}
