/**
 * Система подсчёта очков и стабильности.
 *
 * Начисление:
 * - Успешный allocate: +10 за каждую ячейку
 * - Успешный free: +5
 *
 * Штрафы:
 * - Утечка: −20 очков, −0.1 stability
 * - Double free: −50 очков, stability = 0
 */
export class Scorer {
  private score = 0
  private stability = 1

  /** Текущий счёт */
  getScore(): number {
    return this.score
  }

  /** Текущая стабильность (0 — критическая, 1 — идеальная) */
  getStability(): number {
    return this.stability
  }

  /** Успешная аллокация: +10 за каждую ячейку */
  onSuccessfulAllocate(size: number): void {
    this.score += size * 10
  }

  /** Успешное освобождение: +5 */
  onSuccessfulFree(): void {
    this.score += 5
  }

  /** Обнаружена утечка: −20 очков, −0.1 stability */
  onLeakDetected(): void {
    this.score = Math.max(0, this.score - 20)
    this.stability = Math.max(0, this.stability - 0.1)
  }

  /** Double free: −50 очков, stability обнуляется */
  onDoubleFree(): void {
    this.score = Math.max(0, this.score - 50)
    this.stability = 0
  }

  /** Сводка текущих результатов */
  getSummary(): { score: number; stability: number } {
    return {
      score: this.score,
      stability: this.stability,
    }
  }
}
