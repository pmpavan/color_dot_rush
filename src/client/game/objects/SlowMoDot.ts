// SlowMoDot power-up implementation for Color Dot Rush

import Phaser from 'phaser';
import { GlowEffects } from '../utils/GlowEffects';

/**
 * SlowMoDot class represents the slow-motion power-up
 * Appears as a single brown ball with white clock icon
 * Uses a distinct color that's not used by regular game dots
 */
export class SlowMoDot extends Phaser.GameObjects.Arc {
  public static readonly DURATION = 10000; // 10 seconds
  public static readonly INITIAL_CHARGES = 3; // Player starts with 3 charges

  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  private clockIcon: Phaser.GameObjects.Arc;
  private clockHand: Phaser.GameObjects.Line;
  private clockHand2: Phaser.GameObjects.Line;
  private shimmerTween: Phaser.Tweens.Tween | null = null;
  private lastCollisionTime: number = 0;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  private activationGlows: Phaser.GameObjects.Arc[] = [];
  private activationTweens: Phaser.Tweens.Tween[] = [];
  private timeDistortionRings: Phaser.GameObjects.Arc[] = [];
  private timeDistortionTweens: Phaser.Tweens.Tween[] = [];
  private breathingTween: Phaser.Tweens.Tween | null = null;
  public override active: boolean = false;

  constructor(scene: Phaser.Scene) {
    // Create as bright white circle with distinct time-themed design
    super(scene, 0, 0, 40, 0, 360, false, 0xFFFFFF);
    
    this.speed = 100; // Default speed
    this.size = 80; // Default size
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Create enhanced clock icon with bright cyan theme for high visibility
    this.clockIcon = scene.add.circle(0, 0, 20, 0x00FFFF, 1.0);
    this.clockIcon.setStrokeStyle(3, 0xFFFFFF, 1);
    this.clockIcon.setDepth(1000); // Ensure it's on top
    
    // Create hour hand (shorter, pointing to 12 o'clock) - Cyan
    // Line from center (0,0) to (0, -8) - pointing upward
    this.clockHand = scene.add.line(0, 0, 0, 0, 0, -8, 0x00FFFF, 1);
    this.clockHand.setLineWidth(4);
    this.clockHand.setDepth(1001); // Ensure it's on top of the clock icon
    
    // Create minute hand (longer, pointing to 1:30 o'clock - 45 degrees from hour hand) - White
    const angle45 = Math.PI / 4; // 45 degrees in radians
    const minuteHandLength = 12; // Longer than hour hand
    // Line from center (0,0) to calculated position at 45 degrees
    this.clockHand2 = scene.add.line(0, 0, 0, 0, 
      Math.sin(angle45) * minuteHandLength, 
      -Math.cos(angle45) * minuteHandLength, 
      0xFFFFFF, 1);
    this.clockHand2.setLineWidth(3);
    this.clockHand2.setDepth(1002); // Ensure it's on top
    
    // Don't add to scene directly - let ObjectPool manage this
    // scene.add.existing(this);
    
    // Interactive setup handled by centralized input system in GameScene
  }

  /**
   * Initialize slow-mo dot with specific properties
   */
  public init(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    this.speed = speed;
    this.size = size;
    this.direction = direction.clone();
    
    // Set visual properties - bright white theme for maximum visibility
    this.setRadius(size / 2);
    this.setFillStyle(0xFFFFFF); // Bright white - distinct from all regular dot colors
    this.setStrokeStyle(3, 0x00FFFF, 1); // Bright cyan stroke for extra visibility
    
    // Update hitbox - significantly larger than visual sprite for better accessibility
    const hitboxSize = Math.max(size * 1.5, 60); // 50% larger than visual size, minimum 60px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the dot and clock icon
    this.setPosition(x, y);
    this.clockIcon.setPosition(x, y);
    this.clockHand.setPosition(x, y);
    this.clockHand2.setPosition(x, y);
    
    // Ensure clock elements are visible and properly positioned
    this.clockIcon.setVisible(true);
    this.clockHand.setVisible(true);
    this.clockHand2.setVisible(true);
    this.clockIcon.setAlpha(1);
    this.clockHand.setAlpha(1);
    this.clockHand2.setAlpha(1);
    
    // Debug logging for clock elements
    console.log(`[SLOWMO DEBUG] Clock elements positioned at (${x}, ${y})`);
    console.log(`[SLOWMO DEBUG] Clock icon visible: ${this.clockIcon.visible}, alpha: ${this.clockIcon.alpha}`);
    console.log(`[SLOWMO DEBUG] Hour hand (cyan, 8px, static) visible: ${this.clockHand.visible}, alpha: ${this.clockHand.alpha}`);
    console.log(`[SLOWMO DEBUG] Minute hand (white, 12px, 45°, static) visible: ${this.clockHand2.visible}, alpha: ${this.clockHand2.alpha}`);
    
    // Initialize hitbox position
    this.hitbox.setPosition(
      x - this.hitbox.width / 2,
      y - this.hitbox.height / 2
    );
    
    // Create enhanced glow effect
    this.createGlowEffect();
    
    // Start time distortion effects
    this.startTimeDistortionEffects();
    
    // Start animated clock hand
    this.startClockHandAnimation();
    
    // Start breathing effect
    this.startBreathingEffect();
  }

