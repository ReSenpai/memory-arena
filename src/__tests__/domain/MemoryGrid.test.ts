import { describe, it, expect } from 'vitest'
import { MemoryGrid } from '../../domain/MemoryGrid'
import type {
  AllocatedBlock,
  GarbageBlock,
} from '../../domain/types'

/** Хелпер: создать allocated block */
function makeBlock(overrides: Partial<AllocatedBlock> = {}): AllocatedBlock {
  return {
    id: 'b1',
    pointer: '0xAA',
    process: 'Chrome',
    shape: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ],
    cells: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    ],
    placedAtTick: 0,
    ...overrides,
  }
}

/** Хелпер: создать garbage block */
function makeGarbage(overrides: Partial<GarbageBlock> = {}): GarbageBlock {
  return {
    id: 'g1',
    shape: [{ row: 0, col: 0 }],
    cells: [{ row: 0, col: 0 }],
    ...overrides,
  }
}

describe('MemoryGrid — 2D доска', () => {
  describe('создание', () => {
    it('создаёт пустую сетку заданного размера', () => {
      const grid = new MemoryGrid(8, 8)
      const metrics = grid.getMetrics()
      expect(metrics.totalCells).toBe(64)
      expect(metrics.freeCells).toBe(64)
      expect(metrics.usedCells).toBe(0)
      expect(metrics.garbageCells).toBe(0)
    })
  })

  describe('canPlace', () => {
    it('возвращает true для размещения в свободные ячейки', () => {
      const grid = new MemoryGrid(8, 8)
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]
      expect(grid.canPlace(shape, 0, 0)).toBe(true)
    })

    it('возвращает false если выходит за границы', () => {
      const grid = new MemoryGrid(8, 8)
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]
      expect(grid.canPlace(shape, 0, 7)).toBe(false) // col 7 + col 1 = 8 — за границей
    })

    it('возвращает false при нижней границе', () => {
      const grid = new MemoryGrid(8, 8)
      const shape = [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ]
      expect(grid.canPlace(shape, 7, 0)).toBe(false) // row 7 + row 1 = 8
    })

    it('возвращает false если ячейка занята allocated блоком', () => {
      const grid = new MemoryGrid(8, 8)
      grid.place(makeBlock())

      // Пытаемся разместить в то же место
      const shape = [{ row: 0, col: 0 }]
      expect(grid.canPlace(shape, 0, 0)).toBe(false)
    })

    it('возвращает false если ячейка занята garbage блоком', () => {
      const grid = new MemoryGrid(8, 8)
      grid.placeGarbage(makeGarbage({ cells: [{ row: 2, col: 2 }] }))

      expect(grid.canPlace([{ row: 0, col: 0 }], 2, 2)).toBe(false)
    })
  })

  describe('place', () => {
    it('размещает блок на grid', () => {
      const grid = new MemoryGrid(8, 8)
      grid.place(makeBlock())

      const cell = grid.getCell(0, 0)
      expect(cell.type).toBe('allocated')

      const metrics = grid.getMetrics()
      expect(metrics.usedCells).toBe(2)
      expect(metrics.freeCells).toBe(62)
    })

    it('можно разместить несколько блоков', () => {
      const grid = new MemoryGrid(8, 8)
      grid.place(makeBlock({ id: 'b1', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }))
      grid.place(
        makeBlock({
          id: 'b2',
          pointer: '0xBB',
          cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
        }),
      )

      expect(grid.getMetrics().usedCells).toBe(4)
    })
  })

  describe('remove', () => {
    it('освобождает ячейки allocated блока', () => {
      const grid = new MemoryGrid(8, 8)
      grid.place(makeBlock())

      const removed = grid.remove('b1')
      expect(removed).toBe(true)

      const cell = grid.getCell(0, 0)
      expect(cell.type).toBe('free')
      expect(grid.getMetrics().freeCells).toBe(64)
    })

    it('возвращает false если блок не найден', () => {
      const grid = new MemoryGrid(8, 8)
      expect(grid.remove('nonexistent')).toBe(false)
    })
  })

  describe('placeGarbage / removeGarbage', () => {
    it('размещает garbage блок', () => {
      const grid = new MemoryGrid(8, 8)
      grid.placeGarbage(makeGarbage({ cells: [{ row: 3, col: 3 }] }))

      const cell = grid.getCell(3, 3)
      expect(cell.type).toBe('garbage')
      expect(grid.getMetrics().garbageCells).toBe(1)
    })

    it('удаляет garbage блок', () => {
      const grid = new MemoryGrid(8, 8)
      grid.placeGarbage(makeGarbage({ cells: [{ row: 3, col: 3 }] }))

      const removed = grid.removeGarbage('g1')
      expect(removed).toBe(true)
      expect(grid.getCell(3, 3).type).toBe('free')
    })
  })

  describe('moveGarbage', () => {
    it('перемещает garbage блок на новую позицию', () => {
      const grid = new MemoryGrid(8, 8)
      const garbage = makeGarbage({
        shape: [{ row: 0, col: 0 }],
        cells: [{ row: 0, col: 0 }],
      })
      grid.placeGarbage(garbage)

      const result = grid.moveGarbage('g1', 4, 4)
      expect(result.success).toBe(true)

      expect(grid.getCell(0, 0).type).toBe('free')
      expect(grid.getCell(4, 4).type).toBe('garbage')
    })

    it('не перемещает если на новом месте коллизия', () => {
      const grid = new MemoryGrid(8, 8)
      grid.place(makeBlock({ cells: [{ row: 4, col: 4 }] }))
      grid.placeGarbage(makeGarbage({ cells: [{ row: 0, col: 0 }] }))

      const result = grid.moveGarbage('g1', 4, 4)
      expect(result.success).toBe(false)
      // Старая позиция не тронута
      expect(grid.getCell(0, 0).type).toBe('garbage')
    })

    it('не перемещает за границу', () => {
      const grid = new MemoryGrid(8, 8)
      grid.placeGarbage(makeGarbage({ cells: [{ row: 0, col: 0 }] }))

      const result = grid.moveGarbage('g1', 8, 0)
      expect(result.success).toBe(false)
    })

    it('возвращает not-found если id не существует', () => {
      const grid = new MemoryGrid(8, 8)
      const result = grid.moveGarbage('nope', 0, 0)
      expect(result).toEqual({ success: false, reason: 'not-found' })
    })
  })

  describe('getCell', () => {
    it('возвращает free для пустой ячейки', () => {
      const grid = new MemoryGrid(4, 4)
      expect(grid.getCell(2, 2)).toEqual({ type: 'free' })
    })
  })

  describe('getMetrics — фрагментация', () => {
    it('фрагментация 0 на пустой доске', () => {
      const grid = new MemoryGrid(4, 4)
      expect(grid.getMetrics().fragmentation).toBe(0)
    })

    it('фрагментация растёт при разделении свободного пространства', () => {
      const grid = new MemoryGrid(4, 4)
      // Заполняем целую строку, разделяя пространство на два региона
      grid.place(makeBlock({
        id: 'b1',
        cells: [
          { row: 1, col: 0 },
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 1, col: 3 },
        ],
      }))

      const frag = grid.getMetrics().fragmentation
      expect(frag).toBeGreaterThan(0)
    })
  })

  describe('getSnapshot', () => {
    it('возвращает копию состояния', () => {
      const grid = new MemoryGrid(4, 4)
      const snap1 = grid.getSnapshot()
      grid.place(makeBlock({ cells: [{ row: 0, col: 0 }] }))
      const snap2 = grid.getSnapshot()

      // snap1 не должен измениться после place
      expect(snap1).not.toEqual(snap2)
    })
  })
})
