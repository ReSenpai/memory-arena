import { getShapesByLevel } from '../domain/Shapes'
import type { LevelConfig } from './types'

export const TOTAL_LEVELS = 5

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'Stack Basics',
    gridRows: 8,
    gridCols: 8,
    targetScore: 500,
    availableShapes: getShapesByLevel(1),
    requestInterval: 8,
    freeDeadlineTicks: 30,
    pointerLossChance: 0,
    maxQueueSize: 6,
    processNames: ['Chrome', 'Node'],
  },
  {
    id: 2,
    name: 'Heap Growth',
    gridRows: 10,
    gridCols: 10,
    targetScore: 1000,
    availableShapes: getShapesByLevel(2),
    requestInterval: 7,
    freeDeadlineTicks: 25,
    pointerLossChance: 0,
    maxQueueSize: 7,
    processNames: ['Chrome', 'Node', 'VSCode'],
  },
  {
    id: 3,
    name: 'Dangling Pointers',
    gridRows: 12,
    gridCols: 12,
    targetScore: 2000,
    availableShapes: getShapesByLevel(3),
    requestInterval: 6,
    freeDeadlineTicks: 20,
    pointerLossChance: 0.05,
    maxQueueSize: 8,
    processNames: ['Chrome', 'Node', 'VSCode', 'Spotify'],
  },
  {
    id: 4,
    name: 'Fragmentation',
    gridRows: 16,
    gridCols: 16,
    targetScore: 3000,
    availableShapes: getShapesByLevel(4),
    requestInterval: 5,
    freeDeadlineTicks: 18,
    pointerLossChance: 0.08,
    maxQueueSize: 8,
    processNames: ['Chrome', 'Node', 'VSCode', 'Spotify', 'Docker'],
  },
  {
    id: 5,
    name: 'Memory Chaos',
    gridRows: 20,
    gridCols: 20,
    targetScore: 5000,
    availableShapes: getShapesByLevel(5),
    requestInterval: 4,
    freeDeadlineTicks: 15,
    pointerLossChance: 0.12,
    maxQueueSize: 10,
    processNames: ['Chrome', 'Node', 'VSCode', 'Spotify', 'Docker', 'Slack'],
  },
]

export function getLevelConfig(levelId: number): LevelConfig {
  const config = LEVELS.find((l) => l.id === levelId)
  if (!config) {
    throw new Error(`Unknown level: ${levelId}`)
  }
  return config
}
