import { useEffect, useRef } from 'react'
import { GameLoop } from '../game/GameLoop'
import { useGameStore } from '../store/gameStore'

/** Интервал одного тика в миллисекундах */
const TICK_INTERVAL_MS = 500

/**
 * Хук для подключения GameLoop к Zustand store.
 *
 * Автоматически запускает / останавливает / паузит loop
 * в зависимости от sessionState.
 */
export function useGameLoop(): void {
  const sessionState = useGameStore((s) => s.sessionState)
  const doTick = useGameStore((s) => s.doTick)
  const loopRef = useRef<GameLoop | null>(null)

  useEffect(() => {
    if (sessionState === 'playing') {
      if (!loopRef.current) {
        loopRef.current = new GameLoop(TICK_INTERVAL_MS, doTick)
        loopRef.current.start()
      } else if (loopRef.current.isPaused()) {
        loopRef.current.resume()
      }
    } else if (sessionState === 'paused') {
      loopRef.current?.pause()
    } else {
      // idle или finished — останавливаем полностью
      loopRef.current?.stop()
      loopRef.current = null
    }
  }, [sessionState, doTick])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      loopRef.current?.stop()
      loopRef.current = null
    }
  }, [])
}
