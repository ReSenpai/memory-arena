/**
 * Конфигурация уровня
 */
export type LevelConfig = {
  /** Номер уровня (1-5) */
  id: number
  /** Название уровня */
  name: string
  /** Общий размер памяти (в ячейках) */
  memorySize: number
  /** Интервал между запросами (в тиках) */
  requestInterval: number
  /** Минимальный размер аллокации */
  minBlockSize: number
  /** Максимальный размер аллокации */
  maxBlockSize: number
  /** ID программ, которые отправляют запросы */
  programIds: string[]
  /** Тиков до утечки */
  leakThreshold: number
  /** Штраф за фрагментацию включён */
  fragmentationPenalty: boolean
}
