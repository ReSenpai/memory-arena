import { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { rotateShape } from '../domain/Shapes'
import type { CellContent, Shape } from '../domain/types'

/** Цвета процессов (по хэшу имени) */
const PROCESS_COLORS = [
  '#58a6ff', '#f0883e', '#a371f7', '#3fb950',
  '#d2a8ff', '#79c0ff', '#f778ba', '#ffa657',
]

function processColor(blockId: string): string {
  let hash = 0
  for (let i = 0; i < blockId.length; i++) {
    hash = (hash * 31 + blockId.charCodeAt(i)) | 0
  }
  return PROCESS_COLORS[Math.abs(hash) % PROCESS_COLORS.length]
}

const GARBAGE_COLOR = '#6e4020'
const FREE_COLOR = '#1a1d27'
const GRID_LINE_COLOR = '#2a2d3a'
const HOVER_COLOR = 'rgba(126, 231, 135, 0.25)'
const GHOST_OK_COLOR = 'rgba(126, 231, 135, 0.35)'
const GHOST_BAD_COLOR = 'rgba(248, 81, 73, 0.35)'
const SELECTED_BORDER_COLOR = '#7ee787'

/** Анимация ячейки */
type CellAnimation = {
  cells: { row: number; col: number }[]
  kind: 'place' | 'free' | 'garbage'
  start: number
  duration: number
}

const ANIM_DURATION = 350

export function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null)
  const animationsRef = useRef<CellAnimation[]>([])
  const animFrameRef = useRef<number>(0)
  const prevBlockIdsRef = useRef<Set<string>>(new Set())

  const gridSnapshot = useGameStore((s) => s.gridSnapshot)
  const gridRows = useGameStore((s) => s.gridRows)
  const gridCols = useGameStore((s) => s.gridCols)
  const selectedRequestId = useGameStore((s) => s.selectedRequestId)
  const selectedRotation = useGameStore((s) => s.selectedRotation)
  const selectedGarbageId = useGameStore((s) => s.selectedGarbageId)
  const pendingRequests = useGameStore((s) => s.pendingRequests)
  const placeBlock = useGameStore((s) => s.placeBlock)
  const freeBlock = useGameStore((s) => s.freeBlock)
  const moveGarbage = useGameStore((s) => s.moveGarbage)
  const selectGarbage = useGameStore((s) => s.selectGarbage)
  const allocatedBlocks = useGameStore((s) => s.allocatedBlocks)
  const garbageBlocks = useGameStore((s) => s.garbageBlocks)

  // Get selected shape for ghost preview
  const getSelectedShape = useCallback((): Shape | null => {
    if (!selectedRequestId) return null
    const req = pendingRequests.find(
      (r) => r.type === 'allocate' && r.payload.id === selectedRequestId,
    )
    if (!req || req.type !== 'allocate') return null
    return rotateShape(req.payload.shape, selectedRotation)
  }, [selectedRequestId, pendingRequests, selectedRotation])

  const getCellSize = useCallback(() => {
    const container = containerRef.current
    if (!container || gridRows === 0 || gridCols === 0) return 0
    const { width, height } = container.getBoundingClientRect()
    const pad = 16
    return Math.floor(
      Math.min((width - pad * 2) / gridCols, (height - pad * 2) / gridRows),
    )
  }, [gridRows, gridCols])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !gridSnapshot) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cellSize = getCellSize()
    if (cellSize <= 0) return

    const w = cellSize * gridCols
    const h = cellSize * gridRows

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // Fill background
    ctx.fillStyle = FREE_COLOR
    ctx.fillRect(0, 0, w, h)

    // Draw cells
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cell: CellContent = gridSnapshot[r][c]
        const x = c * cellSize
        const y = r * cellSize

        if (cell.type === 'allocated') {
          ctx.fillStyle = processColor(cell.blockId)
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        } else if (cell.type === 'garbage') {
          ctx.fillStyle = GARBAGE_COLOR
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          // Garbage pattern
          ctx.strokeStyle = '#8b5e3c'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x + 2, y + cellSize - 2)
          ctx.lineTo(x + cellSize - 2, y + 2)
          ctx.stroke()

          // Highlight selected garbage
          if (cell.blockId === selectedGarbageId) {
            ctx.strokeStyle = SELECTED_BORDER_COLOR
            ctx.lineWidth = 2
            ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
          }
        }
      }
    }

    // Ghost preview for allocate
    const hover = hoverCellRef.current
    const shape = getSelectedShape()
    if (hover && shape) {
      // Check if placement is valid
      let canPlace = true
      for (const cell of shape) {
        const r = hover.row + cell.row
        const c = hover.col + cell.col
        if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) {
          canPlace = false
          break
        }
        if (gridSnapshot[r][c].type !== 'free') {
          canPlace = false
          break
        }
      }

      ctx.fillStyle = canPlace ? GHOST_OK_COLOR : GHOST_BAD_COLOR
      for (const cell of shape) {
        const r = hover.row + cell.row
        const c = hover.col + cell.col
        if (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
          ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2)
        }
      }
    } else if (hover && !selectedRequestId && !selectedGarbageId) {
      // Simple hover
      if (hover.row >= 0 && hover.row < gridRows && hover.col >= 0 && hover.col < gridCols) {
        ctx.fillStyle = HOVER_COLOR
        ctx.fillRect(
          hover.col * cellSize + 1,
          hover.row * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
        )
      }
    }

    // Animation overlays
    const now = performance.now()
    animationsRef.current = animationsRef.current.filter((a) => now - a.start < a.duration)
    for (const anim of animationsRef.current) {
      const t = (now - anim.start) / anim.duration
      for (const { row: r, col: c } of anim.cells) {
        if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) continue
        const x = c * cellSize
        const y = r * cellSize
        if (anim.kind === 'place') {
          // White flash fading out
          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 * (1 - t)})`
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        } else if (anim.kind === 'free') {
          // Green glow fading out
          ctx.fillStyle = `rgba(126, 231, 135, ${0.4 * (1 - t)})`
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        } else if (anim.kind === 'garbage') {
          // Red-orange pulse
          ctx.fillStyle = `rgba(248, 81, 73, ${0.5 * (1 - t)})`
          ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2)
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = GRID_LINE_COLOR
    ctx.lineWidth = 1
    for (let r = 0; r <= gridRows; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * cellSize)
      ctx.lineTo(w, r * cellSize)
      ctx.stroke()
    }
    for (let c = 0; c <= gridCols; c++) {
      ctx.beginPath()
      ctx.moveTo(c * cellSize, 0)
      ctx.lineTo(c * cellSize, h)
      ctx.stroke()
    }
  }, [gridSnapshot, gridRows, gridCols, getCellSize, selectedGarbageId, getSelectedShape, selectedRequestId])

  useEffect(() => {
    draw()
  }, [draw])

  // Detect block changes and trigger animations
  useEffect(() => {
    if (!gridSnapshot) return
    const currentIds = new Set(allocatedBlocks.map((b) => b.id))
    const prevIds = prevBlockIdsRef.current

    // New blocks → place animation
    for (const block of allocatedBlocks) {
      if (!prevIds.has(block.id)) {
        animationsRef.current.push({
          cells: block.cells,
          kind: 'place',
          start: performance.now(),
          duration: ANIM_DURATION,
        })
      }
    }

    // Removed blocks → free animation (find cells from grid snapshot that just became free)
    for (const id of prevIds) {
      if (!currentIds.has(id)) {
        // Block was freed — check if it became garbage
        const isGarbage = garbageBlocks.some((g) => g.id === id)
        if (isGarbage) {
          const gb = garbageBlocks.find((g) => g.id === id)
          if (gb) {
            animationsRef.current.push({
              cells: gb.cells,
              kind: 'garbage',
              start: performance.now(),
              duration: ANIM_DURATION,
            })
          }
        }
        // We can't easily get old cells, so skip free animation for now
      }
    }

    prevBlockIdsRef.current = currentIds
  }, [allocatedBlocks, garbageBlocks, gridSnapshot])

  // Animation frame loop — redraw while animations running
  useEffect(() => {
    let active = true
    const loop = () => {
      if (!active) return
      if (animationsRef.current.length > 0) {
        draw()
        animFrameRef.current = requestAnimationFrame(loop)
      }
    }
    animFrameRef.current = requestAnimationFrame(loop)
    return () => {
      active = false
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [draw, allocatedBlocks, garbageBlocks])

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => draw())
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cellSize = getCellSize()
      if (cellSize <= 0) return
      const col = Math.floor((e.clientX - rect.left) / cellSize)
      const row = Math.floor((e.clientY - rect.top) / cellSize)
      hoverCellRef.current = { row, col }
      draw()
    },
    [getCellSize, draw],
  )

  const handleMouseLeave = useCallback(() => {
    hoverCellRef.current = null
    draw()
  }, [draw])

  const triggerFreeAnim = useCallback((blockId: string) => {
    const block = allocatedBlocks.find((b) => b.id === blockId)
    if (block) {
      animationsRef.current.push({
        cells: block.cells,
        kind: 'free',
        start: performance.now(),
        duration: ANIM_DURATION,
      })
    }
  }, [allocatedBlocks])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas || !gridSnapshot) return
      const rect = canvas.getBoundingClientRect()
      const cellSize = getCellSize()
      if (cellSize <= 0) return
      const col = Math.floor((e.clientX - rect.left) / cellSize)
      const row = Math.floor((e.clientY - rect.top) / cellSize)

      if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return

      const cell = gridSnapshot[row][col]

      // 1. If allocate request selected → place block
      if (selectedRequestId) {
        const req = pendingRequests.find(
          (r) => r.type === 'allocate' && r.payload.id === selectedRequestId,
        )
        if (req) {
          placeBlock(selectedRequestId, row, col, selectedRotation)
          return
        }
        // If it's a free request selected → try to free the clicked block
        const freeReq = pendingRequests.find(
          (r) => r.type === 'free' && r.payload.id === selectedRequestId,
        )
        if (freeReq && cell.type === 'allocated') {
          triggerFreeAnim(cell.blockId)
          freeBlock(selectedRequestId, cell.blockId)
          return
        }
      }

      // 2. If garbage selected → move it here
      if (selectedGarbageId && cell.type === 'free') {
        moveGarbage(selectedGarbageId, row, col)
        selectGarbage(null)
        return
      }

      // 3. Click on garbage → select it
      if (cell.type === 'garbage') {
        selectGarbage(cell.blockId === selectedGarbageId ? null : cell.blockId)
        return
      }

      // 4. Click on allocated block → highlight matching free request
      if (cell.type === 'allocated') {
        const block = allocatedBlocks.find((b) => b.id === cell.blockId)
        if (block) {
          const matchingFree = pendingRequests.find(
            (r) => r.type === 'free' && r.payload.pointer === block.pointer,
          )
          if (matchingFree) {
            triggerFreeAnim(cell.blockId)
            freeBlock(matchingFree.payload.id, cell.blockId)
          }
        }
      }
    },
    [
      gridSnapshot, gridRows, gridCols, getCellSize, selectedRequestId,
      selectedRotation, selectedGarbageId, pendingRequests, placeBlock,
      freeBlock, moveGarbage, selectGarbage, allocatedBlocks,
      triggerFreeAnim,
    ],
  )

  if (!gridSnapshot) return null

  return (
    <div ref={containerRef} className="grid-canvas-container">
      <canvas
        ref={canvasRef}
        className="grid-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
    </div>
  )
}
