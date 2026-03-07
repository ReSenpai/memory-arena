import Phaser from 'phaser'
import type { GameScene } from './GameScene'
import { rotateShape } from '../domain/Shapes'
import { CELL } from '../assets/TextureGenerator'
import type { AllocateRequest, Shape } from '../domain/types'

const FLOAT_CELL = 20

/**
 * DragDropManager — управляет всеми drag & drop взаимодействиями.
 * Использует pointerdown/pointermove/pointerup вместо Phaser drag system
 * для корректной работы с Zone внутри Container.
 */
export class DragDropManager {
  private scene: GameScene

  // ALLOC drag state
  private draggingAlloc = false
  private allocRequestId: string | null = null
  private allocRequest: AllocateRequest | null = null
  private allocShape: Shape = []
  private allocRotation = 0
  private ghostSprites: Phaser.GameObjects.Image[] = []
  private lastGridCell: { row: number; col: number } | null = null
  private floatingContainer: Phaser.GameObjects.Container | null = null

  // FREE drag state
  private draggingFree = false
  private freeRequestId: string | null = null
  private freeTargetBlockId: string | null = null
  private freeDragIcon: Phaser.GameObjects.Text | null = null
  private connectionLine: Phaser.GameObjects.Graphics | null = null

  // Garbage drag state
  private draggingGarbage = false
  private garbageBlockId: string | null = null

  constructor(scene: GameScene) {
    this.scene = scene
    this.setupInputHandlers()
  }

  private setupInputHandlers(): void {
    this.scene.input.on('gameobjectdown', this.onGameObjectDown, this)
    this.scene.input.on('pointermove', this.onPointerMove, this)
    this.scene.input.on('pointerup', this.onPointerUp, this)

    // R key — вращение при drag ALLOC
    this.scene.input.keyboard?.on('keydown-R', () => {
      if (this.draggingAlloc && this.allocRequest) {
        this.allocRotation = (this.allocRotation + 1) % 4
        this.allocShape = rotateShape(this.allocRequest.shape, this.allocRotation)
        this.rebuildFloatingShape()
        if (this.lastGridCell) {
          this.updateGhost(this.lastGridCell.row, this.lastGridCell.col)
        }
      }
    })
  }

  // ============ ALLOC DRAG ============

  private startAllocDrag(
    requestId: string,
    allocReq: AllocateRequest,
    worldX: number,
    worldY: number,
  ): void {
    this.draggingAlloc = true
    this.allocRequestId = requestId
    this.allocRequest = allocReq
    this.allocRotation = 0
    this.allocShape = [...allocReq.shape]
    this.createFloatingShape(worldX, worldY)
    this.scene.sound.play('sfx-drag')
  }

  private createFloatingShape(worldX: number, worldY: number): void {
    this.destroyFloating()
    this.floatingContainer = this.scene.add
      .container(worldX, worldY)
      .setDepth(300)
    this.rebuildFloatingShape()
  }

  private rebuildFloatingShape(): void {
    if (!this.floatingContainer) return
    this.floatingContainer.removeAll(true)

    let minR = Infinity
    let maxR = -Infinity
    let minC = Infinity
    let maxC = -Infinity
    for (const cell of this.allocShape) {
      minR = Math.min(minR, cell.row)
      maxR = Math.max(maxR, cell.row)
      minC = Math.min(minC, cell.col)
      maxC = Math.max(maxC, cell.col)
    }
    const centerR = (minR + maxR + 1) / 2
    const centerC = (minC + maxC + 1) / 2

    const g = this.scene.add.graphics()
    for (const cell of this.allocShape) {
      const x = (cell.col - centerC) * FLOAT_CELL
      const y = (cell.row - centerR) * FLOAT_CELL
      g.fillStyle(0x58a6ff, 0.75)
      g.fillRect(x, y, FLOAT_CELL - 1, FLOAT_CELL - 1)
      g.lineStyle(1, 0x79c0ff, 0.9)
      g.strokeRect(x, y, FLOAT_CELL - 1, FLOAT_CELL - 1)
    }
    this.floatingContainer.add(g)
  }

