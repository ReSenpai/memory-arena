import { describe, it, expect } from 'vitest'
import { Scorer } from '../../domain/Scorer'

describe('Scorer', () => {
  describe('начальное состояние', () => {
    it('начальный score = 0', () => {
      const scorer = new Scorer()
      expect(scorer.getScore()).toBe(0)
    })

    it('начальная stability = 1', () => {
      const scorer = new Scorer()
      expect(scorer.getStability()).toBe(1)
    })
  })

  describe('onSuccessfulAllocate', () => {
    it('успешный allocate даёт +10 очков за каждую ячейку', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulAllocate(4) // 4 ячейки × 10 = 40
      expect(scorer.getScore()).toBe(40)
    })

    it('очки накапливаются при нескольких аллокациях', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulAllocate(4) // +40
      scorer.onSuccessfulAllocate(2) // +20
      expect(scorer.getScore()).toBe(60)
    })
  })

  describe('onSuccessfulFree', () => {
    it('успешный free даёт +5 очков', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulFree()
      expect(scorer.getScore()).toBe(5)
    })
  })

  describe('onLeakDetected', () => {
    it('утечка снижает score на 20', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulAllocate(5) // +50
      scorer.onLeakDetected() // -20
      expect(scorer.getScore()).toBe(30)
    })

    it('score не опускается ниже 0', () => {
      const scorer = new Scorer()
      scorer.onLeakDetected()
      expect(scorer.getScore()).toBe(0)
    })

    it('утечка снижает stability на 0.1', () => {
      const scorer = new Scorer()
      scorer.onLeakDetected()
      expect(scorer.getStability()).toBeCloseTo(0.9)
    })
  })

  describe('onDoubleFree', () => {
    it('double free обнуляет stability', () => {
      const scorer = new Scorer()
      scorer.onDoubleFree()
      expect(scorer.getStability()).toBe(0)
    })

    it('double free снижает score на 50', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulAllocate(10) // +100
      scorer.onDoubleFree() // -50
      expect(scorer.getScore()).toBe(50)
    })
  })

  describe('getSummary', () => {
    it('возвращает сводку с текущими значениями', () => {
      const scorer = new Scorer()
      scorer.onSuccessfulAllocate(3) // +30
      scorer.onSuccessfulFree() // +5

      const summary = scorer.getSummary()
      expect(summary).toEqual({
        score: 35,
        stability: 1,
      })
    })
  })
})
