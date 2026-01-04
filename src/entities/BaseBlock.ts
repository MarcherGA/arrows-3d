import { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Animation } from "@babylonjs/core/Animations/animation";
import "@babylonjs/core/Animations/";
import { EasingFunction, CubicEase } from "@babylonjs/core/Animations/easing";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/loaders/glTF";
import { GameConfig } from "../config/GameConfig";
import { MaterialManager } from "../systems/MaterialManager";
import { Arrow } from "./Arrow";

/**
 * Direction enum for block arrow indicators
 */
export const Direction = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  FORWARD: "FORWARD",
  BACK: "BACK",
} as const;

export type Direction = typeof Direction[keyof typeof Direction];

/**
 * Base Block class - contains all common functionality for blocks
 * Subclasses override specific behavior for different block types
 */
export abstract class BaseBlock {
  protected mesh: Mesh | InstancedMesh;
  protected arrows: Arrow[] = [];
  protected scene: Scene;
  protected _arrowDirection: Vector3;
  protected _gridPosition: Vector3;
  protected _gridSize: Vector3;
  protected _isRemovable: boolean = false;
  protected _isAnimating: boolean = false;
  protected _disposed: boolean = false;
  protected direction: Direction;
  protected materialManager: MaterialManager;

  // Shared resources for all blocks
  protected static sharedWoodTexture: Texture | null = null;
  protected static sharedBeveledBox: Mesh | null = null;
  protected static loadPromise: Promise<void> | null = null;

  /**
   * Creates a new Block
   * @param scene - Babylon.js scene
   * @param worldPosition - World position (corner of the block)
   * @param gridPosition - Grid position (corner)
   * @param gridSize - Number of grid cells occupied [x, y, z]
   * @param direction - Arrow direction enum
   * @param color - Optional custom color
   * @param parent - Optional parent node for rotation
   * @param blockType - Block type (KEY, LOCKED, or STANDARD)
   */
  constructor(
    scene: Scene,
    worldPosition: Vector3,
    gridPosition: Vector3,
    gridSize: Vector3,
    direction: Direction,
    color?: Color3,
    parent?: any
  ) {
    this.scene = scene;
    this.materialManager = MaterialManager.getInstance(scene);
    this._gridPosition = gridPosition.clone();
    this._gridSize = gridSize.clone();
    this.direction = direction;
    this._arrowDirection = this.getDirectionVector(direction);

    // Calculate visual size from grid size
    const visualSize = this.gridSizeToVisualSize(gridSize);

    // Create temporary placeholder until model loads
    this.mesh = MeshBuilder.CreateBox("tempBox", { size: 1 }, scene);
    this.mesh.scaling = visualSize;
    // Position at corner + half the visual size to center the mesh
    this.mesh.position = worldPosition.add(visualSize.scale(0.5));
    this.mesh.isVisible = false;

    // Set parent immediately for temp mesh
    if (parent) {
      this.mesh.parent = parent;
    }

    // Create shared wood texture if not exists
    if (!BaseBlock.sharedWoodTexture) {
      BaseBlock.sharedWoodTexture = new Texture("/textures/wood-texture.jpg", scene);
    }

    // Load GLB model asynchronously
    this.loadModel(worldPosition, visualSize, color, parent);
  }

  /**
   * Convert grid size to visual size
   */
  protected gridSizeToVisualSize(gridSize: Vector3): Vector3 {
    // Visual size = number of cells * cell size, plus gaps between cells within the block
    // For a 3-cell block: cell + gap + cell + gap + cell = 3 cells + 2 gaps
    const { SCALE, GAP } = GameConfig.BLOCK;
    return new Vector3(
      gridSize.x * SCALE + (gridSize.x - 1) * GAP,
      gridSize.y * SCALE + (gridSize.y - 1) * GAP,
      gridSize.z * SCALE + (gridSize.z - 1) * GAP
    );
  }

