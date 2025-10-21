import { Scene } from 'phaser';
import { GAME_ASSETS, validateAssets } from '../assets/AssetManifest';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    console.log('Color Dot Rush: Preloader init started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    const { width, height } = this.scale;
    
    //  Background will be handled by the camera background color
    console.log('Color Dot Rush: Using camera background color for preloader');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(width / 2, height / 2, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(width / 2 - 230, height / 2, 4, 28, 0xffffff);

    // Create animated loading dots instead of text (CSP-compliant)
    const dotSpacing = 20;
    const dots: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const dot = this.add.circle(
        width / 2 - dotSpacing + (i * dotSpacing),
        height / 2 - 50,
        5,
        0xffffff
      );
      dots.push(dot);
      
      // Animate each dot with a delay
      this.tweens.add({
        targets: dot,
        alpha: 0.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        delay: i * 200
      });
    }

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
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
    
    // Show completion with a green checkmark circle (CSP-compliant)
    const checkmark = this.add.circle(
      this.scale.width / 2,
      this.scale.height / 2 + 50,
      20,
      0x2ECC71
    );
    
    // Animate checkmark and then transition to SplashScreen
    this.tweens.add({
      targets: checkmark,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        // Wait a moment to show the checkmark, then transition
        this.time.delayedCall(500, () => {
          console.log('Color Dot Rush: Preloader complete - transitioning to SplashScreen');
          this.scene.start('SplashScreen');
        });
      }
    });
  }
}
