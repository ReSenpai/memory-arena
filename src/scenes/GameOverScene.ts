import Phaser from 'phaser'
import { setupCamera, textResolution, viewSize } from '../viewport'
import type { FinishReason } from '../game/GameSession'

const BTN_W = 240
const BTN_H = 48
const BTN_GAP = 12

type GameOverData = { reason: FinishReason; score: number; targetScore: number; levelId: number }

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: GameOverData): void {
    setupCamera(this)
    const { width, height } = viewSize(this)
    const isWin = data.reason === 'win'
    const hasNext = isWin && data.levelId < 5

    // Dimmed background
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, width, height)

    // Title
    const title = this.add
      .text(width / 2, 0, isWin ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', {
        fontSize: '44px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: isWin ? '#3fb950' : '#f85149',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)

    // Score
    const score = this.add
      .text(width / 2, 0, `Очки: ${data.score} / ${data.targetScore}`, {
        fontSize: '22px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5, 0)

    const buttons: [string, () => void][] = [
      [
        'Заново',
        () => {
          this.scene.stop()
          this.scene.start('GameScene', { levelId: data.levelId })
        },
      ],
    ]
    if (hasNext) {
      buttons.push([
        'След. уровень',
        () => {
          this.scene.stop()
          this.scene.start('GameScene', { levelId: data.levelId + 1 })
        },
      ])
    }
    buttons.push([
      'Меню',
      () => {
        this.scene.stop()
        this.scene.start('MenuScene')
      },
    ])

    // Вертикальный стек по центру экрана
    const buttonsH = buttons.length * BTN_H + (buttons.length - 1) * BTN_GAP
    const stackH = title.height + 16 + score.height + 48 + buttonsH
    let y = Math.max(24, (height - stackH) / 2)

    title.setY(y)
    y += title.height + 16
    score.setY(y)
    y += score.height + 48

    for (const [label, onClick] of buttons) {
      this.createButton(width / 2, y + BTN_H / 2, label, onClick)
      y += BTN_H + BTN_GAP
    }

    const onResize = () => this.scene.restart(data)
    this.scale.on('resize', onResize)
    this.events.once('shutdown', () => this.scale.off('resize', onResize))
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const left = x - BTN_W / 2
    const top = y - BTN_H / 2

    const bg = this.add.graphics()
    const draw = (fill: number, stroke: number) => {
      bg.clear()
      bg.fillStyle(fill)
      bg.fillRoundedRect(left, top, BTN_W, BTN_H, 8)
      bg.lineStyle(1, stroke)
      bg.strokeRoundedRect(left, top, BTN_W, BTN_H, 8)
    }
    draw(0x161b22, 0x21262d)

    const text = this.add
      .text(x, y, label, {
        fontSize: '19px',
        resolution: textResolution(),
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)

    const zone = this.add
      .zone(left, top, BTN_W, BTN_H)
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
  }
}
