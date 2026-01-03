import { Scene, Vector3 } from "@babylonjs/core";
import { GameManager } from "../game/GameManager";
import { Block } from "../entities/Block";

/**
 * Configuration constants for tutorial timing and positioning
 */
const TUTORIAL_CONFIG = {
  // Timing
  INITIAL_LOAD_DELAY: 300,
  FINGER_MOVEMENT_DURATION: 600,
  FINGER_ARRIVE_DELAY: 700,
  PRESS_MIDPOINT_DELAY: 300,
  SHAKE_ANIMATION_DELAY: 400,
  BLOCK_FLY_AWAY_DELAY: 400,
  SPIN_STEP_DELAY: 50,
  SPIN_END_DELAY: 300,
  FINGER_SHOW_DELAY: 200,
  BOUNCE_REPEAT_COUNT: 3,
  BOUNCE_DELAY: 400,
  BOUNCE_PAUSE_DELAY: 2000,
  BLOCK_CHECK_INTERVAL: 100,

  // Positioning
  SPIN_DISTANCE: 120,
  SPIN_STEPS: 15,
  SPIN_ROTATION_AMOUNT: 0.05,
  SPIN_ARC_HEIGHT: 20,
  BLOCKED_BLOCK_OFFSET_X: 40,
  BLOCKED_BLOCK_OFFSET_Y: 40,
  BLOCKING_BLOCK_OFFSET_X: 60,
  BLOCKING_BLOCK_OFFSET_Y: 60,
  TARGET_BLOCK_OFFSET_X: 30,
  TARGET_BLOCK_OFFSET_Y: 70,

  // Grid positions for demonstration blocks
  BLOCKED_BLOCK_POS: { x: 0, y: 2, z: 1 },
  BLOCKING_BLOCK_POS: { x: 0, y: 2, z: 2 },

  // Animation
  PRESS_ANIMATION_DURATION: 150,
  PRESS_SCALE: 0.85,
  BOUNCE_DISTANCE: 20,
  BOUNCE_ANIMATION_DURATION: 200,
} as const;

/**
 * Position offset for finger pointer
 */
interface FingerOffset {
  x: number;
  y: number;
}

/**
 * Manages the autoplay tutorial sequence for playable ads
 * Demonstrates game mechanics through automated finger gestures
 *
 * Tutorial flow:
 * 1. Spin cube to reveal blocks
 * 2. Demonstrate blocking mechanics
 * 3. Guide user to make first move
 */
export class AutoplayManager {
  private readonly scene: Scene;
  private readonly gameManager: GameManager;
  private fingerElement: HTMLElement | null = null;
  private isPlaying: boolean = false;
  private blockCheckInterval: number | null = null;

  constructor(scene: Scene, gameManager: GameManager) {
    this.scene = scene;
    this.gameManager = gameManager;
    this.createFingerElement();
  }

  /**
   * Start the autoplay tutorial sequence
   */
  public async start(): Promise<void> {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.gameManager.enableInput();
    this.setCanvasPointerEvents(false);

    await this.wait(TUTORIAL_CONFIG.INITIAL_LOAD_DELAY);

    await this.demonstrateSpinning();
    await this.demonstrateBlockingMechanic();
    await this.loopPointingToFirstMove();
  }

  /**
   * Stop the autoplay sequence and clean up
   */
  public stop(): void {
    this.isPlaying = false;
    this.clearBlockCheckInterval();
    this.hideFinger();
    this.enableFullInput();
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    this.removeFingerElement();
  }

  // ==================== Tutorial Steps ====================

  /**
   * Step 1: Demonstrate spinning the cube to reveal blocks
   */
  private async demonstrateSpinning(): Promise<void> {
    if (!this.fingerElement) return;

    const { centerX, centerY } = this.getScreenCenter();

    this.showFinger(centerX, centerY);
    await this.wait(TUTORIAL_CONFIG.FINGER_SHOW_DELAY);

    await this.performSpinGesture(centerX, centerY);
    await this.wait(TUTORIAL_CONFIG.SPIN_END_DELAY);
  }

  /**
   * Step 2: Demonstrate blocking mechanic (blocked block + blocking block)
   */
  private async demonstrateBlockingMechanic(): Promise<void> {
    const blocks = this.getAvailableBlocks();
    if (blocks.length === 0) return;

    const { blockedBlock, blockingBlock } = this.findDemonstrationBlocks(blocks);

    if (!blockedBlock || !blockingBlock) {
      await this.handleFallbackClick(blocks);
      return;
    }

    await this.demonstrateBlockedClick(blockedBlock);
    await this.demonstrateBlockingBlockRemoval(blockingBlock);
  }

