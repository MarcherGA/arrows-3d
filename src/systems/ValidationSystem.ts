import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Block } from "../entities/Block";
import { OccupancyGrid } from "./OccupancyGrid";
import { Vector3Pool } from "./ObjectPool";

/**
 * Validates block removal logic using grid-based collision detection
 * Uses object pooling to reduce garbage collection pressure
 */
export class ValidationSystem {
  private occupancyGrid!: OccupancyGrid;
  private readonly vectorPool: Vector3Pool;

  constructor() {
    this.vectorPool = Vector3Pool.getInstance();
  }

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

    try {
      // Find the first block blocking this block's path
      const blockingBlock = this.occupancyGrid.getBlockingBlock(block, gridDir);

      return {
        isRemovable: !block.isLocked && !blockingBlock,
        blockingBlock: blockingBlock,
      };
    } finally {
      // Always release the pooled vector
      this.vectorPool.release(gridDir);
    }
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
   * Uses object pooling to reduce allocations
   */
  private getGridDirection(worldDirection: Vector3): Vector3 {
    const gridDir = this.vectorPool.acquire();
    gridDir.set(
      Math.sign(worldDirection.x),
      Math.sign(worldDirection.y),
      Math.sign(worldDirection.z)
    );
    return gridDir;
  }

  /**
   * Update removable state for all blocks
   * @param blocks - All blocks to update
   */
  public updateAllBlockStates(blocks: Block[]): void {
    for (const block of blocks) {
      // Locked blocks can never be removed until unlocked
      if (block.isLocked) {
        block.updateRemovableState(false);
        continue;
      }

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
