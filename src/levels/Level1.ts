import { Vector3, Color3 } from "@babylonjs/core";
import { Direction } from "../entities/Block";

/**
 * Data structure for a single block in a level
 */
export interface BlockData {
  position: Vector3;
  direction: Direction;
  color?: Color3;
  size?: Vector3;
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
    // Layer 0 (y=0) - bottom layer
    { position: new Vector3(0, 0, 0), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 0), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 0), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(0, 0, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 1), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(0, 0, 2), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(1, 0, 2), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },
    { position: new Vector3(2, 0, 2), direction: Direction.UP, color: new Color3(0.8, 0.4, 0.4) },

    // Layer 1 (y=1) - middle layer
    { position: new Vector3(0, 1, 0), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 0), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 0), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(0, 1, 1), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 1), direction: Direction.UP, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 1), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(0, 1, 2), direction: Direction.LEFT, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(1, 1, 2), direction: Direction.BACK, color: new Color3(0.4, 0.8, 0.4) },
    { position: new Vector3(2, 1, 2), direction: Direction.RIGHT, color: new Color3(0.4, 0.8, 0.4) },

    // Layer 2 (y=2) - top layer
    { position: new Vector3(0, 2, 0), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 0), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 0), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(0, 2, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 1), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(0, 2, 2), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(1, 2, 2), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
    { position: new Vector3(2, 2, 2), direction: Direction.DOWN, color: new Color3(0.4, 0.4, 0.8) },
  ],
  cameraDistance: 15,
};

/**
 * Test Level 2: Stretched blocks demonstration
 *
 * Using grid positions - each grid unit = 1 block + gap
 * LevelParser will automatically convert to world positions with consistent gaps
 */
export const Level2: LevelData = {
  name: "Stretched Blocks",
  levelNumber: 2,
  blocks: [
    // Normal block at grid 0
    {
      position: new Vector3(0, 0, 0),
      direction: Direction.LEFT,
      color: new Color3(0.4, 0.8, 0.4),
    },

    // Tall stretched block (1x3x1) at grid center (1)
    {
      position: new Vector3(1, 0, 0),
      direction: Direction.UP,
      color: new Color3(0.6, 0.4, 0.3),
      size: new Vector3(1, 3, 1),
    },

    // Wide stretched block (3x1x1) at grid 2
    {
      position: new Vector3(2, 0, 0),
      direction: Direction.LEFT,
      color: new Color3(0.4, 0.6, 0.8),
      size: new Vector3(3, 1, 1),
    },

    // Deep block (1x1x2) - 1 grid unit backward from center
    {
      position: new Vector3(1, 0, -1),
      direction: Direction.BACK,
      color: new Color3(0.8, 0.6, 0.4),
      size: new Vector3(1, 1, 2),
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
