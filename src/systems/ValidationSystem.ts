import { Vector3 } from "@babylonjs/core";
import { Block } from "../entities/Block";
import { OccupancyGrid } from "./OccupancyGrid";

/**
 * Validates block removal logic using grid-based collision detection
 */
export class ValidationSystem {
  private occupancyGrid!: OccupancyGrid;

  /**
   * Set the occupancy grid to use for validation
   */
  public setOccupancyGrid(grid: OccupancyGrid): void {
    this.occupancyGrid = grid;
  }

  /**
   * Check if a specific block can be removed (no obstructions in arrow direction)
   * @param block - The block to check
   * @returns Object with isRemovable flag and optional blocking block
   */
  public checkBlockRemoval(block: Block): { isRemovable: boolean; blockingBlock?: Block } {
    const gridDir = this.getGridDirection(block.arrowDirection);

    // Find the first block blocking this block's path
    const blockingBlock = this.occupancyGrid.getBlockingBlock(block, gridDir);

    return {
      isRemovable: !blockingBlock,
      blockingBlock: blockingBlock,
    };
  }

  /**
   * Check if a specific block can be removed (backward compatibility)
   * @param block - The block to check
   * @param _allBlocks - All blocks in the scene (unused now, kept for compatibility)
   * @returns true if block can be removed, false if blocked
   */
  public isBlockRemovable(block: Block, _allBlocks: Block[]): boolean {
    return this.checkBlockRemoval(block).isRemovable;
  }

  /**
   * Convert world direction to grid direction (normalize to -1, 0, 1)
   */
  private getGridDirection(worldDirection: Vector3): Vector3 {
    return new Vector3(
      Math.sign(worldDirection.x),
      Math.sign(worldDirection.y),
      Math.sign(worldDirection.z)
    );
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
   * Check if all blocks have been cleared
   * @param blocks - Current blocks in the scene
   * @returns true if no blocks remain
   */
  public isLevelComplete(blocks: Block[]): boolean {
    return blocks.length === 0;
  }
}
