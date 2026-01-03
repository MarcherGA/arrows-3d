import { Scene, TransformNode, Vector3, ArcRotateCamera } from "@babylonjs/core";
import { Block } from "../entities/Block";
import { InputManager } from "./InputManager";
import type { InputEvent } from "./InputManager";
import { ValidationSystem } from "../systems/ValidationSystem";
import { OccupancyGrid } from "../systems/OccupancyGrid";
import type { LevelData } from "../levels/types";
import { LevelParser } from "../levels/LevelParser";
import { LevelRegistry } from "../levels/LevelRegistry";
import { GameConfig, GAME_STATE } from "../config/GameConfig";
import { UIManager } from "../ui/UIManager";
import { SoundManager, SoundType } from "../audio/SoundManager";

// Re-export for backward compatibility
export const GameState = GAME_STATE;
export type GameState = typeof GAME_STATE[keyof typeof GAME_STATE];

/**
 * Orchestrates gameplay, manages blocks, and handles game state
 */
export class GameManager {
  private scene: Scene;
  private blocks: Block[] = [];
  private inputManager: InputManager;
  private validationSystem: ValidationSystem;
  private occupancyGrid!: OccupancyGrid;
  private blockContainer: TransformNode;
  private gameState: GameState = GameState.PLAYING;
  private onWinCallback?: () => void;
  private onBlockRemovedCallback?: (remainingBlocks: number) => void;
  private uiManager: UIManager;
  private restrictedBlock: Block | null = null; // For tutorial mode
  private inputBlocked: boolean = true; // Block input during initialization
  private soundManager: SoundManager;
  private currentLevelNumber: number = 1; // Track current level

  // Playable ad timers
  private idleTimer?: number;
  private totalEngagementTimer?: number;
  private onTimeoutCallback?: () => void;
  private inputFailsafeTimer?: number;
  private idleCueTimer?: number;
  private currentIdleCueBlock?: Block;
  private idleCueEnabled: boolean = false; // Track if idle cue has been enabled

  constructor(scene: Scene, uiManager: UIManager, soundManager: SoundManager) {
    this.scene = scene;
    this.uiManager = uiManager;
    this.soundManager = soundManager;
    this.inputManager = new InputManager(scene);
    this.validationSystem = new ValidationSystem();
    this.blockContainer = new TransformNode("blockContainer", scene);

    // Setup input event handlers
    this.inputManager.on(this.handleInputEvent.bind(this));
  }

  /**
   * Start the game from level 1
   */
  public startGame(): void {
    this.currentLevelNumber = 1;
    this.loadCurrentLevel();
    this.startEngagementTimers();
  }

  /**
   * Start playable ad engagement timers
   */
  private startEngagementTimers(): void {
    if (!GameConfig.PLAYABLE_AD.ENABLE_AUTO_CTA) return;

    // Start total engagement timer
    this.totalEngagementTimer = window.setTimeout(() => {
      this.handleEngagementTimeout();
    }, GameConfig.PLAYABLE_AD.MAX_ENGAGEMENT_TIME);

    // Start idle timer
    this.resetIdleTimer();
  }

  /**
   * Reset idle timer (called on any user interaction)
   */
  private resetIdleTimer(): void {
    if (!GameConfig.PLAYABLE_AD.ENABLE_AUTO_CTA) return;

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = window.setTimeout(() => {
      this.handleIdleTimeout();
    }, GameConfig.PLAYABLE_AD.IDLE_TIMEOUT);

    // Also reset idle cue timer
    this.resetIdleCueTimer();
  }

  /**
   * Reset idle cue timer (shows hint after brief inactivity)
   */
  private resetIdleCueTimer(): void {
    // Check if idle cue is enabled (either by config or dynamically)
    if (!GameConfig.PLAYABLE_AD.ENABLE_IDLE_CUE && !this.idleCueEnabled) return;

    // Clear existing cue timer and animation
    if (this.idleCueTimer) {
      clearTimeout(this.idleCueTimer);
    }

    // Clear any existing idle cue animation
    if (this.currentIdleCueBlock) {
      this.currentIdleCueBlock = undefined;
    }

    // Start new idle cue timer
    this.idleCueTimer = window.setTimeout(() => {
      this.showIdleCue();
    }, GameConfig.PLAYABLE_AD.IDLE_CUE_TIMEOUT);
  }

