import type { Shape } from '../domain/types'

/** Конфигурация уровня */
export type LevelConfig = {
  id: number
  name: string
  gridRows: number
  gridCols: number
  /** Очки для победы */
  targetScore: number
  /** Доступные фигуры на уровне */
  availableShapes: Shape[]
  /** Интервал генерации запросов (в тиках) */
  requestInterval: number
  /** Тикам до превращения в garbage (при пропуске free) */
  freeDeadlineTicks: number
  /** Шанс потери pointer'а (0–1). 0 для Level 1–2 */
  pointerLossChance: number
  /** Макс. размер очереди — переполнение штрафует стабильность */
  maxQueueSize: number
  /** Имена процессов для этого уровня */
  processNames: string[]
}
