// ===================================================================
// Memory Arena v2 — Типы и модель данных
// Grid-based memory с фигурными блоками, pointer'ами и garbage.
// ===================================================================

/** Координата ячейки на grid-доске */
export type Cell = {
  row: number
  col: number
}

/**
 * Фигура блока — массив относительных координат (от точки (0,0)).
 * Пример линии-3: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }]
 */
export type Shape = Cell[]

/** Уникальный идентификатор блока */
export type BlockId = string

/** Указатель (hex-строка вида 0xA3F2) */
export type Pointer = string

/** Название процесса */
export type ProcessName = string

// -------------------------------------------------------------------
// Блоки на доске
// -------------------------------------------------------------------

/** Активный (allocated) блок на grid-доске */
export type AllocatedBlock = {
  id: BlockId
  pointer: Pointer
  process: ProcessName
  /** Относительная фигура блока */
  shape: Shape
  /** Абсолютные координаты на grid (после размещения) */
  cells: Cell[]
  /** Тик, на котором блок был размещён */
  placedAtTick: number
}

/** Garbage блок — утекшая память, можно перемещать */
export type GarbageBlock = {
  id: BlockId
  /** Относительная фигура блока */
  shape: Shape
  /** Абсолютные координаты на grid */
  cells: Cell[]
}

// -------------------------------------------------------------------
// Запросы
// -------------------------------------------------------------------

/** Запрос на выделение памяти */
export type AllocateRequest = {
  id: string
  process: ProcessName
  pointer: Pointer
  /** Фигура для размещения */
  shape: Shape
  /** Тик создания запроса */
  createdAtTick: number
}

/** Запрос на освобождение памяти */
export type FreeRequest = {
  id: string
  pointer: Pointer
  /** Тик, после которого block → garbage (если не обработан) */
  deadline: number
  /** Тик создания запроса */
  createdAtTick: number
}

/** Общий тип запроса (tagged union) */
export type GameRequest =
  | { type: 'allocate'; payload: AllocateRequest }
  | { type: 'free'; payload: FreeRequest }

// -------------------------------------------------------------------
// Результаты операций
// -------------------------------------------------------------------

export type PlaceResult =
  | { success: true; block: AllocatedBlock }
  | { success: false; reason: 'collision' | 'out-of-bounds' | 'request-not-found' }

export type FreeResult =
  | { success: true; freedCells: Cell[] }
  | { success: false; reason: 'pointer-mismatch' | 'not-found' | 'request-not-found' | 'double-free' }

export type MoveGarbageResult =
  | { success: true }
  | { success: false; reason: 'collision' | 'out-of-bounds' | 'not-found' }

// -------------------------------------------------------------------
// Метрики
// -------------------------------------------------------------------

/** Метрики состояния grid-доски */
export type GridMetrics = {
  /** Общее количество ячеек (rows × cols) */
  totalCells: number
  /** Ячеек используется (allocated) */
  usedCells: number
  /** Ячеек свободно */
  freeCells: number
  /** Ячеек занято garbage */
  garbageCells: number
  /** Фрагментация: 0 = нет, 1 = полная (метрика как в v1) */
  fragmentation: number
}

// -------------------------------------------------------------------
// Состояние ячейки
// -------------------------------------------------------------------

/** Содержимое одной ячейки grid */
export type CellContent =
  | { type: 'free' }
  | { type: 'allocated'; blockId: BlockId }
  | { type: 'garbage'; blockId: BlockId }
  | { type: 'dissolving'; blockId: BlockId }
