import type {
  AllocatedBlock,
  CellContent,
  FreeResult,
  GameRequest,
  GarbageBlock,
  MoveGarbageResult,
  PlaceResult,
  Pointer,
} from '../domain/types'
import { rotateShape } from '../domain/Shapes'
import { MemoryGrid } from '../domain/MemoryGrid'
import { PointerRegistry } from '../domain/PointerRegistry'
import { Scorer } from '../domain/Scorer'
import { GarbageManager } from '../domain/GarbageManager'
import { RequestGenerator } from './RequestGenerator'
import { getLevelConfig } from './LevelManager'
import { SeededRandom } from './SeededRandom'
import type { LevelConfig } from './types'

export type SessionState = 'idle' | 'playing' | 'paused' | 'finished'
export type FinishReason = 'win' | 'lose' | null

export type SessionSnapshot = {
  state: SessionState
  finishReason: FinishReason
  levelId: number
  currentTick: number
  score: number
  stability: number
  targetScore: number
  gridSnapshot: CellContent[][]
  gridRows: number
  gridCols: number
  allocatedBlocks: AllocatedBlock[]
  garbageBlocks: GarbageBlock[]
  pendingRequests: GameRequest[]
  dissolvingBlockIds: string[]
}

/**
 * GameSession v2 — главный фасад игры.
 * Оркестрирует: MemoryGrid, PointerRegistry, RequestGenerator, Scorer, GarbageManager.
 */
export class GameSession {
  private state: SessionState = 'idle'
  private finishReason: FinishReason = null
  private currentTick = 0

  private config: LevelConfig
  private grid: MemoryGrid
  private registry: PointerRegistry
  private scorer: Scorer
  private garbageManager: GarbageManager
  private requestGen: RequestGenerator

  private pendingRequests: GameRequest[] = []
  private allocatedBlocks = new Map<string, AllocatedBlock>()
  /** requestId → AllocateRequest (для сопоставления) */
  private allocateRequestMap = new Map<string, GameRequest>()
  private freeRequestMap = new Map<string, GameRequest>()
  /** Блоки в процессе растворения: blockId → оставшихся тиков */
  private dissolvingBlocks = new Map<string, number>()
  private static readonly DISSOLVE_TICKS = 6

  constructor(levelId: number, seed: number) {
    this.config = getLevelConfig(levelId)
    this.grid = new MemoryGrid(this.config.gridRows, this.config.gridCols)
    this.registry = new PointerRegistry()
    this.scorer = new Scorer()
    this.garbageManager = new GarbageManager()
    const rng = new SeededRandom(seed)
    this.requestGen = new RequestGenerator(this.config, rng)
  }

  getState(): SessionState {
    return this.state
  }

