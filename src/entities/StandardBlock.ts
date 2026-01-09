import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { BaseBlock, Direction } from "./BaseBlock";
import { GameConfig, getArrowColor } from "../config/GameConfig";

/**
 * StandardBlock - Basic block with default behavior
 */
export class StandardBlock extends BaseBlock {
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
    // Standard blocks only need custom material if they have a custom color
    return !!color;
  }

  protected applyMaterial(color?: Color3): void {
    if (color) {
      const material = this.materialManager.getMaterialForColor(color);
      this.mesh.material = material;
    }
    // Otherwise, use default wood texture from shared mesh
  }

  protected getArrowColor(): Color3 {
    // Use theme-based arrow color from palette
    return getArrowColor();
  }

  protected onSetupComplete(): void {
    // No additional setup needed for standard blocks
  }

  protected onFlyAwayStart(): void {
    // No cleanup needed for standard blocks
  }

  protected onDispose(): void {
    // No additional cleanup needed for standard blocks
  }
}
