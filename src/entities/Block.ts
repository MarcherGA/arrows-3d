import {
  Scene,
  Mesh,
  InstancedMesh,
  Vector3,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Animation,
  EasingFunction,
  CubicEase,
  SceneLoader,
  Texture,
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { ANIMATION, BLOCK, COLORS } from "../constants";
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
 * Block entity representing a single 3D block with directional arrow
 */
export class Block {
  private mesh: Mesh | InstancedMesh;
  private arrows: Arrow[] = [];
  private scene: Scene;
  private _arrowDirection: Vector3;
  private _gridPosition: Vector3;
  private _gridSize: Vector3;
  private _isRemovable: boolean = false;
  private _isAnimating: boolean = false;
  private material: StandardMaterial | null = null;
  private direction: Direction;

  // Shared resources for all blocks
  private static sharedWoodTexture: Texture | null = null;
  private static sharedBeveledBox: Mesh | null = null;
  private static loadPromise: Promise<void> | null = null;

  /**
   * Creates a new Block
   * @param scene - Babylon.js scene
   * @param worldPosition - World position (corner of the block)
   * @param gridPosition - Grid position (corner)
   * @param gridSize - Number of grid cells occupied [x, y, z]
   * @param direction - Arrow direction enum
   * @param color - Optional custom color
   * @param parent - Optional parent node for rotation
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
    if (!Block.sharedWoodTexture) {
      Block.sharedWoodTexture = new Texture("/wood-texture.jpg", scene);
    }

    // Load GLB model asynchronously
    this.loadModel(worldPosition, visualSize, color, parent);
  }

  /**
   * Convert grid size to visual size
   */
  private gridSizeToVisualSize(gridSize: Vector3): Vector3 {
    // Visual size = number of cells * cell size, plus gaps between cells within the block
    // For a 3-cell block: cell + gap + cell + gap + cell = 3 cells + 2 gaps
    return new Vector3(
      gridSize.x * BLOCK.SCALE + (gridSize.x - 1) * BLOCK.GAP,
      gridSize.y * BLOCK.SCALE + (gridSize.y - 1) * BLOCK.GAP,
      gridSize.z * BLOCK.SCALE + (gridSize.z - 1) * BLOCK.GAP
    );
  }

  /**
   * Load GLB model and setup instance
   */
  private async loadModel(worldPosition: Vector3, visualSize: Vector3, color?: Color3, parent?: any): Promise<void> {
    // If model already loaded, create instance immediately
    if (Block.sharedBeveledBox) {
      this.setupInstance(worldPosition, visualSize, color, parent);
      return;
    }

    // If already loading, wait for it
    if (Block.loadPromise) {
      await Block.loadPromise;
      this.setupInstance(worldPosition, visualSize, color, parent);
      return;
    }

    // Load the GLB model (first block triggers this)
    Block.loadPromise = (async () => {
      try {
        const result = await SceneLoader.ImportMeshAsync(
          "",
          "/",
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
          Block.sharedBeveledBox = loadedMesh;
          Block.sharedBeveledBox.name = "beveledBlock";

          // Apply wood texture material
          const material = new StandardMaterial("woodMaterial", this.scene);
          material.diffuseTexture = Block.sharedWoodTexture;

          if (Block.sharedWoodTexture) {
            Block.sharedWoodTexture.uScale = 1.0;
            Block.sharedWoodTexture.vScale = 1.0;
          }

          material.backFaceCulling = true;
          material.specularColor = new Color3(0.2, 0.2, 0.2);

          Block.sharedBeveledBox.material = material;
          Block.sharedBeveledBox.setEnabled(false); // Hide the original

          // Setup this instance now that model is loaded
          this.setupInstance(worldPosition, visualSize, color, parent);
        } else {
          console.error("No mesh with geometry found in beveled-cube.glb");
          // Fallback to basic box
          this.setupFallbackBox(worldPosition, visualSize, color, parent);
        }
      } catch (error) {
        console.error("Error loading beveled-cube.glb:", error);
        // Fallback to basic box
        this.setupFallbackBox(worldPosition, visualSize, color, parent);
      }
    })();

    await Block.loadPromise;
  }

  /**
   * Setup instance from loaded model
   */
  private setupInstance(worldPosition: Vector3, visualSize: Vector3, color?: Color3, parent?: any): void {
    if (!Block.sharedBeveledBox) {
      this.setupFallbackBox(worldPosition, visualSize, color, parent);
      return;
    }

    // Store parent from temp mesh
    const oldParent = this.mesh.parent;

    // Dispose temp box
    if (this.mesh) {
      this.mesh.dispose();
    }

    // Create instance
    this.mesh = Block.sharedBeveledBox.createInstance("block");
    this.mesh.scaling = visualSize;
    // Position at corner + half the visual size to center the mesh
    this.mesh.position = worldPosition.add(visualSize.scale(0.5));

    // Restore parent
    if (parent || oldParent) {
      this.mesh.parent = parent || oldParent;
    }

    // Apply custom color if provided
    if (color) {
      this.material = new StandardMaterial("blockMat_" + Math.random(), this.scene);
      this.material.diffuseColor = color;
      this.material.specularColor = new Color3(0.2, 0.2, 0.2);
      this.mesh.material = this.material;
    }

    // Create arrow overlay
    this.createAndPositionArrow();
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

    // Create material
    this.material = new StandardMaterial("blockMaterial", this.scene);
    const defaultColor = color || new Color3(
      COLORS.BLOCK_DEFAULT.r,
      COLORS.BLOCK_DEFAULT.g,
      COLORS.BLOCK_DEFAULT.b
    );
    this.material.diffuseColor = defaultColor;
    this.material.specularColor = new Color3(0.2, 0.2, 0.2);
    this.mesh.material = this.material;

    // Create arrow overlay
    this.createAndPositionArrow();
  }

  /**
   * Create and position arrow indicators (4 arrows on perpendicular faces)
   */
  private createAndPositionArrow(): void {
    // Determine which faces should have arrows based on movement direction
    const facesToDraw = this.getFacesForDirection(this.direction);

    // Create arrows for each face using Arrow class
    for (const face of facesToDraw) {
      const arrow = new Arrow(this.scene, face, this.direction, this.mesh);

      // Apply inverse scaling to maintain constant arrow size regardless of block stretching
      arrow.setScaling();

      this.arrows.push(arrow);
    }
  }

  /**
   * Determine which 4 faces should have arrows based on movement direction
   */
  private getFacesForDirection(direction: Direction): Direction[] {
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
  private getDirectionVector(direction: Direction): Vector3 {
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

    const startPosition = this.mesh.position.clone();
    const endPosition = startPosition.add(this._arrowDirection.scale(ANIMATION.FLY_AWAY_DISTANCE));

    // Position animation
    const positionAnim = new Animation(
      "flyPosition",
      "position",
      ANIMATION.FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const positionKeys = [
      { frame: 0, value: startPosition },
      { frame: (ANIMATION.FLY_AWAY_DURATION_MS / 1000) * ANIMATION.FPS, value: endPosition },
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
      ANIMATION.FPS,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const rotationKeys = [
      { frame: 0, value: this.mesh.rotation.y },
      { frame: (ANIMATION.FLY_AWAY_DURATION_MS / 1000) * ANIMATION.FPS, value: this.mesh.rotation.y + Math.PI },
    ];
    rotationAnim.setKeys(rotationKeys);

    // Play animations
    this.scene.beginDirectAnimation(
      this.mesh,
      [positionAnim, rotationAnim],
      0,
      (ANIMATION.FLY_AWAY_DURATION_MS / 1000) * ANIMATION.FPS,
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

    const originalPosition = this.mesh.position.clone();
    const shakeOffset = this._arrowDirection.scale(ANIMATION.SHAKE_DISTANCE);
    const shakePosition = originalPosition.add(shakeOffset);

    const shakeAnim = new Animation(
      "shake",
      "position",
      ANIMATION.FPS,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CYCLE
    );

    const shakeKeys = [
      { frame: 0, value: originalPosition },
      { frame: ANIMATION.FPS * 0.05, value: shakePosition },
      { frame: ANIMATION.FPS * 0.1, value: originalPosition },
      { frame: ANIMATION.FPS * 0.15, value: shakePosition },
      { frame: ANIMATION.FPS * 0.2, value: originalPosition },
    ];
    shakeAnim.setKeys(shakeKeys);

    this.scene.beginDirectAnimation(
      this.mesh,
      [shakeAnim],
      0,
      ANIMATION.FPS * 0.2,
      false,
      1,
      () => {
        this._isAnimating = false;
      }
    );
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.mesh.dispose();
    for (const arrow of this.arrows) {
      arrow.dispose();
    }
    this.arrows = [];
    if (this.material) {
      this.material.dispose();
    }
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
}
