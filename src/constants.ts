/**
 * Game constants for consistent behavior across the application
 */

export const ANIMATION = {
  FLY_AWAY_DURATION_MS: 400,
  FLY_AWAY_DISTANCE: 8,
  SHAKE_DURATION_MS: 150,
  SHAKE_DISTANCE: 0.15,
  FPS: 60,
} as const;

export const CAMERA = {
  INITIAL_ALPHA: -Math.PI / 2,
  INITIAL_BETA: Math.PI / 3,
  INITIAL_RADIUS: 20,
  MIN_RADIUS: 20,
  MAX_RADIUS: 20,
  ALPHA_MIN: 0,
  ALPHA_MAX: 2 * Math.PI,
  BETA_MIN: Math.PI / 6,
  BETA_MAX: (Math.PI / 2) - 0.1,
  ROTATION_SENSITIVITY: 0.005,
} as const;

export const POINTER = {
  DRAG_THRESHOLD: 3,
} as const;

export const BLOCK = {
  SCALE: 1, // Visual size of one grid cell
  GAP: 0.05, // Gap between blocks (in world units)
  ARROW_SIZE: 1.25,
} as const;

export const COLORS = {
  BLOCK_DEFAULT: { r: 0.8, g: 0.6, b: 0.4 },
  ARROW_COLOR: { r: 1, g: 1, b: 1 },
  BACKGROUND: { r: 0.2, g: 0.3, b: 0.4, a: 1 },
} as const;