  /**
   * Load GLB model and setup instance
   */
  private async loadModel(worldPosition: Vector3, visualSize: Vector3, color?: Color3, parent?: any): Promise<void> {
    // If model already loaded, create instance immediately
    if (BaseBlock.sharedBeveledBox) {
      // Guard: don't create instance if block was disposed while waiting
      if (!this._disposed) {
        this.setupInstance(worldPosition, visualSize, color, parent);
      }
      return;
    }

    // If already loading, wait for it
    if (BaseBlock.loadPromise) {
      await BaseBlock.loadPromise;
      // Guard: don't create instance if block was disposed while waiting
      if (!this._disposed) {
        this.setupInstance(worldPosition, visualSize, color, parent);
      }
      return;
    }

    // Load the GLB model (first block triggers this)
    BaseBlock.loadPromise = (async () => {
      try {
        const result = await SceneLoader.ImportMeshAsync(
          "",
          "/models/",
          "beveled-cube.glb",
          this.scene
        );

        // Find the mesh with actual geometry
        let loadedMesh: Mesh | null = null;
        for (const mesh of result.meshes) {
          if (mesh instanceof Mesh && mesh.getTotalVertices() > 0) {
            loadedMesh = mesh;
            break;
          }
        }

        if (loadedMesh) {
          BaseBlock.sharedBeveledBox = loadedMesh;
          BaseBlock.sharedBeveledBox.name = "beveledBlock";

          // Apply wood texture material
          const material = new StandardMaterial("woodMaterial", this.scene);
          material.diffuseTexture = BaseBlock.sharedWoodTexture;

          if (BaseBlock.sharedWoodTexture) {
            BaseBlock.sharedWoodTexture.uScale = 1.0;
            BaseBlock.sharedWoodTexture.vScale = 1.0;
          }

          material.backFaceCulling = true;
          material.specularColor = new Color3(0.2, 0.2, 0.2);

          BaseBlock.sharedBeveledBox.material = material;
          BaseBlock.sharedBeveledBox.setEnabled(false); // Hide the original

          // Guard: don't create instance if block was disposed during load
          if (!this._disposed) {
            this.setupInstance(worldPosition, visualSize, color, parent);
          }
        } else {
          console.error("No mesh with geometry found in beveled-cube.glb");
          // Fallback to basic box (only if not disposed)
          if (!this._disposed) {
            this.setupFallbackBox(worldPosition, visualSize, color, parent);
          }
        }
      } catch (error) {
        console.error("Error loading beveled-cube.glb:", error);
        // Fallback to basic box (only if not disposed)
        if (!this._disposed) {
          this.setupFallbackBox(worldPosition, visualSize, color, parent);
        }
      }
    })();

    await BaseBlock.loadPromise;
  }

  /**
   * Setup instance from loaded model
   */
  private setupInstance(worldPosition: Vector3, visualSize: Vector3, color?: Color3, parent?: any): void {
    if (!BaseBlock.sharedBeveledBox) {
      this.setupFallbackBox(worldPosition, visualSize, color, parent);
      return;
    }

    // Store parent from temp mesh
    const oldParent = this.mesh.parent;

    // Dispose temp box (don't trigger onDispose hooks - this is just the initial temp mesh)
    if (this.mesh) {
      this.mesh.dispose();
      // Don't call this.onDispose() here - temp mesh never had overlays/arrows attached
    }

    // Check if we need custom material
    const needsCustomMaterial = this.needsCustomMaterial(color);

    if (needsCustomMaterial) {
      // Use clone instead of instance for blocks that need custom materials
      // Instances share materials with parent, clones can have their own
      this.mesh = BaseBlock.sharedBeveledBox.clone("block", null, false) as Mesh;
      this.mesh.setEnabled(true); // Ensure clone is visible
      this.mesh.isVisible = true;
    } else {
      // Use instance for standard blocks (better performance)
      this.mesh = BaseBlock.sharedBeveledBox.createInstance("block");
    }

    this.mesh.scaling = visualSize;
    // Position at corner + half the visual size to center the mesh
    this.mesh.position = worldPosition.add(visualSize.scale(0.5));

    // Restore parent
    if (parent || oldParent) {
      this.mesh.parent = parent || oldParent;
    }

    // Apply material and create arrows (subclass-specific)
    this.applyMaterial(color);
    this.createAndPositionArrow();
    this.onSetupComplete();
  }

