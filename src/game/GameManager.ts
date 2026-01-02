import { Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { Block } from "../entities/Block";
import { InputManager } from "./InputManager";
import type { InputEvent } from "./InputManager";
import { ValidationSystem } from "../systems/ValidationSystem";
import { OccupancyGrid } from "../systems/OccupancyGrid";
import type { LevelData } from "../levels/Level1";
import { LevelParser } from "../levels/LevelParser";
import { CAMERA } from "../constants";
import { UIManager } from "../ui/UIManager";

/**
 * Game state enum
 */
export const GameState = {
  PLAYING: "PLAYING",
  WON: "WON",
  PAUSED: "PAUSED",
} as const;

export type GameState = typeof GameState[keyof typeof GameState];

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

  constructor(scene: Scene, uiManager: UIManager) {
    this.scene = scene;
    this.uiManager = uiManager;
    this.inputManager = new InputManager(scene);
    this.validationSystem = new ValidationSystem();
    this.blockContainer = new TransformNode("blockContainer", scene);

    // Setup input event handlers
    this.inputManager.on(this.handleInputEvent.bind(this));
  }

  /**
   * Load a level and instantiate all blocks
   */
  public loadLevel(levelData: LevelData): void {
    // Clear existing blocks
    this.clearLevel();

    // Update UI with level number
    this.uiManager.setLevel(levelData.levelNumber);

    // Reset currency to 0 when loading a new level
    this.uiManager.resetCurrency();

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

    // Check in real-time if the block can be removed
    const result = this.validationSystem.checkBlockRemoval(block);

    if (result.isRemovable) {
      // Remove the block
      this.removeBlock(block);
    } else {
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

    // Rotate the container freely to see all sides
    this.blockContainer.rotation.y += deltaX * CAMERA.ROTATION_SENSITIVITY;
    this.blockContainer.rotation.x -= deltaY * CAMERA.ROTATION_SENSITIVITY;
  }

  /**
   * Handle win condition
   */
  private handleWin(): void {
    this.gameState = GameState.WON;
    console.log("Level complete!");

    if (this.onWinCallback) {
      this.onWinCallback();
    }
  }

  /**
   * Restart the current level
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
   * Clean up resources
   */
  public dispose(): void {
    this.clearLevel();
    this.inputManager.dispose();
    this.blockContainer.dispose();
  }
}
