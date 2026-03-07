import { describe, it, expect } from 'vitest'
import { RequestGenerator } from '../../game/RequestGenerator'
import { getLevelConfig } from '../../game/LevelManager'
import { SeededRandom } from '../../game/SeededRandom'

describe('RequestGenerator v2 — генерация запросов', () => {
  function makeGenerator(levelId = 1) {
    const config = getLevelConfig(levelId)
    const rng = new SeededRandom(42)
    return new RequestGenerator(config, rng)
  }

  describe('allocate запросы', () => {
    it('генерирует allocate запрос на нужном тике', () => {
      const gen = makeGenerator()
      const config = getLevelConfig(1)
      const requests = gen.tick(config.requestInterval)
      const allocs = requests.filter((r) => r.type === 'allocate')
      expect(allocs.length).toBeGreaterThan(0)
    })

    it('не генерирует запросы между интервалами', () => {
      const gen = makeGenerator()
      const requests = gen.tick(1)
      expect(requests).toHaveLength(0)
    })

    it('allocate содержит shape из availableShapes', () => {
      const gen = makeGenerator()
      const config = getLevelConfig(1)
      const requests = gen.tick(config.requestInterval)
      const alloc = requests.find((r) => r.type === 'allocate')
      expect(alloc).toBeDefined()
      if (alloc && alloc.type === 'allocate') {
        expect(alloc.payload.shape.length).toBeGreaterThan(0)
        expect(alloc.payload.process).toBeTruthy()
        // pointer назначается при размещении, в запросе пустая строка
        expect(alloc.payload.pointer).toBe('')
        expect(alloc.payload.createdAtTick).toBe(config.requestInterval)
      }
    })
  })

  describe('free запросы', () => {
    it('генерирует free для существующего блока', () => {
      const gen = makeGenerator()
      
      // Регистрируем блок чтобы free мог на него ссылаться
      gen.registerAllocated('block-1', 'ptr-1')

      // Тикаем до генерации
      let freeFound = false
      for (let t = 1; t <= 100; t++) {
        const requests = gen.tick(t)
        const free = requests.find((r) => r.type === 'free')
        if (free) {
          freeFound = true
          if (free.type === 'free') {
            expect(free.payload.pointer).toBeTruthy()
            expect(free.payload.deadline).toBeGreaterThan(t)
          }
          break
        }
      }
      expect(freeFound).toBe(true)
    })
  })

  describe('pointer loss', () => {
    it('Level 1 не теряет pointer (pointerLossChance = 0)', () => {
      const gen = makeGenerator(1)
      gen.registerAllocated('b1', 'p1')
      const events: string[] = []
      for (let t = 1; t <= 200; t++) {
        const requests = gen.tick(t)
        for (const r of requests) {
          if (r.type === 'allocate') events.push('alloc')
        }
      }
      // Нет pointer loss на уровне 1
      expect(gen.getLostPointers()).toHaveLength(0)
    })
  })

  describe('maxQueueSize', () => {
    it('setQueueSize влияет на overflow-детекцию', () => {
      const gen = makeGenerator()
      gen.setCurrentQueueSize(100) // заведомо больше maxQueueSize
      expect(gen.isQueueOverflow()).toBe(true)
    })

    it('нет overflow при нормальном размере', () => {
      const gen = makeGenerator()
      gen.setCurrentQueueSize(1)
      expect(gen.isQueueOverflow()).toBe(false)
    })
  })
})
