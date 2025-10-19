// Bomb game object implementation for Color Rush

import Phaser from 'phaser';

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
    
    // Add graphics to container
    this.add([this.bombGraphics, this.fuseGraphics]);
    
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
    const hitboxSize = Math.max(size, 44); // Minimum 44px tap target
    this.hitbox.setSize(hitboxSize, hitboxSize);
    
    // Position the bomb
    this.setPosition(x, y);
    this.setDepth(999); // Ensure bomb is visible
    
    // Draw the bomb shape
    this.drawBombShape();
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

    // Create explosion effect with enhanced graphics
    const explosionColors = [0xFF0000, 0xFF4500, 0xFF8C00, 0xFFD700, 0xFFFFFF]; // Red, OrangeRed, DarkOrange, Gold, White
    
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
  }

  /**
   * Deactivate the bomb
   */
  public deactivate(): void {
    this.active = false;
    this.setVisible(false);
    this.bombGraphics.setVisible(false);
    this.fuseGraphics.setVisible(false);
    // Clean up any ongoing tweens
    this.scene.tweens.killTweensOf(this);
  }

  /**
   * Destroy the bomb and its graphics
   */
  public override destroy(fromScene?: boolean): void {
    if (this.bombGraphics) {
      this.bombGraphics.destroy();
    }
    if (this.fuseGraphics) {
      this.fuseGraphics.destroy();
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
    if (!this.bombGraphics || !this.fuseGraphics) return;
    
    const radius = this.size / 2;
    const fuseLength = radius * 0.8;
    
    // Clear previous drawings
    this.bombGraphics.clear();
    this.fuseGraphics.clear();
    
    // Draw bomb body (dark metallic sphere)
    this.bombGraphics.fillStyle(0x2C3E50, 1.0); // Dark slate blue
    this.bombGraphics.lineStyle(2, 0x34495E, 1.0); // Slightly lighter outline
    this.bombGraphics.fillCircle(0, 0, radius);
    this.bombGraphics.strokeCircle(0, 0, radius);
    
    // Add metallic highlight
    this.bombGraphics.fillStyle(0x5D6D7E, 0.6); // Lighter metallic highlight
    this.bombGraphics.fillCircle(-radius * 0.3, -radius * 0.3, radius * 0.4);
    
    // Draw fuse (red wick)
    this.fuseGraphics.fillStyle(0xFF0000, 1.0); // Bright red
    this.fuseGraphics.lineStyle(1, 0xCC0000, 1.0); // Darker red outline
    this.fuseGraphics.fillRect(-2, -radius - fuseLength, 4, fuseLength);
    this.fuseGraphics.strokeRect(-2, -radius - fuseLength, 4, fuseLength);
    
    // Add fuse tip (smaller red circle)
    this.fuseGraphics.fillStyle(0xFF4500, 1.0); // Orange-red tip
    this.fuseGraphics.fillCircle(0, -radius - fuseLength, 3);
    
    // Add some bomb details (small circles for rivets)
    this.bombGraphics.fillStyle(0x1B2631, 1.0); // Dark rivets
    this.bombGraphics.fillCircle(-radius * 0.4, radius * 0.2, 2);
    this.bombGraphics.fillCircle(radius * 0.3, -radius * 0.1, 2);
    this.bombGraphics.fillCircle(radius * 0.1, radius * 0.4, 2);
  }
}
