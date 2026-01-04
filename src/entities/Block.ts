/**
 * Block entities - Polymorphic class hierarchy for different block types
 *
 * This file serves as the main entry point for block-related exports.
 * The actual implementation is split across:
 * - BaseBlock: Abstract base class with common functionality
 * - StandardBlock: Basic blocks with default behavior
 * - KeyBlock: Gold blocks with pulse animation
 * - LockedBlock: Grey blocks with lock overlays and unlock behavior
 * - BlockFactory: Factory for creating the appropriate block type
 */

// Re-export all block-related types and classes
export { BaseBlock, Direction } from "./BaseBlock";
export type { Direction as DirectionType } from "./BaseBlock";
export { StandardBlock } from "./StandardBlock";
export { KeyBlock } from "./KeyBlock";
export { LockedBlock } from "./LockedBlock";
export { BlockFactory } from "./BlockFactory";

// For backward compatibility, export BaseBlock as Block
export { BaseBlock as Block } from "./BaseBlock";
