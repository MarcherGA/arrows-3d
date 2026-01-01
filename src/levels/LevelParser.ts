import { Vector3 } from "@babylonjs/core";
import { BLOCK } from "../constants";
import type { BlockData } from "./Level1";

/**
 * Parses level configuration and converts grid positions to world positions
 * accounting for block sizes and gaps
 */
export class LevelParser {
  /**
   * Process all blocks in a level, converting grid positions to world positions
   *
   * Grid position 0 = world position 0
   * Distance from grid N to grid N+1 = (sizeN / 2) + GAP + (sizeN+1 / 2)
   */
  public static processLevelBlocks(blocks: BlockData[]): BlockData[] {
    const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];

    // First pass: convert grid to world positions
    const worldBlocks = blocks.map(block => {
      const worldPos = new Vector3(0, 0, 0);

      for (const axis of axes) {
        const gridPos = block.position[axis];
        worldPos[axis] = this.gridToWorld(gridPos);
      }

      return {
        ...block,
        position: worldPos,
      };
    });

    // Calculate the bounding box center
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);

    for (const block of worldBlocks) {
      const pos = block.position;
      min.x = Math.min(min.x, pos.x);
      min.y = Math.min(min.y, pos.y);
      min.z = Math.min(min.z, pos.z);
      max.x = Math.max(max.x, pos.x);
      max.y = Math.max(max.y, pos.y);
      max.z = Math.max(max.z, pos.z);
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
      position: block.position.subtract(center),
    }));
  }

  /**
   * Convert a single grid position to world position on one axis
   * Simple version: each grid unit = DEFAULT_SIZE + GAP
   */
  private static gridToWorld(gridPos: number): number {
    const spacing = BLOCK.DEFAULT_SIZE + BLOCK.GAP;
    return gridPos * spacing;
  }
}
