import { describe, it, expect } from 'vitest'
import { RequestGenerator } from '../../game/RequestGenerator'
import { getLevelConfig } from '../../game/LevelManager'

describe('RequestGenerator', () => {
  const config = getLevelConfig(1) // requestInterval = 8, programIds = ['A'], size 4-8

  describe('генерация по интервалу', () => {
    it('не генерирует запрос на тике, не кратном requestInterval', () => {
      const gen = new RequestGenerator(config, 42)
      const request = gen.generate(3, [])
      expect(request).toBeNull()
    })

    it('генерирует запрос на тике, кратном requestInterval', () => {
      const gen = new RequestGenerator(config, 42)
      const request = gen.generate(8, [])
      expect(request).not.toBeNull()
    })

    it('генерирует запрос на тике 0', () => {
      const gen = new RequestGenerator(config, 42)
      const request = gen.generate(0, [])
      expect(request).not.toBeNull()
    })
  })

  describe('тип запроса allocate', () => {
    it('генерирует allocate, если нет аллоцированных блоков', () => {
      const gen = new RequestGenerator(config, 42)
      const request = gen.generate(0, [])
      expect(request).not.toBeNull()
      expect(request?.type).toBe('allocate')
    })

    it('allocate содержит programId из конфига и корректный size', () => {
      const gen = new RequestGenerator(config, 42)
      const request = gen.generate(0, [])
      if (request?.type !== 'allocate') {
        throw new Error('Ожидался allocate-запрос')
      }
      expect(config.programIds).toContain(request.payload.programId)
      expect(request.payload.size).toBeGreaterThanOrEqual(config.minBlockSize)
      expect(request.payload.size).toBeLessThanOrEqual(config.maxBlockSize)
    })
  })

  describe('тип запроса free', () => {
    it('может генерировать free, если есть аллоцированные блоки', () => {
      // Прогоняем много тиков — рано или поздно должен выбрать free
      const gen = new RequestGenerator(config, 123)
      const allocatedBlockIds = ['block-1', 'block-2', 'block-3']
      let foundFree = false

      for (let tick = 0; tick <= 200; tick += config.requestInterval) {
        const request = gen.generate(tick, allocatedBlockIds)
        if (request?.type === 'free') {
          foundFree = true
          expect(allocatedBlockIds).toContain(request.payload.blockId)
          break
        }
      }

      expect(foundFree).toBe(true)
    })
  })

  describe('детерминированность', () => {
    it('одинаковый seed даёт одинаковую последовательность', () => {
      const gen1 = new RequestGenerator(config, 42)
      const gen2 = new RequestGenerator(config, 42)
      const allocatedBlockIds = ['block-1']

      for (let tick = 0; tick <= 80; tick += config.requestInterval) {
        const r1 = gen1.generate(tick, allocatedBlockIds)
        const r2 = gen2.generate(tick, allocatedBlockIds)
        expect(r1).toEqual(r2)
      }
    })

    it('разные seed дают разные последовательности', () => {
      const gen1 = new RequestGenerator(config, 42)
      const gen2 = new RequestGenerator(config, 999)

      const results1: unknown[] = []
      const results2: unknown[] = []

      for (let tick = 0; tick <= 80; tick += config.requestInterval) {
        results1.push(gen1.generate(tick, []))
        results2.push(gen2.generate(tick, []))
      }

      // Хотя бы один запрос должен отличаться
      const allEqual = results1.every(
        (r, i) => JSON.stringify(r) === JSON.stringify(results2[i]),
      )
      expect(allEqual).toBe(false)
    })
  })

  describe('уникальные id запросов', () => {
    it('каждый запрос имеет уникальный id', () => {
      const gen = new RequestGenerator(config, 42)
      const ids = new Set<string>()

      for (let tick = 0; tick <= 80; tick += config.requestInterval) {
        const request = gen.generate(tick, [])
        if (request) {
          expect(ids.has(request.payload.id)).toBe(false)
          ids.add(request.payload.id)
        }
      }
    })
  })
})