  /**
   * Show idle engagement cue (subtle pulse on removable block)
   */
  private showIdleCue(): void {
    // Find a removable block to highlight
    const removableBlock = this.blocks.find((block) => {
      if (block.isAnimating()) return false;
      const result = this.validationSystem.checkBlockRemoval(block);
      return result.isRemovable;
    });

    if (removableBlock) {
      this.currentIdleCueBlock = removableBlock;
      // Trigger a gentle shake/pulse as a hint
      removableBlock.shake();
    }
  }

  /**
   * Handle idle timeout (no interaction for IDLE_TIMEOUT ms)
   */
  private handleIdleTimeout(): void {
    console.log("⏰ Idle timeout - user inactive");
    // Trigger CTA or show hint
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  /**
   * Handle total engagement timeout (MAX_ENGAGEMENT_TIME reached)
   */
  private handleEngagementTimeout(): void {
    console.log("⏰ Max engagement time reached - forcing CTA");
    this.gameState = GameState.GAME_OVER;
    if (this.onTimeoutCallback) {
      this.onTimeoutCallback();
    }
  }

  /**
   * Clear all playable ad timers
   */
  private clearEngagementTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
    if (this.totalEngagementTimer) {
      clearTimeout(this.totalEngagementTimer);
      this.totalEngagementTimer = undefined;
    }
    if (this.inputFailsafeTimer) {
      clearTimeout(this.inputFailsafeTimer);
      this.inputFailsafeTimer = undefined;
    }
    if (this.idleCueTimer) {
      clearTimeout(this.idleCueTimer);
      this.idleCueTimer = undefined;
    }
  }

  /**
   * Start input failsafe timer
   * Ensures input is enabled even if tutorial/initialization fails
   */
  private startInputFailsafe(): void {
    // Clear any existing failsafe timer
    if (this.inputFailsafeTimer) {
      clearTimeout(this.inputFailsafeTimer);
    }

    // Set failsafe to auto-enable input after timeout
    this.inputFailsafeTimer = window.setTimeout(() => {
      if (this.inputBlocked) {
        console.warn("⚠️ Input failsafe triggered - auto-enabling input");
        this.enableInput();
      }
    }, GameConfig.PLAYABLE_AD.INPUT_FAILSAFE_TIMEOUT);
  }

  /**
   * Load the current level by number
   */
  private loadCurrentLevel(): void {
    const levelData = LevelRegistry.getLevelOrDefault(this.currentLevelNumber);
    this.loadLevel(levelData);
  }

  /**
   * Load a level and instantiate all blocks
   */
  public loadLevel(levelData: LevelData): void {
    // Clear existing blocks
    this.clearLevel();

    // Update current level number
    this.currentLevelNumber = levelData.levelNumber;

    // Update UI with level number
    this.uiManager.setLevel(levelData.levelNumber);

    // Reset currency to 0 when loading a new level
    this.uiManager.resetCurrency();

    // Apply camera distance if specified in level data
    if (levelData.cameraDistance) {
      const camera = this.scene.activeCamera as ArcRotateCamera;
      if (camera) {
        const { ENABLE_ZOOM } = GameConfig.CAMERA;

        if (!ENABLE_ZOOM) {
          // When zoom is disabled, lock the camera at the level's specified distance
          camera.lowerRadiusLimit = levelData.cameraDistance;
          camera.upperRadiusLimit = levelData.cameraDistance;
        }

        // Set the camera distance
        camera.radius = levelData.cameraDistance;
      }
    }

    // Start input failsafe timer
    this.startInputFailsafe();

    // Create fresh occupancy grid
    this.occupancyGrid = new OccupancyGrid();

    // Process level blocks: convert grid positions to world positions
    const processedBlocks = LevelParser.processLevelBlocks(levelData.blocks);

    // Create blocks from level data
    for (const blockData of processedBlocks) {
      const block = new Block(
        this.scene,
        blockData.worldPosition,
        blockData.position,
        blockData.gridSize,
        blockData.direction,
        blockData.color,
        this.blockContainer
      );

      // Register in occupancy grid
      this.occupancyGrid.register(block, blockData.position, blockData.gridSize);

      this.blocks.push(block);
    }

    // Update input manager with new blocks
    this.inputManager.setBlocks(this.blocks);

    // Pass grid to validation system
    this.validationSystem.setOccupancyGrid(this.occupancyGrid);

    // Initial validation pass
    this.validationSystem.updateAllBlockStates(this.blocks);

    this.gameState = GameState.PLAYING;
  }

