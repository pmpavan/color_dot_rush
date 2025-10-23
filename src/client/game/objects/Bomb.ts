// Bomb game object implementation for Color Dot Rush

import Phaser from 'phaser';
import { GlowEffects } from '../utils/GlowEffects';

/**
 * Bomb class represents dangerous objects that end the game when tapped
 */
export class Bomb extends Phaser.GameObjects.Container {
  public explosionRadius: number;
  public speed: number;
  public size: number;
  private direction: Phaser.Math.Vector2;
  private hitbox: Phaser.Geom.Rectangle;
  private bombGraphics: Phaser.GameObjects.Graphics;
  private fuseGraphics: Phaser.GameObjects.Graphics;
  private sparkGraphics: Phaser.GameObjects.Graphics;
  private sparkTween: Phaser.Tweens.Tween | null = null;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;
  private glowTween: Phaser.Tweens.Tween | null = null;
  public override active: boolean = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    
    this.explosionRadius = 100; // Default explosion radius
    this.speed = 100; // Default speed
    this.size = 80; // Default size
    this.direction = new Phaser.Math.Vector2(0, 1); // Default downward movement
    this.hitbox = new Phaser.Geom.Rectangle(0, 0, this.size, this.size);
    
    // Create bomb graphics container
    this.bombGraphics = scene.add.graphics();
    this.fuseGraphics = scene.add.graphics();
    this.sparkGraphics = scene.add.graphics();
    
    // Add graphics to container
    this.add([this.bombGraphics, this.fuseGraphics, this.sparkGraphics]);
    
    // Add to scene
    scene.add.existing(this);
    this.setDepth(999); // Ensure bomb is visible
    
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
    
    // Update hitbox - slightly larger than visual sprite for accessibility
    const hitboxSize = Math.max(size, 30); // Minimum 30px tap target (reduced to allow smaller bombs)
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the bomb
    this.setPosition(x, y);
    this.setDepth(999); // Ensure bomb is visible
    
    // Draw the bomb shape
    this.drawBombShape();
    
    // Create glow effect
    this.createGlowEffect();
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

    // Update glow effect position
    if (this.glowEffect) {
      this.glowEffect.setPosition(this.x, this.y);
    }

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

    // Create explosion effect with enhanced neon graphics
    const explosionColors = [0xFF0000, 0xFF4500, 0xFF8C00, 0xFFD700, 0xFFFFFF, 0xFF6666]; // Warning Red, OrangeRed, DarkOrange, Gold, White, Bright Red
    
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 120;
      const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
      const size = 8 + Math.random() * 12;
      
      const explosionDot = this.scene.add.circle(this.x, this.y, size, color);
      explosionDot.setDepth(1500); // High depth to be visible
      
