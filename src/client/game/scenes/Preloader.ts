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

    // Add loading text
    this.add.text(width / 2, height / 2 - 50, 'Loading Color Rush Assets...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
      console.log(`Color Rush: Preloader progress: ${Math.round(progress * 100)}%`);
    });
  }

  preload() {
    // Validate asset manifest before loading
    const validation = validateAssets();
    if (!validation.valid) {
      console.error('Asset manifest validation failed. Missing assets:', validation.missing);
    }

    // Load all Color Rush game assets - CSP compliant (all local)
    GAME_ASSETS.forEach(asset => {
      if (asset.type === 'image') {
        this.load.image(asset.key, asset.path);
      }
    });

    // Progress tracking
    this.load.on('complete', () => {
      console.log('All Color Rush assets loaded successfully');
      console.log(`Loaded ${GAME_ASSETS.length} assets`);
    });

    this.load.on('loaderror', (file: any) => {
      console.error('Failed to load asset:', file.key);
    });

    this.load.on('progress', (progress: number) => {
      // Optional: Add more detailed progress logging
      if (progress === 1) {
        console.log('Asset loading complete');
      }
    });
  }

  create() {
    console.log('Color Rush: Preloader create started');
    
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    // Add a brief delay to show completion
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, 'Loading Complete!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#2ECC71'
    }).setOrigin(0.5);

    //  Move to the SplashScreen. You could also swap this for a Scene Transition, such as a camera fade.
    this.time.delayedCall(500, () => {
      console.log('Color Rush: Starting SplashScreen');
      this.scene.start('SplashScreen');
    });
  }
}