  /**
   * Step 3: Loop pointing animation until user clicks the target block
   */
  private async loopPointingToFirstMove(): Promise<void> {
    const targetBlock = this.findTargetBlock();
    if (!targetBlock) return;

    await this.moveFingerToBlock(targetBlock, {
      x: TUTORIAL_CONFIG.TARGET_BLOCK_OFFSET_X,
      y: TUTORIAL_CONFIG.TARGET_BLOCK_OFFSET_Y,
    });

    this.setupRestrictedInput(targetBlock);
    await this.performBouncingLoop();
  }

  // ==================== Block Finding ====================

  /**
   * Find the blocks used for demonstration
   */
  private findDemonstrationBlocks(blocks: Block[]): {
    blockedBlock: Block | null;
    blockingBlock: Block | null;
  } {
    const { x: bx, y: by, z: bz } = TUTORIAL_CONFIG.BLOCKED_BLOCK_POS;
    const { x: kx, y: ky, z: kz } = TUTORIAL_CONFIG.BLOCKING_BLOCK_POS;

    return {
      blockedBlock: this.findBlockAtGridPosition(blocks, bx, by, bz),
      blockingBlock: this.findBlockAtGridPosition(blocks, kx, ky, kz),
    };
  }

  /**
   * Find the target block for user to click
   */
  private findTargetBlock(): Block | null {
    const blocks = this.getAvailableBlocks();
    if (blocks.length === 0) return null;

    const { x, y, z } = TUTORIAL_CONFIG.BLOCKED_BLOCK_POS;
    return this.findBlockAtGridPosition(blocks, x, y, z) || this.findRemovableBlock(blocks);
  }

  /**
   * Find a block at specific grid coordinates
   */
  private findBlockAtGridPosition(blocks: Block[], x: number, y: number, z: number): Block | null {
    return blocks.find((block) => {
      const { x: gx, y: gy, z: gz } = block.gridPosition;
      return gx === x && gy === y && gz === z;
    }) || null;
  }

  /**
   * Find any removable block as fallback
   */
  private findRemovableBlock(blocks: Block[]): Block | null {
    const validationSystem = this.gameManager.getValidationSystem();

    return blocks.find((block) => {
      if (block.isAnimating()) return false;
      const result = validationSystem.checkBlockRemoval(block);
      return result.isRemovable;
    }) || null;
  }

  // ==================== Gesture Actions ====================

  /**
   * Perform spinning gesture animation
   */
  private async performSpinGesture(startX: number, startY: number): Promise<void> {
    const { SPIN_DISTANCE, SPIN_STEPS, SPIN_ROTATION_AMOUNT, SPIN_ARC_HEIGHT, SPIN_STEP_DELAY } =
      TUTORIAL_CONFIG;

    const stepDistance = SPIN_DISTANCE / SPIN_STEPS;
    const blockContainer = this.scene.getTransformNodeByName("blockContainer");

    for (let i = 0; i < SPIN_STEPS; i++) {
      if (blockContainer) {
        blockContainer.rotation.y -= SPIN_ROTATION_AMOUNT;
      }

      const progress = i / SPIN_STEPS;
      const x = startX + stepDistance * i;
      const y = startY + Math.sin(progress * Math.PI) * SPIN_ARC_HEIGHT;

      this.moveFinger(x, y);
      await this.wait(SPIN_STEP_DELAY);
    }
  }

  /**
   * Demonstrate clicking a blocked block
   */
  private async demonstrateBlockedClick(block: Block): Promise<void> {
    await this.moveFingerToBlock(block, {
      x: TUTORIAL_CONFIG.BLOCKED_BLOCK_OFFSET_X,
      y: TUTORIAL_CONFIG.BLOCKED_BLOCK_OFFSET_Y,
    });

    await this.performSyncedClick(block);
    await this.wait(TUTORIAL_CONFIG.SHAKE_ANIMATION_DELAY);
  }

  /**
   * Demonstrate clicking the blocking block to remove it
   */
  private async demonstrateBlockingBlockRemoval(block: Block): Promise<void> {
    await this.moveFingerToBlock(block, {
      x: TUTORIAL_CONFIG.BLOCKING_BLOCK_OFFSET_X,
      y: TUTORIAL_CONFIG.BLOCKING_BLOCK_OFFSET_Y,
    });

    await this.performSyncedClick(block);
    await this.wait(TUTORIAL_CONFIG.BLOCK_FLY_AWAY_DELAY);
  }

