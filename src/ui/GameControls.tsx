import { useGameStore } from '../store/gameStore'

/** Кнопки управления игрой */
export function GameControls() {
  const sessionState = useGameStore((s) => s.sessionState)
  const startGame = useGameStore((s) => s.startGame)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const levelId = useGameStore((s) => s.levelId)

  return (
    <div className="game-controls">
      {sessionState === 'idle' && (
        <button className="btn btn-start" onClick={() => startGame(levelId)}>
          ▶ Старт
        </button>
      )}
      {sessionState === 'playing' && (
        <button className="btn btn-pause" onClick={pause}>
          ⏸ Пауза
        </button>
      )}
      {sessionState === 'paused' && (
        <button className="btn btn-resume" onClick={resume}>
          ▶ Продолжить
        </button>
      )}
    </div>
  )
}
