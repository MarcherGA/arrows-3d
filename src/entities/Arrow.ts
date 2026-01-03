import {
  Scene,
  Mesh,
  Vector3,
  MeshBuilder,
  Matrix,
  Quaternion,
} from "@babylonjs/core";
import { GameConfig } from "../config/GameConfig";
import { positionArrowOnFace } from "../systems/ArrowSystem";
import { Direction } from "./Block";
import { MaterialManager } from "../systems/MaterialManager";

/**
 * Arrow indicator that shows on block faces
 */
export class Arrow {
  private mesh: Mesh;

  /**
   * Create an arrow on a specific face pointing in a direction
   * @param scene - Babylon scene
   * @param face - Which face to place arrow on
   * @param pointingDirection - Which direction the arrow should point
   * @param parent - Parent mesh (the block)
   */
  constructor(
    scene: Scene,
    face: Direction,
    pointingDirection: Direction,
    parent: Mesh | any
  ) {
    // Create arrow plane
    const { ARROW_SIZE } = GameConfig.BLOCK;
    this.mesh = MeshBuilder.CreatePlane(
      "arrow",
      { width: ARROW_SIZE, height: ARROW_SIZE },
      scene
    );
    this.mesh.parent = parent;

    // Use shared material from MaterialManager
    const materialManager = MaterialManager.getInstance(scene);
    this.mesh.material = materialManager.getArrowMaterial(
      GameConfig.COLOR.ARROW_COLOR,
      "/icons/brown-arrow.png"
    );
    this.mesh.renderingGroupId = 0;
    this.mesh.isPickable = false;

    // Position and orient the arrow
    this.positionAndOrient(face, pointingDirection);
  }

  /**
   * Position arrow on face and orient to point in correct direction
   */
  private positionAndOrient(face: Direction, pointingDir: Direction): void {
    const faceNormal = this.directionToVector(face);
    const arrowDirection = this.directionToVector(pointingDir);

    positionArrowOnFace(this.mesh, faceNormal, arrowDirection, 1.0);
  }

  /**
   * Convert Direction enum to Vector3
   */
  private directionToVector(dir: Direction): Vector3 {
    switch (dir) {
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
      default:
        return new Vector3(0, 1, 0);
    }
  }

  /**
   * Set arrow scaling to maintain constant world size regardless of parent scaling
   */
  public setScaling(): void {
    // Don't use simple inverse scaling - it doesn't work correctly when the arrow is rotated
    // Instead, we need to compute the absolute world scale needed

    // Get the parent's absolute world scaling
    const parent = this.mesh.parent;
    if (!parent) {
      this.mesh.scaling = new Vector3(1, 1, 1);
      return;
    }

    // Compute the parent's world scaling matrix
    const parentWorldMatrix = parent.getWorldMatrix();
    const parentScaling = new Vector3();
    parentWorldMatrix.decompose(parentScaling);

    // To maintain constant world size, we need to scale inversely to parent's world scale
    // But we need to account for the arrow's rotation relative to parent

    // Get the arrow's rotation quaternion (or convert from euler)
    const arrowRotation = this.mesh.rotationQuaternion ||
                          this.mesh.rotation.toQuaternion();

    // The key insight: we need to transform the parent's scaling vector
    // by the INVERSE of the arrow's rotation to get the correct compensation
    const inverseRotation = Quaternion.Inverse(arrowRotation);
    const inverseRotationMatrix = new Matrix();
    inverseRotation.toRotationMatrix(inverseRotationMatrix);

    // Transform the parent scaling vector by the inverse rotation
    // This tells us how much the parent's scaling affects each of the arrow's local axes
    const localScalingEffect = Vector3.TransformNormal(parentScaling, inverseRotationMatrix);

    // Now we can apply inverse scaling along the arrow's local axes
    this.mesh.scaling = new Vector3(
      1.0 / Math.abs(localScalingEffect.x),
      1.0 / Math.abs(localScalingEffect.y),
      1.0 / Math.abs(localScalingEffect.z)
    );
  }

  /**
   * Dispose arrow mesh
   */
  public dispose(): void {
    this.mesh.dispose();
  }

  /**
   * Get the mesh
   */
  public getMesh(): Mesh {
    return this.mesh;
  }
}