  start(): void {
    if (this.state === 'idle') {
      this.state = 'playing'
    }
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

  resolvePointer(pointer: Pointer): string | null {
    return this.registry.resolve(pointer)
  }

  tick(): void {
    if (this.state !== 'playing') return

    this.currentTick++

    // 1. Генерация запросов
    this.requestGen.setCurrentQueueSize(this.pendingRequests.length)
    const newRequests = this.requestGen.tick(this.currentTick)
    for (const req of newRequests) {
      this.pendingRequests.push(req)
      if (req.type === 'allocate') {
        this.allocateRequestMap.set(req.payload.id, req)
      } else {
        this.freeRequestMap.set(req.payload.id, req)
      }
    }

    // 2. Проверка просроченных free-запросов
    const freeRequests = this.pendingRequests
      .filter((r) => r.type === 'free')
      .map((r) => r.payload as { id: string; pointer: Pointer; deadline: number; createdAtTick: number })

    const expired = this.garbageManager.checkExpiredFrees(freeRequests, this.currentTick)

    for (const exp of expired) {
      const blockId = this.registry.resolve(exp.pointer)
      if (blockId) {
        const block = this.allocatedBlocks.get(blockId)
        if (block) {
          // Конвертируем в garbage
          this.grid.remove(blockId)
          const garbage = this.garbageManager.convertToGarbage(block)
          this.grid.placeGarbage(garbage)
          this.allocatedBlocks.delete(blockId)
          this.registry.losePointer(exp.pointer)
          this.requestGen.unregisterAllocated(blockId)
          this.scorer.onMissedFree()
        }
      }
      // Удаляем просроченный free из очереди
      this.pendingRequests = this.pendingRequests.filter(
        (r) => !(r.type === 'free' && r.payload.id === exp.id),
      )
      this.freeRequestMap.delete(exp.id)
    }

    // 3. Queue overflow
    if (this.requestGen.isQueueOverflow()) {
      this.scorer.onQueueOverflow()
    }

    // 4. Фрагментация штраф
    const metrics = this.grid.getMetrics()
    if (metrics.fragmentation > 0) {
      this.scorer.onFragmentationPenalty(metrics.fragmentation)
    }

    // 5. Проверка pointer loss от генератора
    const lostPointers = this.requestGen.getLostPointers()
    for (const lp of lostPointers) {
      const blockId = this.registry.resolve(lp)
      if (blockId) {
        const block = this.allocatedBlocks.get(blockId)
        if (block) {
          this.dissolvingBlocks.delete(blockId)
          this.grid.remove(blockId)
          const garbage = this.garbageManager.convertToGarbage(block)
          this.grid.placeGarbage(garbage)
          this.allocatedBlocks.delete(blockId)
          this.registry.losePointer(lp)
          this.scorer.onMissedFree()
        }
      }
    }

    // 6. Обработка растворяющихся блоков
    for (const [blockId, remaining] of this.dissolvingBlocks) {
      const next = remaining - 1
      if (next <= 0) {
        // Полностью удаляем блок
        const block = this.allocatedBlocks.get(blockId)
        if (block) {
          this.grid.remove(blockId)
          this.registry.unregister(block.pointer)
          this.allocatedBlocks.delete(blockId)
          this.requestGen.unregisterAllocated(blockId)
        }
        this.dissolvingBlocks.delete(blockId)
      } else {
        this.dissolvingBlocks.set(blockId, next)
      }
    }

    // 7. Win / Lose check
    if (this.scorer.getStability() <= 0) {
      this.state = 'finished'
      this.finishReason = 'lose'
    } else if (this.scorer.getScore() >= this.config.targetScore) {
      this.state = 'finished'
      this.finishReason = 'win'
    }
  }

  placeBlock(requestId: string, row: number, col: number, rotation: number): PlaceResult {
    const req = this.allocateRequestMap.get(requestId)
    if (!req || req.type !== 'allocate') {
      return { success: false, reason: 'request-not-found' }
    }

    const shape = rotateShape(req.payload.shape, rotation)
    if (!this.grid.canPlace(shape, row, col)) {
      // Определяем причину
      for (const cell of shape) {
        const r = row + cell.row
        const c = col + cell.col
        if (r < 0 || r >= this.config.gridRows || c < 0 || c >= this.config.gridCols) {
          return { success: false, reason: 'out-of-bounds' }
        }
      }
      return { success: false, reason: 'collision' }
    }

    const cells = shape.map((c) => ({ row: row + c.row, col: col + c.col }))
    const pointer = PointerRegistry.pointerForCell(row, col, this.config.gridCols)
    const block: AllocatedBlock = {
      id: `block-${requestId}`,
      pointer,
      process: req.payload.process,
      shape,
      cells,
      placedAtTick: this.currentTick,
    }

    this.grid.place(block)
    this.registry.register(pointer, block.id)
    this.allocatedBlocks.set(block.id, block)
    this.requestGen.registerAllocated(block.id, block.pointer)

    // Удаляем запрос из очереди
    this.pendingRequests = this.pendingRequests.filter((r) =>
      !(r.type === 'allocate' && r.payload.id === requestId),
    )
    this.allocateRequestMap.delete(requestId)

    // Очки
    this.scorer.onAllocate(shape.length)
    const ticksSince = this.currentTick - req.payload.createdAtTick
    this.scorer.onQuickAction(ticksSince)

    return { success: true, block }
  }

  freeBlock(freeRequestId: string, targetBlockId: string): FreeResult {
    const req = this.freeRequestMap.get(freeRequestId)
    if (!req || req.type !== 'free') {
      return { success: false, reason: 'request-not-found' }
    }

    // Double-free: блок уже растворяется
    if (this.dissolvingBlocks.has(targetBlockId)) {
      this.scorer.onDoubleFree()
      // Удаляем free из очереди
      this.pendingRequests = this.pendingRequests.filter(
        (r) => !(r.type === 'free' && r.payload.id === freeRequestId),
      )
      this.freeRequestMap.delete(freeRequestId)
      return { success: false, reason: 'double-free' }
    }

    const block = this.allocatedBlocks.get(targetBlockId)
    if (!block) {
      return { success: false, reason: 'not-found' }
    }

    // Проверяем pointer
    if (block.pointer !== req.payload.pointer) {
      this.scorer.onWrongFree()
      return { success: false, reason: 'pointer-mismatch' }
    }

    // Начинаем растворение вместо мгновенного удаления
    this.dissolvingBlocks.set(targetBlockId, GameSession.DISSOLVE_TICKS)

    // Удаляем free из очереди
    this.pendingRequests = this.pendingRequests.filter(
      (r) => !(r.type === 'free' && r.payload.id === freeRequestId),
    )
    this.freeRequestMap.delete(freeRequestId)

    this.scorer.onFree()
    const ticksSince = this.currentTick - req.payload.createdAtTick
    this.scorer.onQuickAction(ticksSince)

    return { success: true, freedCells: [...block.cells] }
  }

  moveGarbage(garbageId: string, newRow: number, newCol: number): MoveGarbageResult {
    const result = this.grid.moveGarbage(garbageId, newRow, newCol)
    if (result.success) {
      this.scorer.onDefragMove()
    }
    return result
  }

  getSnapshot(): SessionSnapshot {
    const gridSnapshot = this.grid.getSnapshot()

    // Пометить растворяющиеся ячейки
    for (const [blockId] of this.dissolvingBlocks) {
      const block = this.allocatedBlocks.get(blockId)
      if (block) {
        for (const cell of block.cells) {
          gridSnapshot[cell.row][cell.col] = { type: 'dissolving', blockId }
        }
      }
    }

    return {
      state: this.state,
      finishReason: this.finishReason,
      levelId: this.config.id,
      currentTick: this.currentTick,
      score: this.scorer.getScore(),
      stability: this.scorer.getStability(),
      targetScore: this.config.targetScore,
      gridSnapshot,
      gridRows: this.config.gridRows,
      gridCols: this.config.gridCols,
      allocatedBlocks: [...this.allocatedBlocks.values()],
      garbageBlocks: this.garbageManager.getGarbageBlocks(),
      pendingRequests: [...this.pendingRequests],
      dissolvingBlockIds: [...this.dissolvingBlocks.keys()],
    }
  }
}
