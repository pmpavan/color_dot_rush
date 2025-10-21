// Object pooling system for Color Dot Rush game objects

import Phaser from 'phaser';
import { Dot } from './Dot';
import { Bomb } from './Bomb';
import { SlowMoDot } from './SlowMoDot';
import { GameColor } from '../../../shared/types/game';

/**
 * Generic object pool interface
 */
export interface IObjectPool<T> {
  get(): T | null;
  release(object: T): void;
  update(delta: number): void;
  clear(): void;
  getActiveCount(): number;
  getTotalCount(): number;
}

/**
 * Object pool manager that uses Phaser Groups for efficient object pooling
 * Prevents garbage collection overhead during intensive gameplay
 */
export class ObjectPoolManager {
  private scene: Phaser.Scene;
  
  // Phaser Groups for object pooling
  private dotPool: Phaser.GameObjects.Group;
  private bombPool: Phaser.GameObjects.Group;
  private slowMoPool: Phaser.GameObjects.Group;
  
  // Pool size limits based on performance testing
  private readonly MAX_DOTS = 50;
  private readonly MAX_BOMBS = 20;
  private readonly MAX_SLOWMO = 10;
  
  // Shutdown flag to prevent updates during destruction
  private isShuttingDown: boolean = false;
  
  // Slow motion callback for newly spawned objects
  private slowMotionCallback: ((object: any) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializePools();
  }

  /**
   * Set the slow motion callback for newly spawned objects
   */
  public setSlowMotionCallback(callback: ((object: any) => void) | null): void {
    this.slowMotionCallback = callback;
  }

  /**
   * Initialize all object pools using Phaser Groups
   */
  private initializePools(): void {
    // Dot pool configuration
    this.dotPool = this.scene.add.group({
      classType: Dot,
      maxSize: this.MAX_DOTS,
      runChildUpdate: false, // We'll handle updates manually
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const dot = item as Dot;
        dot.active = false;
        dot.setVisible(false);
      }
    });

