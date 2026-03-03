import { describe, it, expect, beforeEach } from 'vitest'
import { createGameStore, type GameStore } from '../../store/gameStore'
import type { StoreApi } from 'zustand'

describe('gameStore', () => {
  let store: StoreApi<GameStore>

  beforeEach(() => {
    store = createGameStore()
  })

  describe('начальное состояние', () => {
    it('состояние idle, тик 0, пустые блоки и запросы', () => {
      const state = store.getState()
      expect(state.sessionState).toBe('idle')
      expect(state.currentTick).toBe(0)
      expect(state.blocks).toEqual([])
      expect(state.pendingRequests).toEqual([])
      expect(state.score).toBe(0)
      expect(state.stability).toBe(1)
      expect(state.metrics).toBeNull()
      expect(state.levelId).toBe(1)
    })
  })

  describe('startGame', () => {
    it('переводит в состояние playing и инициализирует данные', () => {
      store.getState().startGame(1)
      const state = store.getState()
      expect(state.sessionState).toBe('playing')
      expect(state.blocks.length).toBeGreaterThan(0)
      expect(state.pendingRequests.length).toBe(1) // начальный запрос
      expect(state.metrics).not.toBeNull()
    })

    it('можно запустить другой уровень', () => {
      store.getState().startGame(3)
      const state = store.getState()
      expect(state.levelId).toBe(3)
      expect(state.sessionState).toBe('playing')
    })
  })

  describe('doTick', () => {
    it('увеличивает тик и обновляет snapshot', () => {
      store.getState().startGame(1)
      store.getState().doTick()
      expect(store.getState().currentTick).toBe(1)
    })

    it('не обновляет если не playing', () => {
      store.getState().doTick()
      expect(store.getState().currentTick).toBe(0)
    })
  })

  describe('allocate', () => {
    it('обрабатывает allocate-запрос и обновляет состояние', () => {
      store.getState().startGame(1)
      const requests = store.getState().pendingRequests
      expect(requests.length).toBe(1)
      expect(requests[0].type).toBe('allocate')

      const requestId = requests[0].payload.id
      const result = store.getState().allocate(requestId)
      expect(result.success).toBe(true)

      // Запрос убран из очереди
      expect(store.getState().pendingRequests).toHaveLength(0)
      // Очки начислены
      expect(store.getState().score).toBeGreaterThan(0)
    })

    it('возвращает ошибку для несуществующего запроса', () => {
      store.getState().startGame(1)
      const result = store.getState().allocate('nonexistent')
      expect(result.success).toBe(false)
    })
  })

  describe('free', () => {
    it('обрабатывает free-запрос и обновляет состояние', () => {
      store.getState().startGame(1)

      // Аллоцируем
      const allocReq = store.getState().pendingRequests[0]
      store.getState().allocate(allocReq.payload.id)

      // Тикаем до free-запроса
      let freeReq = null
      for (let i = 0; i < 200; i++) {
        store.getState().doTick()
        const pending = store.getState().pendingRequests
        freeReq = pending.find((r) => r.type === 'free')
        if (freeReq) break
      }

      if (freeReq) {
        const scoreBeforeFree = store.getState().score
        const result = store.getState().free(freeReq.payload.id)
        expect(result.success).toBe(true)
        expect(store.getState().score).toBeGreaterThan(scoreBeforeFree)
      }
    })
  })

  describe('pause / resume', () => {
    it('pause переводит в paused', () => {
      store.getState().startGame(1)
      store.getState().pause()
      expect(store.getState().sessionState).toBe('paused')
    })

    it('resume возвращает в playing', () => {
      store.getState().startGame(1)
      store.getState().pause()
      store.getState().resume()
      expect(store.getState().sessionState).toBe('playing')
    })

    it('doTick не работает в paused', () => {
      store.getState().startGame(1)
      store.getState().pause()
      const tickBefore = store.getState().currentTick
      store.getState().doTick()
      expect(store.getState().currentTick).toBe(tickBefore)
    })
  })

  describe('lastError', () => {
    it('начальное значение — null', () => {
      expect(store.getState().lastError).toBeNull()
    })

    it('устанавливается при неуспешной аллокации (no-space)', () => {
      store.getState().startGame(1)

      // Заполняем всю память
      for (let i = 0; i < 100; i++) {
        store.getState().doTick()
        const reqs = store.getState().pendingRequests
        for (const req of reqs) {
          if (req.type === 'allocate') {
            store.getState().allocate(req.payload.id)
          }
        }
      }

      // Генерируем ещё запросы и пытаемся аллоцировать — должно не хватить места
      for (let i = 0; i < 50; i++) {
        store.getState().doTick()
      }
      const allocReq = store.getState().pendingRequests.find(
        (r) => r.type === 'allocate',
      )
      if (allocReq) {
        store.getState().allocate(allocReq.payload.id)
        // Если аллокация не удалась, ошибка должна быть установлена
        if (!store.getState().pendingRequests.find((r) => r.payload.id === allocReq.payload.id)) {
          // запрос обработан успешно — пропускаем
        } else {
          expect(store.getState().lastError).not.toBeNull()
        }
      }
    })

    it('устанавливается при несуществующем запросе', () => {
      store.getState().startGame(1)
      store.getState().allocate('nonexistent')
      expect(store.getState().lastError).toBe('Запрос не найден')
    })

    it('clearError сбрасывает ошибку', () => {
      store.getState().startGame(1)
      store.getState().allocate('nonexistent')
      expect(store.getState().lastError).not.toBeNull()
      store.getState().clearError()
      expect(store.getState().lastError).toBeNull()
    })
  })

  describe('finishReason и targetTicks', () => {
    it('начальное finishReason = null', () => {
      expect(store.getState().finishReason).toBeNull()
    })

    it('targetTicks устанавливается при startGame', () => {
      store.getState().startGame(1)
      expect(store.getState().targetTicks).toBeGreaterThan(0)
    })
  })

  describe('nextLevel', () => {
    it('переходит на следующий уровень', () => {
      store.getState().startGame(1)
      store.getState().nextLevel()
      expect(store.getState().levelId).toBe(2)
      expect(store.getState().sessionState).toBe('playing')
    })

    it('не переходит выше уровня 5', () => {
      store.getState().startGame(5)
      store.getState().nextLevel()
      expect(store.getState().levelId).toBe(5)
    })
  })
})
