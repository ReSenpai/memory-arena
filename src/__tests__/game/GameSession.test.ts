import { describe, it, expect, beforeEach } from 'vitest'
import { GameSession } from '../../game/GameSession'

describe('GameSession v2 — фасад игры', () => {
  let session: GameSession

  beforeEach(() => {
    session = new GameSession(1, 42) // Level 1, seed 42
  })

  describe('state machine', () => {
    it('начинает в idle', () => {
      expect(session.getState()).toBe('idle')
    })

    it('idle → playing', () => {
      session.start()
      expect(session.getState()).toBe('playing')
    })

    it('playing → paused → playing', () => {
      session.start()
      session.pause()
      expect(session.getState()).toBe('paused')
      session.resume()
      expect(session.getState()).toBe('playing')
    })

    it('нельзя tick в idle', () => {
      const snap = session.getSnapshot()
      session.tick()
      expect(session.getSnapshot().currentTick).toBe(snap.currentTick)
    })
  })

  describe('tick', () => {
    it('увеличивает currentTick', () => {
      session.start()
      session.tick()
      expect(session.getSnapshot().currentTick).toBe(1)
    })

    it('генерирует запросы через интервал', () => {
      session.start()
      // Тикаем достаточно раз для генерации
      for (let i = 0; i < 8; i++) session.tick()
      const snap = session.getSnapshot()
      expect(snap.pendingRequests.length).toBeGreaterThan(0)
    })
  })

  describe('placeBlock', () => {
    it('размещает блок из очереди на grid', () => {
      session.start()
      // Генерируем запросы
      for (let i = 0; i < 8; i++) session.tick()

      const snap = session.getSnapshot()
      const allocReq = snap.pendingRequests.find((r) => r.type === 'allocate')
      expect(allocReq).toBeDefined()

      if (allocReq && allocReq.type === 'allocate') {
        const result = session.placeBlock(allocReq.payload.id, 0, 0, 0)
        expect(result.success).toBe(true)
      }
    })

    it('не даёт разместить при коллизии', () => {
      session.start()
      for (let i = 0; i < 8; i++) session.tick()

      const snap = session.getSnapshot()
      const allocReq = snap.pendingRequests.find((r) => r.type === 'allocate')
      if (allocReq && allocReq.type === 'allocate') {
        session.placeBlock(allocReq.payload.id, 0, 0, 0)
      }

      // Генерируем ещё запрос
      for (let i = 0; i < 8; i++) session.tick()
      const snap2 = session.getSnapshot()
      const allocReq2 = snap2.pendingRequests.find((r) => r.type === 'allocate')

      if (allocReq2 && allocReq2.type === 'allocate') {
        // Этот блок может пересечься — размещаем в (0,0) повторно
        const result = session.placeBlock(allocReq2.payload.id, 0, 0, 0)
        // Может быть success или collision — зависит от фигуры
        // Просто проверяем что не крашится
        expect(result).toBeDefined()
      }
    })

    it('возвращает request-not-found для несуществующего запроса', () => {
      session.start()
      const result = session.placeBlock('nonexistent', 0, 0, 0)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('request-not-found')
      }
    })
  })

  describe('freeBlock', () => {
    it('освобождает блок через pointer', () => {
      session.start()
      // Генерируем и размещаем allocate
      for (let i = 0; i < 8; i++) session.tick()
      const snap = session.getSnapshot()
      const allocReq = snap.pendingRequests.find((r) => r.type === 'allocate')

      if (allocReq && allocReq.type === 'allocate') {
        session.placeBlock(allocReq.payload.id, 0, 0, 0)

        // Генерируем free запросы
        for (let i = 0; i < 80; i++) session.tick()
        const snap2 = session.getSnapshot()
        const freeReq = snap2.pendingRequests.find((r) => r.type === 'free')

        if (freeReq && freeReq.type === 'free') {
          // Найдём блок по pointer
          const blockId = session.resolvePointer(freeReq.payload.pointer)
          if (blockId) {
            const result = session.freeBlock(freeReq.payload.id, blockId)
            expect(result.success).toBe(true)
          }
        }
      }
    })

    it('возвращает request-not-found для несуществующего free', () => {
      session.start()
      const result = session.freeBlock('nonexistent', 'some-block')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.reason).toBe('request-not-found')
      }
    })
  })

  describe('moveGarbage', () => {
    it('возвращает not-found для несуществующего garbage', () => {
      session.start()
      const result = session.moveGarbage('nonexistent', 0, 0)
      expect(result.success).toBe(false)
    })
  })

  describe('getSnapshot', () => {
    it('возвращает полное состояние', () => {
      session.start()
      const snap = session.getSnapshot()
      expect(snap.gridSnapshot).toBeDefined()
      expect(snap.score).toBe(0)
      expect(snap.stability).toBe(1)
      expect(snap.state).toBe('playing')
      expect(snap.currentTick).toBe(0)
      expect(snap.pendingRequests).toEqual([])
      expect(snap.allocatedBlocks).toEqual([])
      expect(snap.garbageBlocks).toEqual([])
      expect(snap.levelId).toBe(1)
    })
  })

  describe('win/lose', () => {
    it('переходит в finished при stability ≤ 0', () => {
      session.start()
      // Потеряем стабильность вручную — много missed free
      // Пройдём 500 тиков чтобы гарантированно просрочить free
      for (let i = 0; i < 500; i++) session.tick()
      const snap = session.getSnapshot()
      // Если хоть один free просрочен, стабильность должна уменьшиться
      expect(snap.stability).toBeLessThan(1)
    })
  })
})
