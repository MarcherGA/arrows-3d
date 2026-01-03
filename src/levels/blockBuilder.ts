import { Vector3, Color3 } from "@babylonjs/core";
import { Direction } from "../entities/Block";
import type { BlockData, BlockType } from "./types";

/**
 * Builder utility for creating block data
 *
 * Implements DRY principle by centralizing block creation logic
 * Provides a fluent, type-safe API for level designers
 *
 * @param x - Grid X coordinate
 * @param y - Grid Y coordinate
 * @param z - Grid Z coordinate
 * @param direction - Arrow direction
 * @param gx - Grid size X (default: 1)
 * @param gy - Grid size Y (default: 1)
 * @param gz - Grid size Z (default: 1)
 * @param color - Optional custom color
 * @param blockType - Optional block type (KEY, LOCKED, or STANDARD)
 * @returns Block data object
 */
export function block(
  x: number,
  y: number,
  z: number,
  direction: Direction,
  gx: number = 1,
  gy: number = 1,
  gz: number = 1,
  color?: Color3,
  blockType?: BlockType
): BlockData {
  return {
    position: new Vector3(x, y, z),
    gridSize: new Vector3(gx, gy, gz),
    direction,
    ...(color && { color }),
    ...(blockType && { blockType }),
  };
}

/**
 * Alternative builder with named parameters for better readability
 * Useful for complex block configurations
 */
export function createBlock(params: {
  x: number;
  y: number;
  z: number;
  direction: Direction;
  width?: number;
  height?: number;
  depth?: number;
  color?: Color3;
  blockType?: BlockType;
}): BlockData {
  return block(
    params.x,
    params.y,
    params.z,
    params.direction,
    params.width,
    params.height,
    params.depth,
    params.color,
    params.blockType
  );
}
