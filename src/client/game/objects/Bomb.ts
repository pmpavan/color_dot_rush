// Bomb game object implementation for Color Rush

import Phaser from 'phaser';

/**
 * Bomb class represents dangerous objects that end the game when tapped
 */
export class Bomb extends Phaser.GameObjects.Arc {
  public explosionRadius: number;
  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  private fuseIcon: Phaser.GameObjects.Rectangle;
  public override active: boolean = false;

  constructor(scene: Phaser.Scene) {
    // Create as a dark circle instead of sprite
    super(scene, 0, 0, 40, 0, 360, false, 0x34495E);
    
    this.explosionRadius = 100; // Default explosion radius
    this.speed = 100; // Default speed
    this.size = 80; // Default size
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Create fuse as a red rectangle
    this.fuseIcon = scene.add.rectangle(0, 0, 6, 15, 0xFF0000);
    
    // Add to scene
    scene.add.existing(this);
    
    // Interactive setup handled by centralized input system in GameScene
  }

  /**
   * Initialize bomb with specific properties
   */
  public init(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.speed = speed;
    this.size = size;
    this.direction = direction.clone();
    this.explosionRadius = size * 1.5; // Explosion radius based on size
    
    // Set visual properties
    this.setRadius(size / 2);
    
    // Update hitbox - slightly larger than visual sprite for accessibility
    const hitboxSize = Math.max(size, 44); // Minimum 44px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the bomb and fuse icon
    this.setPosition(x, y);
    this.fuseIcon.setPosition(x, y - size * 0.3); // Position fuse above bomb
    this.fuseIcon.setDisplaySize(6, 15); // Set fuse size
  }

  /**
   * Update bomb movement and lifecycle
   */
  public override update(delta: number): void {
    if (!this.active) return;

    // Move the bomb based on direction and speed
    const deltaSeconds = delta / 1000;
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;

    // Update fuse icon position
    this.fuseIcon.setPosition(this.x, this.y - this.size * 0.3);

    // Update hitbox position
    this.hitbox.setPosition(
      this.x - this.hitbox.width / 2,
      this.y - this.hitbox.height / 2
    );

    // Check if bomb is off-screen and deactivate
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
   * Get collision bounds for this bomb
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
    // Bombs don't typically collide with other objects
    // But could trigger explosion if needed
  }

  /**
   * Handle tap/click on this bomb (called by centralized input system)
   */
  public onTap(): void {
    // Tap handling is now managed by GameScene's centralized collision detection
    // This method is kept for potential future use or debugging
  }

  /**
   * Create explosion animation and effects
   */
  public explode(): void {
    if (!this.active) return;

    // Create explosion effect with simple graphics
    const explosionColors = [0xFF0000, 0xFF4500, 0xFF8C00, 0xFFD700]; // Red, OrangeRed, DarkOrange, Gold
    
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 50 + Math.random() * 100;
      const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
      const size = 6 + Math.random() * 8;
      
      const explosionDot = this.scene.add.circle(this.x, this.y, size, color);
      
      this.scene.tweens.add({
        targets: explosionDot,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2.easeOut',
        onComplete: () => explosionDot.destroy()
      });
    }

    // Screen shake effect (2-3px, 150ms)
    this.scene.cameras.main.shake(150, 0.02); // 150ms duration, 0.02 intensity (about 2-3px)

    // Hide bomb and fuse immediately
    this.setVisible(false);
    this.fuseIcon.setVisible(false);

    // Clean up explosion after animation
    this.scene.time.delayedCall(600, () => {
      this.deactivate();
    });
  }

  /**
   * Create ripple effect for tap feedback
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
   * Activate the bomb
   */
  public activate(): void {
    this.active = true;
    this.setVisible(true);
    this.fuseIcon.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
  }

  /**
   * Deactivate the bomb
   */
  public deactivate(): void {
    this.active = false;
    this.setVisible(false);
    this.fuseIcon.setVisible(false);
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
  }

  /**
   * Destroy the bomb and its fuse icon
   */
  public override destroy(fromScene?: boolean): void {
    if (this.fuseIcon) {
      this.fuseIcon.destroy();
    }
    super.destroy(fromScene);
  }

  /**
   * Get the explosion radius of this bomb
   */
  public getExplosionRadius(): number {
    return this.explosionRadius;
  }
}
