import { Scene } from 'phaser';
import { GAME_ASSETS, validateAssets } from '../assets/AssetManifest';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
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
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the SplashScreen. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('SplashScreen');
  }
}