  /**
   * Fallback to basic box if GLB fails to load
   */
  private setupFallbackBox(worldPosition: Vector3, visualSize: Vector3, color?: Color3, parent?: any): void {
    // Store parent from temp mesh
    const oldParent = this.mesh.parent;
    // Dispose temp box if exists
    if (this.mesh) {
      this.mesh.dispose();
    }

    // Create basic box
    this.mesh = MeshBuilder.CreateBox(
      "block",
      {
        size: 1,
        width: visualSize.x,
        height: visualSize.y,
        depth: visualSize.z,
      },
      this.scene
    );
    // Position at corner + half the visual size to center the mesh
    this.mesh.position = worldPosition.add(visualSize.scale(0.5));

    // Restore parent
    if (parent || oldParent) {
      this.mesh.parent = parent || oldParent;
    }

    // Apply material and create arrows (subclass-specific)
    this.applyMaterial(color);
    this.createAndPositionArrow();
    this.onSetupComplete();
  }

  /**
   * Create and position arrow indicators (4 arrows on perpendicular faces)
   */
  private createAndPositionArrow(): void {
    // Determine which faces should have arrows based on movement direction
    const facesToDraw = this.getFacesForDirection(this.direction);

    // Get arrow color from subclass
    const arrowColor = this.getArrowColor();

    // Create arrows for each face using Arrow class
    for (const face of facesToDraw) {
      const arrow = new Arrow(this.scene, face, this.direction, this.mesh, arrowColor);

      // Apply inverse scaling to maintain constant arrow size regardless of block stretching
      arrow.setScaling();

      this.arrows.push(arrow);
    }
  }

