import { describe, it, expect } from 'vitest'
import { GarbageManager } from '../../domain/GarbageManager'
import type {
  AllocatedBlock,
  FreeRequest,
} from '../../domain/types'

describe('GarbageManager — управление утечками', () => {
  const makeBlock = (overrides: Partial<AllocatedBlock> = {}): AllocatedBlock => ({
    id: 'b1',
    pointer: '0x0001',
    process: 'Chrome',
    shape: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
    cells: [{ row: 2, col: 3 }, { row: 2, col: 4 }],
    placedAtTick: 5,
    ...overrides,
  })

  describe('convertToGarbage', () => {
    it('преобразует allocated блок в garbage', () => {
      const gm = new GarbageManager()
      const block = makeBlock()
      const garbage = gm.convertToGarbage(block)
      expect(garbage.id).toBe(block.id)
      expect(garbage.shape).toEqual(block.shape)
      expect(garbage.cells).toEqual(block.cells)
    })

    it('добавляет garbage в список', () => {
      const gm = new GarbageManager()
      gm.convertToGarbage(makeBlock())
      expect(gm.getGarbageBlocks()).toHaveLength(1)
    })
  })

  describe('removeGarbage', () => {
    it('удаляет garbage блок по id', () => {
      const gm = new GarbageManager()
      gm.convertToGarbage(makeBlock({ id: 'b1' }))
      gm.convertToGarbage(makeBlock({ id: 'b2' }))
      gm.removeGarbage('b1')
      expect(gm.getGarbageBlocks()).toHaveLength(1)
      expect(gm.getGarbageBlocks()[0].id).toBe('b2')
    })
  })

  describe('checkExpiredFrees', () => {
    it('возвращает pointer блоков с просроченным deadline', () => {
      const gm = new GarbageManager()
      const freeRequests: FreeRequest[] = [
        { id: 'f1', pointer: '0x0001', deadline: 10, createdAtTick: 5 },
        { id: 'f2', pointer: '0x0002', deadline: 20, createdAtTick: 10 },
      ]
      const expired = gm.checkExpiredFrees(freeRequests, 15)
      expect(expired).toEqual([
        { id: 'f1', pointer: '0x0001', deadline: 10, createdAtTick: 5 },
      ])
    })

    it('ничего не возвращает если все deadline в будущем', () => {
      const gm = new GarbageManager()
      const freeRequests: FreeRequest[] = [
        { id: 'f1', pointer: '0x0001', deadline: 100, createdAtTick: 5 },
      ]
      const expired = gm.checkExpiredFrees(freeRequests, 10)
      expect(expired).toHaveLength(0)
    })
  })

  describe('getGarbageBlocks', () => {
    it('возвращает копию списка garbage', () => {
      const gm = new GarbageManager()
      gm.convertToGarbage(makeBlock({ id: 'b1' }))
      gm.convertToGarbage(makeBlock({ id: 'b2' }))
      const blocks = gm.getGarbageBlocks()
      expect(blocks).toHaveLength(2)
      // Проверяем что это копия
      blocks.pop()
      expect(gm.getGarbageBlocks()).toHaveLength(2)
    })
  })

  describe('updateGarbageCells', () => {
    it('обновляет позицию garbage блока', () => {
      const gm = new GarbageManager()
      gm.convertToGarbage(makeBlock({ id: 'b1' }))
      const newCells = [{ row: 5, col: 5 }, { row: 5, col: 6 }]
      gm.updateGarbageCells('b1', newCells)
      expect(gm.getGarbageBlocks()[0].cells).toEqual(newCells)
    })
  })
})
