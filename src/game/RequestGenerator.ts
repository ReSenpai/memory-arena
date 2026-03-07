import type { GameRequest, Pointer } from '../domain/types'
import type { SeededRandom } from './SeededRandom'
import type { LevelConfig } from './types'

/**
 * RequestGenerator v2 — генерирует allocate/free запросы с shaped-блоками,
 * deadlines и pointer loss.
 */
export class RequestGenerator {
  private config: LevelConfig
  private rng: SeededRandom
  private nextId = 1
  /** BlockId → Pointer для отслеживания allocated блоков (для free) */
  private allocatedPointers = new Map<string, Pointer>()
  private lostPointers: Pointer[] = []
  private currentQueueSize = 0

  constructor(config: LevelConfig, rng: SeededRandom) {
    this.config = config
    this.rng = rng
  }

  /** Отметить блок как allocated (для генерации free запросов) */
  registerAllocated(blockId: string, pointer: Pointer): void {
    this.allocatedPointers.set(blockId, pointer)
  }

  /** Убрать блок из allocated (после free) */
  unregisterAllocated(blockId: string): void {
    this.allocatedPointers.delete(blockId)
  }

  setCurrentQueueSize(size: number): void {
    this.currentQueueSize = size
  }

  isQueueOverflow(): boolean {
    return this.currentQueueSize > this.config.maxQueueSize
  }

  getLostPointers(): Pointer[] {
    return [...this.lostPointers]
  }

  /**
   * Вызывается каждый тик. Возвращает новые запросы (если пора).
   */
  tick(currentTick: number): GameRequest[] {
    const requests: GameRequest[] = []

    // Генерация по интервалу
    if (currentTick % this.config.requestInterval !== 0) return requests

    // Генерируем allocate
    const shape =
      this.config.availableShapes[
        this.rng.nextInt(0, this.config.availableShapes.length - 1)
      ]
    const process =
      this.config.processNames[
        this.rng.nextInt(0, this.config.processNames.length - 1)
      ]

    requests.push({
      type: 'allocate',
      payload: {
        id: `req-${this.nextId++}`,
        process,
        pointer: '',
        shape,
        createdAtTick: currentTick,
      },
    })

    // Иногда генерируем free (если есть allocated блоки)
    if (this.allocatedPointers.size > 0 && this.rng.next() < 0.5) {
      const entries = Array.from(this.allocatedPointers.entries())
      const [, freePointer] =
        entries[this.rng.nextInt(0, entries.length - 1)]

      requests.push({
        type: 'free',
        payload: {
          id: `req-${this.nextId++}`,
          pointer: freePointer,
          deadline: currentTick + this.config.freeDeadlineTicks,
          createdAtTick: currentTick,
        },
      })
    }

    // Pointer loss
    if (
      this.config.pointerLossChance > 0 &&
      this.allocatedPointers.size > 0 &&
      this.rng.next() < this.config.pointerLossChance
    ) {
      const entries = Array.from(this.allocatedPointers.entries())
      const [lostBlockId, lostPointer] =
        entries[this.rng.nextInt(0, entries.length - 1)]
      this.lostPointers.push(lostPointer)
      this.allocatedPointers.delete(lostBlockId)
    }

    return requests
  }
}
