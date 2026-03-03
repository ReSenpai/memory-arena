/**
 * Простой линейный конгруэнтный генератор (LCG).
 * Детерминированный — одинаковый seed всегда даёт одинаковую последовательность.
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed
  }

  /** Возвращает число в диапазоне [0, 1) */
  next(): number {
    // Параметры LCG из Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) & 0x7fffffff
    return this.state / 0x7fffffff
  }

  /** Возвращает целое число в диапазоне [min, max] (включительно) */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
}
