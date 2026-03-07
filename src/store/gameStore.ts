import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import { GameSession, type SessionSnapshot } from '../game/GameSession'
import { TOTAL_LEVELS } from '../game/LevelManager'
import type {
  CellContent,
  AllocatedBlock,
  GarbageBlock,
  GameRequest,
  PlaceResult,
  FreeResult,
  MoveGarbageResult,
} from '../domain/types'

export type GameStore = {
  // State
  sessionState: 'idle' | 'playing' | 'paused' | 'finished'
  finishReason: 'win' | 'lose' | null
  score: number
  stability: number
  targetScore: number
  levelId: number
  currentTick: number
  gridSnapshot: CellContent[][] | null
  gridRows: number
  gridCols: number
  allocatedBlocks: AllocatedBlock[]
  garbageBlocks: GarbageBlock[]
  pendingRequests: GameRequest[]
  selectedRequestId: string | null
  selectedRotation: number
  selectedGarbageId: string | null
  lastError: string | null

  // Actions
  startGame: (levelId: number) => void
  doTick: () => void
  pause: () => void
  resume: () => void
  selectRequest: (requestId: string | null) => void
  rotateSelected: () => void
  placeBlock: (requestId: string, row: number, col: number, rotation: number) => PlaceResult
  freeBlock: (freeRequestId: string, blockId: string) => FreeResult
  moveGarbage: (garbageId: string, row: number, col: number) => MoveGarbageResult
  selectGarbage: (garbageId: string | null) => void
  resolvePointer: (pointer: string) => string | null
  nextLevel: () => void
  clearError: () => void
}

let session: GameSession | null = null

function syncFromSession(
  set: (partial: Partial<GameStore>) => void,
): void {
  if (!session) return
  const snap: SessionSnapshot = session.getSnapshot()
  set({
    sessionState: snap.state,
    finishReason: snap.finishReason,
    score: snap.score,
    stability: snap.stability,
    targetScore: snap.targetScore,
    currentTick: snap.currentTick,
    gridSnapshot: snap.gridSnapshot,
    gridRows: snap.gridRows,
    gridCols: snap.gridCols,
    allocatedBlocks: snap.allocatedBlocks,
    garbageBlocks: snap.garbageBlocks,
    pendingRequests: snap.pendingRequests,
    levelId: snap.levelId,
  })
}

export function createGameStore() {
  return createStore<GameStore>()((set) => ({
    sessionState: 'idle',
    finishReason: null,
    score: 0,
    stability: 1,
    targetScore: 0,
    levelId: 1,
    currentTick: 0,
    gridSnapshot: null,
    gridRows: 0,
    gridCols: 0,
    allocatedBlocks: [],
    garbageBlocks: [],
    pendingRequests: [],
    selectedRequestId: null,
    selectedRotation: 0,
    selectedGarbageId: null,
    lastError: null,

    startGame(levelId: number) {
      session = new GameSession(levelId, Date.now())
      session.start()
      syncFromSession(set)
    },

    doTick() {
      if (!session) return
      session.tick()
      syncFromSession(set)
    },

    pause() {
      if (!session) return
      session.pause()
      syncFromSession(set)
    },

    resume() {
      if (!session) return
      session.resume()
      syncFromSession(set)
    },

    selectRequest(requestId: string | null) {
      set({ selectedRequestId: requestId, selectedRotation: 0, selectedGarbageId: null })
    },

    rotateSelected() {
      set((state) => ({
        selectedRotation: (state.selectedRotation + 1) % 4,
      }))
    },

    placeBlock(requestId, row, col, rotation) {
      if (!session) return { success: false as const, reason: 'request-not-found' as const }
      const result = session.placeBlock(requestId, row, col, rotation)
      syncFromSession(set)
      if (!result.success) {
        set({ lastError: `Ошибка размещения: ${result.reason}` })
      } else {
        set({ selectedRequestId: null, selectedRotation: 0 })
      }
      return result
    },

    freeBlock(freeRequestId, blockId) {
      if (!session) return { success: false as const, reason: 'request-not-found' as const }
      const result = session.freeBlock(freeRequestId, blockId)
      syncFromSession(set)
      if (!result.success) {
        set({ lastError: `Ошибка освобождения: ${result.reason}` })
      }
      return result
    },

    moveGarbage(garbageId, row, col) {
      if (!session) return { success: false as const, reason: 'not-found' as const }
      const result = session.moveGarbage(garbageId, row, col)
      syncFromSession(set)
      return result
    },

    selectGarbage(garbageId: string | null) {
      set({ selectedGarbageId: garbageId, selectedRequestId: null, selectedRotation: 0 })
    },

    resolvePointer(pointer: string) {
      if (!session) return null
      return session.resolvePointer(pointer)
    },

    nextLevel() {
      const currentLevel = session?.getSnapshot().levelId ?? 1
      const next = Math.min(currentLevel + 1, TOTAL_LEVELS)
      session = new GameSession(next, Date.now())
      session.start()
      syncFromSession(set)
    },

    clearError() {
      set({ lastError: null })
    },
  }))
}

export const gameStore = createGameStore()

export function useGameStore(): GameStore
export function useGameStore<T>(selector: (state: GameStore) => T): T
export function useGameStore<T>(selector?: (state: GameStore) => T) {
  return useStore(gameStore, selector as (state: GameStore) => T)
}
