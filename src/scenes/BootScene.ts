import Phaser from 'phaser'
import { generateTextures } from '../assets/TextureGenerator'
import { generateSounds } from '../assets/SoundGenerator'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    generateTextures(this)
    generateSounds(this)
    this.scene.start('MenuScene')
  }
}
