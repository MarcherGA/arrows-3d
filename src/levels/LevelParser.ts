import { Vector3 } from "@babylonjs/core";
import { BLOCK } from "../constants";
import type { BlockData } from "./Level1";

/**
 * Extended block data with grid and world positions
 */
export interface ProcessedBlockData extends BlockData {
  worldPosition: Vector3;  // Final centered world position for rendering
}

/**
 * Parses level configuration and converts grid positions to world positions
 *
 * Design:
 * - Grid position = corner of the block (starting position)
 * - gridSize = number of grid cells occupied [x, y, z]
 * - Each grid cell = 1 visual unit
 * - Fixed gap between all blocks (BLOCK.GAP)
 * - Final structure centered around world origin (0,0,0)
 */
export class LevelParser {
  /**
   * Process all blocks in a level, converting grid positions to world positions
   */
  public static processLevelBlocks(blocks: BlockData[]): ProcessedBlockData[] {
    // First pass: convert grid to world positions
    const worldBlocks = blocks.map(block => {
      const worldPos = this.gridToWorld(block.position);

      return {
        ...block,
        worldPosition: worldPos,
      };
    });

    // Calculate the bounding box center (accounting for block volumes)
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);

    for (const block of worldBlocks) {
      const pos = block.worldPosition;
      const visualSize = this.gridSizeToVisualSize(block.gridSize);

      // Block extends from its corner position
      const blockMin = pos;
      const blockMax = pos.add(visualSize);

      min.x = Math.min(min.x, blockMin.x);
      min.y = Math.min(min.y, blockMin.y);
      min.z = Math.min(min.z, blockMin.z);
      max.x = Math.max(max.x, blockMax.x);
      max.y = Math.max(max.y, blockMax.y);
      max.z = Math.max(max.z, blockMax.z);
    }

    // Calculate center offset
    const center = new Vector3(
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2
    );

    // Second pass: center all blocks around origin
    return worldBlocks.map(block => ({
      ...block,
      worldPosition: block.worldPosition.subtract(center),
    }));
  }

  /**
   * Convert grid position to world position (corner-based)
   * @param gridPos - Grid coordinates
   * @returns World position (corner of the block)
   */
  private static gridToWorld(gridPos: Vector3): Vector3 {
    // Each grid cell = 1 visual unit + gap
    // Spacing includes the visual size plus gap
    const spacing = BLOCK.SCALE + BLOCK.GAP;

    return new Vector3(
      gridPos.x * spacing,
      gridPos.y * spacing,
      gridPos.z * spacing
    );
  }

  /**
   * Convert grid size to visual size (for rendering)
   * @param gridSize - Number of grid cells occupied
   * @returns Visual size in world units
   */
  private static gridSizeToVisualSize(gridSize: Vector3): Vector3 {
    // Visual size = number of cells * cell size, plus gaps between cells within the block
    // For a 3-cell block: cell + gap + cell + gap + cell = 3 cells + 2 gaps
    return new Vector3(
      gridSize.x * BLOCK.SCALE + (gridSize.x - 1) * BLOCK.GAP,
      gridSize.y * BLOCK.SCALE + (gridSize.y - 1) * BLOCK.GAP,
      gridSize.z * BLOCK.SCALE + (gridSize.z - 1) * BLOCK.GAP
    );
  }
}
