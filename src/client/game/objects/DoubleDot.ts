// DoubleDot power-up implementation for Color Dot Rush

import Phaser from 'phaser';
import { GlowEffects } from '../utils/GlowEffects';

/**
 * DoubleDot class represents the 2x points power-up
 * Appears as a single bright green ball with white "2x" icon
 * Uses a distinct color that's not used by regular game dots
 */
export class DoubleDot extends Phaser.GameObjects.Arc {
  public static readonly DURATION = 10000; // 10 seconds

  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  private doubleIcon: Phaser.GameObjects.Arc;
  private doubleText: Phaser.GameObjects.DOMElement | null = null;
  private shimmerTween: Phaser.Tweens.Tween | null = null;
  private lastCollisionTime: number = 0;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private activationGlows: Phaser.GameObjects.Arc[] = [];
  private activationTweens: Phaser.Tweens.Tween[] = [];
  private breathingTween: Phaser.Tweens.Tween | null = null;
  public override active: boolean = false;

  constructor(scene: Phaser.Scene) {
    // Create as bright green circle with distinct 2x-themed design
    super(scene, 0, 0, 40, 0, 360, false, 0x00FF00);
    
    this.speed = 100; // Default speed
    this.size = 80; // Default size
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Create enhanced 2x icon with bright white theme for high visibility
    try {
      this.doubleIcon = scene.add.circle(0, 0, 20, 0xFFFFFF, 1.0);
      this.doubleIcon.setStrokeStyle(3, 0x00FF00, 1);
      this.doubleIcon.setDepth(1000); // Ensure it's on top
      this.doubleIcon.setVisible(false); // Start hidden
    } catch (error) {
      console.warn(`Error creating 2x icon:`, error);
    }
    
    // Create "2x" text using DOM text render (required for Devvit)
    try {
      this.doubleText = scene.add.dom(0, 0, 'div', {
        innerHTML: '<span style="color: #00FF00; font-size: 16px; font-weight: bold; text-align: center; font-family: Arial, sans-serif;">2x</span>',
        style: {
          position: 'absolute',
          pointerEvents: 'none',
          userSelect: 'none'
        }
      });
      this.doubleText.setOrigin(0.5, 0.5);
      this.doubleText.setDepth(1001); // Ensure it's on top of the icon
      this.doubleText.setVisible(false); // Start hidden
    } catch (error) {
      console.warn(`Error creating 2x DOM text:`, error);
      // Create a fallback text object
      this.doubleText = null;
    }
    
    // Start inactive and hidden
    this.active = false;
    this.setVisible(false);
    
    // Don't add to scene directly - let ObjectPool manage this
    // scene.add.existing(this);
    
    // Interactive setup handled by centralized input system in GameScene
  }

  /**
   * Initialize 2x dot with specific properties
   */
  public init(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.speed = speed;
    this.size = size;
    this.direction = direction.clone();
    
    // Set visual properties - bright green theme for maximum visibility
    this.setRadius(size / 2);
    this.setFillStyle(0x00FF00); // Bright green - distinct from all regular dot colors
    this.setStrokeStyle(3, 0xFFFFFF, 1); // Bright white stroke for extra visibility
    
    // Update hitbox - significantly larger than visual sprite for better accessibility
    const hitboxSize = Math.max(size * 1.5, 60); // 50% larger than visual size, minimum 60px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the dot and 2x icon
    this.setPosition(x, y);
    if (this.doubleIcon) {
      this.doubleIcon.setPosition(x, y);
    }
    if (this.doubleText) {
      this.doubleText.setPosition(x, y);
    }
    
    // Ensure 2x elements are visible and properly positioned
    if (this.doubleIcon) {
      this.doubleIcon.setVisible(true);
      this.doubleIcon.setAlpha(1);
    }
    if (this.doubleText) {
      this.doubleText.setVisible(true);
      this.doubleText.setAlpha(1);
    }
    
    // Initialize hitbox position
    this.hitbox.setPosition(
      x - this.hitbox.width / 2,
      y - this.hitbox.height / 2
    );
    
    // Create enhanced glow effect
    this.createGlowEffect();
    
    // Start breathing effect
    this.startBreathingEffect();
  }