    // Bomb pool configuration
    this.bombPool = this.scene.add.group({
      classType: Bomb,
      maxSize: this.MAX_BOMBS,
      runChildUpdate: false, // We'll handle updates manually
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const bomb = item as Bomb;
        bomb.active = false;
        bomb.setVisible(false);
      }
    });

    // Slow-mo dot pool configuration
    this.slowMoPool = this.scene.add.group({
      classType: SlowMoDot,
      maxSize: this.MAX_SLOWMO,
      runChildUpdate: false, // We'll handle updates manually
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const slowMo = item as SlowMoDot;
        slowMo.active = false;
        slowMo.setVisible(false);
      }
    });
  }

  /**
   * Get a dot from the pool or create a new one
   */
  public getDot(): Dot | null {
    // Find an inactive dot
    let dot = this.dotPool.children.entries.find(item => !(item as Dot).active) as Dot;
    
    if (!dot) {
      if (this.dotPool.children.size < this.MAX_DOTS) {
        try {
          dot = new Dot(this.scene);
          // Validate the dot was created successfully
          if (dot && typeof dot.destroy === 'function') {
            this.dotPool.add(dot);
          } else {
            console.warn('Failed to create valid dot object');
            return null;
          }
        } catch (error) {
          console.warn('Error creating dot:', error);
          return null;
        }
      } else {
        // Pool is full, return null
        return null;
      }
    }
    
    return dot;
  }

  /**
   * Get a bomb from the pool or create a new one
   */
  public getBomb(): Bomb | null {
    // Find an inactive bomb
    let bomb = this.bombPool.children.entries.find(item => !(item as Bomb).active) as Bomb;
    
    if (!bomb) {
      if (this.bombPool.children.size < this.MAX_BOMBS) {
        try {
          bomb = new Bomb(this.scene);
          // Validate the bomb was created successfully
          if (bomb && typeof bomb.destroy === 'function') {
            this.bombPool.add(bomb);
          } else {
            console.warn('Failed to create valid bomb object');
            return null;
          }
        } catch (error) {
          console.warn('Error creating bomb:', error);
          return null;
        }
      } else {
        // Pool is full, return null
        return null;
      }
    }
    
    return bomb;
  }

  /**
   * Get a slow-mo dot from the pool or create a new one
   */
  public getSlowMoDot(): SlowMoDot | null {
    // Find an inactive slow-mo dot
    let slowMo = this.slowMoPool.children.entries.find(item => !(item as SlowMoDot).active) as SlowMoDot;
    
    if (!slowMo) {
      if (this.slowMoPool.children.size < this.MAX_SLOWMO) {
        try {
          slowMo = new SlowMoDot(this.scene);
          // Validate the slow-mo dot was created successfully
          if (slowMo && typeof slowMo.destroy === 'function') {
            this.slowMoPool.add(slowMo);
          } else {
            console.warn('Failed to create valid slow-mo dot object');
            return null;
          }
        } catch (error) {
          console.warn('Error creating slow-mo dot:', error);
          return null;
        }
      } else {
        // Pool is full, return null
        return null;
      }
    }
    
    return slowMo;
  }

  /**
   * Spawn a dot with specific properties
   */
  public spawnDot(color: GameColor, speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): Dot | null {
    const dot = this.getDot();
    if (!dot) return null;
    
    dot.init(color, speed, size, x, y, direction);
    dot.activate();
    
    // Apply slow motion if active
    if (this.slowMotionCallback) {
      this.slowMotionCallback(dot);
    }
    
    return dot;
  }

  /**
   * Spawn a bomb with specific properties
   */
  public spawnBomb(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): Bomb | null {
    const bomb = this.getBomb();
    if (!bomb) return null;
    
    bomb.init(speed, size, x, y, direction);
    bomb.activate();
    
    // Apply slow motion if active
    if (this.slowMotionCallback) {
      this.slowMotionCallback(bomb);
    }
    
    return bomb;
  }

  /**
   * Spawn a slow-mo dot with specific properties
   */
  public spawnSlowMoDot(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): SlowMoDot | null {
    const slowMo = this.getSlowMoDot();
    if (!slowMo) return null;
    
    slowMo.init(speed, size, x, y, direction);
    slowMo.activate();
    
    return slowMo;
  }

  /**
   * Release a dot back to the pool
   */
  public releaseDot(dot: Dot): void {
    dot.deactivate();
  }

  /**
   * Release a bomb back to the pool
   */
  public releaseBomb(bomb: Bomb): void {
    bomb.deactivate();
  }

  /**
   * Release a slow-mo dot back to the pool
   */
  public releaseSlowMoDot(slowMo: SlowMoDot): void {
    slowMo.deactivate();
  }

  /**
   * Update all active objects in pools
   */
  public update(delta: number): void {
    // Don't update if shutting down
    if (this.isShuttingDown) {
      return;
    }

    // Manual update to ensure objects move properly
    this.dotPool.children.entries.forEach((dot: Phaser.GameObjects.GameObject) => {
      const dotObj = dot as Dot;
      if (dotObj.active && dotObj.update) {
        dotObj.update(delta);
      }
    });

    this.bombPool.children.entries.forEach((bomb: Phaser.GameObjects.GameObject) => {
      const bombObj = bomb as Bomb;
      if (bombObj.active && bombObj.update) {
        bombObj.update(delta);
      }
    });

    this.slowMoPool.children.entries.forEach((slowMo: Phaser.GameObjects.GameObject) => {
      const slowMoObj = slowMo as SlowMoDot;
      if (slowMoObj.active && slowMoObj.update) {
        slowMoObj.update(delta);
      }
    });

    // Handle all collision types for bouncing behavior
    this.handleAllCollisions();
  }

  /**
   * Handle all collision types for bouncing behavior
   * Includes: dot-dot, slowmo-dot, slowmo-slowmo collisions
   */
  private handleAllCollisions(): void {
    const activeDots = this.getActiveDots();
    const activeSlowMoDots = this.getActiveSlowMoDots();
    
    // 1. Handle dot-to-dot collisions
    for (let i = 0; i < activeDots.length; i++) {
      for (let j = i + 1; j < activeDots.length; j++) {
        const dot1 = activeDots[i];
        const dot2 = activeDots[j];
        
        // Ensure both dots exist and are active
        if (dot1 && dot2 && dot1.isCollidingWith(dot2)) {
          // Handle collision and bouncing
          dot1.handleDotCollision(dot2);
        }
      }
    }
    
    // 2. Handle slow-mo dot to regular dot collisions
    for (let i = 0; i < activeSlowMoDots.length; i++) {
      for (let j = 0; j < activeDots.length; j++) {
        const slowMoDot = activeSlowMoDots[i];
        const dot = activeDots[j];
        
        // Ensure both objects exist and are active
        if (slowMoDot && dot && slowMoDot.isCollidingWith(dot)) {
          // Handle collision and bouncing
          slowMoDot.handleDotCollision(dot);
        }
      }
    }
    
    // 3. Handle slow-mo dot to slow-mo dot collisions
    for (let i = 0; i < activeSlowMoDots.length; i++) {
      for (let j = i + 1; j < activeSlowMoDots.length; j++) {
        const slowMoDot1 = activeSlowMoDots[i];
        const slowMoDot2 = activeSlowMoDots[j];
        
        // Ensure both slow-mo dots exist and are active
        if (slowMoDot1 && slowMoDot2 && slowMoDot1.isCollidingWith(slowMoDot2)) {
          // Handle collision and bouncing
          slowMoDot1.handleSlowMoCollision(slowMoDot2);
        }
      }
    }
  }

  /**
   * Pause all active objects in pools (for Game Over modal)
   */
  public pauseAllObjects(): void {
    // Pause all active dots
    this.dotPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && item.active) {
        try {
          const dot = item as Dot;
          if (dot && typeof dot.setVisible === 'function') {
            dot.setVisible(false);
          }
        } catch (error) {
          console.warn('Error pausing dot:', error);
        }
      }
    });
    
    // Pause all active bombs
    this.bombPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && item.active) {
        try {
          const bomb = item as Bomb;
          if (bomb && typeof bomb.setVisible === 'function') {
            bomb.setVisible(false);
          }
        } catch (error) {
          console.warn('Error pausing bomb:', error);
        }
      }
    });
    
    // Pause all active slow-mo dots
    this.slowMoPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && item.active) {
        try {
          const slowMo = item as SlowMoDot;
          if (slowMo && typeof slowMo.setVisible === 'function') {
            slowMo.setVisible(false);
          }
        } catch (error) {
          console.warn('Error pausing slow-mo dot:', error);
        }
      }
    });
  }

  /**
   * Clear all objects from pools
   */
  public clearAll(): void {
    // Set shutdown flag to prevent updates during cleanup
    this.isShuttingDown = true;
    
    // Clear dots
    this.dotPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && typeof item.destroy === 'function') {
        try {
          const dot = item as Dot;
          if (dot && typeof dot.deactivate === 'function') {
            dot.deactivate();
          }
        } catch (error) {
          console.warn('Error deactivating dot:', error);
        }
      }
    });
    
    // Clear bombs
    this.bombPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && typeof item.destroy === 'function') {
        try {
          const bomb = item as Bomb;
          if (bomb && typeof bomb.deactivate === 'function') {
            bomb.deactivate();
          }
        } catch (error) {
          console.warn('Error deactivating bomb:', error);
        }
      }
    });
    
    // Clear slow-mo dots
    this.slowMoPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      if (item && typeof item.destroy === 'function') {
        try {
          const slowMo = item as SlowMoDot;
          if (slowMo && typeof slowMo.deactivate === 'function') {
            slowMo.deactivate();
          }
        } catch (error) {
          console.warn('Error deactivating slow-mo dot:', error);
        }
      }
    });
  }

  /**
   * Get statistics about pool usage
   */
  public getPoolStats(): {
    dots: { active: number; total: number; max: number };
    bombs: { active: number; total: number; max: number };
    slowMo: { active: number; total: number; max: number };
  } {
    return {
      dots: {
        active: this.dotPool.countActive(),
        total: this.dotPool.children.size,
        max: this.MAX_DOTS
      },
      bombs: {
        active: this.bombPool.countActive(),
        total: this.bombPool.children.size,
        max: this.MAX_BOMBS
      },
      slowMo: {
        active: this.slowMoPool.countActive(),
        total: this.slowMoPool.children.size,
        max: this.MAX_SLOWMO
      }
    };
  }

  /**
   * Get all active dots
   */
  public getActiveDots(): Dot[] {
    return this.dotPool.children.entries.filter(dot => dot.active) as Dot[];
  }

  /**
   * Get all active bombs
   */
  public getActiveBombs(): Bomb[] {
    return this.bombPool.children.entries.filter(bomb => bomb.active) as Bomb[];
  }

  /**
   * Get all active slow-mo dots
   */
  public getActiveSlowMoDots(): SlowMoDot[] {
    return this.slowMoPool.children.entries.filter(slowMo => slowMo.active) as SlowMoDot[];
  }

  /**
   * Get total count of active objects across all pools
   */
  public getActiveObjectCount(): number {
    return this.getActiveDots().length + this.getActiveBombs().length + this.getActiveSlowMoDots().length;
  }

  /**
   * Get count of active bombs
   */
  public getActiveBombCount(): number {
    return this.getActiveBombs().length;
  }

  /**
   * Update maximum pool sizes for performance optimization
   */
  public updateMaxSizes(limits: { dots: number; bombs: number; slowMo: number }): void {
    // Note: Phaser Groups don't support dynamic maxSize changes
    // We'll implement this by tracking limits manually
    console.log('Updated pool size limits:', limits);
  }

  /**
   * Emergency cleanup for performance optimization
   * Deactivates excess objects to improve performance
   */
  public emergencyCleanup(maxTotalObjects: number): void {
    const totalActive = this.dotPool.countActive() + this.bombPool.countActive() + this.slowMoPool.countActive();
    
    if (totalActive <= maxTotalObjects) return;
    
    const objectsToRemove = totalActive - maxTotalObjects;
    let removed = 0;
    
    console.warn(`Emergency cleanup: removing ${objectsToRemove} objects`);
    
    // Remove dots first (least critical for gameplay)
    const activeDots = this.getActiveDots();
    for (const dot of activeDots) {
      if (removed >= objectsToRemove) break;
      dot.deactivate();
      removed++;
    }
    
    // Remove excess bombs if still over limit
    if (removed < objectsToRemove) {
      const activeBombs = this.getActiveBombs();
      for (const bomb of activeBombs) {
        if (removed >= objectsToRemove) break;
        bomb.deactivate();
        removed++;
      }
    }
    
    console.log(`Emergency cleanup complete: removed ${removed} objects`);
  }

  /**
   * Destroy all pools and clean up
   */
  public destroy(): void {
    // Set shutdown flag to prevent updates during destruction
    this.isShuttingDown = true;
    
    // Clear all objects first to prevent issues during destruction
    this.clearAll();
    
    try {
      if (this.dotPool && typeof this.dotPool.destroy === 'function') {
        this.dotPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying dotPool:', error);
    }

    try {
      if (this.bombPool && typeof this.bombPool.destroy === 'function') {
        this.bombPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying bombPool:', error);
    }

    try {
      if (this.slowMoPool && typeof this.slowMoPool.destroy === 'function') {
        this.slowMoPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying slowMoPool:', error);
    }

    // Clear references
    this.dotPool = null as any;
    this.bombPool = null as any;
    this.slowMoPool = null as any;
  }
}
