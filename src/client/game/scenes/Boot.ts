import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    console.log('Color Rush: Boot scene preload started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    // No assets to load - we'll use graphics only for Reddit webview compatibility
    console.log('Color Rush: Using graphics-only mode for Reddit webview');
  }

  create() {
    console.log('Color Rush: Boot scene created - transitioning directly to SplashScreen');
    
    // Skip Preloader to avoid texture generation issues, go directly to SplashScreen
    this.scene.start('SplashScreen');
  }
}
