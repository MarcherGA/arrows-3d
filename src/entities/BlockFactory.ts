import { Scene, Vector3, Color3 } from "@babylonjs/core";
import { BaseBlock, Direction } from "./BaseBlock";
import { StandardBlock } from "./StandardBlock";
import { KeyBlock } from "./KeyBlock";
import { LockedBlock } from "./LockedBlock";
import { BlockType } from "../levels/types";

/**
 * Factory for creating different types of blocks using polymorphism
 */
export class BlockFactory {
  /**
   * Create a block based on the block type
   * @param blockType - Type of block to create (STANDARD, KEY, or LOCKED)
   * @param scene - Babylon.js scene
   * @param worldPosition - World position (corner of the block)
   * @param gridPosition - Grid position (corner)
   * @param gridSize - Number of grid cells occupied [x, y, z]
   * @param direction - Arrow direction enum
   * @param color - Optional custom color
   * @param parent - Optional parent node for rotation
   * @returns The created block instance
   */
  public static createBlock(
    blockType: BlockType | undefined,
    scene: Scene,
    worldPosition: Vector3,
    gridPosition: Vector3,
    gridSize: Vector3,
    direction: Direction,
    color?: Color3,
    parent?: any
  ): BaseBlock {
    switch (blockType) {
      case BlockType.KEY:
        return new KeyBlock(scene, worldPosition, gridPosition, gridSize, direction, color, parent);

      case BlockType.LOCKED:
        return new LockedBlock(scene, worldPosition, gridPosition, gridSize, direction, color, parent);

      case BlockType.STANDARD:
      default:
        return new StandardBlock(scene, worldPosition, gridPosition, gridSize, direction, color, parent);
    }
  }
}
