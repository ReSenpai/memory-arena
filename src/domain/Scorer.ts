/** Scorer v2 — подсчёт очков и стабильности */
export class Scorer {
  private score = 0
  private stability = 1

  getScore(): number {
    return this.score
  }

  getStability(): number {
    return this.stability
  }

  /** +size × 10 за размещение блока */
  onAllocate(size: number): void {
    this.score += size * 10
  }

  /** +10 за корректное освобождение */
  onFree(): void {
    this.score += 10
  }

  /** +5 за перемещение мусорного блока (дефрагментация) */
  onDefragMove(): void {
    this.score += 5
  }

  /** Бонус за быстрое действие (≤ 3 тика с момента запроса) */
  onQuickAction(ticksSinceRequest: number): void {
    if (ticksSinceRequest <= 3) {
      this.score += Math.max(0, (4 - ticksSinceRequest) * 5)
    }
  }

  /** −20 очков и −0.1 стабильности за пропущенное освобождение */
  onMissedFree(): void {
    this.score = Math.max(0, this.score - 20)
    this.stability = Math.max(0, this.stability - 0.1)
  }

  /** −5 очков за неправильное освобождение */
  onWrongFree(): void {
    this.score = Math.max(0, this.score - 5)
  }

  /** Штраф пропорциональный фрагментации (0–1) */
  onFragmentationPenalty(fragmentation: number): void {
    if (fragmentation > 0) {
      this.score = Math.max(0, this.score - Math.round(fragmentation * 10))
    }
  }

  /** −0.05 стабильности при переполнении очереди */
  onQueueOverflow(): void {
    this.stability = Math.max(0, this.stability - 0.05)
  }

  getSummary(): { score: number; stability: number } {
    return { score: this.score, stability: this.stability }
  }
}
