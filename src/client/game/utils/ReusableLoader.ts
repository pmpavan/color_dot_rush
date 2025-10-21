import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';

/**
 * Reusable Loader Component
 * Creates a beautiful orbital loading animation that can be used across the app
 */
export class ReusableLoader {
  private scene: Scene;
  private orbitalDots: Phaser.GameObjects.Arc[] = [];
  private orbitalTweens: Phaser.Tweens.Tween[] = [];
  private centerHub: Phaser.GameObjects.Arc | null = null;
  private progressRing: Phaser.GameObjects.Arc | null = null;
  
  // Animation properties - scaled to 15% of screen
  private innerRadius: number = 0;
  private outerRadius: number = 0;
  private dotSize: number = 0;
  private hubSize: number = 0;
  private ringRadius: number = 0;
  
  // Enhanced game colors for orbital dots
  private readonly GAME_COLORS = [
    GameColor.RED,
    GameColor.GREEN, 
    GameColor.BLUE,
    GameColor.YELLOW,
    GameColor.PURPLE,
    GameColor.RED,    // Repeat for more variety
    GameColor.GREEN,
    GameColor.BLUE
  ];

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create the loader at specified position
   */
  public createLoader(centerX: number, centerY: number, width: number, height: number): void {
    // Calculate responsive sizes (15% of screen)
    this.calculateResponsiveSizes(width, height);
    
    // Create central pulsing hub
    this.createCenterHub(centerX, centerY);
    
    // Create orbital animation system
    this.createOrbitalAnimation(centerX, centerY);
    
    // Create progress ring
    this.createProgressRing(centerX, centerY);
    
    // Start the perpetual motion
    this.startPerpetualMotion(centerX, centerY);
  }

  /**
   * Update progress (0 to 1)
   */
  public updateProgress(progress: number): void {
    if (this.progressRing) {
      // Scale the ring based on progress (0 to 1)
      this.progressRing.setScale(progress, progress);
      
      // Change color based on progress
      const color = progress < 0.5 ? 0xE74C3C : progress < 0.8 ? 0xF1C40F : 0x2ECC71;
      this.progressRing.setFillStyle(color, 0.8);
      this.progressRing.setStrokeStyle(3, color, 1);
    }
  }

