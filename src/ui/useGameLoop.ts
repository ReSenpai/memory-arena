import { useEffect, useRef } from 'react'
import { GameLoop } from '../game/GameLoop'
import { useGameStore } from '../store/gameStore'

const TICK_INTERVAL_MS = 500

/**
 * Хук: запускает/останавливает GameLoop в зависимости от sessionState.
 * Вызывает doTick() на каждый тик.
 */
export function useGameLoop() {
  const sessionState = useGameStore((s) => s.sessionState)
  const doTick = useGameStore((s) => s.doTick)
  const loopRef = useRef<GameLoop | null>(null)

  useEffect(() => {
    if (sessionState === 'playing') {
      if (!loopRef.current) {
        loopRef.current = new GameLoop(TICK_INTERVAL_MS, doTick)
      }
      loopRef.current.start()
    } else if (sessionState === 'paused') {
      loopRef.current?.pause()
    } else {
      loopRef.current?.stop()
      loopRef.current = null
    }

    return () => {
      loopRef.current?.stop()
      loopRef.current = null
    }
  }, [sessionState, doTick])
}
