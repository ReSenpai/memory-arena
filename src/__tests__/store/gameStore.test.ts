import { describe, it, expect, beforeEach } from 'vitest'
import { createGameStore, type GameStore } from '../../store/gameStore'
import type { StoreApi } from 'zustand/vanilla'

describe('gameStore v2 — Zustand store', () => {
  let store: StoreApi<GameStore>

  beforeEach(() => {
    store = createGameStore()
  })

  describe('начальное состояние', () => {
    it('sessionState = idle', () => {
      expect(store.getState().sessionState).toBe('idle')
    })

    it('score = 0, stability = 1', () => {
      expect(store.getState().score).toBe(0)
      expect(store.getState().stability).toBe(1)
    })

    it('levelId = 1', () => {
      expect(store.getState().levelId).toBe(1)
    })
  })

  describe('startGame', () => {
    it('переводит в playing', () => {
      store.getState().startGame(1)
      expect(store.getState().sessionState).toBe('playing')
    })

    it('создаёт grid snapshot', () => {
      store.getState().startGame(1)
      const snapshot = store.getState().gridSnapshot
      expect(snapshot).toBeDefined()
      expect(snapshot?.length).toBe(8) // Level 1: 8×8
    })
  })

  describe('doTick', () => {
    it('увеличивает currentTick', () => {
      store.getState().startGame(1)
      store.getState().doTick()
      expect(store.getState().currentTick).toBe(1)
    })
  })

  describe('pause / resume', () => {
    it('pause переводит в paused', () => {
      store.getState().startGame(1)
      store.getState().pause()
      expect(store.getState().sessionState).toBe('paused')
    })

    it('resume переводит в playing', () => {
      store.getState().startGame(1)
      store.getState().pause()
      store.getState().resume()
      expect(store.getState().sessionState).toBe('playing')
    })
  })

  describe('placeBlock', () => {
    it('размещает блок и обновляет snapshot', () => {
      store.getState().startGame(1)
      // Генерируем запросы
      for (let i = 0; i < 8; i++) store.getState().doTick()

      const reqs = store.getState().pendingRequests
      const alloc = reqs.find((r) => r.type === 'allocate')

      if (alloc && alloc.type === 'allocate') {
        const result = store.getState().placeBlock(alloc.payload.id, 0, 0, 0)
        expect(result.success).toBe(true)
        expect(store.getState().score).toBeGreaterThan(0)
      }
    })
  })

  describe('freeBlock', () => {
    it('возвращает request-not-found для несуществующего', () => {
      store.getState().startGame(1)
      const result = store.getState().freeBlock('nope', 'nope')
      expect(result.success).toBe(false)
    })
  })

  describe('moveGarbage', () => {
    it('возвращает not-found для несуществующего garbage', () => {
      store.getState().startGame(1)
      const result = store.getState().moveGarbage('nope', 0, 0)
      expect(result.success).toBe(false)
    })
  })

  describe('nextLevel', () => {
    it('увеличивает levelId', () => {
      store.getState().startGame(1)
      store.getState().nextLevel()
      expect(store.getState().levelId).toBe(2)
      expect(store.getState().sessionState).toBe('playing')
    })
  })

  describe('clearError', () => {
    it('очищает lastError', () => {
      store.setState({ lastError: 'test error' })
      store.getState().clearError()
      expect(store.getState().lastError).toBeNull()
    })
  })

  describe('selectedRequestId', () => {
    it('selectRequest устанавливает selectedRequestId', () => {
      store.getState().startGame(1)
      store.getState().selectRequest('req-1')
      expect(store.getState().selectedRequestId).toBe('req-1')
    })

    it('selectRequest(null) снимает выделение', () => {
      store.getState().startGame(1)
      store.getState().selectRequest('req-1')
      store.getState().selectRequest(null)
      expect(store.getState().selectedRequestId).toBeNull()
    })
  })

  describe('rotateSelected', () => {
    it('увеличивает rotation на 1', () => {
      store.getState().startGame(1)
      expect(store.getState().selectedRotation).toBe(0)
      store.getState().rotateSelected()
      expect(store.getState().selectedRotation).toBe(1)
    })

    it('rotation оборачивается: 3 → 0', () => {
      store.getState().startGame(1)
      store.getState().rotateSelected()
      store.getState().rotateSelected()
      store.getState().rotateSelected()
      store.getState().rotateSelected()
      expect(store.getState().selectedRotation).toBe(0)
    })
  })
})