  /**
   * Load next level (or loop back to level 1)
   */
  public loadNextLevel(): void {
    const totalLevels = LevelRegistry.getLevelCount();

    // Move to next level or loop back to 1
    this.currentLevelNumber = (this.currentLevelNumber % totalLevels) + 1;

    this.loadCurrentLevel();
  }

  /**
   * Handle input events from InputManager
   */
  private handleInputEvent(event: InputEvent): void {
    switch (event.type) {
      case "blockClicked":
        this.handleBlockClick(event.block);
        break;

      case "structureRotated":
        this.handleRotation(event.deltaX, event.deltaY);
        break;

      case "blockHovered":
        // Hover feedback is handled by InputManager
        break;
    }
  }

  /**
   * Handle block click
   */
  private handleBlockClick(block: Block): void {
    if (this.gameState !== GameState.PLAYING) return;
    if (block.isAnimating()) return;

    // Block all input during initialization
    if (this.inputBlocked) return;

    // Reset idle timer on interaction
    this.resetIdleTimer();

    // If in tutorial mode with restricted block, only allow clicking that block
    if (this.restrictedBlock && block !== this.restrictedBlock) {
      // Block rotation during tutorial as well
      return;
    }

    // Check in real-time if the block can be removed
    const result = this.validationSystem.checkBlockRemoval(block);

    if (result.isRemovable) {
      // Play success sound and remove the block
      this.soundManager.play(SoundType.BLOCK_CLICKED);
      this.removeBlock(block);
    } else {
      // Play blocked sound
      this.soundManager.play(SoundType.BLOCK_BLOCKED);

      // Shake the clicked block to indicate it can't be removed
      block.shake();

      // Also shake the blocking block if one exists
      if (result.blockingBlock && !result.blockingBlock.isAnimating()) {
        result.blockingBlock.shake();
      }
    }
  }

  /**
   * Remove a block and update game state
   */
  private removeBlock(block: Block): void {
    // Unregister from grid immediately
    this.occupancyGrid.unregister(block);

    // Increment currency immediately when block starts flying away
    this.uiManager.incrementCurrency();

    // Animate removal
    block.flyAway(() => {
      // Remove from array after animation
      const index = this.blocks.indexOf(block);
      if (index > -1) {
        this.blocks.splice(index, 1);
      }

      // Update input manager
      this.inputManager.setBlocks(this.blocks);

      // Update validation for remaining blocks
      this.validationSystem.updateAllBlockStates(this.blocks);

      // Callback for UI updates
      if (this.onBlockRemovedCallback) {
        this.onBlockRemovedCallback(this.blocks.length);
      }

      // Check win condition
      if (this.validationSystem.isLevelComplete(this.blocks)) {
        this.handleWin();
      }
    });
  }

