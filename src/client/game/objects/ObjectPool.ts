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
      runChildUpdate: true,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const dot = item as Dot;
        dot.setActive(false);
        dot.setVisible(false);
      }
    });

    // Bomb pool configuration
    this.bombPool = this.scene.add.group({
      classType: Bomb,
      maxSize: this.MAX_BOMBS,
      runChildUpdate: true,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const bomb = item as Bomb;
        bomb.setActive(false);
        bomb.setVisible(false);
      }
    });

    // Slow-mo dot pool configuration
    this.slowMoPool = this.scene.add.group({
      classType: SlowMoDot,
      maxSize: this.MAX_SLOWMO,
      runChildUpdate: true,
      createCallback: (item: Phaser.GameObjects.GameObject) => {
        const slowMo = item as SlowMoDot;
        slowMo.setActive(false);
        slowMo.setVisible(false);
      }
    });
  }

  /**
   * Get a dot from the pool or create a new one
   */
  public getDot(): Dot | null {
    let dot = this.dotPool.getFirstDead() as Dot;
    
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
    let bomb = this.bombPool.getFirstDead() as Bomb;
    
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
    let slowMo = this.slowMoPool.getFirstDead() as SlowMoDot;
    
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
    dot.activate(x, y);
    
    return dot;
  }

  /**
   * Spawn a bomb with specific properties
   */
  public spawnBomb(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): Bomb | null {
    const bomb = this.getBomb();
    if (!bomb) return null;
    
    bomb.init(speed, size, x, y, direction);
    bomb.activate(x, y);
    
    return bomb;
  }

  /**
   * Spawn a slow-mo dot with specific properties
   */
  public spawnSlowMoDot(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): SlowMoDot | null {
    const slowMo = this.getSlowMoDot();
    if (!slowMo) return null;
    
    slowMo.init(speed, size, x, y, direction);
    slowMo.activate(x, y);
    
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
  public update(_delta: number): void {
    // Phaser Groups automatically call update on active children
    // when runChildUpdate is true, so no manual update needed
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
   * Destroy all pools and clean up
   */
  public destroy(): void {
    this.dotPool.destroy(true);
    this.bombPool.destroy(true);
    this.slowMoPool.destroy(true);
  }
}