import type { AllocatorStrategy } from './Allocator'
import { firstFit } from './Allocator'
import type { AllocationResult, MemoryBlock } from './types'

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

    // Create allocated block
    const allocatedBlock: MemoryBlock = {
      id: `block-${this.nextBlockId++}`,
      start: freeBlock.start,
      size,
      state: 'allocated',
      programId,
    }

    if (freeBlock.size === size) {
      // Exact fit — replace the free block
      this.blocks.splice(index, 1, allocatedBlock)
    } else {
      // Split — allocated block + remaining free block
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

  getBlocks(): ReadonlyArray<MemoryBlock> {
    return this.blocks
  }
}
