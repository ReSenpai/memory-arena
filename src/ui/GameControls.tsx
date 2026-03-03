import { useGameStore } from '../store/gameStore'
import { getLevelConfig } from '../game/LevelManager'

/** Кнопки управления игрой — Start, Pause, Resume + название уровня */
export function GameControls() {
  const sessionState = useGameStore((s) => s.sessionState)
  const startGame = useGameStore((s) => s.startGame)
  const pause = useGameStore((s) => s.pause)
  const resume = useGameStore((s) => s.resume)
  const levelId = useGameStore((s) => s.levelId)
  const currentTick = useGameStore((s) => s.currentTick)
  const targetTicks = useGameStore((s) => s.targetTicks)

  const levelConfig = (() => {
    try {
      return getLevelConfig(levelId)
    } catch {
      return null
    }
  })()

  const levelLabel = levelConfig
    ? `Ур. ${levelId}: ${levelConfig.name}`
    : `Уровень ${levelId}`

  return (
    <div className="game-controls">
      {sessionState !== 'idle' && (
        <span className="level-label">{levelLabel}</span>
      )}

      {sessionState === 'playing' && targetTicks > 0 && (
        <span className="tick-progress">
          {currentTick}/{targetTicks}
        </span>
      )}

      {sessionState === 'idle' && (
        <button className="btn btn-start" onClick={() => startGame(1)}>
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

      {sessionState === 'finished' && (
        <button
          className="btn btn-start"
          onClick={() => startGame(levelId)}
        >
          🔄 Заново
        </button>
      )}
    </div>
  )
}
