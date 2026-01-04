/**
 * Centralized Game Configuration
 * All game constants, balancing values, and configuration in one place
 * This allows for quick iteration and balancing without touching core logic
 */

import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";

/**
 * Animation timing and distance constants
 */
export const ANIMATION_CONFIG = {
  /** Duration of block fly-away animation in milliseconds */
  FLY_AWAY_DURATION_MS: 400,
  /** Distance blocks travel when removed */
  FLY_AWAY_DISTANCE: 8,
  /** Duration of block shake animation when blocked */
  SHAKE_DURATION_MS: 150,
  /** Shake offset distance */
  SHAKE_DISTANCE: 0.15,
  /** Target frames per second for animations */
  FPS: 60,
} as const;

/**
 * Camera positioning and controls
 */
export const CAMERA_CONFIG = {
  /** Initial horizontal rotation (radians) */
  INITIAL_ALPHA: -Math.PI / 2,
  /** Initial vertical rotation - 60 degrees (radians) */
  INITIAL_BETA: Math.PI / 3,
  /** Camera distance from target */
  INITIAL_RADIUS: 15,
  /** Enable user zoom control (otherwise fixed radius) */
  ENABLE_ZOOM: false,
  /** Minimum zoom distance (when zoom enabled) */
  MIN_RADIUS: 10,
  /** Maximum zoom distance (when zoom enabled) */
  MAX_RADIUS: 20,
  /** Minimum horizontal rotation */
  ALPHA_MIN: 0,
  /** Maximum horizontal rotation (full circle) */
  ALPHA_MAX: 2 * Math.PI,
  /** Minimum vertical rotation - 30 degrees */
  BETA_MIN: Math.PI / 6,
  /** Maximum vertical rotation - 80 degrees */
  BETA_MAX: Math.PI / 2 - 0.1,
  /** Mouse/touch rotation sensitivity */
  ROTATION_SENSITIVITY: 0.005,
} as const;

/**
 * Lighting configuration
 */
export const LIGHTING_CONFIG = {
  /** Hemispheric light intensity */
  HEMISPHERIC_INTENSITY: 1.5,
  /** Hemispheric light direction */
  HEMISPHERIC_DIRECTION: { x: 0, y: 1, z: 0 },
  /** Directional light intensity */
  DIRECTIONAL_INTENSITY: 0.2,
  /** Directional light direction */
  DIRECTIONAL_DIRECTION: { x: -1, y: -2, z: -1 },
  /** Directional light position */
  DIRECTIONAL_POSITION: { x: 10, y: 20, z: 10 },
} as const;

/**
 * Input handling configuration 
 */
export const INPUT_CONFIG = {
  /** Pixels threshold to distinguish drag from click */
  DRAG_THRESHOLD: 3,
} as const;

/**
 * Block rendering and layout
 */
export const BLOCK_CONFIG = {
  /** Visual size of one grid cell */
  SCALE: 1,
  /** Gap between blocks in world units */
  GAP: 0.05,
  /** Arrow indicator size */
  ARROW_SIZE: 1.25,
  /** Arrow offset from block face */
  ARROW_FACE_OFFSET: 0.01,
  /** Model path for block mesh */
  MODEL_PATH: "/models/beveled-cube.glb",
  /** Model name within GLB file */
  MODEL_NAME: "BeveledCube",
} as const;

/**
 * Color palette for game elements
 */
export const COLOR_CONFIG = {
  /** Default block color (brown/wood) */
  BLOCK_DEFAULT: new Color3(1, 1, 1),
  /** Arrow indicator color (white) */
  ARROW_COLOR: new Color3(0.459, 0.176, 0.016),
  /** Background clear color (dark blue) */
  BACKGROUND: new Color4(0.2, 0.3, 0.4, 1),
} as const;

/**
 * Audio volume levels (0.0 - 1.0)
 */
