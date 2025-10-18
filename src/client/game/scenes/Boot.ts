import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    console.log('Color Rush: Boot scene preload started');
    
    // Set a background color immediately so we don't see grey
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
    //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

    this.load.image('background', 'assets/bg.png');
    
    this.load.on('complete', () => {
      console.log('Color Rush: Boot scene assets loaded');
    });
    
    this.load.on('loaderror', (file: any) => {
      console.error('Color Rush: Failed to load asset in Boot scene:', file);
    });
    
    this.load.on('progress', (progress: number) => {
      console.log(`Color Rush: Boot loading progress: ${Math.round(progress * 100)}%`);
    });
  }

  create() {
    console.log('Color Rush: Boot scene created, starting Preloader');
    
    // Add a simple loading text
    this.add.text(this.scale.width / 2, this.scale.height / 2, 'Loading Color Rush...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    
    // Start preloader after a brief moment to show the loading text
    this.time.delayedCall(100, () => {
      this.scene.start('Preloader');
    });
  }
}
