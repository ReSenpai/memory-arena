import type {
  AllocatedBlock,
  GarbageBlock,
  CellContent,
  GridMetrics,
  MoveGarbageResult,
  Shape,
} from './types'

/**
 * 2D Grid-доска памяти.
 *
 * Хранит сетку ячеек (rows × cols). Каждая ячейка может быть:
 * - free (пустая)
 * - allocated (занята блоком)
 * - garbage (утекшая память)
 */
export class MemoryGrid {
  readonly rows: number
  readonly cols: number

  /** Сетка: null = free, строка = blockId */
  private grid: (string | null)[][]
  /** Тип содержимого: 'a' = allocated, 'g' = garbage */
  private typeMap: Map<string, 'a' | 'g'> = new Map()
  /** Зарегистрированные allocated блоки */
  private allocatedBlocks: Map<string, AllocatedBlock> = new Map()
  /** Зарегистрированные garbage блоки */
  private garbageBlocks: Map<string, GarbageBlock> = new Map()

  constructor(rows: number, cols: number) {
    this.rows = rows
    this.cols = cols
    this.grid = Array.from({ length: rows }, () => Array<string | null>(cols).fill(null))
  }

  /** Проверяет, можно ли разместить фигуру в указанной позиции */
  canPlace(shape: Shape, row: number, col: number): boolean {
    for (const cell of shape) {
      const r = row + cell.row
      const c = col + cell.col
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false
      if (this.grid[r][c] !== null) return false
    }
    return true
  }

  /** Размещает allocated блок на grid (ячейки уже заданы в block.cells) */
  place(block: AllocatedBlock): void {
    for (const cell of block.cells) {
      this.grid[cell.row][cell.col] = block.id
    }
    this.typeMap.set(block.id, 'a')
    this.allocatedBlocks.set(block.id, block)
  }

  /** Удаляет allocated блок, освобождая ячейки. Возвращает true если найден. */
  remove(blockId: string): boolean {
    const block = this.allocatedBlocks.get(blockId)
    if (!block) return false
    for (const cell of block.cells) {
      this.grid[cell.row][cell.col] = null
    }
    this.typeMap.delete(blockId)
    this.allocatedBlocks.delete(blockId)
    return true
  }

  /** Размещает garbage блок на grid */
  placeGarbage(garbage: GarbageBlock): void {
    for (const cell of garbage.cells) {
      this.grid[cell.row][cell.col] = garbage.id
    }
    this.typeMap.set(garbage.id, 'g')
    this.garbageBlocks.set(garbage.id, garbage)
  }

  /** Удаляет garbage блок. Возвращает true если найден. */
  removeGarbage(blockId: string): boolean {
    const garbage = this.garbageBlocks.get(blockId)
    if (!garbage) return false
    for (const cell of garbage.cells) {
      this.grid[cell.row][cell.col] = null
    }
    this.typeMap.delete(blockId)
    this.garbageBlocks.delete(blockId)
    return true
  }

  /** Перемещает garbage блок на новую позицию */
  moveGarbage(garbageId: string, newRow: number, newCol: number): MoveGarbageResult {
    const garbage = this.garbageBlocks.get(garbageId)
    if (!garbage) return { success: false, reason: 'not-found' }

    // Проверяем bounds и коллизии (исключая текущие ячейки garbage)
    const newCells = garbage.shape.map((c) => ({
      row: newRow + c.row,
      col: newCol + c.col,
    }))

    for (const cell of newCells) {
      if (cell.row < 0 || cell.row >= this.rows || cell.col < 0 || cell.col >= this.cols) {
        return { success: false, reason: 'out-of-bounds' }
      }
      const occupant = this.grid[cell.row][cell.col]
      if (occupant !== null && occupant !== garbageId) {
        return { success: false, reason: 'collision' }
      }
    }

    // Очищаем старое положение
    for (const cell of garbage.cells) {
      this.grid[cell.row][cell.col] = null
    }

    // Ставим в новое
    for (const cell of newCells) {
      this.grid[cell.row][cell.col] = garbageId
    }

    garbage.cells = newCells
    return { success: true }
  }

  /** Получить содержимое ячейки */
  getCell(row: number, col: number): CellContent {
    const id = this.grid[row][col]
    if (id === null) return { type: 'free' }
    const kind = this.typeMap.get(id)
    if (kind === 'g') return { type: 'garbage', blockId: id }
    return { type: 'allocated', blockId: id }
  }

  /** Вычислить метрики grid */
  getMetrics(): GridMetrics {
    const total = this.rows * this.cols
    let used = 0
    let garbage = 0

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const id = this.grid[r][c]
        if (id !== null) {
          const kind = this.typeMap.get(id)
          if (kind === 'a') used++
          else garbage++
        }
      }
    }

    const free = total - used - garbage
    const fragmentation = this.computeFragmentation()

    return { totalCells: total, usedCells: used, freeCells: free, garbageCells: garbage, fragmentation }
  }

  /** Копия состояния для рендера (immutable snapshot) */
  getSnapshot(): CellContent[][] {
    return Array.from({ length: this.rows }, (_, r) =>
      Array.from({ length: this.cols }, (_, c) => this.getCell(r, c)),
    )
  }

  /**
   * Фрагментация: 1 - (largest connected free region / total free).
   * BFS по свободным ячейкам.
   */
  private computeFragmentation(): number {
    const free = this.rows * this.cols - [...this.typeMap.values()].length
    // Считаем фактически (пересчитываем)
    let totalFree = 0
    const visited = Array.from({ length: this.rows }, () =>
      new Array<boolean>(this.cols).fill(false),
    )
    let largestRegion = 0

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] === null) totalFree++
        if (this.grid[r][c] === null && !visited[r][c]) {
          const regionSize = this.bfs(r, c, visited)
          if (regionSize > largestRegion) largestRegion = regionSize
        }
      }
    }

    void free
    if (totalFree <= 1) return 0
    return 1 - largestRegion / totalFree
  }

  private bfs(startRow: number, startCol: number, visited: boolean[][]): number {
    const queue: [number, number][] = [[startRow, startCol]]
    visited[startRow][startCol] = true
    let size = 0

    while (queue.length > 0) {
      const item = queue.shift()
      if (!item) break
      const [r, c] = item
      size++
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && !visited[nr][nc] && this.grid[nr][nc] === null) {
          visited[nr][nc] = true
          queue.push([nr, nc])
        }
      }
    }

    return size
  }
}
