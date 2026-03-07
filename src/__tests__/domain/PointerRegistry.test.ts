import { describe, it, expect } from 'vitest'
import { PointerRegistry } from '../../domain/PointerRegistry'

describe('PointerRegistry — реестр указателей', () => {
  describe('pointerForCell', () => {
    it('генерирует hex-строку вида 0xXXXX из позиции ячейки', () => {
      const ptr = PointerRegistry.pointerForCell(0, 0, 8)
      expect(ptr).toMatch(/^0x[0-9A-F]{4}$/)
      expect(ptr).toBe('0x0000')
    })

    it('генерирует уникальные адреса для разных ячеек', () => {
      const pointers = new Set<string>()
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          pointers.add(PointerRegistry.pointerForCell(r, c, 8))
        }
      }
      expect(pointers.size).toBe(64)
    })

    it('одна и та же ячейка всегда даёт один и тот же адрес', () => {
      const p1 = PointerRegistry.pointerForCell(3, 5, 8)
      const p2 = PointerRegistry.pointerForCell(3, 5, 8)
      expect(p1).toBe(p2)
    })
  })

  describe('register / resolve', () => {
    it('регистрирует pointer → blockId', () => {
      const reg = new PointerRegistry()
      reg.register('0xAAAA', 'b1')
      expect(reg.resolve('0xAAAA')).toBe('b1')
    })

    it('resolve возвращает null для незарегистрированного', () => {
      const reg = new PointerRegistry()
      expect(reg.resolve('0x0000')).toBeNull()
    })
  })

  describe('unregister', () => {
    it('удаляет связь pointer → blockId', () => {
      const reg = new PointerRegistry()
      reg.register('0xBBBB', 'b2')
      reg.unregister('0xBBBB')
      expect(reg.resolve('0xBBBB')).toBeNull()
    })

    it('ничего не делает для несуществующего pointer', () => {
      const reg = new PointerRegistry()
      expect(() => reg.unregister('0xFFFF')).not.toThrow()
    })
  })

  describe('losePointer', () => {
    it('помечает pointer как lost', () => {
      const reg = new PointerRegistry()
      reg.register('0xCCCC', 'b3')
      reg.losePointer('0xCCCC')
      expect(reg.isLost('0xCCCC')).toBe(true)
    })

    it('lost pointer не resolve-ится', () => {
      const reg = new PointerRegistry()
      reg.register('0xDDDD', 'b4')
      reg.losePointer('0xDDDD')
      expect(reg.resolve('0xDDDD')).toBeNull()
    })

    it('можно получить blockId от lost pointer через resolveIncludingLost', () => {
      const reg = new PointerRegistry()
      reg.register('0xEEEE', 'b5')
      reg.losePointer('0xEEEE')
      expect(reg.resolveIncludingLost('0xEEEE')).toBe('b5')
    })
  })

  describe('getAll', () => {
    it('возвращает все зарегистрированные пары', () => {
      const reg = new PointerRegistry()
      reg.register('0x0001', 'b1')
      reg.register('0x0002', 'b2')
      const all = reg.getAll()
      expect(all).toHaveLength(2)
      expect(all).toContainEqual({ pointer: '0x0001', blockId: 'b1' })
      expect(all).toContainEqual({ pointer: '0x0002', blockId: 'b2' })
    })

    it('не включает lost pointer в getAll', () => {
      const reg = new PointerRegistry()
      reg.register('0x0001', 'b1')
      reg.losePointer('0x0001')
      expect(reg.getAll()).toHaveLength(0)
    })
  })
})
