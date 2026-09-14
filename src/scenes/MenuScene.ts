import Phaser from 'phaser'
import { setupCamera, textResolution, viewSize } from '../viewport'
import { TOTAL_LEVELS } from '../game/LevelManager'

const BTN_W = 380
const BTN_H = 48
const BTN_GAP = 12

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create(): void {
    setupCamera(this)
    const { width, height } = viewSize(this)
    const contentW = width - 32

    // Title
    const title = this.add
      .text(width / 2, 0, 'MEMORY ARENA', {
        fontSize: '52px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#58a6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
    // На узком экране заголовок не должен вылезать за края
    if (title.width > contentW) title.setScale(contentW / title.width)

    // Subtitle
    const subtitle = this.add
      .text(width / 2, 0, 'Управляй памятью. Размещай блоки. Освобождай указатели.', {
        fontSize: '17px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#8b949e',
        align: 'center',
        wordWrap: { width: contentW },
      })
      .setOrigin(0.5, 0)

    // Help text — прижат к низу
    const help = this.add
      .text(width / 2, height - 24, 'R — поворот   Esc — пауза   Перетаскивай карточки на сетку', {
        fontSize: '14px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#6e7681',
        align: 'center',
        wordWrap: { width: contentW },
      })
      .setOrigin(0.5, 1)

    // Вертикальный стек: заголовок, подзаголовок, кнопки — по центру свободной области
    const btnW = Math.min(BTN_W, contentW)
    const buttonsH = TOTAL_LEVELS * BTN_H + (TOTAL_LEVELS - 1) * BTN_GAP
    const stackH = title.displayHeight + 16 + subtitle.height + 48 + buttonsH
    const freeH = help.y - help.height - 24
    let y = Math.max(24, (freeH - stackH) / 2)

    title.setY(y)
    y += title.displayHeight + 16
    subtitle.setY(y)
    y += subtitle.height + 48

    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      this.createLevelButton(width / 2, y + BTN_H / 2, btnW, i)
      y += BTN_H + BTN_GAP
    }

    const onResize = () => this.scene.restart()
    this.scale.on('resize', onResize)
    this.events.once('shutdown', () => this.scale.off('resize', onResize))
  }

  private createLevelButton(x: number, y: number, w: number, levelId: number): void {
    const names = ['Основы стека', 'Рост кучи', 'Висячие указатели', 'Фрагментация', 'Хаос памяти']
    const label = `Уровень ${levelId}: ${names[levelId - 1]}`
    const left = x - w / 2
    const top = y - BTN_H / 2

    const bg = this.add.graphics()
    const draw = (fill: number, stroke: number) => {
      bg.clear()
      bg.fillStyle(fill)
      bg.fillRoundedRect(left, top, w, BTN_H, 8)
      bg.lineStyle(1, stroke)
      bg.strokeRoundedRect(left, top, w, BTN_H, 8)
    }
    draw(0x161b22, 0x21262d)

    const text = this.add
      .text(x, y, label, {
        fontSize: '18px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)
    if (text.width > w - 24) text.setScale((w - 24) / text.width)

    const zone = this.add
      .zone(left, top, w, BTN_H)
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

    zone.on('pointerdown', () => {
      this.scene.start('GameScene', { levelId })
    })
  }
}
