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

/** Цвет вспышки при аллокации */
const FLASH_ALLOCATE = 'rgba(88, 166, 255, 0.6)'
/** Цвет вспышки при освобождении */
const FLASH_FREE = 'rgba(35, 134, 54, 0.6)'
/** Длительность вспышки (мс) */
const FLASH_DURATION_MS = 400

/** Высота одной полоски блока */
const BLOCK_HEIGHT = 48
/** Отступ от краёв canvas */
const PADDING = 12

/** Запись о вспышке (анимация при изменении блока) */
type FlashEntry = {
  blockStart: number
  blockSize: number
  type: 'allocate' | 'free'
  createdAt: number
}

type MemoryCanvasProps = {
  /** ID выбранного блока (для подсветки) */
  selectedBlockId?: string | null
  /** Колбэк при клике на блок */
  onBlockClick?: (block: MemoryBlock) => void
}

/**
 * Рисует экран приветствия с правилами игры.
 */
function drawRulesScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, w, h)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Заголовок
  ctx.fillStyle = '#7ee787'
  ctx.font = 'bold 18px system-ui'
  ctx.fillText('⚡ Memory Arena', w / 2, 28)

  // Подзаголовок
  ctx.fillStyle = '#aaa'
  ctx.font = '13px system-ui'
  ctx.fillText('Симулятор управления памятью', w / 2, 52)

  // Правила
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ccc'
  ctx.font = '12px system-ui'

  const rules = [
    '📋  Справа появляются запросы: ALLOC или FREE.',
    '🟢  ALLOC — нажмите «Выделить» или кликните по зелёному блоку.',
    '🔵  FREE — нажмите «Освободить» или кликните по нужному блоку.',
    '⏱️  Запросы приходят по таймеру — действуйте быстро!',
    '⚠️  Утечки памяти снижают стабильность.',
    '🏆  Продержитесь до конца раунда, чтобы пройти уровень.',
  ]

  const startY = 80
  const lineH = 22
  const leftX = Math.max(20, w / 2 - 200)

  for (let i = 0; i < rules.length; i++) {
    ctx.fillText(rules[i], leftX, startY + i * lineH)
  }

  // Призыв к действию
  ctx.textAlign = 'center'
  ctx.fillStyle = '#7ee787'
  ctx.font = 'bold 14px system-ui'
  ctx.fillText('Нажмите «Старт» чтобы начать ▶', w / 2, startY + rules.length * lineH + 24)
}

/**
 * MemoryCanvas — визуализация памяти через Canvas 2D.
 *
 * Каждый блок — горизонтальный прямоугольник, ширина пропорциональна size.
 * Free — зелёный, allocated — цвет по programId.
 * Клик по блоку вызывает onBlockClick.
 * При изменении блоков показывается вспышка-анимация.
 */
export function MemoryCanvas({
  selectedBlockId,
  onBlockClick,
}: MemoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const blocks = useGameStore((s) => s.blocks)
  const metrics = useGameStore((s) => s.metrics)
  const sessionState = useGameStore((s) => s.sessionState)

  /** Общий размер памяти (для масштабирования) */
  const totalSize = metrics?.totalSize ?? 0

  /** Список активных вспышек */
  const flashesRef = useRef<FlashEntry[]>([])
  /** Предыдущее состояние блоков (для отслеживания изменений) */
  const prevBlocksRef = useRef<ReadonlyArray<MemoryBlock>>([])
  /** ID анимационного кадра для flash-анимации */
  const flashRafRef = useRef<number | null>(null)

  /** Сравниваем блоки и добавляем вспышки при изменениях */
  useEffect(() => {
    const prev = prevBlocksRef.current
    const curr = blocks

    if (prev.length === 0 || curr.length === 0) {
      prevBlocksRef.current = curr
      return
    }

    const now = performance.now()

    // Ищем новые allocated-блоки (были free → стали allocated)
    for (const block of curr) {
      if (block.state === 'allocated') {
        const prevBlock = prev.find((b) => b.id === block.id)
        if (!prevBlock || prevBlock.state === 'free') {
          flashesRef.current.push({
            blockStart: block.start,
            blockSize: block.size,
            type: 'allocate',
            createdAt: now,
          })
        }
      }
    }

    // Ищем блоки, которые стали free (были allocated → стали free, или merged)
    for (const block of curr) {
      if (block.state === 'free') {
        const wasFreeExact = prev.some(
          (b) =>
            b.state === 'free' &&
            b.start === block.start &&
            b.size === block.size,
        )
        if (!wasFreeExact) {
          flashesRef.current.push({
            blockStart: block.start,
            blockSize: block.size,
            type: 'free',
            createdAt: now,
          })
        }
      }
    }

    prevBlocksRef.current = curr
  }, [blocks])

  /** Отрисовка canvas */
  const draw = useCallback(
    (now: number) => {
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

      // Экран правил (до старта)
      if (sessionState === 'idle' || totalSize === 0 || blocks.length === 0) {
        drawRulesScreen(ctx, width, height)
        return
      }

      // Очищаем
      ctx.fillStyle = BACKGROUND
      ctx.fillRect(0, 0, width, height)

      const usableWidth = width - PADDING * 2

      // Удаляем устаревшие вспышки
      flashesRef.current = flashesRef.current.filter(
        (f) => now - f.createdAt < FLASH_DURATION_MS,
      )

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
            (block.programId && PROGRAM_COLORS[block.programId]) ?? '#666'
        }
        ctx.fillRect(x, y, w, h)

        // Вспышка-анимация поверх блока
        for (const flash of flashesRef.current) {
          if (
            flash.blockStart === block.start &&
            flash.blockSize === block.size
          ) {
            const elapsed = now - flash.createdAt
            const alpha = 1 - elapsed / FLASH_DURATION_MS
            ctx.fillStyle =
              flash.type === 'allocate'
                ? FLASH_ALLOCATE.replace('0.6', String((0.6 * alpha).toFixed(2)))
                : FLASH_FREE.replace('0.6', String((0.6 * alpha).toFixed(2)))
            ctx.fillRect(x, y, w, h)
          }
        }

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
    },
    [blocks, totalSize, selectedBlockId, sessionState],
  )

  // Перерисовка при изменении данных
  useEffect(() => {
    draw(performance.now())
  }, [draw])

  // Анимационный цикл для flash-эффектов
  useEffect(() => {
    let active = true

    function loop() {
      if (!active) return
      if (flashesRef.current.length > 0) {
        draw(performance.now())
      }
      flashRafRef.current = requestAnimationFrame(loop)
    }

    flashRafRef.current = requestAnimationFrame(loop)

    return () => {
      active = false
      if (flashRafRef.current !== null) {
        cancelAnimationFrame(flashRafRef.current)
      }
    }
  }, [draw])

  // ResizeObserver для адаптивности
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const observer = new ResizeObserver(() => {
      draw(performance.now())
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
        height:
          sessionState === 'idle'
            ? '240px'
            : `${PADDING * 2 + BLOCK_HEIGHT + 40}px`,
        cursor: onBlockClick ? 'pointer' : 'default',
      }}
    />
  )
}
