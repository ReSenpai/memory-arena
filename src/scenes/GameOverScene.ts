import Phaser from 'phaser'
import type { FinishReason } from '../game/GameSession'

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: { reason: FinishReason; score: number; targetScore: number; levelId: number }): void {
    const { width, height } = this.scale
    const isWin = data.reason === 'win'

    // Dimmed background
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.7)
    overlay.fillRect(0, 0, width, height)

    // Title
    this.add
      .text(width / 2, height * 0.3, isWin ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', {
        fontSize: '32px',
        fontFamily: 'monospace',
        color: isWin ? '#3fb950' : '#f85149',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    // Score
    this.add
      .text(width / 2, height * 0.3 + 50, `Очки: ${data.score} / ${data.targetScore}`, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)

    // Retry button
    this.createButton(width / 2, height * 0.55, 'Заново', () => {
      this.scene.stop()
      this.scene.start('GameScene', { levelId: data.levelId })
    })

    // Next level button (on win, if not last level)
    if (isWin && data.levelId < 5) {
      this.createButton(width / 2, height * 0.55 + 48, 'След. уровень', () => {
        this.scene.stop()
        this.scene.start('GameScene', { levelId: data.levelId + 1 })
      })
    }

    // Menu button
    this.createButton(width / 2, height * 0.55 + (isWin && data.levelId < 5 ? 96 : 48), 'Меню', () => {
      this.scene.stop()
      this.scene.start('MenuScene')
    })
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.graphics()
    bg.fillStyle(0x161b22)
    bg.fillRoundedRect(x - 80, y - 16, 160, 36, 6)
    bg.lineStyle(1, 0x21262d)
    bg.strokeRoundedRect(x - 80, y - 16, 160, 36, 6)

    const text = this.add
      .text(x, y, label, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5)

    const zone = this.add
      .zone(x - 80, y - 16, 160, 36)
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(0x1f2937)
      bg.fillRoundedRect(x - 80, y - 16, 160, 36, 6)
      bg.lineStyle(1, 0x58a6ff)
      bg.strokeRoundedRect(x - 80, y - 16, 160, 36, 6)
      text.setColor('#58a6ff')
    })

    zone.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(0x161b22)
      bg.fillRoundedRect(x - 80, y - 16, 160, 36, 6)
      bg.lineStyle(1, 0x21262d)
      bg.strokeRoundedRect(x - 80, y - 16, 160, 36, 6)
      text.setColor('#e6edf3')
    })

    zone.on('pointerdown', onClick)
  }
}
