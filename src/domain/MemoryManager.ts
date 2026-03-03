import type { AllocatorStrategy } from './Allocator'
import { firstFit } from './Allocator'
import type {
  AllocationResult,
  FreeResult,
  MemoryBlock,
  MemoryMetrics,
} from './types'

export class MemoryManager {
  private blocks: MemoryBlock[]
  private nextBlockId = 1
  private strategy: AllocatorStrategy

  constructor(totalSize: number, strategy: AllocatorStrategy = firstFit) {
    this.blocks = [
      {
        id: 'block-0',
        start: 0,
        size: totalSize,
        state: 'free',
      },
    ]
    this.strategy = strategy
  }

  allocate(size: number, programId: string, tick?: number): AllocationResult {
    const index = this.strategy.findFreeBlock(this.blocks, size)

    if (index === -1) {
      return { success: false, reason: 'no-fit' }
    }

    const freeBlock = this.blocks[index]

    // Создаём выделенный блок
    const allocatedBlock: MemoryBlock = {
      id: `block-${this.nextBlockId++}`,
      start: freeBlock.start,
      size,
      state: 'allocated',
      programId,
      allocatedAtTick: tick,
    }

    if (freeBlock.size === size) {
      // Точное совпадение — заменяем свободный блок
      this.blocks.splice(index, 1, allocatedBlock)
    } else {
      // Разделение — выделенный блок + оставшийся свободный
      const remainingBlock: MemoryBlock = {
        id: `block-${this.nextBlockId++}`,
        start: freeBlock.start + size,
        size: freeBlock.size - size,
        state: 'free',
      }
      this.blocks.splice(index, 1, allocatedBlock, remainingBlock)
    }

    return { success: true, block: allocatedBlock }
  }

  free(blockId: string): FreeResult {
    const block = this.blocks.find((b) => b.id === blockId)

    if (!block) {
      return { success: false, reason: 'not-found' }
    }

    if (block.state === 'free') {
      return { success: false, reason: 'double-free' }
    }

    // Освобождаем блок
    block.state = 'free'
    block.programId = undefined

    return { success: true, block }
  }

  /**
   * Объединяет соседние свободные блоки в один.
   * Проходит массив слева направо: если текущий и следующий оба free — сливаем.
   */
  mergeFreeBlocks(): void {
    let i = 0
    while (i < this.blocks.length - 1) {
      const current = this.blocks[i]
      const next = this.blocks[i + 1]

      if (current.state === 'free' && next.state === 'free') {
        // Объединяем: расширяем текущий, удаляем следующий
        current.size += next.size
        this.blocks.splice(i + 1, 1)
        // Не двигаем i — проверяем дальше (каскадное объединение)
      } else {
        i++
      }
    }
  }

  getBlocks(): ReadonlyArray<MemoryBlock> {
    return this.blocks.map((b) => ({ ...b }))
  }

  /**
   * Вычисляет метрики текущего состояния памяти.
   * Фрагментация = 1 - (наибольший свободный блок / общий свободный размер).
   * Если свободный только один блок или памяти нет — фрагментация = 0.
   */
  getMetrics(): MemoryMetrics {
    const totalSize = this.blocks.reduce((sum, b) => sum + b.size, 0)
    const freeBlocks = this.blocks.filter((b) => b.state === 'free')
    const freeSize = freeBlocks.reduce((sum, b) => sum + b.size, 0)
    const usedSize = totalSize - freeSize

    let fragmentation = 0
    if (freeBlocks.length > 1) {
      const largestFree = Math.max(...freeBlocks.map((b) => b.size))
      fragmentation = 1 - largestFree / freeSize
    }

    return {
      totalSize,
      usedSize,
      freeSize,
      fragmentation,
      blockCount: this.blocks.length,
    }
  }
}
