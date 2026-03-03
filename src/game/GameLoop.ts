/**
 * GameLoop — обёртка над requestAnimationFrame.
 *
 * Конвертирует реальное время (мс) в дискретные тики с заданным интервалом.
 * Поддерживает pause/resume без накопления времени за паузу.
 */
export class GameLoop {
  private tickIntervalMs: number
  private onTick: () => void

  private running = false
  private paused = false
  private rafId: number | null = null
  private lastTimestamp: number | null = null
  private accumulatedMs = 0

  /**
   * @param tickIntervalMs — интервал одного тика в миллисекундах
   * @param onTick — колбэк, вызываемый на каждый тик
   */
  constructor(tickIntervalMs: number, onTick: () => void) {
    this.tickIntervalMs = tickIntervalMs
    this.onTick = onTick
  }

  /** Запускает game loop */
  start(): void {
    if (this.running) return

    this.running = true
    this.paused = false
    this.lastTimestamp = null
    this.accumulatedMs = 0
    this.scheduleFrame()
  }

  /** Полностью останавливает loop */
  stop(): void {
    this.running = false
    this.paused = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /** Ставит на паузу (RAF продолжает работать, но тики не считаются) */
  pause(): void {
    if (this.running && !this.paused) {
      this.paused = true
    }
  }

  /** Снимает с паузы, сбрасывая lastTimestamp чтобы не накапливать время */
  resume(): void {
    if (this.running && this.paused) {
      this.paused = false
      this.lastTimestamp = null
      this.accumulatedMs = 0
    }
  }

  isRunning(): boolean {
    return this.running
  }

  isPaused(): boolean {
    return this.paused
  }

  /** Основной цикл — вызывается из requestAnimationFrame */
  private frame = (timestamp: number): void => {
    if (!this.running) return

    if (!this.paused) {
      if (this.lastTimestamp !== null) {
        const delta = timestamp - this.lastTimestamp
        this.accumulatedMs += delta

        while (this.accumulatedMs >= this.tickIntervalMs) {
          this.onTick()
          this.accumulatedMs -= this.tickIntervalMs
        }
      }
      this.lastTimestamp = timestamp
    }

    this.scheduleFrame()
  }

  private scheduleFrame(): void {
    this.rafId = requestAnimationFrame(this.frame)
  }
}
