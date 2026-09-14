import Phaser from 'phaser'
import { getDpr, setupCamera, textResolution, viewSize } from '../viewport'
import { GameSession } from '../game/GameSession'
import type { SessionSnapshot } from '../game/GameSession'
import {
  CELL,
  CELL_TEX_SCALE,
  getProcessColorIndex,
  GRID_LINE_COLOR,
  PROCESS_COLORS,
} from '../assets/TextureGenerator'
import { CARD_H, QUEUE_BOTTOM, RequestQueueHUD } from './RequestQueueHUD'
import { DragDropManager } from './DragDropManager'
import { BAR_H, StatsBar } from './StatsBar'
import { AnimationManager } from './AnimationManager'

const PAUSE_BTN_H = 48
/** Экранный размер подписи указателя на блоке и минимум при ужатии */
const POINTER_LABEL_PX = 13
const POINTER_LABEL_MIN_PX = 9
/** Строка подсказки под очередью */
const HELP_BOTTOM = 8

export class GameScene extends Phaser.Scene {
  private session!: GameSession
  private snapshot!: SessionSnapshot
  /** Менеджер drag & drop */
  private dragManager!: DragDropManager

  /** Спрайты ячеек сетки [row][col] */
  private cellSprites: Phaser.GameObjects.Image[][] = []
  /** Контейнер сетки — для централизации позиционирования */
  private gridContainer!: Phaser.GameObjects.Container
  /** Линии сетки (векторные, поверх ячеек) */
  private gridLines!: Phaser.GameObjects.Graphics
  /** Текстовые метки указателей (по blockId) */
  private pointerLabels = new Map<string, Phaser.GameObjects.Text>()
  /** Подсветка ячеек (highlight спрайты для FREE drag) */
  private highlightSprites: Phaser.GameObjects.Image[] = []
  /** Tooltip — имя процесса при hover */
  private tooltip!: Phaser.GameObjects.Text
  /** HUD очереди запросов */
  private queueHUD!: RequestQueueHUD
  /** Stats bar сверху */
  private statsBar!: StatsBar
  /** Анимации */
  private animManager!: AnimationManager
  /** Таймер игровых тиков */
  private tickTimer!: Phaser.Time.TimerEvent
  /** Флаг паузы */
  private paused = false
  /** Overlay при паузе */
  private pauseOverlay!: Phaser.GameObjects.Graphics
  private pauseMenu!: Phaser.GameObjects.Container
  /** Help text */
  private helpText!: Phaser.GameObjects.Text

  /** Текущий масштаб ячеек (1 = 32px) */
  private cellScale = 1

  constructor() {
    super({ key: 'GameScene' })
  }

  create(data?: { levelId?: number }): void {
    setupCamera(this)
    const levelId = data?.levelId ?? 1
    this.session = new GameSession(levelId, Date.now())
    this.session.start()
    this.snapshot = this.session.getSnapshot()

    this.gridContainer = this.add.container(0, 0)

    // Tooltip для hover
    this.tooltip = this.add
      .text(0, 0, '', {
        fontSize: '15px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: '#1a1d27',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100)
      .setVisible(false)

    this.buildGrid()
    this.layoutGrid()
    this.syncGrid()

    this.queueHUD = new RequestQueueHUD(this)
    this.syncQueue()

    this.dragManager = new DragDropManager(this)

    this.statsBar = new StatsBar(this)
    this.animManager = new AnimationManager(this)
    this.syncStats()

    // Tick timer — 500ms per tick
    this.tickTimer = this.time.addEvent({
      delay: 500,
      callback: this.onTick,
      callbackScope: this,
      loop: true,
    })

    // Hover handler
    this.input.on('pointermove', this.onPointerMove, this)

    // Pause — Esc key
    this.input.keyboard?.on('keydown-ESC', () => {
      this.togglePause()
    })

    // Help text
    const view = viewSize(this)
    this.helpText = this.add
      .text(view.width / 2, view.height - HELP_BOTTOM, 'R — поворот   Esc — пауза   Перетаскивай карточки на сетку', {
        fontSize: '13px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#6e7681',
      })
      .setOrigin(0.5, 1)
      .setDepth(50)

    // Pause overlay (hidden initially)
    this.pauseOverlay = this.add.graphics().setDepth(500).setVisible(false)
    this.pauseMenu = this.add.container(0, 0).setDepth(501).setVisible(false)

    this.scale.on('resize', this.onResize, this)
    this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this))
  }

