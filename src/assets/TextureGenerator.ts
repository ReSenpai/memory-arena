import Phaser from 'phaser'

const CELL = 32

/**
 * Во сколько раз текстуры ячеек крупнее логического размера CELL.
 * Сетка масштабируется (cellScale до 1.5) и зумится на devicePixelRatio,
 * поэтому 32px текстура растягивалась и мылилась. Спрайты ячеек нужно
 * создавать со `setScale(1 / CELL_TEX_SCALE)`.
 *
 * Линий сетки в текстурах нет: тонкая рамка у края сильно уменьшенной
 * текстуры то попадает в пиксель, то нет (рябь). Сетку рисует GameScene
 * векторно поверх ячеек.
 */
const CELL_TEX_SCALE = 4
const TEX = CELL * CELL_TEX_SCALE
const S = CELL_TEX_SCALE

/** Цвет линий сетки */
const GRID_LINE_COLOR = 0x2a2d3a

const PROCESS_COLORS = [
  0x58a6ff, 0xf0883e, 0xa371f7, 0x3fb950, 0xd2a8ff, 0x79c0ff, 0xf778ba,
  0xffa657,
]

export function generateTextures(scene: Phaser.Scene): void {
  // cell-free — тёмная ячейка
  const gFree = scene.make.graphics({ x: 0, y: 0 }, false)
  gFree.fillStyle(0x1a1d27)
  gFree.fillRect(0, 0, TEX, TEX)
  gFree.generateTexture('cell-free', TEX, TEX)
  gFree.destroy()

  // cell-alloc-{i} — 8 цветов процессов
  for (let i = 0; i < PROCESS_COLORS.length; i++) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(PROCESS_COLORS[i])
    g.fillRect(S, S, TEX - 2 * S, TEX - 2 * S)
    g.generateTexture(`cell-alloc-${i}`, TEX, TEX)
    g.destroy()
  }

  // cell-garbage — коричневая с диагональю
  const gGarb = scene.make.graphics({ x: 0, y: 0 }, false)
  gGarb.fillStyle(0x6e4020)
  gGarb.fillRect(S, S, TEX - 2 * S, TEX - 2 * S)
  gGarb.lineStyle(2 * S, 0x8b5e3c)
  gGarb.beginPath()
  gGarb.moveTo(2 * S, TEX - 2 * S)
  gGarb.lineTo(TEX - 2 * S, 2 * S)
  gGarb.strokePath()
  gGarb.generateTexture('cell-garbage', TEX, TEX)
  gGarb.destroy()

  // cell-ghost-ok — зелёный полупрозрачный
  const gOk = scene.make.graphics({ x: 0, y: 0 }, false)
  gOk.fillStyle(0x7ee787, 0.35)
  gOk.fillRect(S, S, TEX - 2 * S, TEX - 2 * S)
  gOk.generateTexture('cell-ghost-ok', TEX, TEX)
  gOk.destroy()

  // cell-ghost-bad — красный полупрозрачный
  const gBad = scene.make.graphics({ x: 0, y: 0 }, false)
  gBad.fillStyle(0xf85149, 0.35)
  gBad.fillRect(S, S, TEX - 2 * S, TEX - 2 * S)
  gBad.generateTexture('cell-ghost-bad', TEX, TEX)
  gBad.destroy()

  // cell-highlight — ярко-зелёная рамка (для подсветки целевого блока FREE)
  const gHi = scene.make.graphics({ x: 0, y: 0 }, false)
  gHi.lineStyle(2 * S, 0x7ee787)
  gHi.strokeRect(S, S, TEX - 2 * S, TEX - 2 * S)
  gHi.generateTexture('cell-highlight', TEX, TEX)
  gHi.destroy()

  // particle-white — маленькая частица для эффектов
  const gPart = scene.make.graphics({ x: 0, y: 0 }, false)
  gPart.fillStyle(0xffffff)
  gPart.fillRect(0, 0, 4, 4)
  gPart.generateTexture('particle-white', 4, 4)
  gPart.destroy()
}

/** Индекс цвета процесса по хэшу blockId */
export function getProcessColorIndex(blockId: string): number {
  let hash = 0
  for (let i = 0; i < blockId.length; i++) {
    hash = (hash * 31 + blockId.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % PROCESS_COLORS.length
}

export { CELL, CELL_TEX_SCALE, GRID_LINE_COLOR, PROCESS_COLORS }
