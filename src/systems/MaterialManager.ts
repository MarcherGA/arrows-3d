/**
 * Material Manager
 * Manages shared materials to reduce memory usage and improve performance
 * Implements the Flyweight pattern for material reuse
 */

import { Scene, StandardMaterial, Color3, Texture } from "@babylonjs/core";

/**
 * Material cache key for color-based materials
 */
function getMaterialKey(color: Color3): string {
  return `mat_${color.r.toFixed(3)}_${color.g.toFixed(3)}_${color.b.toFixed(3)}`;
}

/**
 * MaterialManager - Singleton for managing shared materials
 * Prevents duplicate material creation and reduces memory footprint
 */
export class MaterialManager {
  private static instance: MaterialManager | null = null;
  private readonly scene: Scene;
  private readonly materials: Map<string, StandardMaterial> = new Map();
  private readonly textures: Map<string, Texture> = new Map();

  private constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(scene: Scene): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager(scene);
    }
    return MaterialManager.instance;
  }

  /**
   * Reset singleton (useful for testing or scene changes)
   */
  public static resetInstance(): void {
    if (MaterialManager.instance) {
      MaterialManager.instance.dispose();
      MaterialManager.instance = null;
    }
  }

  /**
   * Get or create a material for a given color
   * Returns cached material if one exists, otherwise creates new one
   */
  public getMaterialForColor(color: Color3): StandardMaterial {
    const key = getMaterialKey(color);

    let material = this.materials.get(key);
    if (!material) {
      material = this.createColorMaterial(color, key);
      this.materials.set(key, material);
    }

    return material;
  }

  /**
   * Get or create a texture
   * Returns cached texture if one exists, otherwise loads new one
   */
  public getTexture(url: string): Texture {
    let texture = this.textures.get(url);
    if (!texture) {
      texture = new Texture(url, this.scene);
      this.textures.set(url, texture);
    }
    return texture;
  }

  /**
   * Get or create arrow material (shared across all arrows)
   * Returns cached material if one exists, otherwise creates new one
   */
  public getArrowMaterial(color: Color3, textureUrl: string): StandardMaterial {
    // Include texture URL in cache key to prevent color conflicts
    const textureKey = textureUrl.replace(/[^a-zA-Z0-9]/g, '_');
    const key = `arrow_mat_${getMaterialKey(color)}_${textureKey}`;

    let material = this.materials.get(key);
    if (!material) {
      material = this.createArrowMaterial(color, textureUrl, key);
      this.materials.set(key, material);
    }

    return material;
  }

  /**
   * Create a new arrow material with texture
   */
  private createArrowMaterial(color: Color3, textureUrl: string, name: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    const texture = this.getTexture(textureUrl);

    // Enable lighting and use emissive for glow effect with color multiplication
    material.diffuseColor = new Color3(0, 0, 0); // No diffuse (prevents double-lighting)
    material.emissiveColor = color; // Use color as emissive (self-illuminated)
    material.emissiveTexture = texture; // Multiply emissive by texture
    material.opacityTexture = texture; // Use texture alpha for transparency
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = true;
    material.disableDepthWrite = false;
    material.disableLighting = true;

    return material;
  }

  /**
   * Create a new colored material
   */
  private createColorMaterial(color: Color3, name: string): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    material.freeze(); // Optimization: freeze material if it won't change
    return material;
  }

  /**
   * Get cache statistics for debugging/monitoring
   */
  public getStats(): { materialCount: number; textureCount: number } {
    return {
      materialCount: this.materials.size,
      textureCount: this.textures.size,
    };
  }

  /**
   * Clear all cached materials and textures
   */
  public clear(): void {
    this.materials.forEach((material) => material.dispose());
    this.materials.clear();

    this.textures.forEach((texture) => texture.dispose());
    this.textures.clear();
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    this.clear();
  }
}
