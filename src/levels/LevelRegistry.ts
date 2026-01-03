import type { LevelData } from "./types";

/**
 * Central registry for all game levels
 *
 * Implements Single Responsibility Principle:
 * - Only responsible for level storage and retrieval
 *
 * Implements Open/Closed Principle:
 * - Open for extension (add new levels via registerLevel)
 * - Closed for modification (core logic doesn't change)
 */
export class LevelRegistry {
  private static levels: Map<number, LevelData> = new Map();

  /**
   * Register a level in the registry
   * @param level - Level data to register
   */
  public static registerLevel(level: LevelData): void {
    this.levels.set(level.levelNumber, level);
  }

  /**
   * Get a level by its number
   * @param levelNumber - The level number to retrieve
   * @returns Level data or undefined if not found
   */
  public static getLevel(levelNumber: number): LevelData | undefined {
    return this.levels.get(levelNumber);
  }

  /**
   * Get a level by its number with fallback to level 1
   * @param levelNumber - The level number to retrieve
   * @returns Level data (defaults to level 1 if not found)
   */
  public static getLevelOrDefault(levelNumber: number): LevelData {
    return this.levels.get(levelNumber) ?? this.levels.get(1)!;
  }

  /**
   * Get all registered level numbers
   * @returns Array of level numbers sorted in ascending order
   */
  public static getAllLevelNumbers(): number[] {
    return Array.from(this.levels.keys()).sort((a, b) => a - b);
  }

  /**
   * Check if a level exists
   * @param levelNumber - The level number to check
   * @returns True if level exists
   */
  public static hasLevel(levelNumber: number): boolean {
    return this.levels.has(levelNumber);
  }

  /**
   * Get total number of registered levels
   * @returns Total level count
   */
  public static getLevelCount(): number {
    return this.levels.size;
  }

  /**
   * Clear all registered levels (useful for testing)
   */
  public static clear(): void {
    this.levels.clear();
  }
}