  /**
   * Handle structure rotation
   */
  private handleRotation(deltaX: number, deltaY: number): void {
    if (this.gameState !== GameState.PLAYING) return;

    // Block all input during initialization
    if (this.inputBlocked) return;

    // Reset idle timer on interaction
    this.resetIdleTimer();

    // Block rotation during tutorial restricted mode
    if (this.restrictedBlock) return;

    const camera = this.scene.activeCamera;
    if (!camera) return;

    // Get camera's right and up vectors for screen-relative rotation
    const cameraRight = camera.getDirection(new Vector3(1, 0, 0));
    const cameraUp = camera.getDirection(new Vector3(0, 1, 0));

    const { ROTATION_SENSITIVITY } = GameConfig.CAMERA;

    // Apply rotation around camera's up axis (for horizontal drag)
    if (deltaX !== 0) {
      this.blockContainer.rotate(
        cameraUp,
        -deltaX * ROTATION_SENSITIVITY,
        1 // BABYLON.Space.WORLD
      );
    }

    // Apply rotation around camera's right axis (for vertical drag)
    if (deltaY !== 0) {
      this.blockContainer.rotate(
        cameraRight,
        -deltaY * ROTATION_SENSITIVITY,
        1 // BABYLON.Space.WORLD
      );
    }
  }

  /**
   * Handle win condition
   */
  private handleWin(): void {
    this.gameState = GameState.WON;
    console.log("Level complete!");

    // Clear engagement timers on win
    this.clearEngagementTimers();

    // Play level complete sound
    this.soundManager.play(SoundType.LEVEL_COMPLETE);

    if (this.onWinCallback) {
      this.onWinCallback();
    }
  }

  /**
   * Restart the current level
   */
  public restartCurrentLevel(): void {
    this.loadCurrentLevel();
  }

  /**
   * @deprecated Use restartCurrentLevel() or loadLevel() instead
   */
  public restart(levelData: LevelData): void {
    this.loadLevel(levelData);
  }

  /**
   * Clear all blocks
   */
  private clearLevel(): void {
    for (const block of this.blocks) {
      block.dispose();
    }
    this.blocks = [];
    this.blockContainer.rotation = Vector3.Zero();
  }

  /**
   * Set win callback
   */
  public onWin(callback: () => void): void {
    this.onWinCallback = callback;
  }

  /**
   * Set block removed callback
   */
  public onBlockRemoved(callback: (remainingBlocks: number) => void): void {
    this.onBlockRemovedCallback = callback;
  }

  /**
   * Set timeout callback (for idle/max engagement timeout)
   */
  public onTimeout(callback: () => void): void {
    this.onTimeoutCallback = callback;
  }

  /**
   * Get current game state
   */
  public getState(): GameState {
    return this.gameState;
  }

  /**
   * Get remaining block count
   */
  public getRemainingBlocks(): number {
    return this.blocks.length;
  }

  /**
   * Get all blocks (for autoplay/tutorial)
   */
  public getBlocks(): Block[] {
    return this.blocks;
  }

  /**
   * Get validation system (for autoplay/tutorial)
   */
  public getValidationSystem(): ValidationSystem {
    return this.validationSystem;
  }

  /**
   * Programmatically click a block (for autoplay/tutorial)
   */
  public clickBlock(block: Block): void {
    this.handleBlockClick(block);
  }

  /**
   * Set restricted block for tutorial mode (only allow clicking this block)
   */
  public setRestrictedBlock(block: Block | null): void {
    this.restrictedBlock = block;
  }

  /**
   * Enable input (called when tutorial starts)
   */
  public enableInput(): void {
    this.inputBlocked = false;

    // Clear failsafe timer when input is successfully enabled
    if (this.inputFailsafeTimer) {
      clearTimeout(this.inputFailsafeTimer);
      this.inputFailsafeTimer = undefined;
    }
  }

  /**
   * Enable idle engagement cue (called after tutorial interaction)
   */
  public enableIdleCue(): void {
    // Dynamically enable idle cue by setting the flag and starting the timer
    // This is called after user breaks tutorial or clicks target block
    this.idleCueEnabled = true;
    this.resetIdleCueTimer();
  }

  /**
   * Disable input (for initialization)
   */
  public disableInput(): void {
    this.inputBlocked = true;
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.clearLevel();
    this.clearEngagementTimers();
    this.inputManager.dispose();
    this.blockContainer.dispose();
  }
}
