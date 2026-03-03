/**
 * Состояние блока памяти
 */
export type BlockState = 'free' | 'allocated'

/**
 * Блок памяти — основная единица модели.
 * Память состоит из непрерывной последовательности таких блоков.
 */
export type MemoryBlock = {
  /** Уникальный идентификатор блока */
  id: string
  /** Адрес начала (индекс в общем массиве памяти) */
  start: number
  /** Размер блока в ячейках */
  size: number
  /** Состояние: свободен или занят */
  state: BlockState
  /** ID программы-владельца (только для allocated) */
  programId?: string
  /** Тик, на котором блок был аллоцирован (для детектора утечек) */
  allocatedAtTick?: number
}

/**
 * Запрос на выделение памяти от программы
 */
export type AllocationRequest = {
  /** Уникальный ID запроса */
  id: string
  /** ID программы, которая просит память */
  programId: string
  /** Сколько ячеек нужно */
  size: number
}

/**
 * Запрос на освобождение памяти
 */
export type FreeRequest = {
  /** Уникальный ID запроса */
  id: string
  /** ID программы, которая освобождает */
  programId: string
  /** ID блока, который нужно освободить */
  blockId: string
}

/**
 * Любой запрос к менеджеру памяти
 */
export type MemoryRequest =
  | { type: 'allocate'; payload: AllocationRequest }
  | { type: 'free'; payload: FreeRequest }

/**
 * Результат попытки аллокации
 */
export type AllocationResult =
  | { success: true; block: MemoryBlock }
  | { success: false; reason: 'no-space' | 'no-fit' }

/**
 * Результат попытки освобождения
 */
export type FreeResult =
  | { success: true; block: MemoryBlock }
  | { success: false; reason: 'not-found' | 'double-free' }

/**
 * Метрики состояния памяти
 */
export type MemoryMetrics = {
  /** Общий размер памяти */
  totalSize: number
  /** Сколько занято */
  usedSize: number
  /** Сколько свободно */
  freeSize: number
  /** Процент фрагментации (0-1) */
  fragmentation: number
  /** Количество блоков */
  blockCount: number
}
