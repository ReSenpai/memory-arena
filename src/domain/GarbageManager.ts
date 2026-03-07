import type { AllocatedBlock, Cell, FreeRequest, GarbageBlock } from './types'

/** Управление garbage (утёкшими) блоками */
export class GarbageManager {
  private garbageBlocks = new Map<string, GarbageBlock>()

  /** Преобразует allocated блок в garbage (pointer потерян / free просрочен) */
  convertToGarbage(block: AllocatedBlock): GarbageBlock {
    const garbage: GarbageBlock = {
      id: block.id,
      shape: block.shape,
      cells: block.cells,
    }
    this.garbageBlocks.set(garbage.id, garbage)
    return garbage
  }

  /** Удалить garbage блок (после перемещения / очистки) */
  removeGarbage(id: string): void {
    this.garbageBlocks.delete(id)
  }

  /** Обновить позицию garbage блока */
  updateGarbageCells(id: string, newCells: Cell[]): void {
    const g = this.garbageBlocks.get(id)
    if (g) {
      g.cells = newCells
    }
  }

  /** Возвращает free запросы, чей deadline истёк */
  checkExpiredFrees(
    freeRequests: FreeRequest[],
    currentTick: number,
  ): FreeRequest[] {
    return freeRequests.filter((r) => r.deadline <= currentTick)
  }

  /** Копия списка всех garbage блоков */
  getGarbageBlocks(): GarbageBlock[] {
    return [...this.garbageBlocks.values()]
  }
}
