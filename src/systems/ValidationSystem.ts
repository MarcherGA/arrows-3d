import { Ray } from "@babylonjs/core";
import { Block } from "../entities/Block";
import { BLOCK } from "../constants";

/**
 * Validates block removal logic using raycasting
 */
export class ValidationSystem {
  constructor() {
    // No scene needed, raycasting uses block meshes directly
  }

  /**
   * Check if a specific block can be removed (no obstructions in arrow direction)
   * @param block - The block to check
   * @param allBlocks - All blocks in the scene
   * @returns true if block can be removed, false if blocked
   */
  public isBlockRemovable(block: Block, allBlocks: Block[]): boolean {
    const origin = block.position;
    const direction = block.arrowDirection;

    // Create ray from block center in arrow direction
    const ray = new Ray(origin, direction, BLOCK.COLLISION_CHECK_DISTANCE);

    // Check against all other blocks
    for (const otherBlock of allBlocks) {
      if (otherBlock === block) continue;

      // Perform ray intersection with the other block's mesh
      const pickInfo = ray.intersectsMesh(otherBlock.getMesh());

      if (pickInfo.hit && pickInfo.distance > 0.1) {
        // There's a block in the way
        return false;
      }
    }

    return true;
  }

  /**
   * Update removable state for all blocks
   * @param blocks - All blocks to update
   */
  public updateAllBlockStates(blocks: Block[]): void {
    for (const block of blocks) {
      const isRemovable = this.isBlockRemovable(block, blocks);
      block.updateRemovableState(isRemovable);
    }
  }

  /**
   * Get all currently removable blocks
   * @param blocks - All blocks to check
   * @returns Array of removable blocks
   */
  public getRemovableBlocks(blocks: Block[]): Block[] {
    return blocks.filter((block) => this.isBlockRemovable(block, blocks));
  }

  /**
   * Check if all blocks have been cleared
   * @param blocks - Current blocks in the scene
   * @returns true if no blocks remain
   */
  public isLevelComplete(blocks: Block[]): boolean {
    return blocks.length === 0;
  }
}
