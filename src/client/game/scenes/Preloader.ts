import { Scene } from 'phaser';
import { GAME_ASSETS, validateAssets } from '../assets/AssetManifest';
import { GameColor } from '../../../shared/types/game';

export class Preloader extends Scene {
  // Perpetual motion system
  private orbitalDots: Phaser.GameObjects.Arc[] = [];
  private orbitalTweens: Phaser.Tweens.Tween[] = [];
  private centerHub: Phaser.GameObjects.Arc | null = null;
  private progressRing: Phaser.GameObjects.Arc | null = null;
  
  // Animation properties
  private readonly INNER_RADIUS = 50;
  private readonly OUTER_RADIUS = 100;
  private readonly DOT_SIZE = 6;
  private readonly HUB_SIZE = 10;
  private readonly RING_RADIUS = 80;
  
  // Game colors
  private readonly GAME_COLORS = [
    GameColor.RED,
    GameColor.GREEN, 
    GameColor.BLUE,
    GameColor.YELLOW,
    GameColor.PURPLE
  ];

  constructor() {
    super('Preloader');
  }

  init() {
    console.log('Color Dot Rush: Preloader init started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create perpetual motion loading animation
    this.createPerpetualMotionLoader(centerX, centerY);
    
    // Create circular progress ring
    this.createProgressRing(centerX, centerY);
    
    // Start the perpetual motion
    this.startPerpetualMotion(centerX, centerY);
    
    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading ring
    this.load.on('progress', (progress: number) => {
      this.updateProgressRing(progress);
      console.log(`Color Dot Rush: Preloader progress: ${Math.round(progress * 100)}%`);
    });
  }

  preload() {
    console.log('Color Dot Rush: Loading essential assets for Reddit webview compatibility');
    
    // Load essential assets that are needed for the splash screen
    this.loadEssentialAssets();
    
    // Wait for the actual loading to complete instead of simulating it
    this.load.on('complete', () => {
      console.log('Color Dot Rush: All assets loaded successfully');
      this.time.delayedCall(100, () => {
        this.scene.start('SplashScreen');
      });
    });
    
    // Also handle loading errors
    this.load.on('loaderror', (file: any) => {
      console.error('Color Dot Rush: Failed to load asset:', file.key, file.url);
      // Still proceed to splash screen even if logo fails to load
      this.time.delayedCall(500, () => {
        this.scene.start('SplashScreen');
      });
    });
    
    // Start the actual loading process
    this.load.start();
  }

  private loadEssentialAssets(): void {
    try {
      console.log('Preloader: Loading essential assets...');
      
      // Load the logo image that's needed for the splash screen
      this.load.image('logo', 'assets/logo.png');
      
      console.log('Preloader: Essential assets loaded successfully');
      
    } catch (error) {
      console.error('Preloader: Error loading essential assets:', error);
    }
  }

  create() {
    console.log('Color Dot Rush: Preloader create started');
    
    // Show completion with enhanced animation
    this.showCompletionAnimation();
  }

  /**
   * Create perpetual motion loader with orbital dots
   */
  private createPerpetualMotionLoader(centerX: number, centerY: number): void {
    // Create central hub
    this.centerHub = this.add.circle(centerX, centerY, this.HUB_SIZE, 0xFFFFFF, 0.8);
    this.centerHub.setDepth(10);
    
    // Inner ring - 3 dots, fast rotation
    for (let i = 0; i < 3; i++) {
      const angle = (i * 120) * Math.PI / 180;
      const x = centerX + Math.cos(angle) * this.INNER_RADIUS;
      const y = centerY + Math.sin(angle) * this.INNER_RADIUS;
      
      const dot = this.add.circle(x, y, this.DOT_SIZE, this.getColorHex(this.GAME_COLORS[i % this.GAME_COLORS.length]), 0.9);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
    
    // Outer ring - 4 dots, slower rotation
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) * Math.PI / 180;
      const x = centerX + Math.cos(angle) * this.OUTER_RADIUS;
      const y = centerY + Math.sin(angle) * this.OUTER_RADIUS;
      
      const dot = this.add.circle(x, y, this.DOT_SIZE, this.getColorHex(this.GAME_COLORS[i % this.GAME_COLORS.length]), 0.7);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
  }

  /**
   * Create circular progress ring
   */
  private createProgressRing(centerX: number, centerY: number): void {
    // Outer ring (background)
    this.add.circle(centerX, centerY, this.RING_RADIUS, 0xFFFFFF, 0.1).setStrokeStyle(3, 0xFFFFFF, 0.3);
    
    // Progress ring (foreground)
    this.progressRing = this.add.circle(centerX, centerY, this.RING_RADIUS, 0x2ECC71, 0.8);
    this.progressRing.setStrokeStyle(3, 0x2ECC71, 1);
    this.progressRing.setDepth(8);
    
    // Start with 0 progress
    this.progressRing.setScale(0, 0);
  }

  /**
   * Start perpetual motion animation
   */
  private startPerpetualMotion(centerX: number, centerY: number): void {
    // Inner ring rotation (3 dots, fast)
    for (let i = 0; i < 3; i++) {
      const dot = this.orbitalDots[i];
      const tween = this.tweens.add({
        targets: dot,
        angle: 360,
        duration: 1500, // 1.5 seconds per revolution
        ease: 'Linear',
        repeat: -1,
        onUpdate: (tween) => {
          const angle = tween.getValue();
          const radians = angle * Math.PI / 180;
          dot.x = centerX + Math.cos(radians) * this.INNER_RADIUS;
          dot.y = centerY + Math.sin(radians) * this.INNER_RADIUS;
        }
      });
      this.orbitalTweens.push(tween);
    }
    
    // Outer ring rotation (4 dots, slower)
    for (let i = 3; i < 7; i++) {
      const dot = this.orbitalDots[i];
      const tween = this.tweens.add({
        targets: dot,
        angle: 360,
        duration: 3000, // 3 seconds per revolution
        ease: 'Linear',
        repeat: -1,
        onUpdate: (tween) => {
          const angle = tween.getValue();
          const radians = angle * Math.PI / 180;
          dot.x = centerX + Math.cos(radians) * this.OUTER_RADIUS;
          dot.y = centerY + Math.sin(radians) * this.OUTER_RADIUS;
        }
      });
      this.orbitalTweens.push(tween);
    }
    
    // Hub pulsing
    this.tweens.add({
      targets: this.centerHub,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.6,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Update progress ring based on loading progress
   */
  private updateProgressRing(progress: number): void {
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
  private showCompletionAnimation(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    // Create completion checkmark
    const checkmark = this.add.circle(centerX, centerY, 25, 0x2ECC71, 0.9);
    checkmark.setStrokeStyle(4, 0x2ECC71, 1);
    checkmark.setDepth(15);
    checkmark.setScale(0, 0);
    
    // Animate checkmark appearance
    this.tweens.add({
      targets: checkmark,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: checkmark,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            // Wait a moment then transition
            this.time.delayedCall(800, () => {
              console.log('Color Dot Rush: Preloader complete - transitioning to SplashScreen');
              this.scene.start('SplashScreen');
            });
          }
        });
      }
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
