import { Color3 } from "@babylonjs/core";
import { Direction } from "../entities/Block";
import type { LevelData } from "./types";
import { LevelRegistry } from "./LevelRegistry";
import { block } from "./blockBuilder";

/**
 * Level 2: Stretched Blocks
 *
 * Demonstrates blocks with different grid sizes
 * gridSize defines how many grid cells the block occupies
 */
export const level2: LevelData = {
  name: "Stretched Blocks",
  levelNumber: 2,
  blocks: [
    // Normal 1x1x1 block at grid (0,0,0)
    block(0, 0, 0, Direction.RIGHT, 1, 1, 1, new Color3(0.4, 0.8, 0.4)),

    // Tall 1x3x1 block at grid (1,0,0) - occupies cells (1,0,0), (1,1,0), (1,2,0)
    block(1, 0, 0, Direction.UP, 1, 3, 1, new Color3(0.6, 0.4, 0.3)),

    // Wide 3x1x1 block at grid (0,0,2) - occupies cells (0,0,2), (1,0,2), (2,0,2)
    block(0, 0, 2, Direction.RIGHT, 3, 1, 1, new Color3(0.4, 0.6, 0.8)),

    // Deep 1x1x2 block at grid (2,0,0) - occupies cells (2,0,0), (2,0,1)
    block(2, 0, 0, Direction.FORWARD, 1, 1, 2, new Color3(0.8, 0.6, 0.4)),
  ],
  cameraDistance: 15,
};

// Auto-register level on module load
LevelRegistry.registerLevel(level2);
