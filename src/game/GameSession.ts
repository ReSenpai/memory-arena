import { MemoryManager } from '../domain/MemoryManager'
import { Scorer } from '../domain/Scorer'
import { detectLeaks } from '../domain/ErrorDetector'
import type {
  AllocationResult,
  FreeResult,
  MemoryBlock,
  MemoryMetrics,
  MemoryRequest,
} from '../domain/types'
import type { LevelConfig } from './types'
import { RequestGenerator } from './RequestGenerator'

/** Состояние игровой сессии */
export type SessionState = 'idle' | 'playing' | 'paused' | 'finished'

/** Причина завершения сессии */
export type FinishReason = 'win' | 'lose' | null

/** Полный снимок состояния сессии (для UI) */
export type SessionSnapshot = {
  blocks: ReadonlyArray<MemoryBlock>
  metrics: MemoryMetrics
  pendingRequests: MemoryRequest[]
  score: number
  stability: number
  tick: number
  state: SessionState
  finishReason: FinishReason
  targetTicks: number
}

/**
 * GameSession — фасад, связывающий MemoryManager, RequestGenerator, Scorer и ErrorDetector.
 *
 * Отвечает за:
 * - Тик-based обновление (генерация запросов, детекция утечек)
 * - Действия игрока (allocate, free)
 * - Управление состоянием (start, pause, resume, finish)
 */
export class GameSession {
  private memoryManager: MemoryManager
  private requestGenerator: RequestGenerator
  private scorer: Scorer
  private config: LevelConfig

  private currentTick = 0
  private state: SessionState = 'idle'
  private pendingRequests: MemoryRequest[] = []
  private finishReason: FinishReason = null

  constructor(config: LevelConfig, seed: number) {
    this.config = config
    this.memoryManager = new MemoryManager(config.memorySize)
    this.requestGenerator = new RequestGenerator(config, seed)
    this.scorer = new Scorer()
  }

  // --- Управление состоянием ---

  /** Запускает сессию и генерирует начальный запрос (тик 0) */
  start(): void {
    this.state = 'playing'
    this.generateRequest()
  }

  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused'
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'playing'
    }
  }

  finish(): void {
    this.state = 'finished'
  }

  // --- Тик ---

  /** Продвигает время на 1 тик: генерирует запросы, проверяет утечки, проверяет условия победы/поражения */
  tick(): void {
    if (this.state !== 'playing') return

    this.currentTick++
    this.generateRequest()
    this.checkLeaks()

    // Проверка поражения: стабильность упала до 0
    const summary = this.scorer.getSummary()
    if (summary.stability <= 0) {
      this.finishReason = 'lose'
      this.state = 'finished'
      return
    }

    // Проверка победы: продержался targetTicks
    if (this.currentTick >= this.config.targetTicks) {
      this.finishReason = 'win'
      this.state = 'finished'
    }
  }

  // --- Действия игрока ---

  /**
   * Выполняет аллокацию по id запроса из очереди.
   * Возвращает результат аллокации или ошибку, если запрос не найден.
   */
  allocate(
    requestId: string,
  ): AllocationResult | { success: false; reason: 'request-not-found' } {
    const index = this.pendingRequests.findIndex(
      (r) => r.payload.id === requestId,
    )
    if (index === -1) {
      return { success: false, reason: 'request-not-found' }
    }

    const request = this.pendingRequests[index]
    if (request.type !== 'allocate') {
      return { success: false, reason: 'request-not-found' }
    }

    const result = this.memoryManager.allocate(
      request.payload.size,
      request.payload.programId,
      this.currentTick,
    )

    if (result.success) {
      this.pendingRequests.splice(index, 1)
      this.scorer.onSuccessfulAllocate(request.payload.size)
    }

    return result
  }

  /**
   * Выполняет освобождение по id запроса из очереди.
   * Возвращает результат освобождения или ошибку, если запрос не найден.
   */
  free(
    requestId: string,
  ): FreeResult | { success: false; reason: 'request-not-found' } {
    const index = this.pendingRequests.findIndex(
      (r) => r.payload.id === requestId,
    )
    if (index === -1) {
      return { success: false, reason: 'request-not-found' }
    }

    const request = this.pendingRequests[index]
    if (request.type !== 'free') {
      return { success: false, reason: 'request-not-found' }
    }

    const result = this.memoryManager.free(request.payload.blockId)

    if (result.success) {
      this.pendingRequests.splice(index, 1)
      this.scorer.onSuccessfulFree()
      this.memoryManager.mergeFreeBlocks()
    } else if (result.reason === 'double-free') {
      this.scorer.onDoubleFree()
      this.pendingRequests.splice(index, 1)
    }

    return result
  }

  // --- Геттеры ---

  getCurrentTick(): number {
    return this.currentTick
  }

  getState(): SessionState {
    return this.state
  }

  getPendingRequests(): MemoryRequest[] {
    return [...this.pendingRequests]
  }

  getScoreSummary(): { score: number; stability: number } {
    return this.scorer.getSummary()
  }

  /** Полный снимок состояния для UI */
  getSnapshot(): SessionSnapshot {
    const summary = this.scorer.getSummary()
    return {
      blocks: this.memoryManager.getBlocks(),
      metrics: this.memoryManager.getMetrics(),
      pendingRequests: [...this.pendingRequests],
      score: summary.score,
      stability: summary.stability,
      tick: this.currentTick,
      state: this.state,
      finishReason: this.finishReason,
      targetTicks: this.config.targetTicks,
    }
  }

  // --- Приватные методы ---

  /** Генерирует запрос от RequestGenerator и добавляет в очередь */
  private generateRequest(): void {
    const allocatedBlockIds = this.memoryManager
      .getBlocks()
      .filter((b) => b.state === 'allocated')
      .map((b) => b.id)

    const request = this.requestGenerator.generate(
      this.currentTick,
      allocatedBlockIds,
    )

    if (request) {
      this.pendingRequests.push(request)
    }
  }

  /** Проверяет утечки и штрафует за каждый утёкший блок */
  private checkLeaks(): void {
    const leaks = detectLeaks(
      this.memoryManager.getBlocks(),
      this.currentTick,
      this.config.leakThreshold,
    )

    for (let i = 0; i < leaks.length; i++) {
      this.scorer.onLeakDetected()
    }
  }
}
