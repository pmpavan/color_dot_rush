// Dot game object implementation for Color Rush

import Phaser from 'phaser';
import { GameColor } from '../../../shared/types/game';

/**
 * Dot class represents the colored dots that players need to tap
 */
export class Dot extends Phaser.GameObjects.Arc {
  public color: GameColor;
  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  public override active: boolean = false;

  constructor(scene: Phaser.Scene) {
    // Create as a circle instead of sprite - larger for visibility
    super(scene, 0, 0, 50, 0, 360, false, 0xE74C3C);
    
    this.color = GameColor.RED; // Default color
    this.speed = 100; // Default speed
    this.size = 100; // Increased by 150% from 40px (was 60px)
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Add to scene
    scene.add.existing(this);
    
    // Debug logging removed
    
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
    this.setFillStyle(parseInt(color.replace('#', '0x')));
    this.setRadius(size / 2);
    
    // Update hitbox - slightly larger than visual sprite for accessibility
    const hitboxSize = Math.max(size, 44); // Minimum 44px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the dot
    this.setPosition(x, y);
  }

  /**
   * Update dot movement and lifecycle
   */
  public override update(delta: number): void {
    if (!this.active) return;

    // Move the dot based on direction and speed
    const deltaSeconds = delta / 1000;
    const oldX = this.x;
    const oldY = this.y;
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;
    
    // Debug: Log movement occasionally
    if (Math.random() < 0.01) { // 1% chance to log
      console.log(`Dot moving: speed=${this.speed}, direction=(${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}), delta=${delta}, from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }

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
    return new Phaser.Geom.Rectangle(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height) as O;
  }

  /**
   * Handle collision with another object
   */
  public onCollision(_other: any): void {
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
    // Create celebratory pop effect with simple graphics
    const color = parseInt(this.color.replace('#', '0x'));
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      const popDot = this.scene.add.circle(this.x, this.y, 4, color);
      
      this.scene.tweens.add({
        targets: popDot,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => popDot.destroy()
      });
    }

    // Shrink dot to nothing
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.deactivate();
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
   * Activate the dot
   */
  public activate(): void {
    this.active = true;
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    // Debug logging removed
  }

  /**
   * Deactivate the dot
   */
  public deactivate(): void {
    this.active = false;
    this.setVisible(false);
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
