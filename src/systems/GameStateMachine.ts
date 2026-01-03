/**
 * Game State Machine
 * Manages game state transitions with type safety and clean architecture
 * Follows the State Pattern for maintainable game flow control
 */

import { GAME_STATE } from "../config/GameConfig";
import type { GameState } from "../config/GameConfig";

/**
 * State transition callback
 */
type StateChangeCallback = (from: GameState, to: GameState) => void;

/**
 * Valid state transitions map
 * Defines which states can transition to which other states
 */
const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  [GAME_STATE.LOADING]: [GAME_STATE.PLAYING],
  [GAME_STATE.PLAYING]: [GAME_STATE.PAUSED, GAME_STATE.WON, GAME_STATE.GAME_OVER],
  [GAME_STATE.PAUSED]: [GAME_STATE.PLAYING, GAME_STATE.GAME_OVER],
  [GAME_STATE.WON]: [GAME_STATE.LOADING],
  [GAME_STATE.GAME_OVER]: [GAME_STATE.LOADING],
};

/**
 * State Machine for managing game flow
 * Enforces valid state transitions and provides hooks for state changes
 */
export class GameStateMachine {
  private currentState: GameState;
  private readonly onStateChangeCallbacks: StateChangeCallback[] = [];

  constructor(initialState: GameState = GAME_STATE.LOADING) {
    this.currentState = initialState;
  }

  /**
   * Get current game state
   */
  public getState(): GameState {
    return this.currentState;
  }

  /**
   * Check if currently in a specific state
   */
  public is(state: GameState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if transition to target state is valid
   */
  public canTransitionTo(targetState: GameState): boolean {
    const validTargets = VALID_TRANSITIONS[this.currentState];
    return validTargets.includes(targetState);
  }

  /**
   * Transition to a new state
   * @throws Error if transition is invalid
   */
  public transitionTo(newState: GameState): void {
    if (this.currentState === newState) {
      return; // Already in this state
    }

    if (!this.canTransitionTo(newState)) {
      throw new Error(
        `Invalid state transition: ${this.currentState} -> ${newState}`
      );
    }

    const previousState = this.currentState;
    this.currentState = newState;

    // Notify all listeners
    this.notifyStateChange(previousState, newState);
  }

  /**
   * Force state change without validation (use sparingly)
   */
  public forceState(newState: GameState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    this.notifyStateChange(previousState, newState);
  }

  /**
   * Register callback for state changes
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.onStateChangeCallbacks.push(callback);
  }

  /**
   * Remove a state change callback
   */
  public removeStateChangeCallback(callback: StateChangeCallback): void {
    const index = this.onStateChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.onStateChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of state change
   */
  private notifyStateChange(from: GameState, to: GameState): void {
    this.onStateChangeCallbacks.forEach((callback) => {
      try {
        callback(from, to);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  /**
   * Helper: Check if game is playable (accepting input)
   */
  public isPlayable(): boolean {
    return this.is(GAME_STATE.PLAYING);
  }

  /**
   * Helper: Check if game is in an end state
   */
  public isEnded(): boolean {
    return this.is(GAME_STATE.WON) || this.is(GAME_STATE.GAME_OVER);
  }

  /**
   * Reset state machine to initial state
   */
  public reset(): void {
    this.forceState(GAME_STATE.LOADING);
  }
}
