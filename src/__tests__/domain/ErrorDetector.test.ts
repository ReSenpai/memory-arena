import { describe, it, expect } from 'vitest'
import { detectLeaks } from '../../domain/ErrorDetector'
import type { MemoryBlock } from '../../domain/types'

describe('ErrorDetector', () => {
  describe('detectLeaks', () => {
    it('не находит утечек если все блоки свободны', () => {
      const blocks: MemoryBlock[] = [
        { id: 'b0', start: 0, size: 64, state: 'free' },
      ]
      const leaks = detectLeaks(blocks, 100, 50)
      expect(leaks).toHaveLength(0)
    })

    it('не находит утечек если блок аллоцирован недавно', () => {
      const blocks: MemoryBlock[] = [
        {
          id: 'b1',
          start: 0,
          size: 16,
          state: 'allocated',
          programId: 'p1',
          allocatedAtTick: 80,
        },
        { id: 'b2', start: 16, size: 48, state: 'free' },
      ]
      // Текущий тик = 100, порог = 50 → блок аллоцирован 20 тиков назад (< 50)
      const leaks = detectLeaks(blocks, 100, 50)
      expect(leaks).toHaveLength(0)
    })

    it('находит утечку если блок аллоцирован слишком давно', () => {
      const blocks: MemoryBlock[] = [
        {
          id: 'b1',
          start: 0,
          size: 16,
          state: 'allocated',
          programId: 'p1',
          allocatedAtTick: 10,
        },
        { id: 'b2', start: 16, size: 48, state: 'free' },
      ]
      // Текущий тик = 100, порог = 50 → блок аллоцирован 90 тиков назад (> 50)
      const leaks = detectLeaks(blocks, 100, 50)
      expect(leaks).toHaveLength(1)
      expect(leaks[0].id).toBe('b1')
    })

    it('находит несколько утечек', () => {
      const blocks: MemoryBlock[] = [
        {
          id: 'b1',
          start: 0,
          size: 8,
          state: 'allocated',
          programId: 'p1',
          allocatedAtTick: 5,
        },
        {
          id: 'b2',
          start: 8,
          size: 8,
          state: 'allocated',
          programId: 'p2',
          allocatedAtTick: 10,
        },
        {
          id: 'b3',
          start: 16,
          size: 8,
          state: 'allocated',
          programId: 'p3',
          allocatedAtTick: 90,
        },
        { id: 'b4', start: 24, size: 40, state: 'free' },
      ]
      // Тик = 100, порог = 50 → b1 (95 назад) и b2 (90 назад) — утечки, b3 (10 назад) — нет
      const leaks = detectLeaks(blocks, 100, 50)
      expect(leaks).toHaveLength(2)
      expect(leaks.map((b) => b.id)).toEqual(['b1', 'b2'])
    })
  })
})
