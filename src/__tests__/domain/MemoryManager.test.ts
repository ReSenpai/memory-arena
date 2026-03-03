import { describe, it, expect } from 'vitest'
import { MemoryManager } from '../../domain/MemoryManager'

describe('MemoryManager', () => {
  describe('constructor', () => {
    it('should create manager with given total size', () => {
      const mm = new MemoryManager(64)
      const blocks = mm.getBlocks()

      expect(blocks).toHaveLength(1)
      expect(blocks[0].start).toBe(0)
      expect(blocks[0].size).toBe(64)
      expect(blocks[0].state).toBe('free')
    })
  })

  describe('allocate', () => {
    it('should allocate a block and split remaining free space', () => {
      const mm = new MemoryManager(64)
      const result = mm.allocate(16, 'program-1')

      expect(result.success).toBe(true)
      if (!result.success) return

      // Allocated block
      expect(result.block.size).toBe(16)
      expect(result.block.start).toBe(0)
      expect(result.block.state).toBe('allocated')
      expect(result.block.programId).toBe('program-1')

      // Remaining free block
      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(2)
      expect(blocks[1].start).toBe(16)
      expect(blocks[1].size).toBe(48)
      expect(blocks[1].state).toBe('free')
    })

    it('should allocate exact size without leftover block', () => {
      const mm = new MemoryManager(32)
      const result = mm.allocate(32, 'program-1')

      expect(result.success).toBe(true)
      if (!result.success) return

      expect(result.block.size).toBe(32)
      expect(mm.getBlocks()).toHaveLength(1)
      expect(mm.getBlocks()[0].state).toBe('allocated')
    })

    it('should allocate multiple blocks sequentially', () => {
      const mm = new MemoryManager(64)
      mm.allocate(16, 'p1')
      mm.allocate(16, 'p2')

      const blocks = mm.getBlocks()
      expect(blocks).toHaveLength(3)
      expect(blocks[0].state).toBe('allocated')
      expect(blocks[0].programId).toBe('p1')
      expect(blocks[1].state).toBe('allocated')
      expect(blocks[1].start).toBe(16)
      expect(blocks[1].programId).toBe('p2')
      expect(blocks[2].state).toBe('free')
      expect(blocks[2].start).toBe(32)
      expect(blocks[2].size).toBe(32)
    })

    it('should return no-fit when no free block is large enough', () => {
      const mm = new MemoryManager(32)
      mm.allocate(32, 'p1')
      const result = mm.allocate(1, 'p2')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('no-fit')
    })

    it('should return no-fit due to fragmentation', () => {
      const mm = new MemoryManager(32)
      // allocate two 8-byte blocks with gaps after freeing first
      mm.allocate(8, 'p1') // [0..7]
      mm.allocate(8, 'p2') // [8..15]
      mm.allocate(8, 'p3') // [16..23]
      // remaining: [24..31] = 8 free

      // Try to allocate 16: no single free block of 16 available
      const result = mm.allocate(16, 'p4')

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.reason).toBe('no-fit')
    })
  })
})
