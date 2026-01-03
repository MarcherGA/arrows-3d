import { Mesh, Vector3, Matrix, Quaternion } from "@babylonjs/core";
import { GameConfig } from "../config/GameConfig";

/**
 * Position and rotate an arrow mesh on a cube face
 */
export function positionArrowOnFace(
  arrowMesh: Mesh,
  faceNormal: Vector3,
  arrowDirection: Vector3,
  cubeSize: number = 1.0
): void {
  const offset = cubeSize * 0.5 + GameConfig.BLOCK.ARROW_FACE_OFFSET;

  arrowMesh.position = faceNormal.scale(offset);

  // Reset rotation first
  arrowMesh.rotation = Vector3.Zero();

  // Create a coordinate system for the face
  // The face normal is the "forward" direction (Z-axis in local space)
  // Negate it so arrows face outward instead of inward
  const forward = faceNormal.scale(-1);

  // Project arrow direction onto the plane of the face
  const dotProduct = Vector3.Dot(arrowDirection, faceNormal);
  const projectedDirection = arrowDirection.subtract(faceNormal.scale(dotProduct)).normalize();

  // Use projected direction as "up" for the arrow (Y-axis in local space)
  const up = projectedDirection;

  // Calculate right vector (X-axis in local space)
  const right = Vector3.Cross(up, forward).normalize();

  // Create rotation matrix from these axes
  const rotationMatrix = Matrix.Identity();
  Matrix.FromXYZAxesToRef(right, up, forward, rotationMatrix);

  // Apply rotation to the mesh
  const rotation = Quaternion.Identity();
  rotationMatrix.decompose(undefined, rotation, undefined);
  arrowMesh.rotationQuaternion = rotation;
}

