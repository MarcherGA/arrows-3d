import { Scene, PointerEventTypes, PointerInfo } from "@babylonjs/core";
import { Block } from "../entities/Block";
import { GameConfig } from "../config/GameConfig";

/**
 * Event types emitted by InputManager
 */
export type InputEvent =
  | { type: "blockHovered"; block: Block | null }
  | { type: "blockClicked"; block: Block }
  | { type: "structureRotated"; deltaX: number; deltaY: number };

export type InputEventHandler = (event: InputEvent) => void;

/**
 * Manages user input for touch/mouse interactions
 */
export class InputManager {
  private scene: Scene;
  private eventHandlers: InputEventHandler[] = [];
  private isDragging: boolean = false;
  private startPointerX: number = 0;
  private startPointerY: number = 0;
  private previousPointerX: number = 0;
  private previousPointerY: number = 0;
  private hoveredBlock: Block | null = null;
  private blocks: Block[] = [];

  constructor(scene: Scene) {
    this.scene = scene;
    this.setupPointerEvents();
  }

  /**
   * Register blocks for raycasting
   */
  public setBlocks(blocks: Block[]): void {
    this.blocks = blocks;
  }

  /**
   * Add event listener
   */
  public on(handler: InputEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event listener
   */
  public off(handler: InputEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: InputEvent): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  /**
   * Setup pointer event handlers
   */
  private setupPointerEvents(): void {
    this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          this.handlePointerDown(pointerInfo);
          break;
        case PointerEventTypes.POINTERMOVE:
          this.handlePointerMove();
          break;
        case PointerEventTypes.POINTERUP:
          this.handlePointerUp();
          break;
      }
    });
  }

  /**
   * Handle pointer down event
   */
  private handlePointerDown(pointerInfo: PointerInfo): void {
    if (pointerInfo.event.button === 0) {
      this.isDragging = true;
      this.startPointerX = this.scene.pointerX;
      this.startPointerY = this.scene.pointerY;
      this.previousPointerX = this.scene.pointerX;
      this.previousPointerY = this.scene.pointerY;
    }
  }

  /**
   * Handle pointer move event
   */
  private handlePointerMove(): void {
    const currentX = this.scene.pointerX;
    const currentY = this.scene.pointerY;

    if (this.isDragging) {
      const deltaX = currentX - this.previousPointerX;
      const deltaY = currentY - this.previousPointerY;

      // Check if movement exceeds threshold
      const totalDeltaX = Math.abs(currentX - this.startPointerX);
      const totalDeltaY = Math.abs(currentY - this.startPointerY);
      const { DRAG_THRESHOLD } = GameConfig.INPUT;

      if (totalDeltaX > DRAG_THRESHOLD || totalDeltaY > DRAG_THRESHOLD) {
        this.emit({
          type: "structureRotated",
          deltaX,
          deltaY,
        });
      }

      this.previousPointerX = currentX;
      this.previousPointerY = currentY;
    } else {
      // Handle hover when not dragging
      this.updateHover();
    }
  }

  /**
   * Handle pointer up event
   */
  private handlePointerUp(): void {
    if (!this.isDragging) return;

    const totalDeltaX = Math.abs(this.scene.pointerX - this.startPointerX);
    const totalDeltaY = Math.abs(this.scene.pointerY - this.startPointerY);
    const { DRAG_THRESHOLD } = GameConfig.INPUT;

    // If movement was minimal, treat as click
    if (totalDeltaX <= DRAG_THRESHOLD && totalDeltaY <= DRAG_THRESHOLD) {
      const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);

      if (pickResult && pickResult.hit && pickResult.pickedMesh) {
        const clickedBlock = this.blocks.find(
          (block) => block.getMesh() === pickResult.pickedMesh
        );

        if (clickedBlock) {
          this.emit({ type: "blockClicked", block: clickedBlock });
        }
      }
    }

    this.isDragging = false;
  }

  /**
   * Update hover state using raycasting
   */
  private updateHover(): void {
    const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    let newHoveredBlock: Block | null = null;

    if (pickResult && pickResult.hit && pickResult.pickedMesh) {
      newHoveredBlock = this.blocks.find(
        (block) => block.getMesh() === pickResult.pickedMesh
      ) || null;
    }

    // Only emit if hover state changed
    if (newHoveredBlock !== this.hoveredBlock) {
      // Update hover state
      this.hoveredBlock = newHoveredBlock;

      this.emit({ type: "blockHovered", block: this.hoveredBlock });
    }
  }

  /**
   * Clean up
   */
  public dispose(): void {
    this.eventHandlers = [];
    this.hoveredBlock = null;
  }
}
