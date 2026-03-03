import type { MemoryBlock } from './types'

/**
 * Находит блоки, которые аллоцированы дольше порогового значения (потенциальные утечки).
 * @param blocks — текущий список блоков
 * @param currentTick — текущий тик игры
 * @param threshold — сколько тиков блок может быть аллоцирован без освобождения
 * @returns массив блоков-утечек
 */
export function detectLeaks(
  blocks: ReadonlyArray<MemoryBlock>,
  currentTick: number,
  threshold: number,
): MemoryBlock[] {
  return blocks.filter(
    (b) =>
      b.state === 'allocated' &&
      b.allocatedAtTick !== undefined &&
      currentTick - b.allocatedAtTick > threshold,
  )
}
