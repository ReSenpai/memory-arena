import { describe, it, expect } from 'vitest'
import type {
  Cell,
  Shape,
  AllocatedBlock,
  GarbageBlock,
  AllocateRequest,
  FreeRequest,
  GameRequest,
  PlaceResult,
  FreeResult,
  MoveGarbageResult,
  GridMetrics,
  CellContent,
} from '../../domain/types'

describe('domain/types — типовая система v2', () => {
  it('Cell — координата ячейки', () => {
    const cell: Cell = { row: 3, col: 5 }
    expect(cell.row).toBe(3)
    expect(cell.col).toBe(5)
  })

  it('Shape — фигура из относительных координат', () => {
    const line: Shape = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]
    expect(line).toHaveLength(3)
  })

  it('AllocatedBlock — активный блок на доске', () => {
    const block: AllocatedBlock = {
      id: 'b1',
      pointer: '0xA3F2',
      process: 'Chrome',
      shape: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
      cells: [{ row: 2, col: 3 }, { row: 2, col: 4 }],
      placedAtTick: 5,
    }
    expect(block.pointer).toBe('0xA3F2')
    expect(block.cells).toHaveLength(2)
  })

  it('GarbageBlock — утекшая память', () => {
    const garbage: GarbageBlock = {
      id: 'g1',
      shape: [{ row: 0, col: 0 }],
      cells: [{ row: 7, col: 7 }],
    }
    expect(garbage.id).toBe('g1')
  })

  it('AllocateRequest — запрос на выделение', () => {
    const req: AllocateRequest = {
      id: 'req-1',
      process: 'Firefox',
      pointer: '0xBEEF',
      shape: [{ row: 0, col: 0 }, { row: 1, col: 0 }],
      createdAtTick: 10,
    }
    expect(req.shape).toHaveLength(2)
  })

  it('FreeRequest — запрос на освобождение с deadline', () => {
    const req: FreeRequest = {
      id: 'req-2',
      pointer: '0xBEEF',
      deadline: 25,
      createdAtTick: 15,
    }
    expect(req.deadline).toBe(25)
  })

  it('GameRequest — tagged union', () => {
    const allocReq: GameRequest = {
      type: 'allocate',
      payload: {
        id: 'req-3',
        process: 'VSCode',
        pointer: '0x1234',
        shape: [{ row: 0, col: 0 }],
        createdAtTick: 1,
      },
    }

    const freeReq: GameRequest = {
      type: 'free',
      payload: {
        id: 'req-4',
        pointer: '0x1234',
        deadline: 20,
        createdAtTick: 10,
      },
    }

    expect(allocReq.type).toBe('allocate')
    expect(freeReq.type).toBe('free')
  })

  it('PlaceResult — discriminated union', () => {
    const ok: PlaceResult = {
      success: true,
      block: {
        id: 'b1',
        pointer: '0xAA',
        process: 'P',
        shape: [{ row: 0, col: 0 }],
        cells: [{ row: 0, col: 0 }],
        placedAtTick: 0,
      },
    }

    const fail: PlaceResult = { success: false, reason: 'collision' }

    expect(ok.success).toBe(true)
    expect(fail.success).toBe(false)
  })

  it('FreeResult — discriminated union', () => {
    const ok: FreeResult = { success: true, freedCells: [{ row: 0, col: 0 }] }
    const fail: FreeResult = { success: false, reason: 'pointer-mismatch' }

    expect(ok.success).toBe(true)
    expect(fail.success).toBe(false)
  })

  it('MoveGarbageResult — discriminated union', () => {
    const ok: MoveGarbageResult = { success: true }
    const fail: MoveGarbageResult = { success: false, reason: 'out-of-bounds' }

    expect(ok.success).toBe(true)
    expect(fail.success).toBe(false)
  })

  it('GridMetrics — метрики доски', () => {
    const m: GridMetrics = {
      totalCells: 64,
      usedCells: 20,
      freeCells: 30,
      garbageCells: 14,
      fragmentation: 0.35,
    }
    expect(m.totalCells).toBe(m.usedCells + m.freeCells + m.garbageCells)
  })

  it('CellContent — содержимое ячейки', () => {
    const free: CellContent = { type: 'free' }
    const alloc: CellContent = { type: 'allocated', blockId: 'b1' }
    const garb: CellContent = { type: 'garbage', blockId: 'g1' }

    expect(free.type).toBe('free')
    expect(alloc.type).toBe('allocated')
    expect(garb.type).toBe('garbage')
  })
})
