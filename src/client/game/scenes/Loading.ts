import { Scene } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
import { GameColor } from '../../../shared/types/game';

/**
 * Unified Loading Scene - Combines Boot and Preloader functionality
 * Handles font loading, asset loading, and progress indication with perpetual motion
 */
export class Loading extends Scene {
  // Orbital animation system
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
  
  // Game colors for orbital dots
  private readonly GAME_COLORS = [
    GameColor.RED,
    GameColor.GREEN, 
    GameColor.BLUE,
    GameColor.YELLOW,
    GameColor.PURPLE
  ];

  // Loading state
  private fontsLoaded: boolean = false;
  private assetsLoaded: boolean = false;
  private loadingComplete: boolean = false;

  constructor() {
    super('Loading');
  }

  preload() {
    console.log('Color Dot Rush: Loading scene preload started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    // Start both font loading and asset loading in parallel
    this.startParallelLoading();
  }

  create() {
    console.log('Color Dot Rush: Loading scene created - setting up perpetual motion animation');
    
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate responsive sizes (15% of screen)
    this.calculateResponsiveSizes(width, height);
    
    // Create subtle background gradient
    this.createBackgroundGradient(centerX, centerY, width, height);
    
    // Create central pulsing hub
    this.createCenterHub(centerX, centerY);
    
    // Create orbital animation system
    this.createOrbitalAnimation(centerX, centerY);
    
    // Create progress ring
    this.createProgressRing(centerX, centerY);
    
    // Start the perpetual motion
    this.startPerpetualMotion(centerX, centerY);
    
    // Start loading processes
    this.startLoadingProcesses();
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
    this.dotSize = Math.max(scaleFactor * 0.05, 4); // 5% of scale, minimum 4px
    this.hubSize = Math.max(scaleFactor * 0.08, 6); // 8% of scale, minimum 6px
    this.ringRadius = Math.max(scaleFactor * 0.5, 30); // 50% of scale, minimum 30px
    
    console.log(`Loading: Calculated responsive sizes - inner: ${this.innerRadius}, outer: ${this.outerRadius}, dots: ${this.dotSize}, hub: ${this.hubSize}, ring: ${this.ringRadius}`);
  }

  /**
   * Start both font loading and asset loading in parallel
   */
  private async startParallelLoading(): Promise<void> {
    console.log('Color Dot Rush: Starting parallel loading processes');
    
    // Start font loading
    this.loadFonts();
    
    // Start asset loading
    this.loadAssets();
  }

  /**
   * Load fonts asynchronously
   */
  private async loadFonts(): Promise<void> {
    try {
      console.log('Color Dot Rush: Starting font loading');
      const fontPreloader = FontPreloader.getInstance();
      const result = await fontPreloader.preloadFonts();
      
      if (result.success) {
        console.log('Color Dot Rush: Fonts loaded successfully');
        this.fontsLoaded = true;
      } else {
        console.warn('Color Dot Rush: Font loading failed, will use fallbacks');
        this.fontsLoaded = true; // Still proceed with fallbacks
      }
    } catch (error) {
      console.warn('Color Dot Rush: Font loading failed, will use fallbacks:', error);
      this.fontsLoaded = true; // Still proceed with fallbacks
    }
    
    this.checkLoadingComplete();
  }

  /**
   * Load essential assets
   */
  private loadAssets(): void {
    console.log('Color Dot Rush: Loading essential assets');
    
    try {
      // Load the logo image that's needed for the splash screen
      this.load.image('logo', 'assets/logo.png');
      
      // Set up loading progress tracking
      this.load.on('progress', (progress: number) => {
        this.updateProgressRing(progress);
        console.log(`Color Dot Rush: Asset loading progress: ${Math.round(progress * 100)}%`);
      });
      
      // Handle loading completion
      this.load.on('complete', () => {
        console.log('Color Dot Rush: All assets loaded successfully');
        this.assetsLoaded = true;
        this.checkLoadingComplete();
      });
      
      // Handle loading errors
      this.load.on('loaderror', (file: any) => {
        console.error('Color Dot Rush: Failed to load asset:', file.key, file.url);
        // Still proceed even if logo fails to load
        this.assetsLoaded = true;
        this.checkLoadingComplete();
      });
      
      // Start the actual loading process
      this.load.start();
      
    } catch (error) {
      console.error('Loading: Error loading essential assets:', error);
      this.assetsLoaded = true;
      this.checkLoadingComplete();
    }
  }

  /**
   * Check if all loading processes are complete
   */
  private checkLoadingComplete(): void {
    if (this.fontsLoaded && this.assetsLoaded && !this.loadingComplete) {
      this.loadingComplete = true;
      console.log('Color Dot Rush: All loading processes complete');
      
      // Show completion animation and transition
      this.showCompletionAnimation();
    }
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
  }

  /**
   * Create central pulsing hub
   */
  private createCenterHub(centerX: number, centerY: number): void {
    this.centerHub = this.add.circle(centerX, centerY, this.hubSize, 0xFFFFFF, 0.6);
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
      const x = centerX + Math.cos(angle) * this.innerRadius;
      const y = centerY + Math.sin(angle) * this.innerRadius;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.add.circle(x, y, this.dotSize, this.getColorHex(color), 0.9);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
    
    // Outer ring - 5 dots, slower rotation
    for (let i = 0; i < 5; i++) {
      const angle = (i * 72) * Math.PI / 180; // 72 degrees apart
      const x = centerX + Math.cos(angle) * this.outerRadius;
      const y = centerY + Math.sin(angle) * this.outerRadius;
      
      const color = this.GAME_COLORS[i % this.GAME_COLORS.length] || GameColor.RED;
      const dot = this.add.circle(x, y, this.dotSize, this.getColorHex(color), 0.7);
      dot.setDepth(5);
      this.orbitalDots.push(dot);
    }
  }

  /**
   * Create circular progress ring
   */
  private createProgressRing(centerX: number, centerY: number): void {
    // Outer ring (background)
    this.add.circle(centerX, centerY, this.ringRadius, 0xFFFFFF, 0.1).setStrokeStyle(3, 0xFFFFFF, 0.3);
    
    // Progress ring (foreground)
    this.progressRing = this.add.circle(centerX, centerY, this.ringRadius, 0x2ECC71, 0.8);
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
        const tween = this.tweens.add({
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
        const tween = this.tweens.add({
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
   * Show completion animation and transition to SplashScreen
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
            // Wait a moment then transition to SplashScreen
            this.time.delayedCall(800, () => {
              console.log('Color Dot Rush: Loading complete - transitioning to SplashScreen');
              this.scene.start('SplashScreen');
            });
          }
        });
      }
    });
  }

  /**
   * Start loading processes (called from create)
   */
  private startLoadingProcesses(): void {
    // This method is called from create() to start the loading processes
    // The actual loading is handled by preload() and the parallel loading methods
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
