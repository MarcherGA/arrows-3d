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
 * Test Level 1: Simple structure to demonstrate game mechanics
 *
 * Structure layout:
 *   [B]
 *    |
 * [L]-[C]-[R]
 *    |
 *   [F]
 *
 * Where:
 * - C = Center block (blocked, can't be removed initially)
 * - L = Left block (points right, towards center - blocked)
 * - R = Right block (points left, away - REMOVABLE)
 * - F = Forward block (points back, towards center - blocked)
 * - B = Back block (points forward, away - REMOVABLE)
 */
export const Level1: LevelData = {
  name: "Tutorial Level",
  levelNumber: 1,
  blocks: [
    // Center block - points up (will be removable last)
    {
      position: new Vector3(0, 0, 0),
      direction: Direction.UP,
      color: new Color3(0.6, 0.4, 0.3), // Brown
    },

    // Right block - points RIGHT (away from center) - REMOVABLE FIRST
    {
      position: new Vector3(2, 0, 0),
      direction: Direction.RIGHT,
      color: new Color3(0.4, 0.7, 0.4), // Green
    },

    // Left block - points LEFT (away from center) - REMOVABLE FIRST
    {
      position: new Vector3(-2, 0, 0),
      direction: Direction.LEFT,
      color: new Color3(0.4, 0.6, 0.8), // Blue
    },

    // Forward block - points FORWARD (away from center) - REMOVABLE FIRST
    {
      position: new Vector3(0, 0, 2),
      direction: Direction.FORWARD,
      color: new Color3(0.8, 0.6, 0.4), // Orange
    },

    // Back block - points BACK (away from center) - REMOVABLE FIRST
    {
      position: new Vector3(0, 0, -2),
      direction: Direction.BACK,
      color: new Color3(0.7, 0.4, 0.6), // Purple
    },
  ],
  cameraDistance: 12,
};

/**
 * Test Level 2: Stretched blocks demonstration
 */
export const Level2: LevelData = {
  name: "Stretched Blocks",
  levelNumber: 2,
  blocks: [
    // Tall stretched block (1x3x1)
    {
      position: new Vector3(0, 0, 0),
      direction: Direction.UP,
      color: new Color3(0.6, 0.4, 0.3),
      size: new Vector3(1, 3, 1),
    },

    // Wide stretched block (3x1x1)
    {
      position: new Vector3(4, 0, 0),
      direction: Direction.LEFT,
      color: new Color3(0.4, 0.6, 0.8),
      size: new Vector3(3, 1, 1),
    },

    // Deep block (1x1x2)
    {
      position: new Vector3(0, 0, -3),
      direction: Direction.BACK,
      color: new Color3(0.8, 0.6, 0.4),
      size: new Vector3(1, 1, 2),
    },

    // Normal block
    {
      position: new Vector3(-2, 0, 0),
      direction: Direction.LEFT,
      color: new Color3(0.4, 0.8, 0.4),
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
