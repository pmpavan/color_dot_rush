// Base GameObject interface and implementations for Color Rush

import Phaser from 'phaser';

/**
 * Base interface for all game objects
 */
export interface IGameObject {
  x: number;
  y: number;
  active: boolean;
  update(delta: number): void;
  destroy(): void;
}

/**
 * Interface for objects that can be collided with
 */
export interface ICollidable extends IGameObject {
  getBounds<O extends Phaser.Geom.Rectangle>(output?: O): O;
  onCollision(other: ICollidable): void;
}

/**
 * Interface for objects that can be rendered
 */
export interface IRenderable extends IGameObject {
  render(): void;
  setVisible(visible: boolean): void;
}

/**
 * Base GameObject class that extends Phaser.GameObjects.Sprite
 * Provides common functionality for all game objects
 */
export abstract class GameObject extends Phaser.GameObjects.Sprite implements IGameObject, ICollidable, IRenderable {
  public override active: boolean = false;

  constructor(scene: Phaser.Scene, x: number = 0, y: number = 0, texture: string = '', frame?: string | number) {
    super(scene, x, y, texture, frame);
    
    // Add to scene display list and update list
    scene.add.existing(this);
    scene.physics.add.existing(this);
  }

  /**
   * Update method called every frame
   */
  public override update(delta: number): void {
    if (!this.active) return;
    
    // Override in subclasses for specific update logic
    this.updateGameObject(delta);
  }

  /**
   * Abstract method for subclass-specific update logic
   */
  protected abstract updateGameObject(delta: number): void;

  /**
   * Get collision bounds for this object
   */
  public override getBounds<O extends Phaser.Geom.Rectangle>(output?: O): O {
    return super.getBounds(output);
  }

  /**
   * Handle collision with another object
   */
  public abstract onCollision(other: ICollidable): void;

  /**
   * Render the object (handled by Phaser automatically)
   */
  public render(): void {
    // Phaser handles rendering automatically
  }

  /**
   * Activate this object for use
   */
  public activate(x?: number, y?: number): void {
    this.active = true;
    this.setVisible(true);
    
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    
    this.onActivate();
  }

  /**
   * Deactivate this object (return to pool)
   */
  public deactivate(): void {
    this.active = false;
    this.setVisible(false);
    this.onDeactivate();
  }

  /**
   * Called when object is activated
   */
  protected onActivate(): void {
    // Override in subclasses
  }

  /**
   * Called when object is deactivated
   */
  protected onDeactivate(): void {
    // Override in subclasses
  }

  /**
   * Destroy the object completely
   */
  public override destroy(fromScene?: boolean): void {
    this.active = false;
    super.destroy(fromScene);
  }
}