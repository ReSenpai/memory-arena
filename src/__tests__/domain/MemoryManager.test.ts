import { describe, it, expect } from 'vitest'
import { MemoryManager } from '../../domain/MemoryManager'

describe('MemoryManager', () => {
  describe('конструктор', () => {
    it('создаёт менеджер с заданным размером памяти', () => {
      const mm = new MemoryManager(64)
      const blocks = mm.getBlocks()

      expect(blocks).toHaveLength(1)
      expect(blocks[0].start).toBe(0)
      expect(blocks[0].size).toBe(64)
      expect(blocks[0].state).toBe('free')
    })
  })

  describe('allocate', () => {
    it('выделяет блок и разделяет оставшееся свободное пространство', () => {
      const mm = new MemoryManager(64)
      const result = mm.allocate(16, 'program-1')

      expect(result.success).toBe(true)
      if (!result.success) return

      // Выделенный блок
      expect(result.block.size).toBe(16)
      expect(result.block.start).toBe(0)
      expect(result.block.state).toBe('allocated')
      expect(result.block.programId).toBe('program-1')

      // Оставшийся свободный блок
      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(2)
      expect(blocks[1].start).toBe(16)
      expect(blocks[1].size).toBe(48)
      expect(blocks[1].state).toBe('free')
    })

    it('выделяет блок точного размера без остатка', () => {
      const mm = new MemoryManager(32)
      const result = mm.allocate(32, 'program-1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.block.size).toBe(32)
      expect(mm.getBlocks()).toHaveLength(1)
      expect(mm.getBlocks()[0].state).toBe('allocated')
    })

    it('выделяет несколько блоков последовательно', () => {
      const mm = new MemoryManager(64)
      mm.allocate(16, 'p1')
      mm.allocate(16, 'p2')

      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(3)
      expect(blocks[0].state).toBe('allocated')
      expect(blocks[0].programId).toBe('p1')
      expect(blocks[1].state).toBe('allocated')
      expect(blocks[1].start).toBe(16)
      expect(blocks[1].programId).toBe('p2')
      expect(blocks[2].state).toBe('free')
      expect(blocks[2].start).toBe(32)
      expect(blocks[2].size).toBe(32)
    })

    it('возвращает no-fit когда нет достаточно большого свободного блока', () => {
      const mm = new MemoryManager(32)
      mm.allocate(32, 'p1')
      const result = mm.allocate(1, 'p2')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('no-fit')
    })

    it('возвращает no-fit из-за фрагментации', () => {
      const mm = new MemoryManager(32)
      // выделяем три блока по 8 ячеек
      mm.allocate(8, 'p1') // [0..7]
      mm.allocate(8, 'p2') // [8..15]
      mm.allocate(8, 'p3') // [16..23]
      // осталось: [24..31] = 8 свободных

      // Пытаемся выделить 16 — нет единого свободного блока такого размера
      const result = mm.allocate(16, 'p4')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('no-fit')
    })
  })

  describe('free', () => {
    it('освобождает выделенный блок', () => {
      const mm = new MemoryManager(64)
      const allocResult = mm.allocate(16, 'p1')
      if (!allocResult.success) throw new Error('аллокация не удалась')

      const result = mm.free(allocResult.block.id)

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.block.state).toBe('free')
      expect(result.block.programId).toBeUndefined()
      expect(result.block.start).toBe(0)
      expect(result.block.size).toBe(16)
    })

    it('возвращает double-free при повторном освобождении', () => {
      const mm = new MemoryManager(64)
      const allocResult = mm.allocate(16, 'p1')
      if (!allocResult.success) throw new Error('аллокация не удалась')

      mm.free(allocResult.block.id)
      const result = mm.free(allocResult.block.id)

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('double-free')
    })

    it('возвращает not-found для несуществующего блока', () => {
      const mm = new MemoryManager(64)
      const result = mm.free('несуществующий-id')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('not-found')
    })
  })

  describe('mergeFreeBlocks', () => {
    it('объединяет два соседних свободных блока в один', () => {
      const mm = new MemoryManager(64)
      // Выделяем два блока подряд
      const r1 = mm.allocate(16, 'p1')
      const r2 = mm.allocate(16, 'p2')
      if (!r1.success || !r2.success) throw new Error('аллокация не удалась')

      // Освобождаем оба — теперь [free:16][free:16][free:32]
      mm.free(r1.block.id)
      mm.free(r2.block.id)

      mm.mergeFreeBlocks()

      // Должен быть один свободный блок на всю память
      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(1)
      expect(blocks[0].state).toBe('free')
      expect(blocks[0].start).toBe(0)
      expect(blocks[0].size).toBe(64)
    })

    it('объединяет три свободных блока подряд', () => {
      const mm = new MemoryManager(48)
      const r1 = mm.allocate(16, 'p1')
      const r2 = mm.allocate(16, 'p2')
      const r3 = mm.allocate(16, 'p3')
      if (!r1.success || !r2.success || !r3.success)
        throw new Error('аллокация не удалась')

      // Освобождаем все три
      mm.free(r1.block.id)
      mm.free(r2.block.id)
      mm.free(r3.block.id)

      mm.mergeFreeBlocks()

      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(1)
      expect(blocks[0].size).toBe(48)
    })

    it('не объединяет блоки, разделённые allocated блоком', () => {
      const mm = new MemoryManager(48)
      const r1 = mm.allocate(16, 'p1')
      const r2 = mm.allocate(16, 'p2')
      if (!r1.success || !r2.success) throw new Error('аллокация не удалась')
      // [alloc:16][alloc:16][free:16]

      // Освобождаем только первый — [free:16][alloc:16][free:16]
      mm.free(r1.block.id)

      mm.mergeFreeBlocks()

      // Два свободных блока не должны слиться — между ними occupied
      const blocks = mm.getBlocks()
      const freeBlocks = blocks.filter((b) => b.state === 'free')
      expect(freeBlocks).toHaveLength(2)
      expect(freeBlocks[0].size).toBe(16)
      expect(freeBlocks[1].size).toBe(16)
    })

    it('объединяет только соседние свободные, оставляя allocated между ними', () => {
      const mm = new MemoryManager(64)
      const r1 = mm.allocate(16, 'p1')
      const r2 = mm.allocate(16, 'p2')
      const r3 = mm.allocate(16, 'p3')
      if (!r1.success || !r2.success || !r3.success)
        throw new Error('аллокация не удалась')
      // [alloc:16][alloc:16][alloc:16][free:16]

      // Освобождаем 1 и 3 — [free:16][alloc:16][free:16][free:16]
      mm.free(r1.block.id)
      mm.free(r3.block.id)

      mm.mergeFreeBlocks()

      // Блоки 3 и хвостовой free должны слиться, блок 1 — отдельно
      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(3)
      expect(blocks[0].state).toBe('free')
      expect(blocks[0].size).toBe(16)
      expect(blocks[1].state).toBe('allocated')
      expect(blocks[2].state).toBe('free')
      expect(blocks[2].size).toBe(32) // 16 + 16 слились
    })
  })
})
