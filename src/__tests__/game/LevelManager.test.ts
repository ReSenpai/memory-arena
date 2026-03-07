import { describe, it, expect } from 'vitest'
import { getLevelConfig, TOTAL_LEVELS } from '../../game/LevelManager'

describe('LevelManager — конфигурация уровней', () => {
  it('всего 5 уровней', () => {
    expect(TOTAL_LEVELS).toBe(5)
  })

  it('getLevelConfig возвращает конфигурацию по id', () => {
    const cfg = getLevelConfig(1)
    expect(cfg.id).toBe(1)
    expect(cfg.gridRows).toBeGreaterThan(0)
    expect(cfg.gridCols).toBeGreaterThan(0)
    expect(cfg.targetScore).toBeGreaterThan(0)
    expect(cfg.availableShapes.length).toBeGreaterThan(0)
    expect(cfg.processNames.length).toBeGreaterThan(0)
  })

  it('Level 1: 8×8, 500 очков', () => {
    const cfg = getLevelConfig(1)
    expect(cfg.gridRows).toBe(8)
    expect(cfg.gridCols).toBe(8)
    expect(cfg.targetScore).toBe(500)
  })

  it('Level 2: 10×10, 1000 очков', () => {
    const cfg = getLevelConfig(2)
    expect(cfg.gridRows).toBe(10)
    expect(cfg.gridCols).toBe(10)
    expect(cfg.targetScore).toBe(1000)
  })

  it('Level 3: 12×12, 2000 очков, pointer loss > 0', () => {
    const cfg = getLevelConfig(3)
    expect(cfg.gridRows).toBe(12)
    expect(cfg.gridCols).toBe(12)
    expect(cfg.targetScore).toBe(2000)
    expect(cfg.pointerLossChance).toBeGreaterThan(0)
  })

  it('Level 4: 16×16, 3000 очков', () => {
    const cfg = getLevelConfig(4)
    expect(cfg.gridRows).toBe(16)
    expect(cfg.gridCols).toBe(16)
    expect(cfg.targetScore).toBe(3000)
  })

  it('Level 5: 20×20, 5000 очков', () => {
    const cfg = getLevelConfig(5)
    expect(cfg.gridRows).toBe(20)
    expect(cfg.gridCols).toBe(20)
    expect(cfg.targetScore).toBe(5000)
  })

  it('Level 1-2 не имеют pointer loss', () => {
    expect(getLevelConfig(1).pointerLossChance).toBe(0)
    expect(getLevelConfig(2).pointerLossChance).toBe(0)
  })

  it('размер grid растёт с уровнем', () => {
    for (let i = 1; i < TOTAL_LEVELS; i++) {
      const curr = getLevelConfig(i)
      const next = getLevelConfig(i + 1)
      expect(next.gridRows * next.gridCols).toBeGreaterThan(
        curr.gridRows * curr.gridCols,
      )
    }
  })

  it('targetScore растёт с уровнем', () => {
    for (let i = 1; i < TOTAL_LEVELS; i++) {
      const curr = getLevelConfig(i)
      const next = getLevelConfig(i + 1)
      expect(next.targetScore).toBeGreaterThan(curr.targetScore)
    }
  })

  it('бросает ошибку для несуществующего уровня', () => {
    expect(() => getLevelConfig(0)).toThrow()
    expect(() => getLevelConfig(6)).toThrow()
  })
})
