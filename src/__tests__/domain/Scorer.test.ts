import { describe, it, expect } from 'vitest'
import { Scorer } from '../../domain/Scorer'

describe('Scorer v2 — система очков', () => {
  describe('начальное состояние', () => {
    it('score = 0, stability = 1', () => {
      const s = new Scorer()
      expect(s.getScore()).toBe(0)
      expect(s.getStability()).toBe(1)
    })
  })

  describe('onAllocate', () => {
    it('начисляет size × 10 очков', () => {
      const s = new Scorer()
      s.onAllocate(4)
      expect(s.getScore()).toBe(40)
    })

    it('начисляет за несколько аллокаций', () => {
      const s = new Scorer()
      s.onAllocate(2)
      s.onAllocate(3)
      expect(s.getScore()).toBe(50)
    })
  })

  describe('onFree', () => {
    it('начисляет +10 очков', () => {
      const s = new Scorer()
      s.onFree()
      expect(s.getScore()).toBe(10)
    })
  })

  describe('onDefragMove', () => {
    it('начисляет +5 очков', () => {
      const s = new Scorer()
      s.onDefragMove()
      expect(s.getScore()).toBe(5)
    })
  })

  describe('onQuickAction', () => {
    it('начисляет бонус за быстрое действие (≤ 3 тика)', () => {
      const s = new Scorer()
      s.onQuickAction(1)
      expect(s.getScore()).toBeGreaterThan(0)
    })

    it('не начисляет бонус за медленное действие (> 3 тика)', () => {
      const s = new Scorer()
      s.onQuickAction(5)
      expect(s.getScore()).toBe(0)
    })
  })

  describe('onMissedFree', () => {
    it('штраф −20 очков и −0.1 стабильности', () => {
      const s = new Scorer()
      s.onAllocate(10) // +100 чтобы score не ушёл в 0
      s.onMissedFree()
      expect(s.getScore()).toBe(80)
      expect(s.getStability()).toBeCloseTo(0.9)
    })
  })

  describe('onWrongFree', () => {
    it('штраф −5 очков', () => {
      const s = new Scorer()
      s.onAllocate(10) // +100
      s.onWrongFree()
      expect(s.getScore()).toBe(95)
    })

    it('не снижает стабильность', () => {
      const s = new Scorer()
      s.onWrongFree()
      expect(s.getStability()).toBe(1)
    })
  })

  describe('onFragmentationPenalty', () => {
    it('штраф пропорционален фрагментации', () => {
      const s = new Scorer()
      s.onAllocate(20) // +200
      s.onFragmentationPenalty(0.5)
      const score = s.getScore()
      expect(score).toBeLessThan(200)
      expect(score).toBeGreaterThan(0)
    })

    it('нет штрафа при 0 фрагментации', () => {
      const s = new Scorer()
      s.onAllocate(10) // +100
      s.onFragmentationPenalty(0)
      expect(s.getScore()).toBe(100)
    })
  })

  describe('onQueueOverflow', () => {
    it('снижает стабильность на 0.05', () => {
      const s = new Scorer()
      s.onQueueOverflow()
      expect(s.getStability()).toBeCloseTo(0.95)
    })
  })

  describe('clamp', () => {
    it('score не опускается ниже 0', () => {
      const s = new Scorer()
      s.onMissedFree()
      s.onMissedFree()
      s.onMissedFree()
      expect(s.getScore()).toBe(0)
    })

    it('stability не опускается ниже 0', () => {
      const s = new Scorer()
      for (let i = 0; i < 15; i++) s.onMissedFree()
      expect(s.getStability()).toBe(0)
    })

    it('stability не превышает 1', () => {
      const s = new Scorer()
      expect(s.getStability()).toBe(1)
    })
  })

  describe('getSummary', () => {
    it('возвращает score и stability', () => {
      const s = new Scorer()
      s.onAllocate(5)
      s.onFree()
      const summary = s.getSummary()
      expect(summary).toEqual({ score: 60, stability: 1 })
    })
  })
})
