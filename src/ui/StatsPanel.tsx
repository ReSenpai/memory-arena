import { useGameStore } from '../store/gameStore'

/** Панель статистики — score, память, фрагментация, стабильность */
export function StatsPanel() {
  const score = useGameStore((s) => s.score)
  const stability = useGameStore((s) => s.stability)
  const metrics = useGameStore((s) => s.metrics)
  const currentTick = useGameStore((s) => s.currentTick)

  return (
    <div className="stats-panel">
      <h2>Статистика</h2>

      <div className="stat-row">
        <span className="stat-label">Очки</span>
        <span className="stat-value">{score}</span>
      </div>

      <div className="stat-row">
        <span className="stat-label">Стабильность</span>
        <span className="stat-value">
          {(stability * 100).toFixed(0)}%
        </span>
      </div>

      <div className="stat-row">
        <span className="stat-label">Тик</span>
        <span className="stat-value">{currentTick}</span>
      </div>

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
