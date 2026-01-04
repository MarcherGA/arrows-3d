import {
  Scene,
  Vector3,
  Color3,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Animation,
  EasingFunction,
  CubicEase,
} from "@babylonjs/core";
import { BaseBlock, Direction } from "./BaseBlock";
import { GameConfig } from "../config/GameConfig";

/**
 * LockedBlock - Grey block with lock overlays and unlock behavior
 */
export class LockedBlock extends BaseBlock {
  private _isLocked: boolean = true;
  // Store lock overlays as metadata on the mesh to avoid initialization timing issues
  private get lockOverlays(): Mesh[] {
    if (!this.mesh.metadata) {
      this.mesh.metadata = {};
    }
    if (!this.mesh.metadata.lockOverlays) {
      this.mesh.metadata.lockOverlays = [];
    }
    return this.mesh.metadata.lockOverlays;
  }

  private set lockOverlays(value: Mesh[]) {
    if (!this.mesh.metadata) {
      this.mesh.metadata = {};
    }
    this.mesh.metadata.lockOverlays = value;
  }

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

  protected needsCustomMaterial(_color?: Color3): boolean {
    // LOCKED blocks always need custom material for grey color + transparency
    return true;
  }

  protected applyMaterial(color?: Color3): void {
    // Dark grey for locked blocks (darker and more visible)
    const lockedColor = color || new Color3(0.2, 0.2, 0.2);

    // IMPORTANT: Create per-block material instead of using shared cached material
    // Locked blocks need to animate alpha when unlocking, which conflicts with
    // frozen shared materials. Each locked block gets its own unfrozen material.
    const lockedMaterial = new StandardMaterial(`lockedBlock_${this.mesh.uniqueId}`, this.scene);
    lockedMaterial.diffuseColor = lockedColor;
    lockedMaterial.specularColor = new Color3(0.2, 0.2, 0.2);
    lockedMaterial.alpha = 0.3; // 30% transparency for initial locked state
    // Don't freeze this material - we need to animate alpha when unlocking
    this.mesh.material = lockedMaterial;
  }

  protected getArrowColor(): Color3 {
    // Very light grey for locked blocks (visible on medium grey)
    return new Color3(0.7, 0.7, 0.7);
  }

  protected onSetupComplete(): void {
    // Add lock chain overlays for locked blocks
    this.createLockOverlays();
  }

  protected onFlyAwayStart(): void {
    // No special cleanup needed before flying away
  }

  protected onDispose(): void {
    // Dispose lock overlays
    if (this.lockOverlays) {
      for (const overlay of this.lockOverlays) {
        if (overlay.material) {
          overlay.material.dispose();
        }
        overlay.dispose();
      }
      this.lockOverlays = [];
    }

    // Dispose per-block material (not managed by MaterialManager)
    if (this.mesh.material) {
      this.mesh.material.dispose();
    }
  }

  /**
   * Create lock chain texture overlays on all 6 faces of locked blocks
   */
  private createLockOverlays(): void {
    // All 6 faces for the lock chain texture
    const allFaces: Direction[] = [
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
      Direction.FORWARD,
      Direction.BACK,
    ];

    const visualSize = this.gridSizeToVisualSize(this._gridSize);
    const lockTexture = this.materialManager.getTexture("/textures/lock-chain.png");

    for (const face of allFaces) {
      // Create a plane for this face
      const plane = MeshBuilder.CreatePlane(
        `lockOverlay_${face}`,
        { width: 1, height: 1 },
        this.scene
      );
      plane.parent = this.mesh;

      // Create material with lock chain texture
      const lockMaterial = new StandardMaterial("lockChainMat", this.scene);
      lockMaterial.diffuseTexture = lockTexture;
      lockMaterial.opacityTexture = lockTexture;
      lockMaterial.useAlphaFromDiffuseTexture = true;
      lockMaterial.backFaceCulling = false;
      lockMaterial.disableLighting = true;
      lockMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
      plane.material = lockMaterial;

      // Position on face
      const offset = 0.02; // Slightly above block surface

      // Calculate plane size based on block dimensions
      let planeWidth = 1;
      let planeHeight = 1;

      switch (face) {
        case Direction.UP:
        case Direction.DOWN:
          planeWidth = visualSize.x;
          planeHeight = visualSize.z;
          plane.rotation.x = Math.PI / 2;
          plane.position = new Vector3(0, (visualSize.y / 2 + offset) * (face === Direction.UP ? 1 : -1), 0);
          break;
        case Direction.LEFT:
        case Direction.RIGHT:
          planeWidth = visualSize.z;
          planeHeight = visualSize.y;
          plane.rotation.y = Math.PI / 2;
          plane.position = new Vector3((visualSize.x / 2 + offset) * (face === Direction.RIGHT ? 1 : -1), 0, 0);
          break;
        case Direction.FORWARD:
        case Direction.BACK:
          planeWidth = visualSize.x;
          planeHeight = visualSize.y;
          if (face === Direction.BACK) plane.rotation.y = Math.PI;
          plane.position = new Vector3(0, 0, (visualSize.z / 2 + offset) * (face === Direction.FORWARD ? 1 : -1));
          break;
      }

      plane.scaling = new Vector3(planeWidth, planeHeight, 1);
      plane.isPickable = false;
      plane.renderingGroupId = 0;

      this.lockOverlays.push(plane);
    }
  }

