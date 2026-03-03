import { useGameStore } from '../store/gameStore'
import { getAllLevels } from '../game/LevelManager'

/**
 * GameOverlay — оверлей для результатов уровня и выбора уровня.
 *
 * Показывается при finished-состоянии:
 * - win → поздравление + кнопка «Следующий уровень»
 * - lose → game over + кнопка «Попробовать снова»
 */
export function GameOverlay() {
  const sessionState = useGameStore((s) => s.sessionState)
  const finishReason = useGameStore((s) => s.finishReason)
  const score = useGameStore((s) => s.score)
  const stability = useGameStore((s) => s.stability)
  const levelId = useGameStore((s) => s.levelId)
  const startGame = useGameStore((s) => s.startGame)
  const nextLevel = useGameStore((s) => s.nextLevel)

  if (sessionState !== 'finished') return null

  const levels = getAllLevels()
  const currentLevel = levels.find((l) => l.id === levelId)
  const hasNextLevel = levelId < 5

  return (
    <div className="overlay-backdrop">
      <div className="overlay-card">
        {finishReason === 'win' ? (
          <>
            <div className="overlay-icon overlay-win">🏆</div>
            <h2 className="overlay-title overlay-title-win">
              Уровень пройден!
            </h2>
            <p className="overlay-subtitle">
              {currentLevel?.name ?? `Уровень ${levelId}`}
            </p>
          </>
        ) : (
          <>
            <div className="overlay-icon overlay-lose">💀</div>
            <h2 className="overlay-title overlay-title-lose">
              Стабильность потеряна
            </h2>
            <p className="overlay-subtitle">
              Утечки памяти разрушили систему
            </p>
          </>
        )}

        <div className="overlay-stats">
          <div className="overlay-stat">
            <span className="overlay-stat-label">Очки</span>
            <span className="overlay-stat-value">{score}</span>
          </div>
          <div className="overlay-stat">
            <span className="overlay-stat-label">Стабильность</span>
            <span className="overlay-stat-value">
              {(stability * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="overlay-actions">
          <button
            className="btn btn-start"
            onClick={() => startGame(levelId)}
          >
            🔄 Заново
          </button>

          {finishReason === 'win' && hasNextLevel && (
            <button className="btn btn-next" onClick={nextLevel}>
              ▶ Следующий уровень
            </button>
          )}

          {finishReason === 'win' && !hasNextLevel && (
            <p className="overlay-complete">
              🎉 Все уровни пройдены! Вы мастер памяти!
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