  /**
   * Show completion animation
   */
  public showCompletion(callback?: () => void): void {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;
    
    // Create completion checkmark
    const checkmark = this.scene.add.circle(centerX, centerY, 25, 0x2ECC71, 0.9);
    checkmark.setStrokeStyle(4, 0x2ECC71, 1);
    checkmark.setDepth(15);
    checkmark.setScale(0, 0);
    
    // Animate checkmark appearance
    this.scene.tweens.add({
      targets: checkmark,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: checkmark,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Wait a moment then call callback
            this.scene.time.delayedCall(800, () => {
              if (callback) callback();
            });
          }
        });
      }
    });
  }

  /**
   * Destroy the loader
   */
  public destroy(): void {
    // Stop all tweens
    this.orbitalTweens.forEach(tween => tween.destroy());
    this.orbitalTweens = [];
    
    // Destroy all dots
    this.orbitalDots.forEach(dot => dot.destroy());
    this.orbitalDots = [];
    
    // Destroy hub and progress ring
    if (this.centerHub) this.centerHub.destroy();
    if (this.progressRing) this.progressRing.destroy();
    
    this.centerHub = null;
    this.progressRing = null;
  }

  /**
   * Calculate responsive sizes based on screen dimensions (15% of screen)
   */
  private calculateResponsiveSizes(width: number, height: number): void {
    // Use the smaller dimension to ensure it fits on all screens
    const baseSize = Math.min(width, height);
    const scaleFactor = baseSize * 0.15; // 15% of screen
    
    this.innerRadius = Math.max(scaleFactor * 0.3, 20); // 30% of scale, minimum 20px
    this.outerRadius = Math.max(scaleFactor * 0.6, 40); // 60% of scale, minimum 40px
    this.dotSize = Math.max(scaleFactor * 0.08, 6); // 8% of scale, minimum 6px (increased from 5%)
    this.hubSize = Math.max(scaleFactor * 0.05, 4); // 5% of scale, minimum 4px (reduced from 8%)
    this.ringRadius = Math.max(scaleFactor * 0.5, 30); // 50% of scale, minimum 30px
  }

  /**
   * Create central pulsing hub
   */
  private createCenterHub(centerX: number, centerY: number): void {
    this.centerHub = this.scene.add.circle(centerX, centerY, this.hubSize, 0xFFFFFF, 0.9);
    this.centerHub.setDepth(10);
    
    // Pulsing animation for the hub
    this.scene.tweens.add({
      targets: this.centerHub,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.7,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Create orbital animation system with multiple rings
   */
  private createOrbitalAnimation(centerX: number, centerY: number): void {
    // Inner ring - 3 dots, fast rotation
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120) * Math.PI / 180; // 120 degrees apart
      const x = centerX + Math.cos(angle) * this.innerRadius;
      const y = centerY + Math.sin(angle) * this.innerRadius;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.scene.add.circle(x, y, this.dotSize, this.getColorHex(color), 0.9);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
    
    // Outer ring - 5 dots, slower rotation
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72) * Math.PI / 180; // 72 degrees apart
      const x = centerX + Math.cos(angle) * this.outerRadius;
      const y = centerY + Math.sin(angle) * this.outerRadius;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.scene.add.circle(x, y, this.dotSize, this.getColorHex(color), 0.7);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
  }

  /**
   * Create circular progress ring
   */
  private createProgressRing(centerX: number, centerY: number): void {
    // Outer ring (background)
    this.scene.add.circle(centerX, centerY, this.ringRadius, 0xFFFFFF, 0.1).setStrokeStyle(3, 0xFFFFFF, 0.3);
    
    // Progress ring (foreground)
    this.progressRing = this.scene.add.circle(centerX, centerY, this.ringRadius, 0x2ECC71, 0.8);
    this.progressRing.setStrokeStyle(3, 0x2ECC71, 1);
    this.progressRing.setDepth(8);
    
    // Start with 0 progress
    this.progressRing.setScale(0, 0);
  }

  /**
   * Start the perpetual motion animation
   */
  private startPerpetualMotion(centerX: number, centerY: number): void {
    // Inner ring rotation (3 dots, fast)
    for (let i = 0; i < 3; i++) {
      const dot = this.orbitalDots[i];
      if (dot) {
        const tween = this.scene.tweens.add({
          targets: dot,
          angle: 360,
          duration: 2000, // 2 seconds per revolution
          ease: 'Linear',
          repeat: -1,
          onUpdate: (tween) => {
            const angle = tween.getValue();
            const radians = angle * Math.PI / 180;
            dot.x = centerX + Math.cos(radians) * this.innerRadius;
            dot.y = centerY + Math.sin(radians) * this.innerRadius;
          }
        });
        this.orbitalTweens.push(tween);
      }
    }
    
    // Outer ring rotation (5 dots, slower)
    for (let i = 3; i < 8; i++) {
      const dot = this.orbitalDots[i];
      if (dot) {
        const tween = this.scene.tweens.add({
          targets: dot,
          angle: 360,
          duration: 4000, // 4 seconds per revolution
          ease: 'Linear',
          repeat: -1,
          onUpdate: (tween) => {
            const angle = tween.getValue();
            const radians = angle * Math.PI / 180;
            dot.x = centerX + Math.cos(radians) * this.outerRadius;
            dot.y = centerY + Math.sin(radians) * this.outerRadius;
          }
        });
        this.orbitalTweens.push(tween);
      }
    }
    
    // Color cycling for all dots
    this.startColorCycling();
  }

  /**
   * Start color cycling animation for orbital dots
   */
  private startColorCycling(): void {
    this.orbitalDots.forEach((dot, index) => {
      this.scene.tweens.add({
        targets: dot,
        alpha: 0.4,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: index * 200 // Stagger the animations
      });
    });
  }

  /**
   * Get hex color from GameColor enum
   */
  private getColorHex(color: GameColor): number {
    const colorMap: { [key in GameColor]: number } = {
      [GameColor.RED]: 0xE74C3C,
      [GameColor.GREEN]: 0x2ECC71,
      [GameColor.BLUE]: 0x3498DB,
      [GameColor.YELLOW]: 0xF1C40F,
      [GameColor.PURPLE]: 0x9B59B6
    };
    return colorMap[color];
  }
}
