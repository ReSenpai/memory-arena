import type { LevelConfig } from './types'

/**
 * Конфигурации 5 уровней.
 *
 * Прогрессия сложности:
 * 1. Фиксированные блоки, одна программа
 * 2. Случайные размеры, быстрее запросы
 * 3. Несколько программ одновременно
 * 4. Штраф за фрагментацию
 * 5. Adversarial-паттерны, максимальная сложность
 */
const levels: LevelConfig[] = [
  {
    id: 1,
    name: 'Первые шаги',
    memorySize: 64,
    requestInterval: 8,
    minBlockSize: 4,
    maxBlockSize: 8,
    programIds: ['A'],
    leakThreshold: 30,
    fragmentationPenalty: false,
  },
  {
    id: 2,
    name: 'Случайные размеры',
    memorySize: 64,
    requestInterval: 6,
    minBlockSize: 2,
    maxBlockSize: 16,
    programIds: ['A'],
    leakThreshold: 25,
    fragmentationPenalty: false,
  },
  {
    id: 3,
    name: 'Многозадачность',
    memorySize: 128,
    requestInterval: 5,
    minBlockSize: 2,
    maxBlockSize: 16,
    programIds: ['A', 'B', 'C'],
    leakThreshold: 20,
    fragmentationPenalty: false,
  },
  {
    id: 4,
    name: 'Борьба с фрагментацией',
    memorySize: 128,
    requestInterval: 4,
    minBlockSize: 1,
    maxBlockSize: 24,
    programIds: ['A', 'B', 'C'],
    leakThreshold: 15,
    fragmentationPenalty: true,
  },
  {
    id: 5,
    name: 'Вредоносные паттерны',
    memorySize: 256,
    requestInterval: 3,
    minBlockSize: 1,
    maxBlockSize: 32,
    programIds: ['A', 'B', 'C', 'D'],
    leakThreshold: 10,
    fragmentationPenalty: true,
  },
]

/**
 * Возвращает конфиг уровня по номеру (1-5).
 * Бросает ошибку, если уровень не существует.
 */
export function getLevelConfig(levelId: number): LevelConfig {
  const config = levels.find((l) => l.id === levelId)
  if (!config) {
    throw new Error(`Уровень ${levelId} не найден (доступны 1-5)`)
  }
  return config
}

/**
 * Возвращает все конфиги уровней.
 */
export function getAllLevels(): LevelConfig[] {
  return [...levels]
}
