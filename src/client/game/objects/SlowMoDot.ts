// SlowMoDot power-up implementation for Color Rush

import Phaser from 'phaser';
import { GameObject, ICollidable } from './GameObject';
import { UIColor } from '../../../shared/types/game';

/**
 * SlowMoDot class represents the slow-motion power-up
 * Appears as shimmering white with blue clock icon
 */
export class SlowMoDot extends GameObject {
  public static readonly DURATION = 3000; // 3 seconds
  public static readonly INITIAL_CHARGES = 3; // Player starts with 3 charges

  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  private clockIcon: Phaser.GameObjects.Image;
  private shimmerTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'slowmo-dot');
    
    this.speed = 100; // Default speed
    this.size = 80; // Default size
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Create clock icon as child object
    this.clockIcon = scene.add.image(0, 0, 'clock-icon');
    this.clockIcon.setTint(0x3498DB); // Blue clock icon
    this.clockIcon.setScale(0.6);
    
    // Set slow-mo dot color (Shimmering White)
    this.setTint(parseInt(UIColor.SLOW_MO.replace('#', '0x')));
    
    // Interactive setup handled by centralized input system in GameScene
  }

  /**
   * Initialize slow-mo dot with specific properties
   */
  public init(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.speed = speed;
    this.size = size;
    this.direction = direction.clone();
    
    // Set visual properties
    this.setDisplaySize(size, size);
    
    // Update hitbox - slightly larger than visual sprite for accessibility
    const hitboxSize = Math.max(size, 44); // Minimum 44px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    this.setSize(hitboxSize, hitboxSize); // For physics body
    
    // Position the dot and clock icon
    this.setPosition(x, y);
    this.clockIcon.setPosition(x, y);
    this.clockIcon.setScale(size / 133); // Scale clock icon relative to dot size
    
    // Start shimmering effect
    this.startShimmerEffect();
  }

  /**
   * Update slow-mo dot movement and lifecycle
   */
  protected updateGameObject(delta: number): void {
    if (!this.active) return;

    // Move the dot based on direction and speed
    const deltaSeconds = delta / 1000;
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;

    // Update clock icon position
    this.clockIcon.setPosition(this.x, this.y);

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
   * Get collision bounds for this slow-mo dot
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
    // Slow-mo dots don't typically collide with other objects
  }

  /**
   * Handle tap/click on this slow-mo dot (called by centralized input system)
   */
  public onTap(): void {
    // Tap handling is now managed by GameScene's centralized collision detection
    // This method is kept for potential future use or debugging
  }

  /**
   * Activate slow-motion effect with enhanced visual feedback
   */
  public activateSlowMo(): void {
    if (!this.active) return;

    // Create multiple radial blue glow effects for more dramatic impact
    this.createRadialGlowEffect();
    
    // Create ripple effect for immediate feedback
    this.createRippleEffect();

    // Hide the slow-mo dot with a satisfying shrink effect
    this.scene.tweens.add({
      targets: [this, this.clockIcon],
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.deactivate();
      }
    });
  }
  
  /**
   * Create enhanced radial glow effect with multiple layers
   */
  private createRadialGlowEffect(): void {
    // Primary glow - large and dramatic
    const primaryGlow = this.scene.add.circle(this.x, this.y, 30, 0x3498DB, 0.8);
    primaryGlow.setDepth(998);
    
    this.scene.tweens.add({
      targets: primaryGlow,
      radius: 300,
      alpha: 0,
      duration: 600,
      ease: 'Power2.easeOut',
      onComplete: () => {
        primaryGlow.destroy();
      }
    });

    // Secondary glow - faster and brighter
    const secondaryGlow = this.scene.add.circle(this.x, this.y, 15, 0x5DADE2, 0.9);
    secondaryGlow.setDepth(999);
    
    this.scene.tweens.add({
      targets: secondaryGlow,
      radius: 150,
      alpha: 0,
      duration: 400,
      ease: 'Power3.easeOut',
      delay: 50,
      onComplete: () => {
        secondaryGlow.destroy();
      }
    });

    // Tertiary glow - subtle and long-lasting
    const tertiaryGlow = this.scene.add.circle(this.x, this.y, 40, 0x85C1E9, 0.4);
    tertiaryGlow.setDepth(997);
    
    this.scene.tweens.add({
      targets: tertiaryGlow,
      radius: 400,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      delay: 100,
      onComplete: () => {
        tertiaryGlow.destroy();
      }
    });
  }

  /**
   * Create enhanced ripple effect for tap feedback
   */
  public createRippleEffect(): void {
    // Create expanding blue ripple effect with multiple layers
    const primaryRipple = this.scene.add.circle(this.x, this.y, 15, 0x3498DB, 0.9);
    primaryRipple.setStrokeStyle(4, 0x5DADE2, 0.8);
    primaryRipple.setDepth(999);
    
    this.scene.tweens.add({
      targets: primaryRipple,
      radius: this.size * 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        primaryRipple.destroy();
      }
    });

    // Secondary ripple for extra impact
    const secondaryRipple = this.scene.add.circle(this.x, this.y, 8, 0x85C1E9, 0.7);
    secondaryRipple.setStrokeStyle(2, 0x3498DB, 0.6);
    secondaryRipple.setDepth(998);
    
    this.scene.tweens.add({
      targets: secondaryRipple,
      radius: this.size * 2,
      alpha: 0,
      duration: 250,
      ease: 'Power2.easeOut',
      delay: 75,
      onComplete: () => {
        secondaryRipple.destroy();
      }
    });
  }

  /**
   * Start shimmering effect for the slow-mo dot
   */
  private startShimmerEffect(): void {
    this.shimmerTween = this.scene.tweens.add({
      targets: this,
      alpha: 0.7,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }



  /**
   * Called when slow-mo dot is activated from pool
   */
  protected override onActivate(): void {
    super.onActivate();
    this.clockIcon.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    this.startShimmerEffect();
  }

  /**
   * Called when slow-mo dot is deactivated to pool
   */
  protected override onDeactivate(): void {
    super.onDeactivate();
    this.clockIcon.setVisible(false);
    
    // Stop shimmer effect
    if (this.shimmerTween) {
      this.shimmerTween.destroy();
      this.shimmerTween = null;
    }
    
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.clockIcon);
  }

  /**
   * Destroy the slow-mo dot and its clock icon
   */
  public override destroy(fromScene?: boolean): void {
    if (this.clockIcon) {
      this.clockIcon.destroy();
    }
    if (this.shimmerTween) {
      this.shimmerTween.destroy();
    }
    super.destroy(fromScene);
  }

  /**
   * Get the slow-mo duration
   */
  public static getDuration(): number {
    return SlowMoDot.DURATION;
  }

  /**
   * Get the initial number of charges
   */
  public static getInitialCharges(): number {
    return SlowMoDot.INITIAL_CHARGES;
  }
}
