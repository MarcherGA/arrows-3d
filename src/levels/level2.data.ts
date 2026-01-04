import { Direction } from "../entities/Block";
import type { LevelData } from "./types";
import { BlockType } from "./types";
import { LevelRegistry } from "./LevelRegistry";
import { block } from "./blockBuilder";

/**
 * Level 2: The Key & Lock Sequence
 *
 * Introduces logic-based gameplay:
 * - Golden KEY block is buried in the center
 * - LOCKED blocks (outer edges) can only be cleared after the KEY is removed
 * - Player must identify the path to the KEY first
 *
 * Win time: 15-30 seconds
 */
export const level2: LevelData = {
  name: "The Key & Lock",
  levelNumber: 2,
  blocks: [
    // LOCKED BLOCKS - Outer layer (bait blocks that tempt the player)
    // These appear clickable but show denial animation until key is cleared
    block(0, 0, 0, Direction.LEFT, 1, 1, 1, undefined, BlockType.LOCKED),
    block(2, 0, 0, Direction.RIGHT, 1, 1, 1, undefined, BlockType.LOCKED),
    block(0, 0, 2, Direction.FORWARD, 1, 1, 1, undefined, BlockType.LOCKED),
    block(2, 0, 2, Direction.BACK, 1, 1, 1, undefined, BlockType.LOCKED),

    // STANDARD BLOCKS - Protective layer around the key
    // These must be cleared to access the key
    block(1, 0, 0, Direction.UP),
    block(0, 0, 1, Direction.DOWN),
    block(2, 0, 1, Direction.DOWN),
    block(1, 0, 2, Direction.UP),

    // KEY BLOCK - Center of the structure (golden, must be cleared first)
    // Only accessible from one side initially
    block(1, 1, 1, Direction.RIGHT, 1, 1, 1, undefined, BlockType.KEY),

    // STANDARD BLOCKS - Top layer (additional challenge)
    block(0, 1, 0, Direction.LEFT),
    block(1, 1, 0, Direction.BACK),
    block(2, 1, 0, Direction.RIGHT),
    block(0, 1, 1, Direction.FORWARD),
    block(2, 1, 1, Direction.BACK),
    block(0, 1, 2, Direction.LEFT),
    block(1, 1, 2, Direction.FORWARD),
    block(2, 1, 2, Direction.RIGHT),
  ],
  cameraDistance: 15,
};

// Auto-register level on module load
LevelRegistry.registerLevel(level2);
