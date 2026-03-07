import type { GameScene } from './GameScene'
import { CELL } from '../assets/TextureGenerator'
import type { Cell } from '../domain/types'

/**
 * AnimationManager — визуальные эффекты (вспышки, dissolve, particles).
 */
export class AnimationManager {
  private scene: GameScene

  constructor(scene: GameScene) {
    this.scene = scene
  }

  /** Белая вспышка при размещении блока */
  flashPlace(cells: Cell[]): void {
    const container = this.scene.getGridContainer()
    for (const cell of cells) {
      const flash = this.scene.add.image(cell.col * CELL, cell.row * CELL, 'cell-ghost-ok')
      flash.setOrigin(0, 0).setAlpha(0.8)
      container.add(flash)
      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => flash.destroy(),
      })
    }
  }

  /** Dissolve при освобождении блока */
  dissolve(cells: Cell[]): void {
    const container = this.scene.getGridContainer()
    for (const cell of cells) {
      const sprite = this.scene.add.image(cell.col * CELL, cell.row * CELL, 'cell-free')
      sprite.setOrigin(0, 0).setAlpha(1)
      container.add(sprite)
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 400,
        ease: 'Power3',
        onComplete: () => sprite.destroy(),
      })
    }
  }

  /** Красная пульсация при конвертации в мусор */
  garbagePulse(cells: Cell[]): void {
    const container = this.scene.getGridContainer()
    for (const cell of cells) {
      const pulse = this.scene.add.image(cell.col * CELL, cell.row * CELL, 'cell-ghost-bad')
      pulse.setOrigin(0, 0).setAlpha(0.7)
      container.add(pulse)
      this.scene.tweens.add({
        targets: pulse,
        alpha: 0,
        duration: 600,
        ease: 'Sine.easeInOut',
        onComplete: () => pulse.destroy(),
      })
    }
  }
}
