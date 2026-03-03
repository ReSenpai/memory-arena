import { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

/** Длительность показа ошибки (мс) */
const ERROR_DISPLAY_MS = 3000

/**
 * Уведомление об ошибках — показывается поверх игры.
 * Автоматически исчезает через 3 секунды.
 */
export function ErrorNotification() {
  const lastError = useGameStore((s) => s.lastError)
  const clearError = useGameStore((s) => s.clearError)

  useEffect(() => {
    if (!lastError) return

    const timer = setTimeout(() => {
      clearError()
    }, ERROR_DISPLAY_MS)

    return () => clearTimeout(timer)
  }, [lastError, clearError])

  if (!lastError) return null

  return (
    <div className="error-notification" role="alert">
      <span className="error-icon">⚠</span>
      <span className="error-message">{lastError}</span>
      <button className="error-close" onClick={clearError}>
        ×
      </button>
    </div>
  )
}
