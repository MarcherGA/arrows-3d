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
    const blockCenter = block.position;
    const direction = block.arrowDirection;
    const mesh = block.getMesh();

    // Refresh bounding info to ensure it's up to date
    mesh.refreshBoundingInfo();
    const boundingInfo = mesh.getBoundingInfo();
    const extents = boundingInfo.boundingBox.extendSizeWorld; // Use world-space extents

    // Calculate the half-extent in the direction of movement
    const blockHalfExtent =
      Math.abs(direction.x) * extents.x +
      Math.abs(direction.y) * extents.y +
      Math.abs(direction.z) * extents.z;

    // Start the ray from just outside the block's surface in the movement direction
    // Add a small offset (0.15) to ensure we're clearly outside the block's bounds
    const rayOrigin = blockCenter.add(direction.scale(blockHalfExtent + 0.15));

    // Create ray from block surface in arrow direction
    const ray = new Ray(rayOrigin, direction, BLOCK.COLLISION_CHECK_DISTANCE);

    // Check against all other blocks
    for (const otherBlock of allBlocks) {
      if (otherBlock === block) continue;

      // Perform ray intersection with the other block's mesh
      const pickInfo = ray.intersectsMesh(otherBlock.getMesh());

      // If the ray hits another block at any distance, it's blocking
      if (pickInfo.hit) {
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
