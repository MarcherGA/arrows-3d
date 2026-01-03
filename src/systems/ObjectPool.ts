/**
 * Object Pool
 * Generic object pooling system to reduce garbage collection pressure
 * Implements the Object Pool pattern for high-frequency allocations
 */

import { Vector3 } from "@babylonjs/core";

/**
 * Generic object pool interface
 */
interface IPoolable {
  reset?(): void;
}

/**
 * Generic Object Pool
 */
export class ObjectPool<T extends IPoolable> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly maxSize: number;

  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Get an object from the pool
   * Creates a new one if pool is empty
   */
  public acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.factory();
  }

  /**
   * Return an object to the pool
   * Calls reset() if available
   */
  public release(obj: T): void {
    if (this.pool.length >= this.maxSize) {
      return; // Pool is full, let GC handle it
    }

    if (obj.reset) {
      obj.reset();
    }

    this.pool.push(obj);
  }

  /**
   * Get current pool statistics
   */
  public getStats(): { available: number; maxSize: number } {
    return {
      available: this.pool.length,
      maxSize: this.maxSize,
    };
  }

  /**
   * Clear the pool
   */
  public clear(): void {
    this.pool.length = 0;
  }
}

/**
 * Poolable Vector3 wrapper
 */
class PoolableVector3 extends Vector3 implements IPoolable {
  public reset(): void {
    this.set(0, 0, 0);
  }
}

/**
 * Vector3 Pool - Specialized pool for Vector3 objects
 * Reduces allocations in hot paths (validation, raycasting, etc.)
 */
export class Vector3Pool {
  private static instance: Vector3Pool | null = null;
  private readonly pool: ObjectPool<PoolableVector3>;

  private constructor(initialSize: number = 50, maxSize: number = 100) {
    this.pool = new ObjectPool<PoolableVector3>(
      () => new PoolableVector3(0, 0, 0),
      initialSize,
      maxSize
    );
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): Vector3Pool {
    if (!Vector3Pool.instance) {
      Vector3Pool.instance = new Vector3Pool();
    }
    return Vector3Pool.instance;
  }

  /**
   * Acquire a Vector3 from the pool
   */
  public acquire(): Vector3 {
    return this.pool.acquire();
  }

  /**
   * Release a Vector3 back to the pool
   */
  public release(vector: Vector3): void {
    if (vector instanceof PoolableVector3) {
      this.pool.release(vector);
    }
  }

  /**
   * Acquire with initial values
   */
  public acquireSet(x: number, y: number, z: number): Vector3 {
    const vec = this.pool.acquire();
    vec.set(x, y, z);
    return vec;
  }

  /**
   * Helper: Use a vector temporarily and auto-release
   */
  public use<R>(x: number, y: number, z: number, fn: (vec: Vector3) => R): R {
    const vec = this.acquireSet(x, y, z);
    try {
      return fn(vec);
    } finally {
      this.release(vec);
    }
  }

  /**
   * Get pool statistics
   */
  public getStats(): { available: number; maxSize: number } {
    return this.pool.getStats();
  }

  /**
   * Clear the pool
   */
  public clear(): void {
    this.pool.clear();
  }

  /**
   * Reset singleton
   */
  public static resetInstance(): void {
    if (Vector3Pool.instance) {
      Vector3Pool.instance.clear();
      Vector3Pool.instance = null;
    }
  }
}