  /**
   * Update 2x dot movement and lifecycle
   */
  public override update(delta: number): void {
    if (!this.active) return;

    // Move the dot based on direction and speed
    const deltaSeconds = delta / 1000;
    
    // Check if direction vector is valid
    if (isNaN(this.direction.x) || isNaN(this.direction.y) || 
        this.direction.x === 0 && this.direction.y === 0) {
      return;
    }
    
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;

    // Update 2x icon position
    if (this.doubleIcon) {
      this.doubleIcon.setPosition(this.x, this.y);
    }
    if (this.doubleText) {
      this.doubleText.setPosition(this.x, this.y);
    }

    // Update glow effect position
    if (this.glowEffect) {
      this.glowEffect.setPosition(this.x, this.y);
    }

    // Update hitbox position
    this.hitbox.setPosition(
      this.x - this.hitbox.width / 2,
      this.y - this.hitbox.height / 2
    );

    // Check if dot is off-screen and deactivate
    const margin = 100; // Extra margin for cleanup
    
    // Use consistent bounds checking with collision detection
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    if (this.x < -margin || 
        this.x > screenWidth + margin || 
        this.y < -margin || 
        this.y > screenHeight + margin) {
      console.log(`[2X DEBUG] 2x dot deactivated - off screen at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) screen: ${screenWidth}x${screenHeight}`);
      this.deactivate();
    }
  }