  /**
   * Update slow-mo dot movement and lifecycle
   */
  public override update(delta: number): void {
    if (!this.active) return;

    // Move the dot based on direction and speed
    const deltaSeconds = delta / 1000;
    this.x += this.direction.x * this.speed * deltaSeconds;
    this.y += this.direction.y * this.speed * deltaSeconds;
    
    // Debug logging for SlowMo dot movement
    if (Math.random() < 0.01) { // 1% chance to log
      console.log(`[SLOWMO DEBUG] SlowMo dot at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) moving ${this.speed} speed`);
    }

    // Update clock icon position
    this.clockIcon.setPosition(this.x, this.y);
    this.clockHand.setPosition(this.x, this.y);
    this.clockHand2.setPosition(this.x, this.y);

    // Update glow effect position
    if (this.glowEffect) {
      this.glowEffect.setPosition(this.x, this.y);
    }

    // Update time distortion rings position
    for (const ring of this.timeDistortionRings) {
      ring.setPosition(this.x, this.y);
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
      console.log(`[SLOWMO DEBUG] SlowMo dot deactivated - off screen at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) screen: ${screenWidth}x${screenHeight}`);
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
    return new Phaser.Geom.Rectangle(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height) as O;
  }

  /**
   * Check if this slow-mo dot is colliding with another object
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
    
    // Calculate collision vector (from this slow-mo dot to regular dot)
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
      console.log(`SlowMo-Dot collision: distance=${distance.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, overlap=${(minDistance - distance).toFixed(1)}`);
      console.log(`  SlowMo: ${originalThisDir.x.toFixed(2)}, ${originalThisDir.y.toFixed(2)} -> ${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}`);
      console.log(`  Dot: ${originalDotDir.x.toFixed(2)}, ${originalDotDir.y.toFixed(2)} -> ${dot.direction.x.toFixed(2)}, ${dot.direction.y.toFixed(2)}`);
    }
  }

  /**
   * Handle collision with another slow-mo dot
   */
  public handleSlowMoCollision(otherSlowMo: SlowMoDot): void {
    if (!this.active || !otherSlowMo.active) return;
    
    // Add collision cooldown to prevent rapid multiple collisions
    const currentTime = this.scene.time.now;
    const collisionCooldown = 500; // Increased to 500ms cooldown to prevent rapid collisions
    
    if (currentTime - this.lastCollisionTime < collisionCooldown || 
        currentTime - otherSlowMo.lastCollisionTime < collisionCooldown) {
      return;
    }
    
    // Calculate collision vector (from this slow-mo dot to other slow-mo dot)
    const dx = otherSlowMo.x - this.x;
    const dy = otherSlowMo.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Calculate minimum distance for collision
    const minDistance = (this.size + otherSlowMo.size) / 2;
    
    // Only handle collision if objects are actually overlapping
    if (distance >= minDistance) return;
    
    // Mark collision time for both objects
    this.lastCollisionTime = currentTime;
    otherSlowMo.lastCollisionTime = currentTime;
    
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
    otherSlowMo.x += separationX;
    otherSlowMo.y += separationY;
    
    // Realistic collision physics: objects bounce off each other based on collision normal
    // Store original directions for debug logging
    const originalThisDir = { x: this.direction.x, y: this.direction.y };
    const originalOtherDir = { x: otherSlowMo.direction.x, y: otherSlowMo.direction.y };
    
    // Calculate reflection vectors based on collision normal
    // Each object bounces off the collision surface (normal vector)
    const dot1 = 2 * (this.direction.x * normalX + this.direction.y * normalY);
    const dot2 = 2 * (otherSlowMo.direction.x * normalX + otherSlowMo.direction.y * normalY);
    
    // Update directions using reflection formula: new_dir = old_dir - 2 * dot(old_dir, normal) * normal
    this.direction.x = this.direction.x - dot1 * normalX;
    this.direction.y = this.direction.y - dot1 * normalY;
    
    otherSlowMo.direction.x = otherSlowMo.direction.x - dot2 * normalX;
    otherSlowMo.direction.y = otherSlowMo.direction.y - dot2 * normalY;
    
    // Ensure directions remain normalized unit vectors
    const thisLength = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    const otherLength = Math.sqrt(otherSlowMo.direction.x * otherSlowMo.direction.x + otherSlowMo.direction.y * otherSlowMo.direction.y);
    
    if (thisLength > 0) {
      this.direction.x /= thisLength;
      this.direction.y /= thisLength;
    }
    
    if (otherLength > 0) {
      otherSlowMo.direction.x /= otherLength;
      otherSlowMo.direction.y /= otherLength;
    }
    
    // Debug logging (occasional)
    if (Math.random() < 0.05) { // 5% chance to log
      console.log(`SlowMo-SlowMo collision: distance=${distance.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, overlap=${(minDistance - distance).toFixed(1)}`);
      console.log(`  SlowMo1: ${originalThisDir.x.toFixed(2)}, ${originalThisDir.y.toFixed(2)} -> ${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}`);
      console.log(`  SlowMo2: ${originalOtherDir.x.toFixed(2)}, ${originalOtherDir.y.toFixed(2)} -> ${otherSlowMo.direction.x.toFixed(2)}, ${otherSlowMo.direction.y.toFixed(2)}`);
    }
  }

  /**
   * Handle collision with another object (legacy method)
   */
  public onCollision(_other: any): void {
    // Slow-mo dots now have specific collision handling methods
  }

  /**
   * Handle tap/click on this slow-mo dot (called by centralized input system)
   */
  public onTap(): void {
    // Tap handling is now managed by GameScene's centralized collision detection
    // This method is kept for potential future use or debugging
  }

  /**
   * Activate slow-motion effect with enhanced time freeze visual feedback
   */
  public activateSlowMo(): void {
    if (!this.active) return;

    // Create time freeze effect with enhanced blue theme
    this.createTimeFreezeEffect();
    
    // Create enhanced ripple effect for immediate feedback
    this.createRippleEffect();

    // Hide the slow-mo dot with a satisfying shrink effect
    this.scene.tweens.add({
      targets: [this, this.clockIcon, this.clockHand, this.clockHand2],
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
   * Create time freeze effect with enhanced blue theme
   */
  private createTimeFreezeEffect(): void {
    // Clean up any existing activation glows first
    this.cleanupActivationGlows();
    
    // Primary time freeze glow - bright cyan
    const primaryGlow = this.scene.add.circle(this.x, this.y, 30, 0x00FFFF, 0.9);
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

    // Time distortion particles
    for (let i = 0; i < 8; i++) {
      const angle = (i * 45) * Math.PI / 180;
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 20,
        this.y + Math.sin(angle) * 20,
        4,
        0xFFFFFF,
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
   * Create enhanced ripple effect for tap feedback with time theme
   */
  public createRippleEffect(): void {
    // Create expanding bright cyan ripple effect with multiple layers
    const primaryRipple = this.scene.add.circle(this.x, this.y, 15, 0x00FFFF, 0.9);
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
    secondaryRipple.setStrokeStyle(2, 0x00FFFF, 0.7);
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
   * Create glow effect for the slow-mo dot
   */
  private createGlowEffect(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }
    
    // Create a stable glow effect instead of pulsing
    const glowConfig = GlowEffects.getSlowMoGlowConfig();
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
   * Start time distortion effects with concentric rings
   */
  private startTimeDistortionEffects(): void {
    // Create 3 concentric rings that pulse outward to show time manipulation
    for (let i = 0; i < 3; i++) {
      const ring = this.scene.add.circle(this.x, this.y, 25 + (i * 15), 0x00FFFF, 0.5);
      ring.setStrokeStyle(3, 0xFFFFFF, 0.8);
      ring.setDepth(this.depth - 1);
      this.timeDistortionRings.push(ring);
      
      // Animate each ring with different timing
      const tween = this.scene.tweens.add({
        targets: ring,
        radius: 25 + (i * 15) + 20,
        alpha: 0,
        duration: 2000 + (i * 500),
        ease: 'Sine.easeOut',
        yoyo: true,
        repeat: -1,
        delay: i * 200
      });
      this.timeDistortionTweens.push(tween);
    }
  }

  /**
   * Start animated clock hand rotation
   */
  private startClockHandAnimation(): void {
    // Clock hands remain static at 45-degree angle - no animation
    // Hour hand points to 12 o'clock, minute hand points to 1:30 o'clock
    console.log('[SLOWMO DEBUG] Clock hands positioned statically at 45-degree angle');
  }

  /**
   * Start breathing effect for the slow-mo dot
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
   * Activate the slow-mo dot
   */
  public activate(): void {
    console.log(`[SLOWMO DEBUG] Activating SlowMo dot at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    this.active = true;
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    
    // Add to scene when activated
    if (!this.scene.children.exists(this)) {
      this.scene.add.existing(this);
    }
    
    // Ensure clock elements are properly added to scene and visible
    if (!this.scene.children.exists(this.clockIcon)) {
      this.scene.add.existing(this.clockIcon);
    }
    if (!this.scene.children.exists(this.clockHand)) {
      this.scene.add.existing(this.clockHand);
    }
    if (!this.scene.children.exists(this.clockHand2)) {
      this.scene.add.existing(this.clockHand2);
    }
    
    this.clockIcon.setVisible(true);
    this.clockHand.setVisible(true);
    this.clockHand2.setVisible(true);
    this.clockIcon.setAlpha(1);
    this.clockHand.setAlpha(1);
    this.clockHand2.setAlpha(1);
    
    // Show glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(true);
    }
    
    // No shimmer effect - SlowMo dots should be stable
  }

  /**
   * Clean up time distortion effects
   */
  private cleanupTimeDistortionEffects(): void {
    // Kill tweens and destroy all time distortion ring objects
    for (const ring of this.timeDistortionRings) {
      try {
        if (this.scene && this.scene.tweens) {
          this.scene.tweens.killTweensOf(ring);
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
      
      try {
        if (ring && !ring.scene) {
          continue;
        }
        if (ring) {
          ring.destroy();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this.timeDistortionRings = [];
    
    // Clean up time distortion tweens
    for (const tween of this.timeDistortionTweens) {
      try {
        if (tween) {
          tween.remove();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this.timeDistortionTweens = [];
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
   * Deactivate the slow-mo dot
   */
  public deactivate(): void {
    console.log(`[SLOWMO DEBUG] Deactivating SlowMo dot at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    this.active = false;
    this.setVisible(false);
    this.clockIcon.setVisible(false);
    this.clockHand.setVisible(false);
    this.clockHand2.setVisible(false);
    
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
    this.scene.tweens.killTweensOf(this.clockIcon);
    this.scene.tweens.killTweensOf(this.clockHand);
    this.scene.tweens.killTweensOf(this.clockHand2);
    
    // Clean up activation glows
    this.cleanupActivationGlows();
    
    // Clean up time distortion effects
    this.cleanupTimeDistortionEffects();
    
    // Clock hands are static - no animation to stop
    
    // Stop breathing effect
    if (this.breathingTween) {
      this.breathingTween.remove();
      this.breathingTween = null;
    }
  }

  /**
   * Destroy the slow-mo dot and its clock icon
   */
  public override destroy(fromScene?: boolean): void {
    // Clean up all effects first
    this.cleanupActivationGlows();
    this.cleanupTimeDistortionEffects();
    
    // Stop all tweens
    if (this.breathingTween) {
      this.breathingTween.remove();
      this.breathingTween = null;
    }
    
    if (this.clockIcon) {
      this.clockIcon.destroy();
    }
    if (this.clockHand) {
      this.clockHand.destroy();
    }
    if (this.clockHand2) {
      this.clockHand2.destroy();
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
