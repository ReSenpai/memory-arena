import { useGameStore } from '../store/gameStore'

/** Панель статистики — score, память, фрагментация, стабильность, прогресс */
export function StatsPanel() {
  const score = useGameStore((s) => s.score)
  const stability = useGameStore((s) => s.stability)
  const metrics = useGameStore((s) => s.metrics)
  const currentTick = useGameStore((s) => s.currentTick)
  const targetTicks = useGameStore((s) => s.targetTicks)

  /** Цвет стабильности в зависимости от значения */
  const stabilityColor =
    stability > 0.6 ? '#7ee787' : stability > 0.3 ? '#f0883e' : '#f85149'

  return (
    <div className="stats-panel">
      <h2>Статистика</h2>

      <div className="stat-row">
        <span className="stat-label">Очки</span>
        <span className="stat-value">{score}</span>
      </div>

      <div className="stat-row">
        <span className="stat-label">Стабильность</span>
        <span className="stat-value" style={{ color: stabilityColor }}>
          {(stability * 100).toFixed(0)}%
        </span>
      </div>
      <div className="stability-bar-container">
        <div
          className="stability-bar-fill"
          style={{
            width: `${Math.max(0, stability * 100)}%`,
            background: stabilityColor,
          }}
        />
      </div>

      <div className="stat-row">
        <span className="stat-label">Прогресс</span>
        <span className="stat-value">
          {currentTick}/{targetTicks || '—'}
        </span>
      </div>

      {targetTicks > 0 && (
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(100, (currentTick / targetTicks) * 100)}%`,
            }}
          />
        </div>
      )}

      {metrics && (
        <>
          <div className="stat-row">
            <span className="stat-label">Свободно</span>
            <span className="stat-value">
              {metrics.freeSize} / {metrics.totalSize}
            </span>
          </div>

          <div className="stat-row">
            <span className="stat-label">Фрагментация</span>
            <span className="stat-value">
              {(metrics.fragmentation * 100).toFixed(1)}%
            </span>
          </div>

          <div className="stat-row">
            <span className="stat-label">Блоков</span>
            <span className="stat-value">{metrics.blockCount}</span>
          </div>
        </>
      )}
    </div>
  )
}
