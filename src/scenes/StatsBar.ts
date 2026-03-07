import Phaser from 'phaser'

const BAR_H = 40
const BAR_PAD = 16

export class StatsBar {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private levelText: Phaser.GameObjects.Text
  private scoreText: Phaser.GameObjects.Text
  private stabilityBarBg: Phaser.GameObjects.Graphics
  private stabilityBarFill: Phaser.GameObjects.Graphics
  private stabilityLabel: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(50)

    // Background
    this.bg = scene.add.graphics()
    this.container.add(this.bg)

    // Level
    this.levelText = scene.add
      .text(BAR_PAD, 10, '', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#58a6ff',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
    this.container.add(this.levelText)

    // Score
    this.scoreText = scene.add
      .text(0, 10, '', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#e6edf3',
      })
      .setOrigin(0.5, 0)
    this.container.add(this.scoreText)

    // Stability label
    this.stabilityLabel = scene.add
      .text(0, 10, 'STABILITY', {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#8b949e',
      })
      .setOrigin(0, 0)
    this.container.add(this.stabilityLabel)

    // Stability bar bg
    this.stabilityBarBg = scene.add.graphics()
    this.container.add(this.stabilityBarBg)

    // Stability bar fill
    this.stabilityBarFill = scene.add.graphics()
    this.container.add(this.stabilityBarFill)

    this.drawBg()
  }

  private drawBg(): void {
    const w = this.scene.scale.width
    this.bg.clear()
    this.bg.fillStyle(0x0d1117, 0.9)
    this.bg.fillRect(0, 0, w, BAR_H)
    this.bg.lineStyle(1, 0x21262d)
    this.bg.lineBetween(0, BAR_H, w, BAR_H)
  }

  update(
    levelId: number,
    score: number,
    targetScore: number,
    stability: number,
  ): void {
    const w = this.scene.scale.width

    this.levelText.setText(`LVL ${levelId}`)
    this.scoreText.setText(`${score} / ${targetScore}`)
    this.scoreText.setX(w / 2)

    // Stability bar
    const stabW = 120
    const stabX = w - BAR_PAD - stabW
    this.stabilityLabel.setX(stabX)
    this.stabilityLabel.setY(5)

    this.stabilityBarBg.clear()
    this.stabilityBarBg.fillStyle(0x1e2130)
    this.stabilityBarBg.fillRect(stabX, 22, stabW, 8)

    const frac = Math.max(0, Math.min(1, stability))
    let color = 0x3fb950 // green
    if (frac < 0.3) color = 0xf85149 // red
    else if (frac < 0.6) color = 0xd29922 // yellow

    this.stabilityBarFill.clear()
    this.stabilityBarFill.fillStyle(color)
    this.stabilityBarFill.fillRect(stabX, 22, stabW * frac, 8)
  }

  layout(): void {
    this.drawBg()
  }
}