      this.scene.tweens.add({
        targets: explosionDot,
        x: this.x + Math.cos(angle) * distance,
        y: this.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 500 + Math.random() * 300,
        ease: 'Power2.easeOut',
        onComplete: () => explosionDot.destroy()
      });
    }

    // Enhanced screen shake effect
    this.scene.cameras.main.shake(200, 0.03); // 200ms duration, 0.03 intensity

    // Hide bomb immediately
    this.setVisible(false);

    // Clean up explosion after animation
    this.scene.time.delayedCall(800, () => {
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
   * Create electric arc visual effects on collision
   */
  public createElectricArcEffect(): void {
    // Create multiple electric arcs around the bomb
    const arcCount = 8;
    const arcLength = this.size * 0.8;
    
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2;
      const startX = this.x + Math.cos(angle) * (this.size / 2);
      const startY = this.y + Math.sin(angle) * (this.size / 2);
      const endX = this.x + Math.cos(angle) * arcLength;
      const endY = this.y + Math.sin(angle) * arcLength;
      
      // Create electric arc line
      const arc = this.scene.add.line(startX, startY, 0, 0, endX - startX, endY - startY, 0x00BFFF, 1);
      arc.setLineWidth(3);
      arc.setDepth(this.depth + 5);
      
      // Animate the arc
      this.scene.tweens.add({
        targets: arc,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 150,
        ease: 'Power2.easeOut',
        onComplete: () => {
          arc.destroy();
        }
      });
    }
    
    // Create central electric burst
    const centralBurst = this.scene.add.circle(this.x, this.y, 15, 0x00BFFF, 0.8);
    centralBurst.setDepth(this.depth + 6);
    
    this.scene.tweens.add({
      targets: centralBurst,
      radius: this.size * 0.6,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        centralBurst.destroy();
      }
    });
  }

  /**
   * Create glow effect for the bomb
   */
  private createGlowEffect(): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }
    
    const glowConfig = GlowEffects.getBombGlowConfig();
    const { glow, tween } = GlowEffects.createFlickeringGlow(
      this.scene,
      this.x,
      this.y,
      glowConfig,
      this.depth - 1
    );
    
    this.glowEffect = glow;
    this.glowTween = tween;
  }

  /**
   * Activate the bomb
   */
  public activate(): void {
    this.active = true;
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    
    // Ensure graphics are properly activated
    this.bombGraphics.setVisible(true);
    this.bombGraphics.setActive(true);
    this.fuseGraphics.setVisible(true);
    this.fuseGraphics.setActive(true);
    this.sparkGraphics.setVisible(true);
    this.sparkGraphics.setActive(true);
    
    // Show glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(true);
    }
    
    // Start spark animation when bomb is activated
    this.startSparkAnimation();
  }

  /**
   * Deactivate the bomb
   */
  public deactivate(): void {
    this.active = false;
    this.setVisible(false);
    this.bombGraphics.setVisible(false);
    this.fuseGraphics.setVisible(false);
    this.sparkGraphics.setVisible(false);
    
    // Hide and clean up glow effect
    if (this.glowEffect) {
      this.glowEffect.setVisible(false);
    }
    if (this.glowTween) {
      this.glowTween.remove();
      this.glowTween = null;
    }
    
    // Stop spark animation
    if (this.sparkTween) {
      this.sparkTween.remove();
      this.sparkTween = null;
    }
    
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
  }

  /**
   * Destroy the bomb and its graphics
   */
  public override destroy(fromScene?: boolean): void {
    // Stop spark animation
    if (this.sparkTween) {
      this.sparkTween.remove();
      this.sparkTween = null;
    }
    
    // Clean up glow effect
    if (this.glowEffect) {
      this.glowEffect.destroy();
      this.glowEffect = null;
    }
    if (this.glowTween) {
      this.glowTween.remove();
      this.glowTween = null;
    }
    
    if (this.bombGraphics) {
      this.bombGraphics.destroy();
    }
    if (this.fuseGraphics) {
      this.fuseGraphics.destroy();
    }
    if (this.sparkGraphics) {
      this.sparkGraphics.destroy();
    }
    super.destroy(fromScene);
  }

  /**
   * Get the explosion radius of this bomb
   */
  public getExplosionRadius(): number {
    return this.explosionRadius;
  }

  /**
   * Draw the bomb shape using graphics
   */
  private drawBombShape(): void {
    if (!this.bombGraphics || !this.fuseGraphics || !this.sparkGraphics) return;
    
    const radius = this.size / 2;
    const fuseLength = radius * 0.5; // Reduced fuse length from 0.8 to 0.5
    
    // Clear previous drawings
    this.bombGraphics.clear();
    this.fuseGraphics.clear();
    this.sparkGraphics.clear();
    
    // Draw bomb body (Warning Red with neon glow)
    this.bombGraphics.fillStyle(0xFF0000, 1.0); // Warning Red (#FF0000)
    this.bombGraphics.lineStyle(3, 0xFF4444, 1.0); // Brighter red outline for neon effect
    this.bombGraphics.fillCircle(0, 0, radius);
    this.bombGraphics.strokeCircle(0, 0, radius);
    
    // Add neon highlight with electric glow
    this.bombGraphics.fillStyle(0xFF6666, 0.8); // Brighter red highlight
    this.bombGraphics.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.4);
    
    // Add inner glow effect
    this.bombGraphics.fillStyle(0xFFAAAA, 0.4); // Light red inner glow
    this.bombGraphics.fillCircle(0, 0, radius * 0.7);
    
    // Draw bent fuse (curved red wick) - using simple line segments
    this.fuseGraphics.lineStyle(5, 0xFF0000, 1.0); // Warning Red, thicker line for neon effect
    
    // Create a bent fuse using simple line segments
    const fuseStartX = -2;
    const fuseStartY = -radius;
    const fuseMidX = 6; // Bend to the right
    const fuseMidY = -radius - fuseLength * 0.5;
    const fuseEndX = 2;
    const fuseEndY = -radius - fuseLength;
    
    // Draw the bent fuse as connected line segments
    this.fuseGraphics.beginPath();
    this.fuseGraphics.moveTo(fuseStartX, fuseStartY);
    this.fuseGraphics.lineTo(fuseMidX, fuseMidY);
    this.fuseGraphics.lineTo(fuseEndX, fuseEndY);
    this.fuseGraphics.strokePath();
    
    // Add fuse tip (smaller orange circle with neon glow)
    this.fuseGraphics.fillStyle(0xFF4500, 1.0); // Orange-red tip
    this.fuseGraphics.lineStyle(2, 0xFF6600, 1.0); // Brighter orange outline
    this.fuseGraphics.fillCircle(fuseEndX, fuseEndY, 4);
    this.fuseGraphics.strokeCircle(fuseEndX, fuseEndY, 4);
    
    // Add some bomb details (neon rivets with glow)
    this.bombGraphics.fillStyle(0xFF3333, 1.0); // Bright red rivets
    this.bombGraphics.lineStyle(1, 0xFF6666, 1.0); // Glowing outline
    this.bombGraphics.fillCircle(-radius * 0.4, radius * 0.2, 3);
    this.bombGraphics.strokeCircle(-radius * 0.4, radius * 0.2, 3);
    this.bombGraphics.fillCircle(radius * 0.3, -radius * 0.1, 3);
    this.bombGraphics.strokeCircle(radius * 0.3, -radius * 0.1, 3);
    this.bombGraphics.fillCircle(radius * 0.1, radius * 0.4, 3);
    this.bombGraphics.strokeCircle(radius * 0.1, radius * 0.4, 3);
    
    // Start spark animation
    this.startSparkAnimation();
    
    // Start subtle flicker effect
    this.startFlickerEffect();
  }

  /**
   * Start subtle flicker effect for the bomb
   */
  private startFlickerEffect(): void {
    // Create subtle alpha flicker for the bomb graphics
    this.scene.tweens.add({
      targets: this.bombGraphics,
      alpha: 0.85,
      duration: 200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Create subtle scale flicker for the fuse
    this.scene.tweens.add({
      targets: this.fuseGraphics,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 300,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Start spark animation on the fuse tip
   */
  private startSparkAnimation(): void {
    if (!this.sparkGraphics || !this.active) {
      console.log('Bomb: Cannot start spark animation - sparkGraphics:', !!this.sparkGraphics, 'active:', this.active);
      return;
    }

    // Stop any existing spark animation
    if (this.sparkTween) {
      this.sparkTween.remove();
    }

    const radius = this.size / 2;
    const fuseLength = radius * 0.5; // Use the same reduced length
    const fuseEndX = 2;
    const fuseEndY = -radius - fuseLength;

    console.log('Bomb: Starting spark animation at fuse tip:', fuseEndX, fuseEndY);

    // Create spark animation with a more visible effect
    this.sparkTween = this.scene.tweens.add({
      targets: { sparkAlpha: 1 },
      sparkAlpha: 0,
      duration: 150,
      ease: 'Power2.easeOut',
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        this.drawSparks(fuseEndX, fuseEndY, tween.getValue());
      }
    });
  }

  /**
   * Draw sparks at the fuse tip
   */
  private drawSparks(fuseEndX: number, fuseEndY: number, alpha: number = 1): void {
    if (!this.sparkGraphics) return;

    this.sparkGraphics.clear();

    // Create 4-6 small sparks around the fuse tip
    const sparkCount = 4 + Math.floor(Math.random() * 3);
    const sparkColors = [0xFFD700, 0xFFA500, 0xFF4500, 0xFFFFFF, 0xFF0000]; // Gold, Orange, Red-Orange, White, Warning Red

    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 2 + Math.random() * 6; // Smaller distance for more focused sparks
      const sparkX = fuseEndX + Math.cos(angle) * distance;
      const sparkY = fuseEndY + Math.sin(angle) * distance;
      const sparkSize = 1.5 + Math.random() * 2.5; // Slightly larger sparks
      const sparkColor = sparkColors[Math.floor(Math.random() * sparkColors.length)];

      // Use the alpha from the tween for fade effect
      this.sparkGraphics.fillStyle(sparkColor, alpha * 0.9);
      this.sparkGraphics.fillCircle(sparkX, sparkY, sparkSize);
    }
  }
}
