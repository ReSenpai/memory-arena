import { useGameStore } from '../store/gameStore'
import { TOTAL_LEVELS } from '../game/LevelManager'

/** Оверлей при победе или поражении */
export function GameOverlay() {
  const sessionState = useGameStore((s) => s.sessionState)
  const finishReason = useGameStore((s) => s.finishReason)
  const score = useGameStore((s) => s.score)
  const stability = useGameStore((s) => s.stability)
  const levelId = useGameStore((s) => s.levelId)
  const startGame = useGameStore((s) => s.startGame)
  const nextLevel = useGameStore((s) => s.nextLevel)

  if (sessionState !== 'finished') return null

  const isWin = finishReason === 'win'
  const isLastLevel = levelId >= TOTAL_LEVELS

  return (
    <div className="overlay-backdrop">
      <div className="overlay-card">
        <div className="overlay-icon">{isWin ? '🏆' : '💥'}</div>
        <h2
          className={`overlay-title ${isWin ? 'overlay-title-win' : 'overlay-title-lose'}`}
        >
          {isWin ? 'Уровень пройден!' : 'Система упала!'}
        </h2>
        <p className="overlay-subtitle">
          {isWin
            ? `Целевой счёт достигнут на уровне ${levelId}`
            : 'Стабильность системы упала до нуля'}
        </p>

        <div className="overlay-stats">
          <div className="overlay-stat">
            <span className="overlay-stat-label">Очки</span>
            <span className="overlay-stat-value">{score}</span>
          </div>
          <div className="overlay-stat">
            <span className="overlay-stat-label">Стабильность</span>
            <span className="overlay-stat-value">
              {Math.round(stability * 100)}%
            </span>
          </div>
        </div>

        <div className="overlay-actions">
          {isWin && !isLastLevel && (
            <button className="btn btn-next" onClick={nextLevel}>
              Следующий уровень →
            </button>
          )}
          {isWin && isLastLevel && (
            <p className="overlay-complete">
              Все уровни пройдены! 🎉
            </p>
          )}
          <button
            className="btn btn-start"
            onClick={() => startGame(isWin ? levelId : levelId)}
          >
            {isWin ? 'Повторить уровень' : 'Попробовать снова'}
          </button>
        </div>
      </div>
    </div>
  )
}
