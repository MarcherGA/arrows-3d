import { Direction } from "../entities/Block";
import type { LevelData } from "./types";
import { LevelRegistry } from "./LevelRegistry";
import { block } from "./blockBuilder";

/**
 * Level 1: 3x3x3 Grid
 *
 * Full 3x3x3 grid with blocks at all 27 positions
 */
export const level1: LevelData = {
  name: "3x3x3 Grid",
  levelNumber: 1,
  blocks: [
    // Layer 0 (y=0) - bottom layer
    block(0, 0, 0, Direction.BACK),
    block(1, 0, 0, Direction.BACK, 2, 1, 1),
    block(0, 0, 1, Direction.DOWN, 1, 2, 1),
    block(1, 0, 1, Direction.LEFT),
    block(2, 0, 1, Direction.RIGHT),
    block(0, 0, 2, Direction.FORWARD),
    block(1, 0, 2, Direction.DOWN, 1, 2, 1),
    block(2, 0, 2, Direction.FORWARD),

    // Layer 1 (y=1) - middle layer
    block(0, 1, 0, Direction.LEFT),
    block(1, 1, 0, Direction.UP),
    block(2, 1, 0, Direction.RIGHT),
    block(1, 1, 1, Direction.LEFT, 2, 1, 1),
    block(0, 1, 2, Direction.UP),
    block(2, 1, 2, Direction.RIGHT),

    // Layer 2 (y=2) - top layer
    block(0, 2, 0, Direction.UP),
    block(1, 2, 0, Direction.RIGHT, 2, 1, 1),
    block(0, 2, 1, Direction.FORWARD),
    block(1, 2, 1, Direction.RIGHT, 1, 1, 2),
    block(2, 2, 1, Direction.BACK),
    block(0, 2, 2, Direction.LEFT),
    block(2, 2, 2, Direction.FORWARD),
  ],
  cameraDistance: 15,
};

// Auto-register level on module load
LevelRegistry.registerLevel(level1);
