import { Scene } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    console.log('Color Rush: Boot scene preload started');
    
    // Set background color
    this.cameras.main.setBackgroundColor('#2C3E50');
    
    // Ensure fonts are loaded before proceeding
    this.ensureFontsLoaded();
  }

  private async ensureFontsLoaded(): Promise<void> {
    console.log('Color Rush: Ensuring fonts are loaded');
    
    try {
      const fontPreloader = FontPreloader.getInstance();
      const result = await fontPreloader.preloadFonts();
      
      if (result.success) {
        console.log('Color Rush: Fonts loaded successfully', {
          loaded: result.fontsLoaded.length,
          failed: result.fontsFailed.length,
          fallbackUsed: result.fallbackUsed
        });
      } else {
        console.warn('Color Rush: Font loading failed, will use fallbacks');
      }
    } catch (error) {
      console.warn('Color Rush: Font loading failed, will use fallbacks:', error);
    }
    
    // Proceed to preloader regardless of font loading status
    this.scene.start('Preloader');
  }

  create() {
    console.log('Color Rush: Boot scene created - transitioning to Preloader');
    
    // Go to Preloader to show loading screen
    this.scene.start('Preloader');
  }
}
