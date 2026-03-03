import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type {
  AllocationResult,
  FreeResult,
  MemoryBlock,
  MemoryMetrics,
  MemoryRequest,
} from '../domain/types'
import type { SessionState } from '../game/GameSession'
import { GameSession } from '../game/GameSession'
import { getLevelConfig } from '../game/LevelManager'

/**
 * Состояние Zustand store.
 * Плоская структура — данные из SessionSnapshot + actions.
 */
export type GameStore = {
  // --- Данные ---
  sessionState: SessionState
  currentTick: number
  blocks: ReadonlyArray<MemoryBlock>
  pendingRequests: MemoryRequest[]
  score: number
  stability: number
  metrics: MemoryMetrics | null
  levelId: number

  // --- Actions ---
  startGame: (levelId: number) => void
  doTick: () => void
  allocate: (
    requestId: string,
  ) => AllocationResult | { success: false; reason: 'request-not-found' }
  free: (
    requestId: string,
  ) => FreeResult | { success: false; reason: 'request-not-found' }
  pause: () => void
  resume: () => void
}

/** Ссылка на текущую GameSession (хранится вне store — мутабельный объект) */
let session: GameSession | null = null

/** Извлекает плоский snapshot из GameSession и обновляет store */
function syncFromSession(
  set: (partial: Partial<GameStore>) => void,
  levelId: number,
): void {
  if (!session) return
  const snap = session.getSnapshot()
  set({
    sessionState: snap.state,
    currentTick: snap.tick,
    blocks: snap.blocks,
    pendingRequests: snap.pendingRequests,
    score: snap.score,
    stability: snap.stability,
    metrics: snap.metrics,
    levelId,
  })
}

/**
 * Фабрика для создания store.
 * Используем `createStore` (vanilla) для тестируемости без React.
 * Для React-компонентов — `useGameStore`.
 */
export function createGameStore() {
  // Сбрасываем session при создании нового store (для тестов)
  session = null

  return createStore<GameStore>()((set, get) => ({
    // --- Начальное состояние ---
    sessionState: 'idle',
    currentTick: 0,
    blocks: [],
    pendingRequests: [],
    score: 0,
    stability: 1,
    metrics: null,
    levelId: 1,

    // --- Actions ---

    startGame(levelId: number) {
      const config = getLevelConfig(levelId)
      const seed = Date.now()
      session = new GameSession(config, seed)
      session.start()
      syncFromSession(set, levelId)
    },

    doTick() {
      if (!session) return
      session.tick()
      syncFromSession(set, get().levelId)
    },

    allocate(requestId: string) {
      if (!session) {
        return { success: false as const, reason: 'request-not-found' as const }
      }
      const result = session.allocate(requestId)
      syncFromSession(set, get().levelId)
      return result
    },

    free(requestId: string) {
      if (!session) {
        return { success: false as const, reason: 'request-not-found' as const }
      }
      const result = session.free(requestId)
      syncFromSession(set, get().levelId)
      return result
    },

    pause() {
      if (!session) return
      session.pause()
      syncFromSession(set, get().levelId)
    },

    resume() {
      if (!session) return
      session.resume()
      syncFromSession(set, get().levelId)
    },
  }))
}

/** Синглтон store для приложения */
export const gameStore = createGameStore()

/** React-хук для подписки на store */
export function useGameStore(): GameStore
export function useGameStore<T>(selector: (state: GameStore) => T): T
export function useGameStore<T>(selector?: (state: GameStore) => T) {
  return useStore(gameStore, selector as (state: GameStore) => T)
}
