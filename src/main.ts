import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { GameOverScene } from './scenes/GameOverScene'
import { getDpr, physicalSize, refreshViewport } from './viewport'

const { width, height } = physicalSize()

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: document.body,
  backgroundColor: '#0d1017',
  scale: {
    // Размером canvas управляем сами (см. viewport.ts): физические пиксели + CSS zoom
    mode: Phaser.Scale.NONE,
    width,
    height,
    zoom: 1 / getDpr(),
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
}

const game = new Phaser.Game(config)

window.addEventListener('resize', () => refreshViewport(game))
