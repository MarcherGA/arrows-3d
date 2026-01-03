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
