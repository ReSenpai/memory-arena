import type { AllocatorStrategy } from './Allocator'
import { firstFit } from './Allocator'
import type { AllocationResult, FreeResult, MemoryBlock } from './types'

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

  allocate(size: number, programId: string): AllocationResult {
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

  getBlocks(): ReadonlyArray<MemoryBlock> {
    return this.blocks
  }
}
