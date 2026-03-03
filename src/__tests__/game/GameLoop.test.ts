import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameLoop } from '../../game/GameLoop'

describe('GameLoop', () => {
  let rafCallbacks: ((timestamp: number) => void)[]
  let rafId: number

  beforeEach(() => {
    rafCallbacks = []
    rafId = 0

    // Мокаем requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb: (timestamp: number) => void) => {
      rafCallbacks.push(cb)
      return ++rafId
    })

    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      // Убираем колбэк (упрощённо — просто очищаем)
      void id
      rafCallbacks = []
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Симулирует один кадр RAF с заданным timestamp */
  function simulateFrame(timestamp: number) {
    const callbacks = [...rafCallbacks]
    rafCallbacks = []
    callbacks.forEach((cb) => cb(timestamp))
  }

  describe('создание', () => {
    it('создаётся с интервалом тика в мс', () => {
      const loop = new GameLoop(500, vi.fn())
      expect(loop).toBeDefined()
    })

    it('начальное состояние — остановлен', () => {
      const loop = new GameLoop(500, vi.fn())
      expect(loop.isRunning()).toBe(false)
    })
  })

  describe('start / stop', () => {
    it('start запускает loop', () => {
      const loop = new GameLoop(500, vi.fn())
      loop.start()
      expect(loop.isRunning()).toBe(true)
    })

    it('stop останавливает loop', () => {
      const loop = new GameLoop(500, vi.fn())
      loop.start()
      loop.stop()
      expect(loop.isRunning()).toBe(false)
    })

    it('повторный start не сбрасывает состояние', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()
      loop.start() // повторный вызов
      expect(loop.isRunning()).toBe(true)
    })
  })

  describe('тики', () => {
    it('вызывает onTick после прошедшего интервала', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      // Первый кадр — инициализация
      simulateFrame(0)
      expect(onTick).not.toHaveBeenCalled()

      // Второй кадр — прошло 500мс, должен быть 1 тик
      simulateFrame(500)
      expect(onTick).toHaveBeenCalledTimes(1)
    })

    it('не вызывает onTick, если прошло меньше интервала', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      simulateFrame(0)
      simulateFrame(200) // только 200мс прошло
      expect(onTick).not.toHaveBeenCalled()
    })

    it('накапливает время и вызывает несколько тиков за один кадр', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      simulateFrame(0)
      simulateFrame(1500) // прошло 1500мс = 3 тика по 500мс
      expect(onTick).toHaveBeenCalledTimes(3)
    })

    it('не вызывает onTick после stop', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      simulateFrame(0)
      loop.stop()
      simulateFrame(500)
      expect(onTick).not.toHaveBeenCalled()
    })
  })

  describe('pause / resume', () => {
    it('pause приостанавливает тики', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      simulateFrame(0)
      loop.pause()
      simulateFrame(500)
      expect(onTick).not.toHaveBeenCalled()
    })

    it('resume возобновляет тики без накопления времени за паузу', () => {
      const onTick = vi.fn()
      const loop = new GameLoop(500, onTick)
      loop.start()

      simulateFrame(0)
      loop.pause()
      simulateFrame(2000) // 2 секунды «стоим» на паузе
      loop.resume()
      simulateFrame(2500) // первый кадр после resume — инициализация
      expect(onTick).not.toHaveBeenCalled() // за паузу время не накопилось

      simulateFrame(3000) // 500мс после re-anchor = 1 тик
      expect(onTick).toHaveBeenCalledTimes(1)
    })

    it('isPaused возвращает корректное состояние', () => {
      const loop = new GameLoop(500, vi.fn())
      loop.start()
      expect(loop.isPaused()).toBe(false)

      loop.pause()
      expect(loop.isPaused()).toBe(true)

      loop.resume()
      expect(loop.isPaused()).toBe(false)
    })
  })
})
