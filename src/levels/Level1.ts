import { Vector3, Color3 } from "@babylonjs/core";
import { Direction } from "../entities/Block";

/**
 * Data structure for a single block in a level
 */
export interface BlockData {
  position: Vector3;    // Grid coordinates (corner position)
  gridSize: Vector3;    // Number of grid cells occupied [x, y, z]
  direction: Direction; // Arrow direction
  color?: Color3;       // Optional custom color
}

/**
 * Level configuration interface
 */
export interface LevelData {
  name: string;
  levelNumber: number;
  blocks: BlockData[];
  cameraDistance?: number;
}

/**
 * Test Level 1: 3x3x3 Grid
 *
 * Full 3x3x3 grid with blocks at all 27 positions
 */
export const Level1: LevelData = {
  name: "3x3x3 Grid",
  levelNumber: 1,
  blocks: [
    // Layer 0 (y=0) - bottom layer - all standard 1x1x1 blocks
    { position: new Vector3(0, 0, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(0, 0, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(0, 0, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },

    // Layer 1 (y=1) - middle layer
    { position: new Vector3(0, 1, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(0, 1, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(0, 1, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.BACK, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },

    // Layer 2 (y=2) - top layer
    { position: new Vector3(0, 2, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 0), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(0, 2, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 1), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(0, 2, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 2), gridSize: new Vector3(1, 1, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
  ],
  cameraDistance: 15,
};

/**
 * Test Level 2: Stretched blocks demonstration
 *
 * Demonstrates blocks with different grid sizes
 * gridSize defines how many grid cells the block occupies
 */
export const Level2: LevelData = {
  name: "Stretched Blocks",
  levelNumber: 2,
  blocks: [
    // Normal 1x1x1 block at grid (0,0,0)
    {
      position: new Vector3(0, 0, 0),
      gridSize: new Vector3(1, 1, 1),
      direction: Direction.RIGHT,
      color: new Color3(0.4, 0.8, 0.4),
    },

    // Tall 1x3x1 block at grid (2,0,0) - occupies cells (2,0,0), (2,1,0), (2,2,0)
    {
      position: new Vector3(1, 0, 0),
      gridSize: new Vector3(1, 3, 1),
      direction: Direction.UP,
      color: new Color3(0.6, 0.4, 0.3),
    },

    // Wide 3x1x1 block at grid (0,0,2) - occupies cells (0,0,2), (1,0,2), (2,0,2)
    {
      position: new Vector3(0, 0, 2),
      gridSize: new Vector3(3, 1, 1),
      direction: Direction.RIGHT,
      color: new Color3(0.4, 0.6, 0.8),
    },

    // Deep 1x1x2 block at grid (4,0,0) - occupies cells (4,0,0), (4,0,1)
    {
      position: new Vector3(2, 0, 0),
      gridSize: new Vector3(1, 1, 2),
      direction: Direction.FORWARD,
      color: new Color3(0.8, 0.6, 0.4),
    },
  ],
  cameraDistance: 15,
};

/**
 * Get level by index
 */
export function getLevel(levelIndex: number): LevelData {
  switch (levelIndex) {
    case 1:
      return Level1;
    case 2:
      return Level2;
    default:
      return Level1;
  }
}