  /**
   * Perform a synchronized click (finger press + block click)
   */
  private async performSyncedClick(block: Block): Promise<void> {
    const pressPromise = this.animateFingerPress();
    await this.wait(TUTORIAL_CONFIG.PRESS_MIDPOINT_DELAY);
    this.simulateBlockClick(block);
    await pressPromise;
  }

  /**
   * Handle fallback when demonstration blocks are not found
   */
  private async handleFallbackClick(blocks: Block[]): Promise<void> {
    console.warn("Could not find blocked/blocking blocks at specified positions");
    const fallbackBlock = this.findRemovableBlock(blocks);
    if (fallbackBlock) {
      await this.clickAndRemoveBlock(fallbackBlock);
    }
  }

  /**
   * Click and remove a block (legacy fallback method)
   */
  private async clickAndRemoveBlock(block: Block): Promise<void> {
    const screenPos = this.getBlockScreenPosition(block);
    if (!screenPos) return;

    this.moveFingerSmooth(screenPos.x, screenPos.y, TUTORIAL_CONFIG.FINGER_MOVEMENT_DURATION);
    await this.wait(TUTORIAL_CONFIG.FINGER_ARRIVE_DELAY);
    await this.animateFingerPress();
    await this.wait(200);
    this.simulateBlockClick(block);
    await this.wait(1000);
  }

  /**
   * Perform the bouncing loop animation
   */
  private async performBouncingLoop(): Promise<void> {
    while (this.isPlaying) {
      for (let i = 0; i < TUTORIAL_CONFIG.BOUNCE_REPEAT_COUNT; i++) {
        if (!this.isPlaying) break;
        await this.animateFingerBounce();
        await this.wait(TUTORIAL_CONFIG.BOUNCE_DELAY);
      }
      await this.wait(TUTORIAL_CONFIG.BOUNCE_PAUSE_DELAY);
    }
  }

  // ==================== Finger Movement ====================

  /**
   * Move finger to a block with offset
   */
  private async moveFingerToBlock(block: Block, offset: FingerOffset): Promise<void> {
    const screenPos = this.getBlockScreenPosition(block);
    if (!screenPos) return;

    const targetX = screenPos.x + offset.x;
    const targetY = screenPos.y + offset.y;

    this.moveFingerSmooth(targetX, targetY, TUTORIAL_CONFIG.FINGER_MOVEMENT_DURATION);
    await this.wait(TUTORIAL_CONFIG.FINGER_ARRIVE_DELAY);
  }

  /**
   * Show finger at position
   */
  private showFinger(x: number, y: number): void {
    if (!this.fingerElement) return;
    this.fingerElement.style.display = "block";
    this.fingerElement.style.left = `${x}px`;
    this.fingerElement.style.top = `${y}px`;
  }

  /**
   * Move finger instantly (no transition)
   */
  private moveFinger(x: number, y: number): void {
    if (!this.fingerElement) return;
    this.fingerElement.style.left = `${x}px`;
    this.fingerElement.style.top = `${y}px`;
  }

