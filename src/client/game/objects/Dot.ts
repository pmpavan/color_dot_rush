// Dot game object implementation for Color Dot Rush

import Phaser from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { AccessibilityManager } from '../utils/AccessibilityManager';

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
  private lastCollisionTime: number = 0;
  private accessibilityManager: AccessibilityManager | null = null;
  private shapeOverlayId: string | null = null;
  private effectObjects: Phaser.GameObjects.Arc[] = [];
  private effectTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene) {
    // Create as a circle instead of sprite - larger for visibility
    super(scene, 0, 0, 50, 0, 360, false, 0xE74C3C);
    
    this.color = GameColor.RED; // Default color
    this.speed = 100; // Default speed
    this.size = 100; // Increased by 150% from 40px (was 60px)
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Don't add to scene directly - let ObjectPool manage this
    // scene.add.existing(this);
    
    // Start hidden until activated
    this.setVisible(false);
    this.active = false;
    
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
    
    // Update hitbox - significantly larger than visual sprite for better accessibility
    const hitboxSize = Math.max(size * 1.5, 50); // 50% larger than visual size, minimum 50px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the dot
    this.setPosition(x, y);
    
    // Initialize hitbox position
    this.hitbox.setPosition(
      x - this.hitbox.width / 2,
      y - this.hitbox.height / 2
    );
    
    // No glow effect - keep dots simple
    
    // Create shape overlay for accessibility if enabled
    if (this.accessibilityManager && this.accessibilityManager.areShapeOverlaysEnabled()) {
      this.createShapeOverlay();
    }
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
    
    // Debug logging for dot movement (increased frequency for red dots)
    const isRed = this.color === '#FF0000';
    if (Math.random() < (isRed ? 0.05 : 0.01)) { // 5% for red, 1% for others
      console.log(`[DOT DEBUG] Dot ${this.color} at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) moving ${this.speed} speed, active=${this.active}, visible=${this.visible}`);
    }
    
    // No glow effect to update
    
    // Debug: Log movement occasionally
    if (Math.random() < 0.01) { // 1% chance to log
      console.log(`Dot moving: speed=${this.speed}, direction=(${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}), delta=${delta}, from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.x.toFixed(1)}, ${this.y.toFixed(1)})`);
    }

    // Update hitbox position
    this.hitbox.setPosition(
      this.x - this.hitbox.width / 2,
      this.y - this.hitbox.height / 2
    );
    
    // Update shape overlay position for accessibility
    this.updateShapeOverlay();

    // Check if dot is off-screen and deactivate
    const margin = 100; // Extra margin for cleanup
    
    // Use consistent bounds checking with collision detection
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    
    if (this.x < -margin || 
        this.x > screenWidth + margin || 
        this.y < -margin || 
        this.y > screenHeight + margin) {
      console.log(`[DOT DEBUG] Dot ${this.color} deactivated - off screen at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}) screen: ${screenWidth}x${screenHeight}`);
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
   * Check if this dot is colliding with another dot
   */
  public isCollidingWith(other: Dot): boolean {
    if (!this.active || !other.active) return false;
    
    // Skip collision detection for dots that are off-screen
    if (this.x < -100 || this.x > this.scene.scale.width + 100 || 
        this.y < -100 || this.y > this.scene.scale.height + 100 ||
        other.x < -100 || other.x > this.scene.scale.width + 100 || 
        other.y < -100 || other.y > this.scene.scale.height + 100) {
      return false;
    }
    
    const distance = Phaser.Math.Distance.Between(this.x, this.y, other.x, other.y);
    const minDistance = (this.size + other.size) / 2;
    
    // Use a more conservative collision detection
    const collisionBuffer = 8; // Increased buffer to reduce false positives
    
    // Ensure we don't get negative collision threshold
    const collisionThreshold = Math.max(8, minDistance - collisionBuffer);
    
    // Only check current distance, not predictive
    return distance < collisionThreshold;
  }

  /**
   * Handle collision with another dot and bounce
   */
  public handleDotCollision(other: Dot): void {
    if (!this.active || !other.active) return;
    
    // Add collision cooldown to prevent rapid multiple collisions
    const currentTime = this.scene.time.now;
    const collisionCooldown = 500; // Increased to 500ms cooldown to prevent rapid collisions
    
    if (currentTime - this.lastCollisionTime < collisionCooldown || 
        currentTime - other.lastCollisionTime < collisionCooldown) {
      return;
    }
    
    // Calculate collision vector (from this dot to other dot)
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return; // Avoid division by zero
    
    // Calculate minimum distance for collision
    const minDistance = (this.size + other.size) / 2;
    
    // Only handle collision if dots are actually overlapping
    if (distance >= minDistance) return;
    
    // Mark collision time for both dots
    this.lastCollisionTime = currentTime;
    other.lastCollisionTime = currentTime;
    
    // Normalize collision vector
    const normalX = dx / distance;
    const normalY = dy / distance;
    
    // Separate dots first to prevent overlap - push them apart more aggressively
    const overlap = minDistance - distance;
    const separationForce = Math.max(overlap * 0.8, 5); // Increased separation force
    const separationX = normalX * separationForce;
    const separationY = normalY * separationForce;
    
    this.x -= separationX;
    this.y -= separationY;
    other.x += separationX;
    other.y += separationY;
    
    // Perfect opposite direction bouncing: each dot bounces back exactly where it came from
    // Simply reverse each dot's direction vector to get perfect opposite direction
    
    // Store original directions for debug logging
    const originalThisDir = { x: this.direction.x, y: this.direction.y };
    const originalOtherDir = { x: other.direction.x, y: other.direction.y };
    
    // Reverse this dot's direction (multiply by -1)
    this.direction.x = -this.direction.x;
    this.direction.y = -this.direction.y;
    
    // Reverse other dot's direction (multiply by -1)
    other.direction.x = -other.direction.x;
    other.direction.y = -other.direction.y;
    
    // Ensure directions remain normalized unit vectors
    const thisLength = Math.sqrt(this.direction.x * this.direction.x + this.direction.y * this.direction.y);
    const otherLength = Math.sqrt(other.direction.x * other.direction.x + other.direction.y * other.direction.y);
    
    if (thisLength > 0) {
      this.direction.x /= thisLength;
      this.direction.y /= thisLength;
    }
    
    if (otherLength > 0) {
      other.direction.x /= otherLength;
      other.direction.y /= otherLength;
    }
    
    // Debug logging (occasional)
    if (Math.random() < 0.05) { // 5% chance to log
      console.log(`Dot collision: distance=${distance.toFixed(1)}, minDistance=${minDistance.toFixed(1)}, overlap=${(minDistance - distance).toFixed(1)}`);
      console.log(`  Dot1: ${originalThisDir.x.toFixed(2)}, ${originalThisDir.y.toFixed(2)} -> ${this.direction.x.toFixed(2)}, ${this.direction.y.toFixed(2)}`);
      console.log(`  Dot2: ${originalOtherDir.x.toFixed(2)}, ${originalOtherDir.y.toFixed(2)} -> ${other.direction.x.toFixed(2)}, ${other.direction.y.toFixed(2)}`);
    }
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
    // Create flash white burst animation
    this.createWhiteBurstEffect();
    
    // Create enhanced luminous particle effects
    this.createLuminousParticleEffect();
    
    // Create enhanced pop effect with multiple layers
    this.createEnhancedPopEffect();

    // Shrink dot to nothing with enhanced animation
    this.scene.tweens.add({
      targets: this,
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
   * Show DOM text for points earned (+1 or +2)
   */
  public showPointsText(points: number): void {
    // Convert Phaser coordinates to DOM coordinates
    const canvas = this.scene.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate DOM position relative to the canvas
    const domX = canvasRect.left + (this.x * canvasRect.width / canvas.width);
    const domY = canvasRect.top + (this.y * canvasRect.height / canvas.height);
    
    // Create DOM text element
    const pointsText = document.createElement('div');
    pointsText.textContent = `+${points}`;
    pointsText.style.position = 'fixed';
    pointsText.style.left = `${domX}px`;
    pointsText.style.top = `${domY}px`;
    pointsText.style.transform = 'translate(-50%, -50%)';
    pointsText.style.fontSize = '24px';
    pointsText.style.fontWeight = 'bold';
    pointsText.style.color = '#FFFFFF';
    pointsText.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.8)';
    pointsText.style.pointerEvents = 'none';
    pointsText.style.zIndex = '1000';
    pointsText.style.fontFamily = 'Obsidian, Arial, sans-serif';
    pointsText.style.userSelect = 'none';
    
    // Add to DOM
    document.body.appendChild(pointsText);
    
    // Animate the text
    pointsText.style.opacity = '1';
    pointsText.style.transition = 'all 500ms ease-out';
    
    // Move up and fade out
    setTimeout(() => {
      pointsText.style.transform = 'translate(-50%, -100%)';
      pointsText.style.opacity = '0';
    }, 50);
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (pointsText.parentNode) {
        pointsText.parentNode.removeChild(pointsText);
      }
    }, 500);
  }

  /**
   * Create flash white burst effect on correct tap
   */
  private createWhiteBurstEffect(): void {
    // Primary white burst - large and bright
    const primaryBurst = this.scene.add.circle(this.x, this.y, 20, 0xFFFFFF, 0.9);
    primaryBurst.setDepth(this.depth + 10);
    this.effectObjects.push(primaryBurst);
    
    const tween1 = this.scene.tweens.add({
      targets: primaryBurst,
      radius: this.size * 1.5,
      alpha: 0,
      duration: 150,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.effectObjects.indexOf(primaryBurst);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(tween1);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (primaryBurst.scene) {
          primaryBurst.destroy();
        }
      }
    });
    this.effectTweens.push(tween1);

    // Secondary burst - smaller and faster
    const secondaryBurst = this.scene.add.circle(this.x, this.y, 10, 0xFFFFFF, 1);
    secondaryBurst.setDepth(this.depth + 11);
    this.effectObjects.push(secondaryBurst);
    
    const tween2 = this.scene.tweens.add({
      targets: secondaryBurst,
      radius: this.size * 0.8,
      alpha: 0,
      duration: 100,
      ease: 'Power3.easeOut',
      delay: 25,
      onComplete: () => {
        const index = this.effectObjects.indexOf(secondaryBurst);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(tween2);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (secondaryBurst.scene) {
          secondaryBurst.destroy();
        }
      }
    });
    this.effectTweens.push(tween2);
  }

  /**
   * Create luminous particle effects on tap
   */
  private createLuminousParticleEffect(): void {
    const dotColor = parseInt(this.color.replace('#', '0x'));
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 40 + Math.random() * 30;
      const size = 3 + Math.random() * 4;
      
      // Create luminous particle with glow
      const particle = this.scene.add.circle(this.x, this.y, size, dotColor, 0.8);
      particle.setDepth(this.depth + 5);
      this.effectObjects.push(particle);
      
      // Add subtle glow effect to particle
      const particleGlow = this.scene.add.circle(this.x, this.y, size * 2, dotColor, 0.3);
      particleGlow.setDepth(this.depth + 4);
      this.effectObjects.push(particleGlow);
      
      // Animate particle movement
      const particleTween = this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2.easeOut',
        onComplete: () => {
          const index = this.effectObjects.indexOf(particle);
          if (index > -1) {
            this.effectObjects.splice(index, 1);
          }
          const tweenIndex = this.effectTweens.indexOf(particleTween);
          if (tweenIndex > -1) {
            this.effectTweens.splice(tweenIndex, 1);
          }
          if (particle.scene) {
            particle.destroy();
          }
        }
      });
      this.effectTweens.push(particleTween);
      
      // Animate particle glow
      const glowTween = this.scene.tweens.add({
        targets: particleGlow,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Power2.easeOut',
        onComplete: () => {
          const index = this.effectObjects.indexOf(particleGlow);
          if (index > -1) {
            this.effectObjects.splice(index, 1);
          }
          const tweenIndex = this.effectTweens.indexOf(glowTween);
          if (tweenIndex > -1) {
            this.effectTweens.splice(tweenIndex, 1);
          }
          if (particleGlow.scene) {
            particleGlow.destroy();
          }
        }
      });
      this.effectTweens.push(glowTween);
    }
  }

  /**
   * Create enhanced pop effect with multiple layers
   */
  private createEnhancedPopEffect(): void {
    const dotColor = parseInt(this.color.replace('#', '0x'));
    
    // Create multiple layers of pop effects
    for (let layer = 0; layer < 3; layer++) {
      const layerCount = 6 + layer * 2;
      const layerDistance = 25 + layer * 15;
      const layerSize = 3 + layer;
      const layerDelay = layer * 50;
      
      for (let i = 0; i < layerCount; i++) {
        const angle = (i / layerCount) * Math.PI * 2;
        const distance = layerDistance + Math.random() * 10;
        
        const popDot = this.scene.add.circle(this.x, this.y, layerSize, dotColor, 0.9);
        popDot.setDepth(this.depth + 3 + layer);
        this.effectObjects.push(popDot);
        
        const popTween = this.scene.tweens.add({
          targets: popDot,
          x: this.x + Math.cos(angle) * distance,
          y: this.y + Math.sin(angle) * distance,
          alpha: 0,
          scale: 0,
          duration: 350 + layer * 50,
          ease: 'Power2.easeOut',
          delay: layerDelay,
          onComplete: () => {
            const index = this.effectObjects.indexOf(popDot);
            if (index > -1) {
              this.effectObjects.splice(index, 1);
            }
            const tweenIndex = this.effectTweens.indexOf(popTween);
            if (tweenIndex > -1) {
              this.effectTweens.splice(tweenIndex, 1);
            }
            if (popDot.scene) {
              popDot.destroy();
            }
          }
        });
        this.effectTweens.push(popTween);
      }
    }
  }

  /**
   * Create ripple effect for any tap
   */
  public createRippleEffect(): void {
    // Create enhanced ripple effect with multiple layers
    this.createEnhancedRippleEffect();
  }

  /**
   * Create enhanced ripple effect with multiple luminous layers
   */
  private createEnhancedRippleEffect(): void {
    const dotColor = parseInt(this.color.replace('#', '0x'));
    
    // Primary ripple - white and bright
    const primaryRipple = this.scene.add.circle(this.x, this.y, 8, 0xFFFFFF, 0.9);
    primaryRipple.setDepth(this.depth + 8);
    this.effectObjects.push(primaryRipple);
    
    const tween1 = this.scene.tweens.add({
      targets: primaryRipple,
      radius: this.size * 2.5,
      alpha: 0,
      duration: 250,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.effectObjects.indexOf(primaryRipple);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(tween1);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (primaryRipple.scene) {
          primaryRipple.destroy();
        }
      }
    });
    this.effectTweens.push(tween1);

    // Secondary ripple - colored and luminous
    const secondaryRipple = this.scene.add.circle(this.x, this.y, 12, dotColor, 0.7);
    secondaryRipple.setDepth(this.depth + 7);
    this.effectObjects.push(secondaryRipple);
    
    const tween2 = this.scene.tweens.add({
      targets: secondaryRipple,
      radius: this.size * 2,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      delay: 50,
      onComplete: () => {
        const index = this.effectObjects.indexOf(secondaryRipple);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(tween2);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (secondaryRipple.scene) {
          secondaryRipple.destroy();
        }
      }
    });
    this.effectTweens.push(tween2);

    // Tertiary ripple - subtle glow
    const tertiaryRipple = this.scene.add.circle(this.x, this.y, 15, dotColor, 0.4);
    tertiaryRipple.setDepth(this.depth + 6);
    this.effectObjects.push(tertiaryRipple);
    
    const tween3 = this.scene.tweens.add({
      targets: tertiaryRipple,
      radius: this.size * 1.8,
      alpha: 0,
      duration: 350,
      ease: 'Sine.easeOut',
      delay: 100,
      onComplete: () => {
        const index = this.effectObjects.indexOf(tertiaryRipple);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(tween3);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (tertiaryRipple.scene) {
          tertiaryRipple.destroy();
        }
      }
    });
    this.effectTweens.push(tween3);
  }

  /**
   * Create smooth color transition effect
   */
  public createColorTransitionEffect(newColor: GameColor): void {
    const newColorValue = parseInt(newColor.replace('#', '0x'));
    const oldColorValue = parseInt(this.color.replace('#', '0x'));
    
    // Create color transition tween
    this.scene.tweens.add({
      targets: this,
      duration: 300,
      ease: 'Power2.easeInOut',
      onUpdate: (tween) => {
        const progress = tween.progress;
        const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(oldColorValue),
          Phaser.Display.Color.IntegerToColor(newColorValue),
          1,
          progress
        );
        const colorInt = Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b);
        this.setFillStyle(colorInt);
      },
      onComplete: () => {
        this.color = newColor;
        // No glow effect to update
      }
    });
  }


  /**
   * Activate the dot
   */
  public activate(): void {
    this.active = true;
    
    // CRITICAL: Kill any ongoing tweens (especially exit animations) before setting visible
    // This prevents race conditions where a previous exit animation sets visible=false
    this.scene.tweens.killTweensOf(this);
    
    this.setVisible(true);
    this.setScale(1.0);  // Full size for consistency
    this.setAlpha(1.0);  // Full opacity for consistency
    
    // Add to scene when activated
    if (!this.scene.children.exists(this)) {
      this.scene.add.existing(this);
      if (this.color === '#FF0000') {
        console.log(`[DOT ACTIVATE] RED dot activated at (${this.x.toFixed(1)}, ${this.y.toFixed(1)}), added to scene`);
      }
    }
    
    // Create entrance animation
    this.createEntranceEffect();
    
    // No glow effect - keep dots simple
  }

  /**
   * Create entrance animation when dot becomes active
   */
  private createEntranceEffect(): void {
    // Start from smaller scale for entrance effect
    this.setScale(0.5);
    this.setAlpha(1.0); // Keep full alpha for visibility
    
    // Scale up animation to full size
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 200,
      ease: 'Back.easeOut'
    });

    // Create entrance burst effect
    const entranceBurst = this.scene.add.circle(this.x, this.y, 5, parseInt(this.color.replace('#', '0x')), 0.6);
    entranceBurst.setDepth(this.depth + 2);
    this.effectObjects.push(entranceBurst);
    
    const entranceTween = this.scene.tweens.add({
      targets: entranceBurst,
      radius: this.size * 1.2,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        const index = this.effectObjects.indexOf(entranceBurst);
        if (index > -1) {
          this.effectObjects.splice(index, 1);
        }
        const tweenIndex = this.effectTweens.indexOf(entranceTween);
        if (tweenIndex > -1) {
          this.effectTweens.splice(tweenIndex, 1);
        }
        if (entranceBurst.scene) {
          entranceBurst.destroy();
        }
      }
    });
    this.effectTweens.push(entranceTween);
  }


  /**
   * Clean up all effect objects and their tweens
   */
  private cleanupEffects(): void {
    // Kill all effect tweens first
    for (const tween of this.effectTweens) {
      try {
        if (tween) {
          tween.remove();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this.effectTweens = [];
    
    // Destroy all effect objects
    for (const obj of this.effectObjects) {
      try {
        if (obj && obj.scene) {
          obj.destroy();
        }
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    this.effectObjects = [];
  }

  /**
   * Deactivate the dot
   */
  public deactivate(): void {
    const isRed = this.color === '#FF0000';
    console.log(`[DOT DEBUG] Deactivating dot ${this.color} at (${this.x.toFixed(1)}, ${this.y.toFixed(1)})${isRed ? ' [RED DOT]' : ''}`);
    
    if (isRed) {
      console.log(`[DOT DEACTIVATE] RED dot deactivated - active=${this.active}, visible=${this.visible}, inScene=${this.scene.children.exists(this)}`);
    }
    
    this.active = false;
    
    // Stop all tweens on this dot
    this.scene.tweens.killTweensOf(this);
    
    // Clean up all effect objects and their tweens
    this.cleanupEffects();
    
    // Create exit animation
    this.createExitEffect();
    
    // No glow effect to clean up
  }

  /**
   * Create exit animation when dot is deactivated
   */
  private createExitEffect(): void {
    // Fade out and scale down
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 150,
      ease: 'Power2.easeIn',
      onComplete: () => {
        // Only set invisible if the dot is still inactive
        // This prevents race conditions where dot is reactivated during exit animation
        if (!this.active) {
          this.setVisible(false);
        }
      }
    });
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

  /**
   * Set accessibility manager for shape overlays
   */
  public setAccessibilityManager(accessibilityManager: AccessibilityManager): void {
    this.accessibilityManager = accessibilityManager;
  }

  /**
   * Create shape overlay for accessibility
   */
  public createShapeOverlay(): void {
    if (!this.accessibilityManager || !this.active) return;
    
    // Generate unique ID for this dot
    this.shapeOverlayId = `dot-${this.x}-${this.y}-${Date.now()}`;
    
    // Convert GameColor to number for shape mapping
    const colorNumber = parseInt(this.color.replace('#', '0x'));
    
    // Create shape overlay
    this.accessibilityManager.createShapeOverlay(this.shapeOverlayId, this.x, this.y, colorNumber);
  }

  /**
   * Update shape overlay position
   */
  public updateShapeOverlay(): void {
    if (!this.accessibilityManager || !this.shapeOverlayId || !this.active) return;
    
    this.accessibilityManager.updateShapeOverlay(this.shapeOverlayId, this.x, this.y);
  }

  /**
   * Remove shape overlay
   */
  public removeShapeOverlay(): void {
    if (!this.accessibilityManager || !this.shapeOverlayId) return;
    
    this.accessibilityManager.removeShapeOverlay(this.shapeOverlayId);
    this.shapeOverlayId = null;
  }

  /**
   * Destroy the dot and clean up glow effects
   */
  public override destroy(fromScene?: boolean): void {
    // Clean up all effects first
    this.cleanupEffects();
    
    // Remove shape overlay if it exists
    this.removeShapeOverlay();
    
    super.destroy(fromScene);
  }
}
