import type { MemoryBlock } from './types'

/**
 * Стратегия аллокации — выбирает подходящий свободный блок.
 * Возвращает индекс в массиве blocks или -1 если не найден.
 */
export interface AllocatorStrategy {
  findFreeBlock(blocks: ReadonlyArray<MemoryBlock>, size: number): number
}

/**
 * First Fit — выбирает первый подходящий свободный блок.
 */
export const firstFit: AllocatorStrategy = {
  findFreeBlock(blocks, size) {
    return blocks.findIndex((b) => b.state === 'free' && b.size >= size)
  },
}
