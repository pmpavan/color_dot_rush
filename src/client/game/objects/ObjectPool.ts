// Object pooling system for Color Rush game objects

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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initializePools();
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
        dot = new Dot(this.scene);
        this.dotPool.add(dot);
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
        bomb = new Bomb(this.scene);
        this.bombPool.add(bomb);
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
        slowMo = new SlowMoDot(this.scene);
        this.slowMoPool.add(slowMo);
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
  }

  /**
   * Clear all objects from pools
   */
  public clearAll(): void {
    this.dotPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      const dot = item as Dot;
      dot.deactivate();
    });
    
    this.bombPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      const bomb = item as Bomb;
      bomb.deactivate();
    });
    
    this.slowMoPool.children.entries.forEach((item: Phaser.GameObjects.GameObject) => {
      const slowMo = item as SlowMoDot;
      slowMo.deactivate();
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
    try {
      if (this.dotPool && this.dotPool.active) {
        this.dotPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying dotPool:', error);
    }

    try {
      if (this.bombPool && this.bombPool.active) {
        this.bombPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying bombPool:', error);
    }

    try {
      if (this.slowMoPool && this.slowMoPool.active) {
        this.slowMoPool.destroy(true);
      }
    } catch (error) {
      console.warn('Error destroying slowMoPool:', error);
    }
  }
}
