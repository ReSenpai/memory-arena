import Phaser from 'phaser'

const CELL = 32

const PROCESS_COLORS = [
  0x58a6ff, 0xf0883e, 0xa371f7, 0x3fb950, 0xd2a8ff, 0x79c0ff, 0xf778ba,
  0xffa657,
]

export function generateTextures(scene: Phaser.Scene): void {
  // cell-free — тёмная ячейка
  const gFree = scene.make.graphics({ x: 0, y: 0 }, false)
  gFree.fillStyle(0x1a1d27)
  gFree.fillRect(0, 0, CELL, CELL)
  gFree.lineStyle(1, 0x2a2d3a)
  gFree.strokeRect(0, 0, CELL, CELL)
  gFree.generateTexture('cell-free', CELL, CELL)
  gFree.destroy()

  // cell-alloc-{i} — 8 цветов процессов
  for (let i = 0; i < PROCESS_COLORS.length; i++) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false)
    g.fillStyle(PROCESS_COLORS[i])
    g.fillRect(1, 1, CELL - 2, CELL - 2)
    g.lineStyle(1, 0x2a2d3a)
    g.strokeRect(0, 0, CELL, CELL)
    g.generateTexture(`cell-alloc-${i}`, CELL, CELL)
    g.destroy()
  }

  // cell-garbage — коричневая с диагональю
  const gGarb = scene.make.graphics({ x: 0, y: 0 }, false)
  gGarb.fillStyle(0x6e4020)
  gGarb.fillRect(1, 1, CELL - 2, CELL - 2)
  gGarb.lineStyle(1, 0x8b5e3c)
  gGarb.beginPath()
  gGarb.moveTo(2, CELL - 2)
  gGarb.lineTo(CELL - 2, 2)
  gGarb.strokePath()
  gGarb.lineStyle(1, 0x2a2d3a)
  gGarb.strokeRect(0, 0, CELL, CELL)
  gGarb.generateTexture('cell-garbage', CELL, CELL)
  gGarb.destroy()

  // cell-ghost-ok — зелёный полупрозрачный
  const gOk = scene.make.graphics({ x: 0, y: 0 }, false)
  gOk.fillStyle(0x7ee787, 0.35)
  gOk.fillRect(1, 1, CELL - 2, CELL - 2)
  gOk.generateTexture('cell-ghost-ok', CELL, CELL)
  gOk.destroy()

  // cell-ghost-bad — красный полупрозрачный
  const gBad = scene.make.graphics({ x: 0, y: 0 }, false)
  gBad.fillStyle(0xf85149, 0.35)
  gBad.fillRect(1, 1, CELL - 2, CELL - 2)
  gBad.generateTexture('cell-ghost-bad', CELL, CELL)
  gBad.destroy()

  // cell-highlight — ярко-зелёная рамка (для подсветки целевого блока FREE)
  const gHi = scene.make.graphics({ x: 0, y: 0 }, false)
  gHi.lineStyle(2, 0x7ee787)
  gHi.strokeRect(1, 1, CELL - 2, CELL - 2)
  gHi.generateTexture('cell-highlight', CELL, CELL)
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

export { CELL, PROCESS_COLORS }