  /**
   * Move finger with smooth transition
   */
  private moveFingerSmooth(x: number, y: number, duration: number): void {
    if (!this.fingerElement) return;
    this.fingerElement.style.transition = `left ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), top ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    this.fingerElement.style.left = `${x}px`;
    this.fingerElement.style.top = `${y}px`;
  }

  /**
   * Hide the finger
   */
  private hideFinger(): void {
    if (!this.fingerElement) return;
    this.fingerElement.style.display = "none";
  }

  // ==================== Finger Animations ====================

  /**
   * Animate finger pressing down
   */
  private async animateFingerPress(): Promise<void> {
    if (!this.fingerElement) return;

    const { PRESS_ANIMATION_DURATION, PRESS_SCALE } = TUTORIAL_CONFIG;

    this.fingerElement.style.transition = `transform ${PRESS_ANIMATION_DURATION}ms`;
    this.fingerElement.style.transform = `translate(-50%, -50%) scale(${PRESS_SCALE})`;
    await this.wait(PRESS_ANIMATION_DURATION);

    this.fingerElement.style.transform = "translate(-50%, -50%) scale(1)";
    await this.wait(PRESS_ANIMATION_DURATION);
  }

  /**
   * Animate finger bouncing
   */
  private async animateFingerBounce(): Promise<void> {
    if (!this.fingerElement) return;

    const originalTop = this.fingerElement.style.top;
    const currentTop = parseFloat(originalTop);
    const { BOUNCE_DISTANCE, BOUNCE_ANIMATION_DURATION } = TUTORIAL_CONFIG;

    this.fingerElement.style.transition = `top ${BOUNCE_ANIMATION_DURATION}ms`;
    this.fingerElement.style.top = `${currentTop - BOUNCE_DISTANCE}px`;
    await this.wait(BOUNCE_ANIMATION_DURATION);

    this.fingerElement.style.top = originalTop;
    await this.wait(BOUNCE_ANIMATION_DURATION);
  }

  // ==================== Input Management ====================

  /**
   * Setup restricted input mode
   */
  private setupRestrictedInput(targetBlock: Block): void {
    this.setCanvasPointerEvents(true);
    this.gameManager.setRestrictedBlock(targetBlock);
    this.startBlockCheckInterval(targetBlock);
  }

  /**
   * Start checking if target block was clicked
   */
  private startBlockCheckInterval(targetBlock: Block): void {
    this.blockCheckInterval = window.setInterval(() => {
      const blocks = this.gameManager.getBlocks();
      if (!blocks.includes(targetBlock)) {
        this.endTutorial();
      }
    }, TUTORIAL_CONFIG.BLOCK_CHECK_INTERVAL);
  }

  /**
   * Clear the block check interval
   */
  private clearBlockCheckInterval(): void {
    if (this.blockCheckInterval !== null) {
      clearInterval(this.blockCheckInterval);
      this.blockCheckInterval = null;
    }
  }

  /**
   * Enable full input after tutorial
   */
  private enableFullInput(): void {
    this.setCanvasPointerEvents(true);
    this.gameManager.setRestrictedBlock(null);
  }

  /**
   * Set canvas pointer events
   */
  private setCanvasPointerEvents(enabled: boolean): void {
    const canvas = this.scene.getEngine().getRenderingCanvas();
    if (canvas) {
      canvas.style.pointerEvents = enabled ? "auto" : "none";
    }
  }

  /**
   * End tutorial and enable free play
   */
  private endTutorial(): void {
    this.clearBlockCheckInterval();
    this.isPlaying = false;
    this.hideFinger();
    this.enableFullInput();
  }

  // ==================== Helper Methods ====================

  /**
   * Get screen center coordinates
   */
  private getScreenCenter(): { centerX: number; centerY: number } {
    return {
      centerX: window.innerWidth / 2,
      centerY: window.innerHeight / 2,
    };
  }

  /**
   * Get screen position of a block
   */
  private getBlockScreenPosition(block: Block): { x: number; y: number } | null {
    const mesh = block.getMesh();
    const camera = this.scene.activeCamera;
    if (!camera) return null;

    const viewport = camera.viewport.toGlobal(
      this.scene.getEngine().getRenderWidth(),
      this.scene.getEngine().getRenderHeight()
    );

    const screenPos = Vector3.Project(
      mesh.position,
      mesh.getWorldMatrix(),
      this.scene.getTransformMatrix(),
      viewport
    );

    return { x: screenPos.x, y: screenPos.y };
  }

  /**
   * Get available blocks from game manager
   */
  private getAvailableBlocks(): Block[] {
    return this.gameManager.getBlocks();
  }

  /**
   * Simulate clicking a block
   */
  private simulateBlockClick(block: Block): void {
    this.gameManager.clickBlock(block);
  }

  /**
   * Wait for specified milliseconds
   */
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== DOM Management ====================

  /**
   * Create the finger pointer HTML element
   */
  private createFingerElement(): void {
    this.fingerElement = document.createElement("div");
    this.fingerElement.id = "tutorialFinger";
    this.fingerElement.innerHTML = "👆";
    this.fingerElement.style.cssText = `
      position: fixed;
      font-size: 48px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      transform: translate(-50%, -50%);
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
    `;
    document.body.appendChild(this.fingerElement);
  }

  /**
   * Remove the finger element from DOM
   */
  private removeFingerElement(): void {
    if (this.fingerElement?.parentNode) {
      this.fingerElement.parentNode.removeChild(this.fingerElement);
    }
    this.fingerElement = null;
  }
}
