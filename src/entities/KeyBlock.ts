import { Scene, Vector3, Color3, Animation, EasingFunction, CubicEase } from "@babylonjs/core";
import { BaseBlock, Direction } from "./BaseBlock";
import { GameConfig } from "../config/GameConfig";

/**
 * KeyBlock - Gold block with pulse animation
 */
export class KeyBlock extends BaseBlock {
  private pulseAnimatable: any = null; // Animatable for KEY block pulse animation

  constructor(
    scene: Scene,
    worldPosition: Vector3,
    gridPosition: Vector3,
    gridSize: Vector3,
    direction: Direction,
    color?: Color3,
    parent?: any
  ) {
    super(scene, worldPosition, gridPosition, gridSize, direction, color, parent);
  }

  protected needsCustomMaterial(color?: Color3): boolean {
    // KEY blocks always need custom material for gold color
    return true;
  }

  protected applyMaterial(color?: Color3): void {
    // Bright gold color for key blocks (highly visible)
    const goldColor = color || new Color3(1, 0.843, 0);
    const goldMaterial = this.materialManager.getMaterialForColor(goldColor);
    goldMaterial.emissiveColor = new Color3(0.3, 0.25, 0); // Add glow
    this.mesh.material = goldMaterial;
    console.log("✨ Created KEY block with gold material");
  }

  protected getArrowColor(): Color3 {
    // Light yellow for key block arrows
    return new Color3(1, 1, 0.8);
  }

  protected onSetupComplete(): void {
    // Start pulse animation for KEY blocks
    this.startPulseAnimation();
  }

  protected onFlyAwayStart(): void {
    // Stop pulse animation when block is cleared
    this.stopPulseAnimation();
  }

  protected onDispose(): void {
    // Ensure pulse animation is stopped
    this.stopPulseAnimation();
  }

  /**
   * Start pulse animation for KEY blocks (scales 1.0 -> 1.1 -> 1.0 every 0.8s)
   */
  private startPulseAnimation(): void {
    if (this.pulseAnimatable) return; // Already running

    const { FPS } = GameConfig.ANIMATION;
    const pulseDuration = 0.8; // Duration in seconds
    const pulseScale = 1.1; // Scale multiplier

    // Get current scale
    const baseScale = this.mesh.scaling.clone();

    // Create scale animation
    const scaleAnim = new Animation(
      "keyPulse",
      "scaling",
      FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const scaleKeys = [
      { frame: 0, value: baseScale },
      { frame: FPS * (pulseDuration / 2), value: baseScale.scale(pulseScale) },
      { frame: FPS * pulseDuration, value: baseScale }
    ];
    scaleAnim.setKeys(scaleKeys);

    // Add smooth easing
    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    scaleAnim.setEasingFunction(easing);

    // Start looping animation
    this.pulseAnimatable = this.scene.beginDirectAnimation(
      this.mesh,
      [scaleAnim],
      0,
      FPS * pulseDuration,
      true // Loop indefinitely
    );

    console.log("✨ Started pulse animation for KEY block");
  }

  /**
   * Stop pulse animation (e.g., when block is cleared)
   */
  private stopPulseAnimation(): void {
    if (this.pulseAnimatable) {
      this.pulseAnimatable.stop();
      this.pulseAnimatable = null;
    }
  }
}
