import * as BABYLON from '@babylonjs/core';

/**
 * Arrow configuration for a single face of a cube
 */
interface FaceArrowConfig {
  faceNormal: BABYLON.Vector3;
  arrowDirection: BABYLON.Vector3;
  hasArrow: boolean;
}

/**
 * Generates arrow configurations for all 6 faces of a cube
 * based on the block's movement direction
 */
export function generateArrowConfigurations(
  movementDirection: BABYLON.Vector3
): FaceArrowConfig[] {
  const moveDir = movementDirection.normalize();

  const allFaces = [
    { normal: new BABYLON.Vector3(0, 1, 0), name: 'TOP' },
    { normal: new BABYLON.Vector3(0, -1, 0), name: 'BOTTOM' },
    { normal: new BABYLON.Vector3(1, 0, 0), name: 'RIGHT' },
    { normal: new BABYLON.Vector3(-1, 0, 0), name: 'LEFT' },
    { normal: new BABYLON.Vector3(0, 0, 1), name: 'FRONT' },
    { normal: new BABYLON.Vector3(0, 0, -1), name: 'BACK' }
  ];

  const configs: FaceArrowConfig[] = [];

  for (const face of allFaces) {
    const dotProduct = BABYLON.Vector3.Dot(face.normal, moveDir);
    const isMovementFace = dotProduct > 0.99;
    const isOppositeFace = dotProduct < -0.99;

    configs.push({
      faceNormal: face.normal.clone(),
      arrowDirection: moveDir.clone(),
      hasArrow: !(isMovementFace || isOppositeFace)
    });
  }

  return configs;
}


/**
 * Position and rotate an arrow mesh on a cube face
 */
export function positionArrowOnFace(
  arrowMesh: BABYLON.Mesh,
  faceNormal: BABYLON.Vector3,
  arrowDirection: BABYLON.Vector3,
  cubeSize: number = 1.0
): void {
  const offset = cubeSize * 1.01;

  arrowMesh.position = faceNormal.scale(offset);

  // Reset rotation first
  arrowMesh.rotation = BABYLON.Vector3.Zero();

  // Create a coordinate system for the face
  // The face normal is the "forward" direction (Z-axis in local space)
  // Negate it so arrows face outward instead of inward
  const forward = faceNormal.scale(-1);

  // Project arrow direction onto the plane of the face
  const dotProduct = BABYLON.Vector3.Dot(arrowDirection, faceNormal);
  const projectedDirection = arrowDirection.subtract(faceNormal.scale(dotProduct)).normalize();

  // Use projected direction as "up" for the arrow (Y-axis in local space)
  const up = projectedDirection;

  // Calculate right vector (X-axis in local space)
  const right = BABYLON.Vector3.Cross(up, forward).normalize();

  // Create rotation matrix from these axes
  const rotationMatrix = BABYLON.Matrix.Identity();
  BABYLON.Matrix.FromXYZAxesToRef(right, up, forward, rotationMatrix);

  // Apply rotation to the mesh
  const rotation = BABYLON.Quaternion.Identity();
  rotationMatrix.decompose(undefined, rotation, undefined);
  arrowMesh.rotationQuaternion = rotation;
}

