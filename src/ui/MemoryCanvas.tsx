import { useRef, useEffect, useCallback } from 'react'
import type { MemoryBlock } from '../domain/types'
import { useGameStore } from '../store/gameStore'

/** Цвета для программ (по programId) */
const PROGRAM_COLORS: Record<string, string> = {
  A: '#58a6ff',
  B: '#f0883e',
  C: '#bc8cff',
  D: '#f778ba',
}

const FREE_COLOR = '#238636'
const FREE_BORDER = '#2ea043'
const SELECTED_BORDER = '#f0f000'
const BLOCK_BORDER = '#2a2d3a'
const TEXT_COLOR = '#e0e0e0'
const BACKGROUND = '#0f1117'

/** Высота одной полоски блока */
const BLOCK_HEIGHT = 48
/** Отступ от краёв canvas */
const PADDING = 12

type MemoryCanvasProps = {
  /** ID выбранного блока (для подсветки) */
  selectedBlockId?: string | null
  /** Колбэк при клике на блок */
  onBlockClick?: (block: MemoryBlock) => void
}

/**
 * MemoryCanvas — визуализация памяти через Canvas 2D.
 *
 * Каждый блок — горизонтальный прямоугольник, ширина пропорциональна size.
 * Free — зелёный, allocated — цвет по programId.
 * Клик по блоку вызывает onBlockClick.
 */
export function MemoryCanvas({
  selectedBlockId,
  onBlockClick,
}: MemoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blocks = useGameStore((s) => s.blocks)
  const metrics = useGameStore((s) => s.metrics)

  /** Общий размер памяти (для масштабирования) */
  const totalSize = metrics?.totalSize ?? 0

  /** Отрисовка canvas */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Подгоняем размер canvas под контейнер
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const height = rect.height

    // Очищаем
    ctx.fillStyle = BACKGROUND
    ctx.fillRect(0, 0, width, height)

    if (totalSize === 0 || blocks.length === 0) {
      ctx.fillStyle = '#555'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(
        'Нажмите «Старт» чтобы начать',
        width / 2,
        height / 2,
      )
      return
    }

    const usableWidth = width - PADDING * 2

    // Рендерим каждый блок
    for (const block of blocks) {
      const x = PADDING + (block.start / totalSize) * usableWidth
      const w = (block.size / totalSize) * usableWidth
      const y = PADDING
      const h = BLOCK_HEIGHT

      // Цвет заливки
      if (block.state === 'free') {
        ctx.fillStyle = FREE_COLOR
      } else {
        ctx.fillStyle =
          (block.programId && PROGRAM_COLORS[block.programId]) ??
          '#666'
      }
      ctx.fillRect(x, y, w, h)

      // Рамка
      ctx.strokeStyle =
        block.id === selectedBlockId ? SELECTED_BORDER : BLOCK_BORDER
      ctx.lineWidth = block.id === selectedBlockId ? 2 : 1
      ctx.strokeRect(x, y, w, h)

      // Зелёная линия сверху для free
      if (block.state === 'free') {
        ctx.strokeStyle = FREE_BORDER
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + w, y)
        ctx.stroke()
      }

      // Текст внутри блока (если достаточно широко)
      if (w > 30) {
        ctx.fillStyle = TEXT_COLOR
        ctx.font = '11px system-ui'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const label =
          block.state === 'free'
            ? `${block.size}`
            : `${block.programId ?? '?'}:${block.size}`
        ctx.fillText(label, x + w / 2, y + h / 2)
      }
    }

    // Легенда внизу
    const legendY = PADDING + BLOCK_HEIGHT + 16
    ctx.font = '11px system-ui'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    let legendX = PADDING
    // Free
    ctx.fillStyle = FREE_COLOR
    ctx.fillRect(legendX, legendY, 12, 12)
    ctx.fillStyle = '#999'
    ctx.fillText('Free', legendX + 16, legendY + 1)
    legendX += 60

    // programId colors
    for (const [id, color] of Object.entries(PROGRAM_COLORS)) {
      ctx.fillStyle = color
      ctx.fillRect(legendX, legendY, 12, 12)
      ctx.fillStyle = '#999'
      ctx.fillText(id, legendX + 16, legendY + 1)
      legendX += 40
    }
  }, [blocks, totalSize, selectedBlockId])

  // Перерисовка при изменении данных
  useEffect(() => {
    draw()
  }, [draw])

  // ResizeObserver для адаптивности
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      draw()
    })
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [draw])

  /** Обработка клика — определяем, по какому блоку кликнули */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onBlockClick || totalSize === 0) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const usableWidth = rect.width - PADDING * 2

      for (const block of blocks) {
        const x = PADDING + (block.start / totalSize) * usableWidth
        const w = (block.size / totalSize) * usableWidth

        if (clickX >= x && clickX <= x + w) {
          onBlockClick(block)
          return
        }
      }
    },
    [blocks, totalSize, onBlockClick],
  )

  return (
    <canvas
      ref={canvasRef}
      className="memory-canvas"
      onClick={handleClick}
      style={{
        width: '100%',
        height: `${PADDING * 2 + BLOCK_HEIGHT + 40}px`,
        cursor: onBlockClick ? 'pointer' : 'default',
      }}
    />
  )
}