export const AUDIO_CONFIG = {
  /** Master volume multiplier */
  MASTER_VOLUME: 1.0,
  /** Sound effects volume */
  SFX_VOLUME: 1.0,
  /** Background music volume */
  MUSIC_VOLUME: 0.3,
  /** Block click sound volume */
  BLOCK_CLICKED_VOLUME: 0.7,
  /** Block blocked sound volume */
  BLOCK_BLOCKED_VOLUME: 0.7,
  /** Level complete sound volume */
  LEVEL_COMPLETE_VOLUME: 0.8,

  /** Sound file paths */
  SOUNDS: {
    BLOCK_CLICKED: "/sounds/block-clicked.ogg",
    BLOCK_BLOCKED: "/sounds/block-blocked.ogg",
    LEVEL_COMPLETE: "/sounds/level-complete.ogg",
    BACKGROUND_MUSIC: "/sounds/background-music.ogg",
  },
} as const;

/**
 * Tutorial/Autoplay configuration
 */
export const TUTORIAL_CONFIG = {
  // === Timing ===
  /** Initial delay before tutorial starts */
  INITIAL_LOAD_DELAY: 300,
  /** Duration of finger movement animations */
  FINGER_MOVEMENT_DURATION: 600,
  /** Delay after finger arrives at target */
  FINGER_ARRIVE_DELAY: 700,
  /** Delay at midpoint of press animation */
  PRESS_MIDPOINT_DELAY: 300,
  /** Wait time for shake animation to complete */
  SHAKE_ANIMATION_DELAY: 400,
  /** Wait time for block fly-away animation */
  BLOCK_FLY_AWAY_DELAY: 400,
  /** Delay between spin animation steps */
  SPIN_STEP_DELAY: 50,
  /** Delay after spin completes */
  SPIN_END_DELAY: 200,
  /** Delay before showing finger */
  FINGER_SHOW_DELAY: 200,
  /** Number of bounces in loop */
  BOUNCE_REPEAT_COUNT: 3,
  /** Delay between bounces */
  BOUNCE_DELAY: 400,
  /** Pause between bounce sequences */
  BOUNCE_PAUSE_DELAY: 1000,
  /** Interval for checking block removal */
  BLOCK_CHECK_INTERVAL: 100,

  // === Positioning ===
  /** Horizontal distance of spin gesture */
  SPIN_DISTANCE: 120,
  /** Number of steps in spin animation */
  SPIN_STEPS: 15,
  /** Rotation amount per spin step */
  SPIN_ROTATION_AMOUNT: 0.05,
  /** Vertical arc height during spin */
  SPIN_ARC_HEIGHT: 20,
  /** Finger offset for blocked block (X) */
  BLOCKED_BLOCK_OFFSET_X: 40,
  /** Finger offset for blocked block (Y) */
  BLOCKED_BLOCK_OFFSET_Y: 50,
  /** Finger offset for blocking block (X) */
  BLOCKING_BLOCK_OFFSET_X: 80,
  /** Finger offset for blocking block (Y) */
  BLOCKING_BLOCK_OFFSET_Y: 80,
  /** Finger offset for target block (X) */
  TARGET_BLOCK_OFFSET_X: 40,
  /** Finger offset for target block (Y) */
  TARGET_BLOCK_OFFSET_Y: 85,

  // === Grid Positions ===
  /** Grid position of blocked demonstration block */
  BLOCKED_BLOCK_POS: { x: 0, y: 2, z: 1 },
  /** Grid position of blocking demonstration block */
  BLOCKING_BLOCK_POS: { x: 0, y: 2, z: 2 },

  // === Animations ===
  /** Duration of finger press animation */
  PRESS_ANIMATION_DURATION: 150,
  /** Scale factor when finger is pressed */
  PRESS_SCALE: 0.85,
  /** Bounce distance in pixels */
  BOUNCE_DISTANCE: 20,
  /** Duration of bounce animation */
  BOUNCE_ANIMATION_DURATION: 200,

  // === Finger Styling ===
  /** Finger emoji */
  FINGER_EMOJI: "👆",
  /** Finger font size */
  FINGER_SIZE: "48px",
  /** Finger z-index */
  FINGER_Z_INDEX: 1000,
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  /** Currency gain per block removed */
  CURRENCY_PER_BLOCK: 1,
  /** Currency icon path */
  CURRENCY_ICON: "/icons/dollar-icon.png",
  /** Currency floating animation icon */
  CURRENCY_GAIN_ICON: "/icons/dollars.png",
  /** Currency floating animation duration (ms) */
  CURRENCY_GAIN_DURATION: 1500,
  /** Level icon path */
  LEVEL_ICON: "/icons/piggy-bank.png",
  /** Delay before showing win overlay (ms) */
  WIN_OVERLAY_DELAY: 500,
} as const;

