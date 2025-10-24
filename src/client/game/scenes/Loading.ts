import { Scene } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
import { ReusableLoader } from '../utils/ReusableLoader';
import { NeonBackgroundSystem } from '../utils/NeonBackgroundSystem';

/**
 * Unified Loading Scene - Combines Boot and Preloader functionality
 * Handles font loading, asset loading, and progress indication with perpetual motion
 */
export class Loading extends Scene {
  // Reusable loader component
  private loader: ReusableLoader | null = null;
  private neonBackground: NeonBackgroundSystem | null = null;

  // Loading state
  private fontsLoaded: boolean = false;
  private assetsLoaded: boolean = false;
  private loadingComplete: boolean = false;
  private minimumDisplayTime: number = 1500; // Minimum 1.5 seconds to show loader
  private sceneStartTime: number = 0;

  constructor() {
    super('Loading');
  }

  preload() {
    console.log('Color Dot Rush: Loading scene preload started');
    
    // Record scene start time for minimum display duration
    this.sceneStartTime = Date.now();
    
    // Set background color
    this.cameras.main.setBackgroundColor('#080808'); // Deep Space Black
    
    // Create loader immediately so it shows right away
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.loader = new ReusableLoader(this);
    this.loader.createLoader(centerX, centerY, width, height);
    
    // Start both font loading and asset loading in parallel
    this.startParallelLoading();
  }

  create() {
    console.log('Color Dot Rush: Loading scene created - loader already shown');
    
    // Initialize and create neon background system
    this.neonBackground = new NeonBackgroundSystem(this);
    this.neonBackground.createBackground();
    
    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });
    
    // Start loading processes
    this.startLoadingProcesses();
  }


  /**
   * Update layout for responsive design
   */
  private updateLayout(width: number, height: number): void {
    // Update camera
    this.cameras.resize(width, height);
    
    // Update neon background system
    if (this.neonBackground) {
      this.neonBackground.updateDimensions(width, height);
    }
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
      // Add aggressive cache-busting parameters to ensure updated logo is loaded
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const logoPath = `assets/logo.png?v=${timestamp}&r=${randomId}&t=${timestamp}`;
      console.log('Loading: Loading logo with cache-busting:', logoPath);
      this.load.image('logo', logoPath);
      
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
        
        // Set texture filtering for logo to maintain crisp quality
        if (this.textures.exists('logo')) {
          const logoTexture = this.textures.get('logo');
          logoTexture.setFilter(Phaser.Textures.FilterMode.LINEAR);
          console.log('Color Dot Rush: Logo texture filtering set to LINEAR');
        }
        
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
      
      // Ensure minimum display time for loader
      const elapsedTime = Date.now() - this.sceneStartTime;
      const remainingTime = Math.max(0, this.minimumDisplayTime - elapsedTime);
      
      console.log(`Color Dot Rush: Loader displayed for ${elapsedTime}ms, waiting ${remainingTime}ms more`);
      
      // Wait for minimum display time, then show completion
      this.time.delayedCall(remainingTime, () => {
        if (this.loader) {
          this.loader.showCompletion(() => {
            this.scene.start('SplashScreen');
          });
        } else {
          this.scene.start('SplashScreen');
        }
      });
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
  shutdown(): void {
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
    
    // Clean up neon background system
    if (this.neonBackground) {
      this.neonBackground.destroy();
      this.neonBackground = null;
    }
  }
}