  /**
   * Get collision bounds for this 2x dot
   */
  public override getBounds<O extends Phaser.Geom.Rectangle>(output?: O): O {
    if (output) {
      output.setTo(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
      return output;
    }
    return new Phaser.Geom.Rectangle(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height) as O;
  }

  /**
   * Check if this 2x dot is colliding with another object
   */
  public isCollidingWith(other: any): boolean {
    if (!this.active || !other.active) return false;
    
    // Skip collision detection for objects that are off-screen
    if (this.x < -100 || this.x > this.scene.scale.width + 100 || 
        this.y < -100 || this.y > this.scene.scale.height + 100 ||
        other.x < -100 || other.x > this.scene.scale.width + 100 || 
        other.y < -100 || other.y > this.scene.scale.height + 100) {
      return false;
    }
    
    // Calculate distance between centers
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate minimum distance for collision
    const minDistance = (this.size + other.size) / 2;
    
    // Use a more conservative collision detection
    const collisionBuffer = 8; // Increased buffer to reduce false positives
    
    // Ensure we don't get negative collision threshold
    const collisionThreshold = Math.max(8, minDistance - collisionBuffer);
    
    // Only check current distance, not predictive
    return distance < collisionThreshold;
  }

  /**
   * Handle collision with a regular dot
   */
  public handleDotCollision(dot: any): void {
    if (!this.active || !dot.active) return;
    
    // Add collision cooldown to prevent rapid multiple collisions
    const currentTime = this.scene.time.now;
    const collisionCooldown = 500; // Increased to 500ms cooldown to prevent rapid collisions
    
    if (currentTime - this.lastCollisionTime < collisionCooldown || 
        currentTime - dot.lastCollisionTime < collisionCooldown) {
      return;
    }
    
    // Calculate collision vector (from this 2x dot to regular dot)
    const dx = dot.x - this.x;
    const dy = dot.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Calculate minimum distance for collision
    const minDistance = (this.size + dot.size) / 2;
    
    // Only handle collision if objects are actually overlapping
    if (distance >= minDistance) return;
    
    // Mark collision time for both objects
    this.lastCollisionTime = currentTime;
    dot.lastCollisionTime = currentTime;
    
    // Normalize collision vector
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    // Separate objects first to prevent overlap - push them apart more aggressively
    const overlap = minDistance - distance;
    const separationForce = Math.max(overlap * 0.8, 5); // Increased separation force
    const separationX = normalX * separationForce;
    const separationY = normalY * separationForce;
    
    this.x -= separationX;
    this.y -= separationY;
    dot.x += separationX;
    dot.y += separationY;
    
    // Realistic collision physics: objects bounce off each other based on collision normal
    // Store original directions for debug logging
    const originalThisDir = { x: this.direction.x, y: this.direction.y };
    const originalDotDir = { x: dot.direction.x, y: dot.direction.y };
    
    // Calculate reflection vectors based on collision normal
    // Each object bounces off the collision surface (normal vector)
    const dot1 = 2 * (this.direction.x * normalX + this.direction.y * normalY);
    const dot2 = 2 * (dot.direction.x * normalX + dot.direction.y * normalY);
    
    // Update directions using reflection formula: new_dir = old_dir - 2 * dot(old_dir, normal) * normal
    this.direction.x = this.direction.x - dot1 * normalX;
    this.direction.y = this.direction.y - dot1 * normalY;
    
    dot.direction.x = dot.direction.x - dot2 * normalX;
    dot.direction.y = dot.direction.y - dot2 * normalY;
    
    // Ensure directions remain normalized unit vectors
    const thisLength = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    const dotLength = Math.sqrt(dot.direction.x * dot.direction.x + dot.direction.y * dot.direction.y);
    
    if (thisLength > 0) {
      this.direction.x /= thisLength;
      this.direction.y /= thisLength;
    }
    
    if (dotLength > 0) {
      dot.direction.x /= dotLength;
      dot.direction.y /= dotLength;
    }
    
    // Debug logging (occasional)
    if (Math.random() < 0.05) { // 5% chance to log
      console.log(`2x-Dot collision: distance=${distance.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, overlap=${(minDistance - distance).toFixed(1)}`);
      console.log(`  2x: ${originalThisDir.x.toFixed(2)}, ${originalThisDir.y.toFixed(2)} -> ${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}`);
      console.log(`  Dot: ${originalDotDir.x.toFixed(2)}, ${originalDotDir.y.toFixed(2)} -> ${dot.direction.x.toFixed(2)}, ${dot.direction.y.toFixed(2)}`);
    }
  }

  /**
   * Handle collision with another 2x dot
   */
  public handleDoubleCollision(otherDouble: DoubleDot): void {
    if (!this.active || !otherDouble.active) return;
    
    // Add collision cooldown to prevent rapid multiple collisions
    const currentTime = this.scene.time.now;
    const collisionCooldown = 500; // Increased to 500ms cooldown to prevent rapid collisions
    
    if (currentTime - this.lastCollisionTime < collisionCooldown || 
        currentTime - otherDouble.lastCollisionTime < collisionCooldown) {
      return;
    }
    
    // Calculate collision vector (from this 2x dot to other 2x dot)
    const dx = otherDouble.x - this.x;
    const dy = otherDouble.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Calculate minimum distance for collision
    const minDistance = (this.size + otherDouble.size) / 2;
    
    // Only handle collision if objects are actually overlapping
    if (distance >= minDistance) return;
    
    // Mark collision time for both objects
    this.lastCollisionTime = currentTime;
    otherDouble.lastCollisionTime = currentTime;
    
    // Normalize collision vector
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    // Separate objects first to prevent overlap - push them apart more aggressively
    const overlap = minDistance - distance;
    const separationForce = Math.max(overlap * 0.8, 5); // Increased separation force
    const separationX = normalX * separationForce;
    const separationY = normalY * separationForce;
    
    this.x -= separationX;
    this.y -= separationY;
    otherDouble.x += separationX;
    otherDouble.y += separationY;
    
    // Realistic collision physics: objects bounce off each other based on collision normal
    // Store original directions for debug logging
    const originalThisDir = { x: this.direction.x, y: this.direction.y };
    const originalOtherDir = { x: otherDouble.direction.x, y: otherDouble.direction.y };
    
    // Calculate reflection vectors based on collision normal
    // Each object bounces off the collision surface (normal vector)
    const dot1 = 2 * (this.direction.x * normalX + this.direction.y * normalY);
    const dot2 = 2 * (otherDouble.direction.x * normalX + otherDouble.direction.y * normalY);
    
    // Update directions using reflection formula: new_dir = old_dir - 2 * dot(old_dir, normal) * normal
    this.direction.x = this.direction.x - dot1 * normalX;
    this.direction.y = this.direction.y - dot1 * normalY;
    
    otherDouble.direction.x = otherDouble.direction.x - dot2 * normalX;
    otherDouble.direction.y = otherDouble.direction.y - dot2 * normalY;
    
    // Ensure directions remain normalized unit vectors
    const thisLength = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    const otherLength = Math.sqrt(otherDouble.direction.x * otherDouble.direction.x + otherDouble.direction.y * otherDouble.direction.y);
    
    if (thisLength > 0) {
      this.direction.x /= thisLength;
      this.direction.y /= thisLength;
    }
    
    if (otherLength > 0) {
      otherDouble.direction.x /= otherLength;
      otherDouble.direction.y /= otherLength;
    }
    
    // Debug logging (occasional)
    if (Math.random() < 0.05) { // 5% chance to log
      console.log(`2x-2x collision: distance=${distance.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, overlap=${(minDistance - distance).toFixed(1)}`);
      console.log(`  2x1: ${originalThisDir.x.toFixed(2)}, ${originalThisDir.y.toFixed(2)} -> ${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}`);
      console.log(`  2x2: ${originalOtherDir.x.toFixed(2)}, ${originalOtherDir.y.toFixed(2)} -> ${otherDouble.direction.x.toFixed(2)}, ${otherDouble.direction.y.toFixed(2)}`);
    }
  }

  /**
   * Handle collision with another object (legacy method)
   */
  public onCollision(_other: any): void {
    // 2x dots now have specific collision handling methods
  }

  /**
   * Handle tap/click on this 2x dot (called by centralized input system)
   */
  public onTap(): void {
    // Tap handling is now managed by GameScene's centralized collision detection
    // This method is kept for potential future use or debugging
  }

  /**
   * Activate 2x points effect with enhanced visual feedback
   */
  public activateDouble(): void {
    if (!this.active) return;

    // Create 2x points effect with enhanced green theme
    this.createDoublePointsEffect();
    
    // Create enhanced ripple effect for immediate feedback
    this.createRippleEffect();

    // Hide the 2x dot with a satisfying shrink effect
    this.scene.tweens.add({
      targets: [this, this.doubleIcon, this.doubleText],
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
   * Create 2x points effect with enhanced green theme
   */
  private createDoublePointsEffect(): void {
    // Clean up any existing activation glows first
    this.cleanupActivationGlows();
    
    // Primary 2x points glow - bright green
    const primaryGlow = this.scene.add.circle(this.x, this.y, 30, 0x00FF00, 0.9);
    primaryGlow.setDepth(998);
    this.activationGlows.push(primaryGlow);
    
    const tween1 = this.scene.tweens.add({
      targets: primaryGlow,
      radius: 400,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.activationGlows.indexOf(primaryGlow);
        if (index > -1) {
          this.activationGlows.splice(index, 1);
        }
        const tweenIndex = this.activationTweens.indexOf(tween1);
        if (tweenIndex > -1) {
          this.activationTweens.splice(tweenIndex, 1);
        }
        if (primaryGlow.scene) {
          primaryGlow.destroy();
        }
      }
    });
    this.activationTweens.push(tween1);

    // Secondary white glow - faster and brighter
    const secondaryGlow = this.scene.add.circle(this.x, this.y, 20, 0xFFFFFF, 0.95);
    secondaryGlow.setDepth(999);
    this.activationGlows.push(secondaryGlow);
    
    const tween2 = this.scene.tweens.add({
      targets: secondaryGlow,
      radius: 200,
      alpha: 0,
      duration: 500,
      ease: 'Power3.easeOut',
      delay: 100,
      onComplete: () => {
        const index = this.activationGlows.indexOf(secondaryGlow);
        if (index > -1) {
          this.activationGlows.splice(index, 1);
        }
        const tweenIndex = this.activationTweens.indexOf(tween2);
        if (tweenIndex > -1) {
          this.activationTweens.splice(tweenIndex, 1);
        }
        if (secondaryGlow.scene) {
          secondaryGlow.destroy();
        }
      }
    });
    this.activationTweens.push(tween2);

    // 2x points particles
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 20,
        this.y + Math.sin(angle) * 20,
        4,
        0x00FF00,
        1.0
      );
      particle.setDepth(1000);
      this.activationGlows.push(particle);
      
      const particleTween = this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 150,
        y: this.y + Math.sin(angle) * 150,
        alpha: 0,
        duration: 600,
        ease: 'Power2.easeOut',
        delay: i * 50,
        onComplete: () => {
          const index = this.activationGlows.indexOf(particle);
          if (index > -1) {
            this.activationGlows.splice(index, 1);
          }
          const tweenIndex = this.activationTweens.indexOf(particleTween);
          if (tweenIndex > -1) {
            this.activationTweens.splice(tweenIndex, 1);
          }
          if (particle.scene) {
            particle.destroy();
          }
        }
      });
      this.activationTweens.push(particleTween);
    }
  }

  /**
   * Create enhanced ripple effect for tap feedback with 2x theme
   */
  public createRippleEffect(): void {
    // Create expanding bright green ripple effect with multiple layers
    const primaryRipple = this.scene.add.circle(this.x, this.y, 15, 0x00FF00, 0.9);
    primaryRipple.setStrokeStyle(4, 0xFFFFFF, 0.8);
    primaryRipple.setDepth(999);
    this.activationGlows.push(primaryRipple);
    
    const rippleTween1 = this.scene.tweens.add({
      targets: primaryRipple,
      radius: this.size * 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.activationGlows.indexOf(primaryRipple);
        if (index > -1) {
          this.activationGlows.splice(index, 1);
        }
        const tweenIndex = this.activationTweens.indexOf(rippleTween1);
        if (tweenIndex > -1) {
          this.activationTweens.splice(tweenIndex, 1);
        }
        if (primaryRipple.scene) {
          primaryRipple.destroy();
        }
      }
    });
    this.activationTweens.push(rippleTween1);

    // Secondary ripple for extra impact with white theme
    const secondaryRipple = this.scene.add.circle(this.x, this.y, 8, 0xFFFFFF, 0.8);
    secondaryRipple.setStrokeStyle(2, 0x00FF00, 0.7);
    secondaryRipple.setDepth(998);
    this.activationGlows.push(secondaryRipple);
    
    const rippleTween2 = this.scene.tweens.add({
      targets: secondaryRipple,
      radius: this.size * 2,
      alpha: 0,
      duration: 250,
      ease: 'Power2.easeOut',
      delay: 75,
      onComplete: () => {
        const index = this.activationGlows.indexOf(secondaryRipple);
        if (index > -1) {
          this.activationGlows.splice(index, 1);
        }
        const tweenIndex = this.activationTweens.indexOf(rippleTween2);
        if (tweenIndex > -1) {
          this.activationTweens.splice(tweenIndex, 1);
        }
        if (secondaryRipple.scene) {
          secondaryRipple.destroy();
        }
      }
    });
    this.activationTweens.push(rippleTween2);
  }

  /**
   * Create glow effect for the 2x dot
   */
  private createGlowEffect(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }
    
    // Create a stable glow effect instead of pulsing
    const glowConfig = GlowEffects.getDoubleGlowConfig();
    this.glowEffect = GlowEffects.createGlowEffect(
      this.scene,
      this.x,
      this.y,
      glowConfig,
      this.depth - 1
    );
    
    // No pulsing tween - keep glow stable
    this.glowTween = null;
  }

  /**
   * Start breathing effect for the 2x dot
   */
  private startBreathingEffect(): void {
    // Subtle size pulsing to indicate "living" power-up
    this.breathingTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Activate the 2x dot
   */
  public activate(): void {
    this.active = true;
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    
    // Force set the green color again to ensure it's applied
    this.setFillStyle(0x00FF00);
    this.setStrokeStyle(3, 0xFFFFFF, 1);
    
    // Force add to scene when activated - don't rely on exists check
    try {
      this.scene.add.existing(this);
    } catch (error) {
      console.warn(`Error adding 2x dot to scene:`, error);
    }
    
    // Ensure 2x elements are properly added to scene and visible
    try {
      this.scene.add.existing(this.doubleIcon);
    } catch (error) {
      console.warn(`Error adding 2x icon to scene:`, error);
    }
    
    if (this.doubleText) {
      try {
        this.scene.add.existing(this.doubleText);
      } catch (error) {
        console.warn(`Error adding 2x text to scene:`, error);
      }
    }
    
    if (this.doubleIcon) {
      this.doubleIcon.setVisible(true);
      this.doubleIcon.setAlpha(1);
    }
    if (this.doubleText) {
      this.doubleText.setVisible(true);
      this.doubleText.setAlpha(1);
    }
    
    // Show glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(true);
    }
  }

  /**
   * Clean up activation glow effects
   */
  private cleanupActivationGlows(): void {
    // Kill tweens and destroy all activation glow objects
    for (const glow of this.activationGlows) {
      // Always try to kill tweens first, even if object might be invalid
      try {
        if (this.scene && this.scene.tweens) {
          this.scene.tweens.killTweensOf(glow);
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
      
      // Then try to destroy the object if it still exists
      try {
        if (glow && !glow.scene) {
          // Object is already destroyed, skip
          continue;
        }
        if (glow) {
          glow.destroy();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this.activationGlows = [];
  }

  /**
   * Deactivate the 2x dot
   */
  public deactivate(): void {
    console.log(`[2X DEBUG] Deactivating 2x dot at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    this.active = false;
    this.setVisible(false);
    this.doubleIcon.setVisible(false);
    if (this.doubleText) {
      this.doubleText.setVisible(false);
    }
    
    // Hide and clean up glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(false);
    }
    if (this.glowTween) {
      this.glowTween.remove();
      this.glowTween = null;
    }
    
    // Stop shimmer effect
    if (this.shimmerTween) {
      this.shimmerTween.stop();
      this.shimmerTween.remove();
      this.shimmerTween = null;
    }
    
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.doubleIcon);
    this.scene.tweens.killTweensOf(this.doubleText);
    
    // Clean up activation glows
    this.cleanupActivationGlows();
    
    // Stop breathing effect
    if (this.breathingTween) {
      this.breathingTween.remove();
      this.breathingTween = null;
    }
  }

  /**
   * Destroy the 2x dot and its 2x icon
   */
  public override destroy(fromScene?: boolean): void {
    // Clean up all effects first
    this.cleanupActivationGlows();
    
    // Stop all tweens
    if (this.breathingTween) {
      this.breathingTween.remove();
      this.breathingTween = null;
    }
    
    if (this.doubleIcon) {
      this.doubleIcon.destroy();
    }
    if (this.doubleText) {
      this.doubleText.destroy();
    }
    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = null;
    }
    if (this.glowTween) {
      this.glowTween.remove();
      this.glowTween = null;
    }
    if (this.shimmerTween) {
      this.shimmerTween.stop();
      this.shimmerTween.remove();
      this.shimmerTween = null;
    }
    super.destroy(fromScene);
  }

  /**
   * Get the 2x points duration
   */
  public static getDuration(): number {
    return DoubleDot.DURATION;
  }
}
