import { describe, it, expect } from 'vitest'
import { getLevelConfig, getAllLevels } from '../../game/LevelManager'

describe('LevelManager', () => {
  describe('getLevelConfig', () => {
    it('возвращает конфиг для уровня 1', () => {
      const config = getLevelConfig(1)
      expect(config).toBeDefined()
      expect(config.id).toBe(1)
      expect(config.memorySize).toBeGreaterThan(0)
      expect(config.programIds.length).toBeGreaterThan(0)
    })

    it('возвращает конфиг для уровня 5', () => {
      const config = getLevelConfig(5)
      expect(config.id).toBe(5)
      expect(config.fragmentationPenalty).toBe(true)
    })

    it('каждый уровень сложнее предыдущего (requestInterval уменьшается)', () => {
      const levels = [1, 2, 3, 4, 5].map(getLevelConfig)
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i].requestInterval).toBeLessThanOrEqual(
          levels[i - 1].requestInterval,
        )
      }
    })

    it('бросает ошибку для несуществующего уровня', () => {
      expect(() => getLevelConfig(0)).toThrow()
      expect(() => getLevelConfig(6)).toThrow()
    })
  })

  describe('getAllLevels', () => {
    it('возвращает массив из 5 конфигов', () => {
      const levels = getAllLevels()
      expect(levels).toHaveLength(5)
    })

    it('id уровней идут по порядку 1..5', () => {
      const levels = getAllLevels()
      expect(levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5])
    })
  })
})
