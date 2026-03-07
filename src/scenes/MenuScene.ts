import Phaser from 'phaser'
import { TOTAL_LEVELS } from '../game/LevelManager'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // Title
    this.add
      .text(width / 2, height * 0.25, 'MEMORY ARENA', {
        fontSize: '36px',
        fontFamily: 'monospace',
        color: '#58a6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // Subtitle
    this.add
      .text(width / 2, height * 0.25 + 50, 'Управляй памятью. Размещай блоки. Освобождай указатели.', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#8b949e',
      })
      .setOrigin(0.5)

    // Level buttons
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const btnY = height * 0.45 + (i - 1) * 48
      this.createLevelButton(width / 2, btnY, i)
    }

    // Help text
    this.add
      .text(width / 2, height - 60, 'R — поворот   Esc — пауза   Перетаскивай карточки на сетку', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#484f58',
      })
      .setOrigin(0.5)

    this.scale.on('resize', () => this.scene.restart())
  }

  private createLevelButton(x: number, y: number, levelId: number): void {
    const names = ['Основы стека', 'Рост кучи', 'Висячие указатели', 'Фрагментация', 'Хаос памяти']
    const label = `Уровень ${levelId}: ${names[levelId - 1]}`

    const bg = this.add.graphics()
    bg.fillStyle(0x161b22)
    bg.fillRoundedRect(x - 140, y - 16, 280, 36, 6)
    bg.lineStyle(1, 0x21262d)
    bg.strokeRoundedRect(x - 140, y - 16, 280, 36, 6)

    const text = this.add
      .text(x, y, label, {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)

    const zone = this.add
      .zone(x - 140, y - 16, 280, 36)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(0x1f2937)
      bg.fillRoundedRect(x - 140, y - 16, 280, 36, 6)
      bg.lineStyle(1, 0x58a6ff)
      bg.strokeRoundedRect(x - 140, y - 16, 280, 36, 6)
      text.setColor('#58a6ff')
    })

    zone.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(0x161b22)
      bg.fillRoundedRect(x - 140, y - 16, 280, 36, 6)
      bg.lineStyle(1, 0x21262d)
      bg.strokeRoundedRect(x - 140, y - 16, 280, 36, 6)
      text.setColor('#e6edf3')
    })

    zone.on('pointerdown', () => {
      this.scene.start('GameScene', { levelId })
    })
  }
}
