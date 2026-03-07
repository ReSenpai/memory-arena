import { useGameStore } from '../store/gameStore'

/** Горизонтальная панель статистики сверху */
export function StatsBar() {
  const score = useGameStore((s) => s.score)
  const stability = useGameStore((s) => s.stability)
  const targetScore = useGameStore((s) => s.targetScore)
  const levelId = useGameStore((s) => s.levelId)
  const currentTick = useGameStore((s) => s.currentTick)

  const stabilityPct = Math.round(stability * 100)
  const stabilityColor =
    stability > 0.6 ? '#7ee787' : stability > 0.3 ? '#f0883e' : '#f85149'

  return (
    <div className="stats-bar">
      <div className="stats-bar-item">
        <span className="stats-bar-label">Уровень</span>
        <span className="stats-bar-value">{levelId}</span>
      </div>
      <div className="stats-bar-item">
        <span className="stats-bar-label">Очки</span>
        <span className="stats-bar-value">
          {score} / {targetScore}
        </span>
      </div>
      <div className="stats-bar-item">
        <span className="stats-bar-label">Стабильность</span>
        <div className="stats-bar-stability">
          <div
            className="stats-bar-stability-fill"
            style={{ width: `${stabilityPct}%`, background: stabilityColor }}
          />
        </div>
        <span className="stats-bar-value" style={{ color: stabilityColor }}>
          {stabilityPct}%
        </span>
      </div>
      <div className="stats-bar-item">
        <span className="stats-bar-label">Тик</span>
        <span className="stats-bar-value">{currentTick}</span>
      </div>
    </div>
  )
}
