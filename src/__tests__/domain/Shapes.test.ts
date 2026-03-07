import { describe, it, expect } from 'vitest'
import {
  SHAPES,
  rotateShape,
  normalizeShape,
  getShapeBounds,
  getShapesByLevel,
} from '../../domain/Shapes'

describe('Shapes — фигуры блоков', () => {
  describe('предопределённые фигуры', () => {
    it('содержит минимум 7 фигур', () => {
      expect(Object.keys(SHAPES).length).toBeGreaterThanOrEqual(7)
    })

    it('каждая фигура содержит хотя бы одну ячейку', () => {
      for (const [name, shape] of Object.entries(SHAPES)) {
        expect(shape.length, `фигура ${name} пустая`).toBeGreaterThan(0)
      }
    })

    it('все фигуры нормализованы (начинаются от 0,0)', () => {
      for (const [name, shape] of Object.entries(SHAPES)) {
        const minRow = Math.min(...shape.map((c) => c.row))
        const minCol = Math.min(...shape.map((c) => c.col))
        expect(minRow, `${name}: minRow`).toBe(0)
        expect(minCol, `${name}: minCol`).toBe(0)
      }
    })
  })

  describe('normalizeShape', () => {
    it('сдвигает фигуру к (0,0)', () => {
      const shape = [
        { row: 3, col: 5 },
        { row: 3, col: 6 },
        { row: 4, col: 5 },
      ]
      const norm = normalizeShape(shape)
      expect(norm).toEqual([
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ])
    })

    it('уже нормализованная фигура не меняется', () => {
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]
      expect(normalizeShape(shape)).toEqual(shape)
    })
  })

  describe('rotateShape', () => {
    it('поворачивает линию-3 на 90°', () => {
      const horizontal = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ]
      const rotated = rotateShape(horizontal, 1)

      // После поворота линия становится вертикальной
      const bounds = getShapeBounds(rotated)
      expect(bounds.rows).toBe(3)
      expect(bounds.cols).toBe(1)
    })

    it('4 поворота возвращают к исходной фигуре', () => {
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ]
      const rotated4 = rotateShape(shape, 4)
      expect(rotated4).toEqual(normalizeShape(shape))
    })

    it('поворот на 0 не меняет фигуру', () => {
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]
      expect(rotateShape(shape, 0)).toEqual(shape)
    })

    it('поворот L-фигуры на 90° даёт правильный результат', () => {
      // L-фигура:
      // X
      // X
      // X X
      const lShape = [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 2, col: 1 },
      ]
      const rotated = rotateShape(lShape, 1)
      expect(rotated).toHaveLength(4)
      const bounds = getShapeBounds(rotated)
      expect(bounds.rows).toBe(2)
      expect(bounds.cols).toBe(3)
    })
  })

  describe('getShapeBounds', () => {
    it('вычисляет bounds для линии-2', () => {
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ]
      expect(getShapeBounds(shape)).toEqual({ rows: 1, cols: 2 })
    })

    it('вычисляет bounds для квадрата 2×2', () => {
      const shape = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
      ]
      expect(getShapeBounds(shape)).toEqual({ rows: 2, cols: 2 })
    })

    it('вычисляет bounds для одной клетки', () => {
      const shape = [{ row: 0, col: 0 }]
      expect(getShapeBounds(shape)).toEqual({ rows: 1, cols: 1 })
    })
  })

  describe('getShapesByLevel', () => {
    it('Level 1 содержит только простые фигуры', () => {
      const shapes = getShapesByLevel(1)
      expect(shapes.length).toBeGreaterThan(0)
      for (const shape of shapes) {
        expect(shape.length).toBeLessThanOrEqual(4)
      }
    })

    it('Level 5 содержит больше фигур, чем Level 1', () => {
      const l1 = getShapesByLevel(1)
      const l5 = getShapesByLevel(5)
      expect(l5.length).toBeGreaterThan(l1.length)
    })

    it('каждый уровень от 1 до 5 возвращает фигуры', () => {
      for (let lvl = 1; lvl <= 5; lvl++) {
        const shapes = getShapesByLevel(lvl)
        expect(shapes.length, `уровень ${lvl}`).toBeGreaterThan(0)
      }
    })
  })
})