  private destroyFloating(): void {
    if (this.floatingContainer) {
      this.floatingContainer.destroy()
      this.floatingContainer = null
    }
  }

  /** Обновить ghost-превью при движении мыши */
  private updateGhost(row: number, col: number): void {
    this.clearGhost()
    const snapshot = this.scene.getSnapshot()
    const { gridSnapshot, gridRows, gridCols } = snapshot

    let canPlace = true
    for (const cell of this.allocShape) {
      const r = row + cell.row
      const c = col + cell.col
      if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) {
        canPlace = false
        break
      }
      if (gridSnapshot[r][c].type !== 'free') {
        canPlace = false
        break
      }
    }

    const texture = canPlace ? 'cell-ghost-ok' : 'cell-ghost-bad'
    const container = this.scene.getGridContainer()
    for (const cell of this.allocShape) {
      const r = row + cell.row
      const c = col + cell.col
      if (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
        const sprite = this.scene.add.image(c * CELL, r * CELL, texture)
        sprite.setOrigin(0, 0)
        container.add(sprite)
        this.ghostSprites.push(sprite)
      }
    }
  }

  private clearGhost(): void {
    for (const s of this.ghostSprites) s.destroy()
    this.ghostSprites = []
  }

  // ============ FREE DRAG ============

  private startFreeDrag(
    requestId: string,
    pointer: string,
    worldX: number,
    worldY: number,
  ): void {
    this.draggingFree = true
    this.freeRequestId = requestId

    const session = this.scene.getSession()
    const blockId = session.resolvePointer(pointer)
    this.freeTargetBlockId = blockId

    if (blockId) {
      this.scene.highlightBlock(blockId)
    }

    this.freeDragIcon = this.scene.add
      .text(worldX, worldY - 30, `FREE\n${pointer}`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#f0883e',
        backgroundColor: '#1a1d27',
        padding: { x: 6, y: 4 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(200)

    this.connectionLine = this.scene.add.graphics().setDepth(199)

    this.scene.sound.play('sfx-drag')
  }

  private updateFreeDrag(worldX: number, worldY: number): void {
    if (this.freeDragIcon) {
      this.freeDragIcon.setPosition(worldX, worldY - 30)
    }

    if (this.connectionLine && this.freeTargetBlockId) {
      this.connectionLine.clear()
      const block = this.scene
        .getSnapshot()
        .allocatedBlocks.find((b) => b.id === this.freeTargetBlockId)
      if (block && block.cells.length > 0) {
        const avgRow =
          block.cells.reduce((s, c) => s + c.row, 0) / block.cells.length
        const avgCol =
          block.cells.reduce((s, c) => s + c.col, 0) / block.cells.length
        const target = this.scene.cellToWorld(avgRow, avgCol)
        this.connectionLine.lineStyle(2, 0xf0883e, 0.6)
        this.connectionLine.beginPath()
        this.connectionLine.moveTo(worldX, worldY)
        this.connectionLine.lineTo(target.x, target.y)
        this.connectionLine.strokePath()
      }
    }
  }

  private endFreeDrag(worldX: number, worldY: number): void {
    const cell = this.scene.worldToCell(worldX, worldY)
    let success = false

    if (cell && this.freeRequestId) {
      const snapshot = this.scene.getSnapshot()
      const content = snapshot.gridSnapshot[cell.row][cell.col]
      if (content.type === 'allocated') {
        const result = this.scene
          .getSession()
          .freeBlock(this.freeRequestId, content.blockId)
        if (result.success) {
          success = true
          this.scene.sound.play('sfx-free')
          this.scene.getAnimManager().dissolve(result.freedCells)
        }
      }
    }

    if (!success) {
      this.scene.sound.play('sfx-error')
    }

    this.scene.clearHighlights()
    this.freeDragIcon?.destroy()
    this.freeDragIcon = null
    this.connectionLine?.destroy()
    this.connectionLine = null
    this.draggingFree = false
    this.freeRequestId = null
    this.freeTargetBlockId = null

    this.scene.syncGrid()
    this.scene.syncQueue()
  }

  // ============ GARBAGE DRAG ============

  private startGarbageDrag(blockId: string): void {
    this.draggingGarbage = true
    this.garbageBlockId = blockId
    this.scene.sound.play('sfx-drag')
  }

  private endGarbageDrag(worldX: number, worldY: number): void {
    const cell = this.scene.worldToCell(worldX, worldY)
    let success = false

    if (cell && this.garbageBlockId) {
      const result = this.scene
        .getSession()
        .moveGarbage(this.garbageBlockId, cell.row, cell.col)
      if (result.success) {
        success = true
        this.scene.sound.play('sfx-place')
      }
    }

    if (!success) {
      this.scene.sound.play('sfx-error')
    }

    this.draggingGarbage = false
    this.garbageBlockId = null

    this.scene.syncGrid()
    this.scene.syncQueue()
  }

  // ============ GENERIC HANDLERS ============

  private onGameObjectDown(
    pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject,
  ): void {
    const reqType = gameObject.getData('requestType') as string | undefined
    if (reqType === 'allocate') {
      const req = gameObject.getData('request')
      if (req?.type === 'allocate') {
        this.startAllocDrag(
          req.payload.id,
          req.payload,
          pointer.worldX,
          pointer.worldY,
        )
      }
    } else if (reqType === 'free') {
      const req = gameObject.getData('request')
      if (req?.type === 'free') {
        this.startFreeDrag(
          req.payload.id,
          req.payload.pointer,
          pointer.worldX,
          pointer.worldY,
        )
      }
    } else if (gameObject.getData('garbageBlockId')) {
      this.startGarbageDrag(gameObject.getData('garbageBlockId') as string)
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging()) return

    if (this.draggingAlloc) {
      if (this.floatingContainer) {
        this.floatingContainer.setPosition(pointer.worldX, pointer.worldY)
      }
      const cell = this.scene.worldToCell(pointer.worldX, pointer.worldY)
      if (cell) {
        this.lastGridCell = cell
        this.updateGhost(cell.row, cell.col)
        this.floatingContainer?.setAlpha(0.3)
      } else {
        this.clearGhost()
        this.lastGridCell = null
        this.floatingContainer?.setAlpha(1)
      }
    } else if (this.draggingFree) {
      this.updateFreeDrag(pointer.worldX, pointer.worldY)
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging()) return

    if (this.draggingAlloc) {
      this.endAllocDrag(pointer.worldX, pointer.worldY)
    } else if (this.draggingFree) {
      this.endFreeDrag(pointer.worldX, pointer.worldY)
    } else if (this.draggingGarbage) {
      this.endGarbageDrag(pointer.worldX, pointer.worldY)
    }
  }

  private endAllocDrag(worldX: number, worldY: number): void {
    const cell = this.scene.worldToCell(worldX, worldY)
    let success = false

    if (cell && this.allocRequestId) {
      const result = this.scene
        .getSession()
        .placeBlock(this.allocRequestId, cell.row, cell.col, this.allocRotation)
      if (result.success) {
        success = true
        this.scene.sound.play('sfx-place')
        this.scene.getAnimManager().flashPlace(result.block.cells)
      }
    }

    if (!success) {
      this.scene.sound.play('sfx-error')
    }

    this.destroyFloating()
    this.clearGhost()
    this.draggingAlloc = false
    this.allocRequestId = null
    this.allocRequest = null
    this.lastGridCell = null
    this.allocRotation = 0

    this.scene.syncGrid()
    this.scene.syncQueue()
  }

  isDragging(): boolean {
    return this.draggingAlloc || this.draggingFree || this.draggingGarbage
  }
}
