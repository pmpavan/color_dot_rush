import { Scene } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
import { GameColor } from '../../../shared/types/game';
import { ReusableLoader } from '../utils/ReusableLoader';

/**
 * Unified Loading Scene - Combines Boot and Preloader functionality
 * Handles font loading, asset loading, and progress indication with perpetual motion
 */
export class Loading extends Scene {
  // Reusable loader component
  private loader: ReusableLoader | null = null;

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
    
    // Create reusable loader
    this.loader = new ReusableLoader(this);
    this.loader.createLoader(centerX, centerY, width, height);
    
    // Start loading processes
    this.startLoadingProcesses();
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
        if (this.loader) {
          this.loader.updateProgress(progress);
        }
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
      if (this.loader) {
        this.loader.showCompletion(() => {
          this.scene.start('SplashScreen');
        });
      } else {
        this.scene.start('SplashScreen');
      }
    }
  }


  /**
   * Start loading processes (called from create)
   */
  private startLoadingProcesses(): void {
    // This method is called from create() to start the loading processes
    // The actual loading is handled by preload() and the parallel loading methods
  }

  /**
   * Clean up resources when scene is destroyed
   */
  destroy(): void {
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
    super.destroy();
  }
}