  /**
   * Determine which 4 faces should have arrows based on movement direction
   */
  protected getFacesForDirection(direction: Direction): Direction[] {
    switch (direction) {
      case Direction.UP:
      case Direction.DOWN:
        // Empty top/bottom, arrows on all 4 sides
        return [Direction.LEFT, Direction.RIGHT, Direction.FORWARD, Direction.BACK];

      case Direction.LEFT:
      case Direction.RIGHT:
        // Empty left/right, arrows on other 4 faces
        return [Direction.UP, Direction.DOWN, Direction.FORWARD, Direction.BACK];

      case Direction.FORWARD:
      case Direction.BACK:
        // Empty front/back, arrows on other 4 faces
        return [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    }
  }

  /**
   * Convert Direction enum to Vector3
   */
  protected getDirectionVector(direction: Direction): Vector3 {
    switch (direction) {
      case Direction.UP:
        return new Vector3(0, 1, 0);
      case Direction.DOWN:
        return new Vector3(0, -1, 0);
      case Direction.LEFT:
        return new Vector3(-1, 0, 0);
      case Direction.RIGHT:
        return new Vector3(1, 0, 0);
      case Direction.FORWARD:
        return new Vector3(0, 0, 1);
      case Direction.BACK:
        return new Vector3(0, 0, -1);
    }
  }

  /**
   * Update the removable state
   */
  public updateRemovableState(isRemovable: boolean): void {
    this._isRemovable = isRemovable;
  }

  /**
   * Animate block flying away in arrow direction
   */
  public flyAway(onComplete?: () => void): void {
    if (this._isAnimating) return;
    this._isAnimating = true;

    // Call hook for subclass cleanup before flying away
    this.onFlyAwayStart();

    const { FLY_AWAY_DISTANCE, FLY_AWAY_DURATION_MS, FPS } = GameConfig.ANIMATION;

    const startPosition = this.mesh.position.clone();
    const endPosition = startPosition.add(this._arrowDirection.scale(FLY_AWAY_DISTANCE));

    // Position animation
    const positionAnim = new Animation(
      "flyPosition",
      "position",
      FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const positionKeys = [
      { frame: 0, value: startPosition },
      { frame: (FLY_AWAY_DURATION_MS / 1000) * FPS, value: endPosition },
    ];
    positionAnim.setKeys(positionKeys);

    // Add easing
    const easing = new CubicEase();
    easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    positionAnim.setEasingFunction(easing);

    // Rotation animation for visual interest
    const rotationAnim = new Animation(
      "flyRotation",
      "rotation.y",
      FPS,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const rotationKeys = [
      { frame: 0, value: this.mesh.rotation.y },
      { frame: (FLY_AWAY_DURATION_MS / 1000) * FPS, value: this.mesh.rotation.y + Math.PI },
    ];
    rotationAnim.setKeys(rotationKeys);

    // Play animations
    this.scene.beginDirectAnimation(
      this.mesh,
      [positionAnim, rotationAnim],
      0,
      (FLY_AWAY_DURATION_MS / 1000) * FPS,
      false,
      1,
      () => {
        this.dispose();
        if (onComplete) onComplete();
      }
    );
  }

  /**
   * Shake animation when block cannot be removed
   */
  public shake(): void {
    if (this._isAnimating) return;
    this._isAnimating = true;

    const { SHAKE_DISTANCE, FPS } = GameConfig.ANIMATION;

    const originalPosition = this.mesh.position.clone();
    const shakeOffset = this._arrowDirection.scale(SHAKE_DISTANCE);
    const shakePosition = originalPosition.add(shakeOffset);

    const shakeAnim = new Animation(
      "shake",
      "position",
      FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const shakeKeys = [
      { frame: 0, value: originalPosition },
      { frame: FPS * 0.05, value: shakePosition },
      { frame: FPS * 0.1, value: originalPosition },
      { frame: FPS * 0.15, value: shakePosition },
      { frame: FPS * 0.2, value: originalPosition },
    ];
    shakeAnim.setKeys(shakeKeys);

    this.scene.beginDirectAnimation(
      this.mesh,
      [shakeAnim],
      0,
      FPS * 0.2,
      false,
      1,
      () => {
        this._isAnimating = false;
      }
    );
  }

  /**
   * Clean up resources
   * Note: Materials are managed by MaterialManager and not disposed here
   */
  public dispose(): void {
    // Set disposed flag to prevent late async callbacks from creating orphaned meshes
    this._disposed = true;

    this.mesh.dispose();
    for (const arrow of this.arrows) {
      arrow.dispose();
    }
    this.arrows = [];

    // Call hook for subclass-specific cleanup
    this.onDispose();
  }

  // Getters
  public get isRemovable(): boolean {
    return this._isRemovable;
  }

  public get arrowDirection(): Vector3 {
    return this._arrowDirection.clone();
  }

  public get gridPosition(): Vector3 {
    return this._gridPosition.clone();
  }

  public get gridSize(): Vector3 {
    return this._gridSize.clone();
  }

  public get position(): Vector3 {
    return this.mesh.position.clone();
  }

  public getMesh(): Mesh | InstancedMesh {
    return this.mesh;
  }

  public isAnimating(): boolean {
    return this._isAnimating;
  }

  /**
   * Check if this block is locked (only LockedBlocks override this)
   */
  public get isLocked(): boolean {
    return false; // Default: blocks are not locked
  }

  /**
   * Unlock this block (only LockedBlocks override this)
   */
  public unlock(): void {
    // Default: do nothing (only LockedBlocks implement this)
  }

  /**
   * Show denial animation (only LockedBlocks override this)
   */
  public showDenial(): void {
    // Default: do nothing (only LockedBlocks implement this)
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Determine if this block needs custom material (clone instead of instance)
   */
  protected abstract needsCustomMaterial(color?: Color3): boolean;

  /**
   * Apply material to the block mesh
   */
  protected abstract applyMaterial(color?: Color3): void;

  /**
   * Get the arrow color for this block type
   */
  protected abstract getArrowColor(): Color3;

  /**
   * Hook called after mesh setup is complete
   */
  protected abstract onSetupComplete(): void;

  /**
   * Hook called before flyAway animation starts
   */
  protected abstract onFlyAwayStart(): void;

  /**
   * Hook called during dispose for subclass-specific cleanup
   */
  protected abstract onDispose(): void;
}
