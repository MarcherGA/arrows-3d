/**
 * @deprecated This file is deprecated. Use GameConfig from '../config/GameConfig' instead.
 *
 * Legacy constants file - maintained for backward compatibility
 * All new code should import from GameConfig instead
 */

import { GameConfig } from "./config/GameConfig";

// Re-export from GameConfig for backward compatibility
export const ANIMATION = GameConfig.ANIMATION;
export const CAMERA = GameConfig.CAMERA;
export const POINTER = GameConfig.INPUT;
export const BLOCK = GameConfig.BLOCK;

// Convert Color3 back to legacy format for backward compatibility
export const COLORS = {
  BLOCK_DEFAULT: {
    r: GameConfig.COLOR.BLOCK_DEFAULT.r,
    g: GameConfig.COLOR.BLOCK_DEFAULT.g,
    b: GameConfig.COLOR.BLOCK_DEFAULT.b,
  },
  ARROW_COLOR: {
    r: GameConfig.COLOR.ARROW_COLOR.r,
    g: GameConfig.COLOR.ARROW_COLOR.g,
    b: GameConfig.COLOR.ARROW_COLOR.b,
  },
  BACKGROUND: {
    r: GameConfig.COLOR.BACKGROUND.r,
    g: GameConfig.COLOR.BACKGROUND.g,
    b: GameConfig.COLOR.BACKGROUND.b,
    a: GameConfig.COLOR.BACKGROUND.a,
  },
} as const;

export const AUDIO = GameConfig.AUDIO;
