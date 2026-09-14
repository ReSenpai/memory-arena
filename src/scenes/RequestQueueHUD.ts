import Phaser from 'phaser'
import { textResolution, viewSize } from '../viewport'
import type { GameRequest } from '../domain/types'
 
const CARD_W = 128
export const CARD_H = 88
const CARD_GAP = 10
const CARD_RADIUS = 8
/** Отступ от низа экрана до карточек (под ними строка подсказки) */
export const QUEUE_BOTTOM = 34
const ALLOC_COLOR = 0x58a6ff
const FREE_COLOR = 0xf0883e
const URGENT_COLOR = 0xf85149
const MINI_CELL = 8

export type CardData = {
  container: Phaser.GameObjects.Container
  request: GameRequest
  bg: Phaser.GameObjects.Graphics
  timerBar?: Phaser.GameObjects.Graphics
}

export class RequestQueueHUD {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private cards: CardData[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(50)
  }

  /** Обновить очередь из текущего списка запросов */
  update(requests: GameRequest[], currentTick: number): void {
    // Удалить старые карточки
    for (const card of this.cards) {
      card.container.destroy()
    }
    this.cards = []

    const { width, height } = viewSize(this.scene)
    const totalWidth = requests.length * (CARD_W + CARD_GAP) - CARD_GAP
    // Длинная очередь на узком экране — ужимаем, чтобы не вылезала за края
    const scale = Math.min(1, (width - 32) / totalWidth)
    this.container.setScale(scale)
    this.container.setPosition(
      (width - totalWidth * scale) / 2,
      height - QUEUE_BOTTOM - CARD_H * scale,
    )

    let x = 0
    for (const req of requests) {
      const card = this.createCard(req, x, 0, currentTick)
      this.cards.push(card)
      x += CARD_W + CARD_GAP
    }
  }

  private createCard(
    req: GameRequest,
    x: number,
    y: number,
    currentTick: number,
  ): CardData {
    const isAlloc = req.type === 'allocate'
    const accent = isAlloc ? ALLOC_COLOR : FREE_COLOR
    const container = this.scene.add.container(x, y)
    this.container.add(container)

    // Background
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x1a1d27)
    bg.fillRoundedRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
    bg.lineStyle(1, 0x2a2d3a)
    bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
    // Левый акцент
    bg.fillStyle(accent)
    bg.fillRect(0, CARD_RADIUS, 4, CARD_H - CARD_RADIUS * 2)
    container.add(bg)

    // Type label
    const typeLabel = isAlloc ? 'ALLOC' : 'FREE'
    const typeText = this.scene.add
      .text(14, 10, typeLabel, {
        fontSize: '13px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#aaaaaa',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
    container.add(typeText)

    // Detail text
    let detail: string
    if (req.type === 'allocate') {
      detail = req.payload.process
    } else {
      detail = req.payload.pointer
    }
    const detailText = this.scene.add
      .text(14, 32, detail, {
        fontSize: '16px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#cccccc',
        lineSpacing: 2,
      })
      .setOrigin(0, 0)
    container.add(detailText)

    // Shape mini-preview for ALLOC cards
    if (req.type === 'allocate') {
      const shape = req.payload.shape
      let minR = Infinity
      let maxR = -Infinity
      let minC = Infinity
      let maxC = -Infinity
      for (const cell of shape) {
        minR = Math.min(minR, cell.row)
        maxR = Math.max(maxR, cell.row)
        minC = Math.min(minC, cell.col)
        maxC = Math.max(maxC, cell.col)
      }
      const shapeW = (maxC - minC + 1) * MINI_CELL
      const shapeH = (maxR - minR + 1) * MINI_CELL
      const offsetX = CARD_W - 12 - shapeW
      const offsetY = CARD_H - 12 - shapeH
      const miniG = this.scene.add.graphics()
      for (const cell of shape) {
        const cx = offsetX + (cell.col - minC) * MINI_CELL
        const cy = offsetY + (cell.row - minR) * MINI_CELL
        miniG.fillStyle(ALLOC_COLOR, 0.85)
        miniG.fillRect(cx, cy, MINI_CELL - 1, MINI_CELL - 1)
      }
      container.add(miniG)
    }

    // Deadline timer bar for FREE requests
    let timerBar: Phaser.GameObjects.Graphics | undefined
    if (req.type === 'free') {
      const elapsed = currentTick - req.payload.createdAtTick
      const total = req.payload.deadline - req.payload.createdAtTick
      const remaining = Math.max(0, 1 - elapsed / total)
      const isUrgent = remaining < 0.3

      timerBar = this.scene.add.graphics()
      // Track
      timerBar.fillStyle(0x1e2130)
      timerBar.fillRect(14, CARD_H - 14, CARD_W - 28, 4)
      // Fill
      timerBar.fillStyle(isUrgent ? URGENT_COLOR : FREE_COLOR)
      timerBar.fillRect(14, CARD_H - 14, (CARD_W - 28) * remaining, 4)
      container.add(timerBar)

      if (isUrgent) {
        bg.clear()
        bg.fillStyle(0x1a1d27)
        bg.fillRoundedRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
        bg.lineStyle(1, URGENT_COLOR)
        bg.strokeRoundedRect(0, 0, CARD_W, CARD_H, CARD_RADIUS)
        bg.fillStyle(URGENT_COLOR)
        bg.fillRect(0, CARD_RADIUS, 4, CARD_H - CARD_RADIUS * 2)
      }
    }

    // Make interactive for dragging
    const hitZone = this.scene.add
      .zone(0, 0, CARD_W, CARD_H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
    hitZone.setData('requestId', req.type === 'allocate' ? req.payload.id : req.payload.id)
    hitZone.setData('requestType', req.type)
    hitZone.setData('request', req)
    container.add(hitZone)

    return { container, request: req, bg, timerBar }
  }

  getCards(): CardData[] {
    return this.cards
  }

  layout(): void {
    // Перерисовываем при resize — update будет вызван заново
  }
}
