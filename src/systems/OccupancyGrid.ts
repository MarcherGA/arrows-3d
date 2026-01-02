import { Vector3 } from "@babylonjs/core";
import { Block } from "../entities/Block";

/**
 * Simple grid-based spatial data structure for tracking block occupancy
 *
 * Purpose:
 * - Track which blocks occupy which grid cells
 * - Find blocking blocks when validating removal
 */
export class OccupancyGrid {
  private grid: Map<string, Block>;

  constructor() {
    this.grid = new Map();
  }

  /**
   * Convert grid coordinates to string key for Map storage
   */
  private static toKey(x: number, y: number, z: number): string {
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  }

  /**
   * Register a block and mark all its occupied cells
   * @param block - The block to register
   * @param gridPos - Starting grid position (corner)
   * @param gridSize - Number of grid cells occupied in each dimension
   */
  public register(block: Block, gridPos: Vector3, gridSize: Vector3): void {
    // Mark all cells occupied by this block
    for (let x = 0; x < gridSize.x; x++) {
      for (let y = 0; y < gridSize.y; y++) {
        for (let z = 0; z < gridSize.z; z++) {
          const key = OccupancyGrid.toKey(
            gridPos.x + x,
            gridPos.y + y,
            gridPos.z + z
          );

          this.grid.set(key, block);
        }
      }
    }
  }

  /**
   * Unregister a block and free all its occupied cells
   * @param block - The block to unregister
   */
  public unregister(block: Block): void {
    const gridPos = block.gridPosition;
    const gridSize = block.gridSize;

    // Free all cells occupied by this block
    for (let x = 0; x < gridSize.x; x++) {
      for (let y = 0; y < gridSize.y; y++) {
        for (let z = 0; z < gridSize.z; z++) {
          const key = OccupancyGrid.toKey(
            gridPos.x + x,
            gridPos.y + y,
            gridPos.z + z
          );

          this.grid.delete(key);
        }
      }
    }
  }

  /**
   * Find the first block blocking the path in a given direction
   * @param block - The block that wants to move
   * @param direction - Direction vector (should be -1, 0, or 1 per axis)
   * @returns The first blocking block, or undefined if path is clear
   */
  public getBlockingBlock(block: Block, direction: Vector3): Block | undefined {
    const gridPos = block.gridPosition;
    const gridSize = block.gridSize;

    // Start checking one cell beyond this block's boundary in the movement direction
    const startPos = gridPos.clone();

    // Offset the start position by the block's size in the direction of movement
    if (direction.x > 0) startPos.x += gridSize.x;
    if (direction.y > 0) startPos.y += gridSize.y;
    if (direction.z > 0) startPos.z += gridSize.z;
    if (direction.x < 0) startPos.x -= 1;
    if (direction.y < 0) startPos.y -= 1;
    if (direction.z < 0) startPos.z -= 1;

    // Check cells along the movement direction
    // We only need to check the "face" of cells adjacent to this block
    const current = startPos.clone();

    // For each cell in the adjacent face, check if occupied
    for (let step = 0; step < 100; step++) { // Max distance to check
      let foundBlock: Block | undefined;

      // Check all cells in the cross-section perpendicular to movement direction
      if (direction.x !== 0) {
        // Moving along X, check YZ plane
        for (let y = 0; y < gridSize.y; y++) {
          for (let z = 0; z < gridSize.z; z++) {
            const checkPos = new Vector3(
              current.x,
              gridPos.y + y,
              gridPos.z + z
            );
            const blockedBy = this.getBlockAt(checkPos);
            if (blockedBy && blockedBy !== block) {
              foundBlock = blockedBy;
              break;
            }
          }
          if (foundBlock) break;
        }
      } else if (direction.y !== 0) {
        // Moving along Y, check XZ plane
        for (let x = 0; x < gridSize.x; x++) {
          for (let z = 0; z < gridSize.z; z++) {
            const checkPos = new Vector3(
              gridPos.x + x,
              current.y,
              gridPos.z + z
            );
            const blockedBy = this.getBlockAt(checkPos);
            if (blockedBy && blockedBy !== block) {
              foundBlock = blockedBy;
              break;
            }
          }
          if (foundBlock) break;
        }
      } else if (direction.z !== 0) {
        // Moving along Z, check XY plane
        for (let x = 0; x < gridSize.x; x++) {
          for (let y = 0; y < gridSize.y; y++) {
            const checkPos = new Vector3(
              gridPos.x + x,
              gridPos.y + y,
              current.z
            );
            const blockedBy = this.getBlockAt(checkPos);
            if (blockedBy && blockedBy !== block) {
              foundBlock = blockedBy;
              break;
            }
          }
          if (foundBlock) break;
        }
      }

      if (foundBlock) {
        return foundBlock;
      }

      // Move to next position
      current.addInPlace(direction);
    }

    return undefined;
  }

  /**
   * Get the block at a specific grid position
   * @param gridPos - Grid coordinates to check
   * @returns The block at that position, or undefined if empty
   */
  public getBlockAt(gridPos: Vector3): Block | undefined {
    const key = OccupancyGrid.toKey(gridPos.x, gridPos.y, gridPos.z);
    return this.grid.get(key);
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.grid.clear();
  }
}
