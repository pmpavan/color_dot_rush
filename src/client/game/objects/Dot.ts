// Dot game object implementation for Color Rush

import Phaser from 'phaser';
import { GameObject, ICollidable } from './GameObject';
import { GameColor } from '../../../shared/types/game';

/**
 * Dot class represents the colored dots that players need to tap
 */
export class Dot extends GameObject {
  public color: GameColor;
  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'dot'); // Will be set dynamically based on color
    
    this.color = GameColor.RED; // Default color
    this.speed = 100; // Default speed
    this.size = 80; // Default size from PRD
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Interactive setup handled by centralized input system in GameScene
  }

  /**
   * Initialize dot with specific properties
   */
  public init(color: GameColor, speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.color = color;
    this.speed = speed;
    this.size = size;
    this.direction = direction.clone();
    
    // Set visual properties
    this.setTint(parseInt(color.replace('#', '0x')));
    this.setDisplaySize(size, size);
    
    // Update hitbox - slightly larger than visual sprite for accessibility
    const hitboxSize = Math.max(size, 44); // Minimum 44px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    this.setSize(hitboxSize, hitboxSize); // For physics body
    
    // Position the dot
    this.setPosition(x, y);
  }

  /**
   * Update dot movement and lifecycle
   */
  protected updateGameObject(delta: number): void {
    if (!this.active) return;

    // Move the dot based on direction and speed
    const deltaSeconds = delta / 1000;
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;

    // Update hitbox position
    this.hitbox.setPosition(
      this.x - this.hitbox.width / 2,
      this.y - this.hitbox.height / 2
    );

    // Check if dot is off-screen and deactivate
    const bounds = this.scene.cameras.main;
    const margin = 100; // Extra margin for cleanup
    
    if (this.x < -margin || 
        this.x > bounds.width + margin || 
        this.y < -margin || 
        this.y > bounds.height + margin) {
      this.deactivate();
    }
  }

  /**
   * Get collision bounds for this dot
   */
  public override getBounds<O extends Phaser.Geom.Rectangle>(output?: O): O {
    if (output) {
      output.setTo(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
      return output;
    }
    return this.hitbox as O;
  }

  /**
   * Handle collision with another object
   */
  public onCollision(_other: ICollidable): void {
    // Handle collision logic if needed
    // For now, dots don't collide with each other
  }

  /**
   * Handle tap/click on this dot (called by centralized input system)
   */
  public onTap(): void {
    // Tap handling is now managed by GameScene's centralized collision detection
    // This method is kept for potential future use or debugging
  }

  /**
   * Create visual feedback when dot is tapped correctly
   */
  public createPopEffect(): void {
    // Create celebratory pop effect with particles
    const particles = this.scene.add.particles(this.x, this.y, 'dot', {
      tint: parseInt(this.color.replace('#', '0x')),
      speed: { min: 50, max: 150 },
      scale: { start: 0.3, end: 0 },
      lifespan: 300,
      quantity: { min: 5, max: 7 }
    });

    // Shrink dot to nothing
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.deactivate();
        particles.destroy();
      }
    });
  }

  /**
   * Create ripple effect for any tap
   */
  public createRippleEffect(): void {
    // Create expanding white ripple effect
    const ripple = this.scene.add.circle(this.x, this.y, 10, 0xFFFFFF, 0.8);
    
    this.scene.tweens.add({
      targets: ripple,
      radius: this.size * 2,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        ripple.destroy();
      }
    });
  }

  /**
   * Called when dot is activated from pool
   */
  protected override onActivate(): void {
    super.onActivate();
    // Reset any visual effects
    this.setScale(1);
    this.setAlpha(1);
  }

  /**
   * Called when dot is deactivated to pool
   */
  protected override onDeactivate(): void {
    super.onDeactivate();
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
  }

  /**
   * Get the color of this dot
   */
  public getColor(): GameColor {
    return this.color;
  }

  /**
   * Check if this dot matches the target color
   */
  public isCorrectColor(targetColor: GameColor): boolean {
    return this.color === targetColor;
  }
}
