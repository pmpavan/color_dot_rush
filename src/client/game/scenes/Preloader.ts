import { Scene } from 'phaser';
import { GAME_ASSETS, validateAssets } from '../assets/AssetManifest';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    console.log('Color Rush: Preloader init started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    const { width, height } = this.scale;
    
    //  We loaded this image in our Boot Scene, so we can display it here
    try {
      this.add.image(width / 2, height / 2, 'background');
    } catch (error) {
      console.warn('Color Rush: Background image not available, using solid color');
    }

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
      console.log(`Color Rush: Preloader progress: ${Math.round(progress * 100)}%`);
    });
  }

  preload() {
    console.log('Color Rush: Using graphics-only mode for Reddit webview compatibility');
    
    // Create graphics-based assets instead of loading external files
    this.createGraphicsAssets();
    
    // Simulate loading progress for visual feedback
    let progress = 0;
    const progressTimer = this.time.addEvent({
      delay: 50,
      callback: () => {
        progress += 0.2;
        this.load.emit('progress', Math.min(progress, 1));
        if (progress >= 1) {
          progressTimer.destroy();
          // Manually trigger the create method after loading is "complete"
          this.time.delayedCall(100, () => {
            this.scene.start('SplashScreen');
          });
        }
      },
      repeat: 5
    });
  }

  private createGraphicsAssets(): void {
    try {
      console.log('Preloader: Creating graphics-based assets...');
      
      // Skip texture generation for now to avoid the source error
      // The game objects will create their own graphics when needed
      console.log('Preloader: Skipping texture generation to avoid initialization issues');
      
    } catch (error) {
      console.error('Preloader: Error creating graphics assets:', error);
    }
  }

  create() {
    console.log('Color Rush: Preloader create started');
    
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
          console.log('Color Rush: Preloader complete - transitioning to SplashScreen');
          this.scene.start('SplashScreen');
        });
      }
    });
  }
}
