/**
 * Levels module - Centralized level management
 *
 * This module follows SOLID principles:
 * - Single Responsibility: Each file has one clear purpose
 * - Open/Closed: Easy to add new levels without modifying existing code
 * - Dependency Inversion: Consumers depend on abstractions (interfaces)
 *
 * Usage:
 *   import { LevelRegistry } from './levels';
 *   import './levels/level1.data'; // Auto-registers on import
 *
 *   const level = LevelRegistry.getLevel(1);
 */

// Export types
export type { BlockData, LevelData } from "./types";

// Export registry
export { LevelRegistry } from "./LevelRegistry";

// Export parser
export { LevelParser } from "./LevelParser";
export type { ProcessedBlockData } from "./LevelParser";

// Import level data files to auto-register them
// These imports have side effects (registration) but make level data available
import "./level1.data";
import "./level2.data";

// Export level data for direct access if needed
export { level1 } from "./level1.data";
export { level2 } from "./level2.data";
