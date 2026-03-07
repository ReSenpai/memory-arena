import type { Cell, Shape } from './types'

// ===================================================================
// Предопределённые фигуры
// Все нормализованы: минимальная координата = (0, 0).
// ===================================================================

export const SHAPES: Record<string, Shape> = {
  /** ▪▪ */
  line2: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
  ],

  /** ▪▪▪ */
  line3: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ],

  /** ▪▪▪▪ */
  line4: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
  ],

  /**
   * ▪▪
   * ▪▪
   */
  square: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],

  /**
   * ▪
   * ▪
   * ▪▪
   */
  lShape: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
  ],

  /**
   * ▪▪▪
   *  ▪
   */
  tShape: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
  ],

  /**
   * ▪▪
   *  ▪▪
   */
  zShape: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],

  /** ▪ (одна клетка) */
  dot: [{ row: 0, col: 0 }],
}

// ===================================================================
// Операции с фигурами
// ===================================================================

/** Нормализует фигуру — сдвигает так, чтобы минимальная координата была (0, 0) */
export function normalizeShape(shape: Shape): Shape {
  const minRow = Math.min(...shape.map((c) => c.row))
  const minCol = Math.min(...shape.map((c) => c.col))
  return shape.map((c) => ({ row: c.row - minRow, col: c.col - minCol }))
}

/**
 * Поворачивает фигуру на 90° по часовой стрелке `times` раз.
 * Формула одного поворота: (row, col) → (col, -row), затем нормализация.
 */
export function rotateShape(shape: Shape, times: number): Shape {
  const n = ((times % 4) + 4) % 4
  let result: Cell[] = shape
  for (let i = 0; i < n; i++) {
    result = result.map((c) => ({ row: c.col, col: -c.row }))
    result = normalizeShape(result)
  }
  return result
}

/** Возвращает размеры bounding box фигуры (rows × cols) */
export function getShapeBounds(shape: Shape): { rows: number; cols: number } {
  const maxRow = Math.max(...shape.map((c) => c.row))
  const maxCol = Math.max(...shape.map((c) => c.col))
  return { rows: maxRow + 1, cols: maxCol + 1 }
}

/**
 * Возвращает набор фигур, доступных на заданном уровне.
 * Уровни 1-2: простые, 3-4: средние, 5: все.
 */
export function getShapesByLevel(level: number): Shape[] {
  if (level <= 2) {
    return [SHAPES.dot, SHAPES.line2, SHAPES.line3, SHAPES.square]
  }
  if (level <= 4) {
    return [
      SHAPES.dot,
      SHAPES.line2,
      SHAPES.line3,
      SHAPES.line4,
      SHAPES.square,
      SHAPES.lShape,
      SHAPES.tShape,
    ]
  }
  return Object.values(SHAPES)
}
