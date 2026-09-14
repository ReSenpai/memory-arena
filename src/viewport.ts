import Phaser from 'phaser'

/**
 * Рендер в физических пикселях экрана (HiDPI).
 *
 * Canvas имеет размер `innerWidth * dpr`, а через CSS сжимается до `innerWidth`,
 * поэтому браузер не растягивает картинку (иначе всё мылится при масштабе
 * Windows 125%/150% и на retina). Камеры сцен зумятся на `dpr`, так что
 * вся раскладка по-прежнему в логических (CSS) пикселях — см. `viewSize`.
 */

function readDpr(): number {
  return Math.max(1, window.devicePixelRatio || 1)
}

let dpr = readDpr()

export function getDpr(): number {
  return dpr
}

/** Физический размер canvas для текущего окна */
export function physicalSize(): { width: number; height: number } {
  return {
    width: Math.round(window.innerWidth * dpr),
    height: Math.round(window.innerHeight * dpr),
  }
}

/** Пересчитать dpr и размер canvas (resize окна, смена монитора, zoom браузера) */
export function refreshViewport(game: Phaser.Game): void {
  dpr = readDpr()
  if (game.scale.zoom !== 1 / dpr) {
    game.scale.setZoom(1 / dpr)
  }
  const { width, height } = physicalSize()
  game.scale.resize(width, height)
  for (const scene of game.scene.getScenes(true)) {
    scene.cameras.main.setZoom(dpr)
  }
}

/** Настроить главную камеру сцены: зум на dpr от левого верхнего угла */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(dpr)
}

/** Логический размер экрана (CSS-пиксели) — использовать вместо scene.scale.width/height */
export function viewSize(scene: Phaser.Scene): { width: number; height: number } {
  return {
    width: scene.scale.width / dpr,
    height: scene.scale.height / dpr,
  }
}

/** Разрешение для Text, чтобы шрифт растеризовался в физических пикселях */
export function textResolution(extraScale = 1): number {
  return Math.ceil(dpr * extraScale)
}