  /**
   * Override isLocked getter from BaseBlock
   */
  public get isLocked(): boolean {
    return this._isLocked;
  }

  /**
   * Unlock this block (used when key is cleared)
   */
  public unlock(): void {
    if (this._isLocked) {
      this._isLocked = false;
      this.fadeLockOverlays();
      this.restoreMaterialAlpha();
    }
  }

  /**
   * Fade out lock overlays with alpha animation
   */
  private fadeLockOverlays(): void {
    if (!this.lockOverlays || this.lockOverlays.length === 0) {
      return;
    }

    const { FPS } = GameConfig.ANIMATION;
    const fadeDuration = 0.5; // Duration in seconds

    // Create alpha animation for each lock overlay
    for (const overlay of this.lockOverlays) {
      if (!overlay.material) {
        continue;
      }

      const material = overlay.material as StandardMaterial;

      // Create alpha animation
      const alphaAnim = new Animation(
        "lockFadeOut",
        "alpha",
        FPS,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );

      const alphaKeys = [
        { frame: 0, value: 1.0 },
        { frame: FPS * fadeDuration, value: 0.0 }
      ];
      alphaAnim.setKeys(alphaKeys);

      // Add easing for smooth fade
      const easing = new CubicEase();
      easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
      alphaAnim.setEasingFunction(easing);

      // Animate the material
      this.scene.beginDirectAnimation(
        material,
        [alphaAnim],
        0,
        FPS * fadeDuration,
        false,
        1,
        () => {
          // Hide overlay after animation completes
          overlay.isVisible = false;
        }
      );
    }
  }

  /**
   * Fade material from transparent (0.3) to opaque (1.0) when unlocking
   */
  private restoreMaterialAlpha(): void {
    if (!this.mesh.material) return;

    const { FPS } = GameConfig.ANIMATION;
    const fadeDuration = 0.5; // Duration in seconds
    const currentMaterial = this.mesh.material as StandardMaterial;

    // Animate from transparent to opaque
    const fadeInAnim = new Animation(
      "unlockFadeIn",
      "alpha",
      FPS,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const fadeInKeys = [
      { frame: 0, value: 0.3 }, // Start at current transparency
      { frame: FPS * fadeDuration, value: 1.0 } // End fully opaque
    ];
    fadeInAnim.setKeys(fadeInKeys);

    // Add easing
    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEINOUT);
    fadeInAnim.setEasingFunction(easing);

    // Animate to full opacity
    this.scene.beginDirectAnimation(
      currentMaterial,
      [fadeInAnim],
      0,
      FPS * fadeDuration,
      false,
      1
    );
  }

  /**
   * Denial animation for locked blocks (shake + red tint)
   */
  public showDenial(): void {
    if (this._isAnimating) return;
    this._isAnimating = true;

    const { FPS } = GameConfig.ANIMATION;
    const originalPosition = this.mesh.position.clone();
    const shakeDistance = 0.1;

    // Create shake animation
    const shakeAnim = new Animation(
      "denialShake",
      "position",
      FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const shakeKeys = [
      { frame: 0, value: originalPosition },
      { frame: FPS * 0.05, value: originalPosition.add(this._arrowDirection.scale(shakeDistance)) },
      { frame: FPS * 0.1, value: originalPosition.add(this._arrowDirection.scale(-shakeDistance)) },
      { frame: FPS * 0.15, value: originalPosition.add(this._arrowDirection.scale(shakeDistance)) },
      { frame: FPS * 0.2, value: originalPosition },
    ];
    shakeAnim.setKeys(shakeKeys);

    // Apply temporary red tint
    const originalMaterial = this.mesh.material;
    const denialMaterial = new StandardMaterial("denialMat", this.scene);
    denialMaterial.diffuseColor = new Color3(1, 0.2, 0.2);
    denialMaterial.emissiveColor = new Color3(0.3, 0, 0);
    this.mesh.material = denialMaterial;

    this.scene.beginDirectAnimation(
      this.mesh,
      [shakeAnim],
      0,
      FPS * 0.2,
      false,
      1,
      () => {
        // Restore original material
        this.mesh.material = originalMaterial;
        denialMaterial.dispose();
        this._isAnimating = false;
      }
    );
  }
}