/**
 * Confetti animation configuration
 */
export const CONFETTI_CONFIG = {
  /** Milliseconds between confetti piece spawns */
  SPAWN_INTERVAL: 150,
  /** Minimum duration for confetti to fall */
  MIN_DURATION: 2000,
  /** Maximum duration for confetti to fall */
  MAX_DURATION: 4000,
  /** Available confetti colors */
  COLORS: [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#f7dc6f",
    "#bb8fce",
    "#85c1e2",
    "#52c7b8",
    "#ffa07a",
  ],
} as const;

/**
 * Performance and optimization settings
 */
export const PERFORMANCE_CONFIG = {
  /** Maximum distance to check for blocking blocks */
  MAX_VALIDATION_DISTANCE: 100,
  /** Enable material caching */
  ENABLE_MATERIAL_CACHE: true,
  /** Enable object pooling for Vector3 */
  ENABLE_VECTOR_POOLING: true,
  /** Pool size for Vector3 objects */
  VECTOR_POOL_SIZE: 50,
} as const;

/**
 * Playable ad specific configuration
 */
export const PLAYABLE_AD_CONFIG = {
  /** Maximum engagement time before forcing CTA (ms) */
  MAX_ENGAGEMENT_TIME: 30000,
  /** Idle timeout before showing nudge/CTA (ms) */
  IDLE_TIMEOUT: 8000,
  /** Enable automatic CTA on timeout (disabled for smooth game loop) */
  ENABLE_AUTO_CTA: false,
  /** Input failsafe timeout - auto-enable if blocked (ms) */
  INPUT_FAILSAFE_TIMEOUT: 5000,
  /** Idle cue timeout - show hint after inactivity (ms) */
  IDLE_CUE_TIMEOUT: 3000,
  /** Enable idle engagement cue (will be enabled after tutorial interaction) */
  ENABLE_IDLE_CUE: false,
} as const;

/**
 * Game state constants
 */
export const GAME_STATE = {
  LOADING: "LOADING",
  PLAYING: "PLAYING",
  PAUSED: "PAUSED",
  WON: "WON",
  GAME_OVER: "GAME_OVER",
} as const;

export type GameState = (typeof GAME_STATE)[keyof typeof GAME_STATE];

/**
 * Unified configuration object for easy access
 */
export const GameConfig = {
  ANIMATION: ANIMATION_CONFIG,
  CAMERA: CAMERA_CONFIG,
  LIGHTING: LIGHTING_CONFIG,
  INPUT: INPUT_CONFIG,
  BLOCK: BLOCK_CONFIG,
  COLOR: COLOR_CONFIG,
  AUDIO: AUDIO_CONFIG,
  TUTORIAL: TUTORIAL_CONFIG,
  UI: UI_CONFIG,
  CONFETTI: CONFETTI_CONFIG,
  PERFORMANCE: PERFORMANCE_CONFIG,
  PLAYABLE_AD: PLAYABLE_AD_CONFIG,
  STATE: GAME_STATE,
} as const;

export default GameConfig;
