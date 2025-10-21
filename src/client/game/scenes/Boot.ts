import { Scene } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
import { GameColor } from '../../../shared/types/game';

export class Boot extends Scene {
  // Orbital animation system
  private orbitalDots: Phaser.GameObjects.Arc[] = [];
  private orbitalTweens: Phaser.Tweens.Tween[] = [];
  private centerHub: Phaser.GameObjects.Arc | null = null;
  
  // Animation properties
  private readonly INNER_RADIUS = 60;
  private readonly OUTER_RADIUS = 120;
  private readonly DOT_SIZE = 8;
  private readonly HUB_SIZE = 12;
  
  // Game colors for orbital dots
  private readonly GAME_COLORS = [
    GameColor.RED,
    GameColor.GREEN, 
    GameColor.BLUE,
    GameColor.YELLOW,
    GameColor.PURPLE
  ];

  constructor() {
    super('Boot');
  }

  preload() {
    console.log('Color Dot Rush: Boot scene preload started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    // Ensure fonts are loaded before proceeding
    this.ensureFontsLoaded();
  }

  private async ensureFontsLoaded(): Promise<void> {
    console.log('Color Dot Rush: Ensuring fonts are loaded');
    
    try {
      const fontPreloader = FontPreloader.getInstance();
      const result = await fontPreloader.preloadFonts();
      
      if (result.success) {
        console.log('Color Dot Rush: Fonts loaded successfully', {
          loaded: result.fontsLoaded.length,
          failed: result.fontsFailed.length,
          fallbackUsed: result.fallbackUsed
        });
      } else {
        console.warn('Color Dot Rush: Font loading failed, will use fallbacks');
      }
    } catch (error) {
      console.warn('Color Dot Rush: Font loading failed, will use fallbacks:', error);
    }
    
    // Proceed to preloader regardless of font loading status
    this.scene.start('Preloader');
  }

  create() {
    console.log('Color Dot Rush: Boot scene created - setting up perpetual motion animation');
    
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create subtle background gradient
    this.createBackgroundGradient(centerX, centerY, width, height);
    
    // Create central pulsing hub
    this.createCenterHub(centerX, centerY);
    
    // Create orbital animation system
    this.createOrbitalAnimation(centerX, centerY);
    
    // Start the perpetual motion
    this.startPerpetualMotion();
    
    // Transition to Preloader after a brief moment
    this.time.delayedCall(1500, () => {
      console.log('Color Dot Rush: Boot animation complete - transitioning to Preloader');
      this.scene.start('Preloader');
    });
  }

  /**
   * Create subtle background gradient
   */
  private createBackgroundGradient(centerX: number, centerY: number, width: number, height: number): void {
    // Create a subtle radial gradient effect using multiple rectangles
    const gradient1 = this.add.rectangle(centerX, centerY, width, height, 0x2C3E50, 0.8);
    const gradient2 = this.add.rectangle(centerX, centerY, width * 0.8, height * 0.8, 0x34495E, 0.3);
    const gradient3 = this.add.rectangle(centerX, centerY, width * 0.6, height * 0.6, 0x1A252F, 0.2);
    
    gradient1.setDepth(0);
    gradient2.setDepth(1);
    gradient3.setDepth(2);
    
    // Background gradient created
  }

  /**
   * Create central pulsing hub
   */
  private createCenterHub(centerX: number, centerY: number): void {
    this.centerHub = this.add.circle(centerX, centerY, this.HUB_SIZE, 0xFFFFFF, 0.6);
    this.centerHub.setDepth(10);
    
    // Pulsing animation for the hub
    this.tweens.add({
      targets: this.centerHub,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.8,
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
      const x = centerX + Math.cos(angle) * this.INNER_RADIUS;
      const y = centerY + Math.sin(angle) * this.INNER_RADIUS;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.add.circle(x, y, this.DOT_SIZE, this.getColorHex(color), 0.9);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
    
    // Outer ring - 5 dots, slower rotation
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72) * Math.PI / 180; // 72 degrees apart
      const x = centerX + Math.cos(angle) * this.OUTER_RADIUS;
      const y = centerY + Math.sin(angle) * this.OUTER_RADIUS;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.add.circle(x, y, this.DOT_SIZE, this.getColorHex(color), 0.7);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
  }

  /**
   * Start the perpetual motion animation
   */
  private startPerpetualMotion(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    // Inner ring rotation (3 dots, fast)
    for (let i = 0; i < 3; i++) {
      const dot = this.orbitalDots[i];
      if (dot) {
        const tween = this.tweens.add({
          targets: dot,
          angle: 360,
          duration: 2000, // 2 seconds per revolution
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
    }
    
    // Outer ring rotation (5 dots, slower)
    for (let i = 3; i < 8; i++) {
      const dot = this.orbitalDots[i];
      if (dot) {
        const tween = this.tweens.add({
          targets: dot,
          angle: 360,
          duration: 4000, // 4 seconds per revolution
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
    }
    
    // Color cycling for all dots
    this.startColorCycling();
  }

  /**
   * Start color cycling animation for orbital dots
   */
  private startColorCycling(): void {
    this.orbitalDots.forEach((dot, index) => {
      this.tweens.add({
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
