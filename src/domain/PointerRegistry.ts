import type { BlockId, Pointer } from './types'

/**
 * Реестр указателей — связывает hex-pointer'ы с blockId.
 * Имитирует реальные pointer'ы в heap-памяти.
 */
export class PointerRegistry {
  /** pointer → blockId (активные) */
  private active: Map<Pointer, BlockId> = new Map()
  /** pointer → blockId (потерянные — pointer lost) */
  private lost: Map<Pointer, BlockId> = new Map()
  /** Счётчик для генерации уникальных pointer'ов */
  private counter = 0

  /** Генерирует уникальный hex pointer вида 0xXXXX */
  generatePointer(): Pointer {
    this.counter++
    const hex = this.counter.toString(16).toUpperCase().padStart(4, '0')
    return `0x${hex}`
  }

  /** Зарегистрировать связь pointer → blockId */
  register(pointer: Pointer, blockId: BlockId): void {
    this.active.set(pointer, blockId)
  }

  /** Получить blockId по pointer. Null если не найден или lost. */
  resolve(pointer: Pointer): BlockId | null {
    return this.active.get(pointer) ?? null
  }

  /** Удалить связь (при успешном free) */
  unregister(pointer: Pointer): void {
    this.active.delete(pointer)
    this.lost.delete(pointer)
  }

  /** Пометить pointer как потерянный (block → garbage) */
  losePointer(pointer: Pointer): void {
    const blockId = this.active.get(pointer)
    if (blockId !== undefined) {
      this.lost.set(pointer, blockId)
      this.active.delete(pointer)
    }
  }

  /** Проверить, потерян ли pointer */
  isLost(pointer: Pointer): boolean {
    return this.lost.has(pointer)
  }

  /** Resolve включая lost pointer'ы (для конвертации в garbage) */
  resolveIncludingLost(pointer: Pointer): BlockId | null {
    return this.active.get(pointer) ?? this.lost.get(pointer) ?? null
  }

  /** Все активные (не lost) пары */
  getAll(): { pointer: Pointer; blockId: BlockId }[] {
    return [...this.active.entries()].map(([pointer, blockId]) => ({
      pointer,
      blockId,
    }))
  }
}