  /** Обработка тика */
  private onTick(): void {
    if (this.paused) return
    this.session.tick()
    this.snapshot = this.session.getSnapshot()
    this.syncGrid()
    if (!this.dragManager.isDragging()) {
      this.syncQueue()
    }
    this.syncStats()

    // Win / Lose
    if (this.snapshot.state === 'finished') {
      this.tickTimer.remove()
      if (this.snapshot.finishReason === 'win') {
        this.sound.play('sfx-win')
      } else {
        this.sound.play('sfx-lose')
      }
      this.time.delayedCall(800, () => {
        this.scene.start('GameOverScene', {
          reason: this.snapshot.finishReason,
          score: this.snapshot.score,
          targetScore: this.snapshot.targetScore,
          levelId: this.snapshot.levelId,
        })
      })
    }
  }

  /** Toggle pause */
  togglePause(): void {
    if (this.snapshot.state === 'finished') return
    if (this.paused) {
      this.session.resume()
      this.paused = false
      this.pauseOverlay.setVisible(false)
      this.pauseMenu.setVisible(false)
      this.pauseMenu.removeAll(true)
    } else {
      this.session.pause()
      this.paused = true
      this.buildPauseMenu()
    }
  }

  /** Построить меню паузы */
  private buildPauseMenu(): void {
    const { width, height } = viewSize(this)

    // Overlay
    this.pauseOverlay.clear()
    this.pauseOverlay.fillStyle(0x000000, 0.6)
    this.pauseOverlay.fillRect(0, 0, width, height)
    this.pauseOverlay.setVisible(true)

    // Очистить старое содержимое
    this.pauseMenu.removeAll(true)

    const panelW = Math.min(560, width - 32)
    const inset = 28

    // Title
    const title = this.add
      .text(width / 2, 0, 'ПАУЗА', {
        fontSize: '30px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#58a6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)

    // Help rules text
    const rules = [
      '• Перетащи карточку ALLOC на сетку — разместить блок',
      '• Перетащи карточку FREE на блок — освободить память',
      '• Не успел освободить — блок станет мусором',
      '• Мусор можно перетаскивать для дефрагментации',
      '• Повторный FREE на растворяющийся блок = double-free!',
      '• R — повернуть блок при перетаскивании',
      '• Набери целевой счёт для победы',
    ]
    const rulesText = this.add
      .text(0, 0, rules.join('\n'), {
        fontSize: '15px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#8b949e',
        lineSpacing: 8,
        wordWrap: { width: panelW - inset * 2 },
      })
      .setOrigin(0, 0)

    // Высота панели считается от контента, чтобы перенос строк не ломал раскладку
    const btnGap = 12
    const panelH =
      inset + title.height + 20 + rulesText.height + 32 + PAUSE_BTN_H * 2 + btnGap + inset
    const px = (width - panelW) / 2
    const py = Math.max(16, (height - panelH) / 2)

    const panelBg = this.add.graphics()
    panelBg.fillStyle(0x0d1117, 0.95)
    panelBg.fillRoundedRect(px, py, panelW, panelH, 12)
    panelBg.lineStyle(1, 0x21262d)
    panelBg.strokeRoundedRect(px, py, panelW, panelH, 12)
    this.pauseMenu.add([panelBg, title, rulesText])

    let y = py + inset
    title.setY(y)
    y += title.height + 20
    rulesText.setPosition(px + inset, y)
    y += rulesText.height + 32

    const btnW = Math.min(280, panelW - inset * 2)
    this.createPauseButton(width / 2, y + PAUSE_BTN_H / 2, btnW, 'Продолжить', () => {
      this.togglePause()
    })
    y += PAUSE_BTN_H + btnGap
    this.createPauseButton(width / 2, y + PAUSE_BTN_H / 2, btnW, 'Главное меню', () => {
      this.pauseMenu.removeAll(true)
      this.pauseMenu.setVisible(false)
      this.pauseOverlay.setVisible(false)
      this.scene.start('MenuScene')
    })

    this.pauseMenu.setVisible(true)
  }

  /** Создать кнопку в меню паузы */
  private createPauseButton(
    x: number,
    y: number,
    w: number,
    label: string,
    onClick: () => void,
  ): void {
    const left = x - w / 2
    const top = y - PAUSE_BTN_H / 2

    const bg = this.add.graphics()
    const draw = (fill: number, stroke: number) => {
      bg.clear()
      bg.fillStyle(fill)
      bg.fillRoundedRect(left, top, w, PAUSE_BTN_H, 8)
      bg.lineStyle(1, stroke)
      bg.strokeRoundedRect(left, top, w, PAUSE_BTN_H, 8)
    }
    draw(0x161b22, 0x21262d)
    this.pauseMenu.add(bg)

    const text = this.add
      .text(x, y, label, {
        fontSize: '18px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)
    this.pauseMenu.add(text)

    const zone = this.add
      .zone(left, top, w, PAUSE_BTN_H)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerover', () => {
      draw(0x1f2937, 0x58a6ff)
      text.setColor('#58a6ff')
    })

    zone.on('pointerout', () => {
      draw(0x161b22, 0x21262d)
      text.setColor('#e6edf3')
    })

    zone.on('pointerdown', onClick)
    this.pauseMenu.add(zone)
  }

  isPaused(): boolean {
    return this.paused
  }

  /** Создаёт массив спрайтов по размеру сетки */
  private buildGrid(): void {
    const { gridRows, gridCols } = this.snapshot

    for (let r = 0; r < gridRows; r++) {
      this.cellSprites[r] = []
      for (let c = 0; c < gridCols; c++) {
        const sprite = this.add.image(c * CELL, r * CELL, 'cell-free')
        sprite.setOrigin(0, 0).setScale(1 / CELL_TEX_SCALE)
        this.gridContainer.add(sprite)
        this.cellSprites[r][c] = sprite
      }
    }

    this.gridLines = this.add.graphics()
    this.gridContainer.add(this.gridLines)
  }

  /**
   * Линии сетки, привязанные к физическим пикселям: одинаковая толщина
   * при любом масштабе сетки и дробном devicePixelRatio.
   */
  private drawGridLines(): void {
    const { gridRows, gridCols } = this.snapshot
    const w = gridCols * CELL
    const h = gridRows * CELL
    const dpr = getDpr()
    const s = this.cellScale
    const { x: gx, y: gy } = this.gridContainer

    // Толщина в физических пикселях; нечётная — по центру пикселя, чётная — по границе
    const px = Math.max(1, Math.round(dpr))
    const snap = (screen: number) => {
      const phys = screen * dpr
      return (px % 2 ? Math.floor(phys) + 0.5 : Math.round(phys)) / dpr
    }

    this.gridLines.clear()
    this.gridLines.lineStyle(px / dpr / s, GRID_LINE_COLOR)
    for (let c = 0; c <= gridCols; c++) {
      const x = (snap(gx + c * CELL * s) - gx) / s
      this.gridLines.lineBetween(x, 0, x, h)
    }
    for (let r = 0; r <= gridRows; r++) {
      const y = (snap(gy + r * CELL * s) - gy) / s
      this.gridLines.lineBetween(0, y, w, y)
    }
  }

  /** Центрирует сетку и масштабирует под размер экрана */
  private layoutGrid(): void {
    const { gridRows, gridCols } = this.snapshot
    const { width, height } = viewSize(this)

    // Свободная область между stats bar сверху и очередью карточек снизу
    const top = BAR_H + 16
    const bottom = height - QUEUE_BOTTOM - CARD_H - 16
    const availW = width - 32
    const availH = bottom - top

    this.cellScale = Math.min(
      availW / (gridCols * CELL),
      availH / (gridRows * CELL),
      1.5,
    )
    this.cellScale = Math.max(this.cellScale, 0.3)

    this.gridContainer.setScale(this.cellScale)
    const gridW = gridCols * CELL * this.cellScale
    const gridH = gridRows * CELL * this.cellScale
    this.gridContainer.setPosition(
      (width - gridW) / 2,
      top + Math.max(0, (availH - gridH) / 2),
    )
    this.drawGridLines()
  }

  /** Синхронизирует текстуры спрайтов с текущим snapshot */
  syncGrid(): void {
    this.snapshot = this.session.getSnapshot()
    const { gridSnapshot, gridRows, gridCols, allocatedBlocks } = this.snapshot

    // Набор garbage blockId для интерактивности
    const garbageBlockIds = new Set<string>()

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const cell = gridSnapshot[r][c]
        const sprite = this.cellSprites[r][c]

        if (cell.type === 'free') {
          sprite.setTexture('cell-free')
          sprite.setAlpha(1)
          sprite.disableInteractive()
          sprite.setData('garbageBlockId', null)
        } else if (cell.type === 'allocated') {
          const idx = getProcessColorIndex(cell.blockId)
          sprite.setTexture(`cell-alloc-${idx}`)
          sprite.setAlpha(1)
          sprite.disableInteractive()
          sprite.setData('garbageBlockId', null)
        } else if (cell.type === 'dissolving') {
          const idx = getProcessColorIndex(cell.blockId)
          sprite.setTexture(`cell-alloc-${idx}`)
          sprite.setAlpha(0.4)
          sprite.disableInteractive()
          sprite.setData('garbageBlockId', null)
        } else if (cell.type === 'garbage') {
          sprite.setTexture('cell-garbage')
          sprite.setAlpha(1)
          // Сделать garbage ячейки интерактивными для перетаскивания
          if (!garbageBlockIds.has(cell.blockId)) {
            garbageBlockIds.add(cell.blockId)
          }
          sprite.setInteractive({ useHandCursor: true })
          sprite.setData('garbageBlockId', cell.blockId)
        }
      }
    }

    // Обновление pointer labels
    const activeIds = new Set<string>()
    for (const block of allocatedBlocks) {
      activeIds.add(block.id)

      // Находим центр блока (среднее координат ячеек)
      const avgRow =
        block.cells.reduce((s, c) => s + c.row, 0) / block.cells.length
      const avgCol =
        block.cells.reduce((s, c) => s + c.col, 0) / block.cells.length

      let label = this.pointerLabels.get(block.id)
      if (!label) {
        label = this.add
          .text(0, 0, block.pointer, {
            fontSize: `${POINTER_LABEL_PX}px`,
            resolution: textResolution(),
            color: '#ffffff',
            fontFamily: 'monospace',
            stroke: '#000000',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
        this.gridContainer.add(label)
        this.pointerLabels.set(block.id, label)
      }

      label.setPosition(
        (avgCol + 0.5) * CELL,
        (avgRow + 0.5) * CELL,
      )
      label.setText(block.pointer)
      // Экранный размер шрифта не зависит от масштаба сетки; по возможности
      // подпись не шире блока, но не мельче читаемого минимума
      const cols = block.cells.map((c) => c.col)
      const blockW = (Math.max(...cols) - Math.min(...cols) + 1) * CELL
      const fit = Math.min(1, (blockW * 0.92 * this.cellScale) / label.width)
      label.setScale(Math.max(fit, POINTER_LABEL_MIN_PX / POINTER_LABEL_PX) / this.cellScale)
      label.setVisible(true)
    }

    // Удалить labels для блоков, которых больше нет
    for (const [id, label] of this.pointerLabels) {
      if (!activeIds.has(id)) {
        label.destroy()
        this.pointerLabels.delete(id)
      }
    }
  }

  /** Подсветить ячейки конкретного блока (для FREE drag) */
  highlightBlock(blockId: string): void {
    this.clearHighlights()
    const block = this.snapshot.allocatedBlocks.find((b) => b.id === blockId)
    if (!block) return

    for (const cell of block.cells) {
      const hl = this.add.image(cell.col * CELL, cell.row * CELL, 'cell-highlight')
      hl.setOrigin(0, 0).setScale(1 / CELL_TEX_SCALE)
      this.gridContainer.add(hl)
      this.highlightSprites.push(hl)
    }

    // Пульсация
    for (const hl of this.highlightSprites) {
      this.tweens.add({
        targets: hl,
        alpha: { from: 1, to: 0.3 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      })
    }
  }

  /** Убрать подсветку */
  clearHighlights(): void {
    for (const hl of this.highlightSprites) {
      this.tweens.killTweensOf(hl)
      hl.destroy()
    }
    this.highlightSprites = []
  }

  /** Hover — показать имя процесса */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.dragManager.isDragging()) {
      this.tooltip.setVisible(false)
      return
    }
    const cell = this.worldToCell(pointer.worldX, pointer.worldY)
    if (!cell) {
      this.tooltip.setVisible(false)
      return
    }

    const content = this.snapshot.gridSnapshot[cell.row][cell.col]
    if (content.type === 'allocated') {
      const block = this.snapshot.allocatedBlocks.find(
        (b) => b.id === content.blockId,
      )
      if (block) {
        const colorIdx = getProcessColorIndex(block.id)
        const hex = PROCESS_COLORS[colorIdx].toString(16).padStart(6, '0')
        this.tooltip.setText(`${block.process} [${block.pointer}]`)
        this.tooltip.setColor(`#${hex}`)
        const worldPos = this.cellToWorld(cell.row, cell.col)
        this.tooltip.setPosition(worldPos.x, worldPos.y - CELL * this.cellScale * 0.6)
        this.tooltip.setVisible(true)
        return
      }
    }
    this.tooltip.setVisible(false)
  }

  /** Возвращает координату ячейки (row, col) по мировым координатам */
  worldToCell(worldX: number, worldY: number): { row: number; col: number } | null {
    const local = this.gridContainer.getLocalPoint(worldX, worldY)
    const col = Math.floor(local.x / CELL)
    const row = Math.floor(local.y / CELL)
    const { gridRows, gridCols } = this.snapshot
    if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return null
    return { row, col }
  }

  /** Мировые координаты центра ячейки */
  cellToWorld(row: number, col: number): { x: number; y: number } {
    const x =
      this.gridContainer.x + (col * CELL + CELL / 2) * this.cellScale
    const y =
      this.gridContainer.y + (row * CELL + CELL / 2) * this.cellScale
    return { x, y }
  }

  getSession(): GameSession {
    return this.session
  }

  getSnapshot(): SessionSnapshot {
    return this.snapshot
  }

  getCellScale(): number {
    return this.cellScale
  }

  getGridContainer(): Phaser.GameObjects.Container {
    return this.gridContainer
  }

  private onResize(): void {
    this.layoutGrid()
    this.syncQueue()
    this.statsBar.layout()
    this.syncStats()
    const { width, height } = viewSize(this)
    this.helpText.setPosition(width / 2, height - HELP_BOTTOM)
    if (this.paused) {
      this.buildPauseMenu()
    }
  }

  /** Обновить HUD очереди из snapshot */
  syncQueue(): void {
    this.queueHUD.update(this.snapshot.pendingRequests, this.snapshot.currentTick)
  }

  /** Обновить stats bar */
  private syncStats(): void {
    this.statsBar.update(
      this.snapshot.levelId,
      this.snapshot.score,
      this.snapshot.targetScore,
      this.snapshot.stability,
    )
  }

  getQueueHUD(): RequestQueueHUD {
    return this.queueHUD
  }

  getAnimManager(): AnimationManager {
    return this.animManager
  }

  getDragManager(): DragDropManager {
    return this.dragManager
  }
}
