import type { MemoryRequest } from '../domain/types'
import type { LevelConfig } from './types'
import { SeededRandom } from './SeededRandom'

/**
 * Генератор запросов на выделение/освобождение памяти.
 *
 * Генерирует запросы с заданным интервалом (по тикам).
 * Использует seed-based random для детерминированности в тестах.
 *
 * Логика выбора типа запроса:
 * - Если нет аллоцированных блоков — всегда allocate
 * - Иначе: ~40% шанс на free, ~60% на allocate
 */
export class RequestGenerator {
  private random: SeededRandom
  private config: LevelConfig
  private requestCounter = 0

  constructor(config: LevelConfig, seed: number) {
    this.config = config
    this.random = new SeededRandom(seed)
  }

  /**
   * Генерирует запрос на заданном тике.
   * Возвращает null, если на этом тике запрос не нужен.
   *
   * @param tick — текущий тик
   * @param allocatedBlockIds — id аллоцированных блоков (для free-запросов)
   */
  generate(tick: number, allocatedBlockIds: string[]): MemoryRequest | null {
    if (tick % this.config.requestInterval !== 0) {
      return null
    }

    const id = `req-${this.requestCounter++}`
    const shouldFree =
      allocatedBlockIds.length > 0 && this.random.next() < 0.4

    if (shouldFree) {
      const blockIndex = this.random.nextInt(
        0,
        allocatedBlockIds.length - 1,
      )
      const programId =
        this.config.programIds[
          this.random.nextInt(0, this.config.programIds.length - 1)
        ]

      return {
        type: 'free',
        payload: {
          id,
          programId,
          blockId: allocatedBlockIds[blockIndex],
        },
      }
    }

    const size = this.random.nextInt(
      this.config.minBlockSize,
      this.config.maxBlockSize,
    )
    const programId =
      this.config.programIds[
        this.random.nextInt(0, this.config.programIds.length - 1)
      ]

    return {
      type: 'allocate',
      payload: {
        id,
        programId,
        size,
      },
    }
  }
}
