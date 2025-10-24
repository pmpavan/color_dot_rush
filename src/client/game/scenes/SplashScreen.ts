import { Scene, GameObjects } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
// import { FontLoadingIndicator } from '../utils/FontLoadingIndicator'; // Not needed with WOFF2
import { FontErrorHandler } from '../utils/FontErrorHandler';
import { DOMTextRenderer, DOMTextStyle } from '../utils/DOMTextRenderer';
import { ResponsiveLayoutManager, IResponsiveLayoutManager, ButtonType } from '../utils/ResponsiveLayoutManager';
import { NeonButtonConfig, NeonButtonVariant, NeonButtonSize } from '../utils/NeonButtonSystem';
import { NeonTextConfig, NeonTextEffectType, NeonTextSize } from '../utils/NeonTextEffects';
import { HowToPlayModal, IHowToPlayModal } from '../utils/HowToPlayModal';
import { ReusableLoader } from '../utils/ReusableLoader';
import { NeonBackgroundSystem } from '../utils/NeonBackgroundSystem';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;
  logo: GameObjects.Image | null = null;
  private neonBackground: NeonBackgroundSystem | null = null;

  // Component systems
  private fontPreloader: FontPreloader;
  private fontErrorHandler: FontErrorHandler;
  private domTextRenderer: DOMTextRenderer | null = null;
  private layoutManager: IResponsiveLayoutManager;
  private howToPlayModal: IHowToPlayModal | null = null;
  private loader: ReusableLoader | null = null;

  // Component lifecycle state
  private componentsInitialized: boolean = false;

  constructor() {
    super('SplashScreen');
    // Ensure scene key is properly set for testing
    if (this.scene) {
      this.scene.key = 'SplashScreen';
    }

    // Initialize core component systems with proper dependency injection
    this.initializeComponents();
  }

  /**
   * Initialize all component systems with proper dependency injection
   */
  private initializeComponents(): void {
    try {
      // Initialize font preloading system (singleton)
      this.fontPreloader = FontPreloader.getInstance();
      this.fontErrorHandler = FontErrorHandler.getInstance();

      // Initialize responsive layout manager
      this.layoutManager = new ResponsiveLayoutManager(this);

      // Initialize neon background system
      this.neonBackground = new NeonBackgroundSystem(this);

      // Mark components as initialized
      this.componentsInitialized = true;

      console.log('SplashScreen: Component systems initialized successfully');
    } catch (error) {
      console.error('SplashScreen: Failed to initialize component systems:', error);
      this.componentsInitialized = false;
      throw error;
    }
  }

  /**
   * Set up component lifecycle management and cross-component dependencies
   */
  private setupComponentLifecycle(): void {
    if (!this.componentsInitialized) {
      throw new Error('Components must be initialized before setting up lifecycle');
    }

    // Set up layout manager resize callbacks to update all visual elements
    this.layoutManager.onResize((width: number, height: number) => {
      this.handleLayoutUpdate(width, height);
    });

    // Initialize DOM text renderer
    this.domTextRenderer = new DOMTextRenderer('game-container');

    // Initialize HowToPlayModal with comprehensive error handling
    try {
      this.howToPlayModal = new HowToPlayModal(this.layoutManager);
      console.log('SplashScreen: HowToPlayModal initialized successfully');
      
      // Test modal functionality to ensure it works properly
      this.validateModalFunctionality();
    } catch (error) {
      console.error('SplashScreen: Failed to initialize HowToPlayModal:', error);
      this.handleModalInitializationError(error as Error);
      this.howToPlayModal = null;
    }

    console.log('SplashScreen: Component lifecycle management set up');
  }

  /**
   * Handle layout updates from ResponsiveLayoutManager
   */
  private handleLayoutUpdate(width: number, height: number): void {
    console.log(`SplashScreen: Handling layout update - ${width}x${height}`);

    // Update camera and background
    this.cameras.resize(width, height);

    if (this.background) {
      this.background.setDisplaySize(width, height);
    }
    
    // Update neon background system
    if (this.neonBackground) {
      this.neonBackground.updateDimensions(width, height);
    }

    // Try to create logo if it doesn't exist and texture is now available
    if (!this.logo && this.textures.exists('logo')) {
      this.createLogo();
    }

    // Update logo position and scale
    if (this.logo) {
      const logoY = height * 0.25; // Position at 25% from top (main title position)
      this.logo.setPosition(width / 2, logoY);

      // Rescale logo for new dimensions - larger since it's now the main title
      const maxLogoWidth = Math.min(width * 0.6, 300);
      const maxLogoHeight = Math.min(height * 0.25, 200);
      
      if (this.logo.width > 0 && this.logo.height > 0) {
        const scaleX = maxLogoWidth / this.logo.width;
        const scaleY = maxLogoHeight / this.logo.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        this.logo.setScale(scale);
      }
    }

    // Update DOM text renderer size
    if (this.domTextRenderer) {
      this.domTextRenderer.updateSize(width, height);

      // Update text positions
      // Note: We no longer have a title text since the logo serves as the title
      // Update subtitle position to be below the logo
      const subtitlePos = {
        x: width / 2,
        y: height * 0.40 // Position below the logo
      };
      this.domTextRenderer.updatePosition('subtitle', subtitlePos.x, subtitlePos.y);

      // Update button positions
      const startButtonPos = this.layoutManager.getButtonPosition(ButtonType.PRIMARY);
      this.domTextRenderer.updatePosition('start-button', startButtonPos.x, startButtonPos.y);

      const howToPlayButtonPos = this.layoutManager.getButtonPosition(ButtonType.SECONDARY);
      this.domTextRenderer.updatePosition('how-to-play-button', howToPlayButtonPos.x, howToPlayButtonPos.y);

      const leaderboardButtonPos = this.layoutManager.getButtonPosition(ButtonType.TERTIARY);
      this.domTextRenderer.updatePosition('leaderboard-button', leaderboardButtonPos.x, leaderboardButtonPos.y);
    }

    // Update HowToPlayModal layout for responsive behavior
    if (this.howToPlayModal) {
      try {
        this.howToPlayModal.updateLayout();
        console.log('SplashScreen: HowToPlayModal layout updated for new dimensions');
      } catch (error) {
        console.error('SplashScreen: Error updating HowToPlayModal layout:', error);
      }
    }

    // No font loading indicator to update
  }

  /**
   * Clean up all component resources
   */
  private cleanupComponentResources(): void {
    console.log('SplashScreen: Cleaning up component resources');

    // Clean up resize event listeners
    this.cleanupResizeEventHandling();

    // Clean up HowToPlayModal
    if (this.howToPlayModal) {
      try {
        this.howToPlayModal.destroy();
        console.log('SplashScreen: HowToPlayModal destroyed successfully');
      } catch (error) {
        console.error('SplashScreen: Error destroying HowToPlayModal:', error);
      }
      this.howToPlayModal = null;
    }

    // Clean up layout manager
    if (this.layoutManager) {
      this.layoutManager.destroy();
    }
    
    // Clean up neon background system
    if (this.neonBackground) {
      this.neonBackground.destroy();
      this.neonBackground = null;
    }

    // No font loading indicator to clean up

    // Clean up DOM text renderer
    if (this.domTextRenderer) {
      this.domTextRenderer.destroy();
      this.domTextRenderer = null;
    }

    // Clean up visual elements
    this.cleanupVisualElements();

    // Clean up any running tweens
    this.cleanupTweens();

    // Reset component state
    this.componentsInitialized = false;
  }

  /**
   * Clean up visual elements to prevent memory leaks
   */
  private cleanupVisualElements(): void {
    console.log('SplashScreen: Cleaning up visual elements');

    // Clean up background
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }

    // Clean up logo
    if (this.logo) {
      this.logo.destroy();
      this.logo = null;
    }
  }

  /**
   * Clean up any running tweens to prevent memory leaks
   */
  private cleanupTweens(): void {
    console.log('SplashScreen: Cleaning up tweens');

    try {
      // Kill all tweens in this scene
      this.tweens.killAll();

      // Also clean up any timeline tweens
      this.tweens.getAllTweens().forEach(tween => {
        if (tween.isPlaying()) {
          tween.stop();
        }
      });

    } catch (error) {
      console.warn('SplashScreen: Error cleaning up tweens:', error);
    }
  }

  /**
   * Clean up resize event listeners
   */
  private cleanupResizeEventHandling(): void {
    console.log('SplashScreen: Cleaning up resize event listeners');

    // Remove Phaser resize listener
    this.scale.off('resize', this.handlePhaserResize, this);

    // Remove orientation change listener
    if (typeof window !== 'undefined') {
      window.removeEventListener('orientationchange', this.handleOrientationChange);
    }
  }

  /**
   * Initialize font loading process with proper error handling and loading indicators
   */
  private async initializeFontLoading(): Promise<void> {
    try {
      console.log('SplashScreen: Starting font preloading with loading indicators...');

      // Inject font CSS for fallback loading method
      this.fontPreloader.injectFontCSS();

      // Start font preloading with WOFF2 fonts
      const fontsLoaded = await this.fontPreloader.preloadFonts();

      // Ensure document fonts are ready before proceeding
      await document.fonts.ready;
      console.log('SplashScreen: Document fonts ready');

      if (fontsLoaded) {
        console.log('SplashScreen: WOFF2 fonts loaded successfully');
      } else {
        console.log('SplashScreen: Using fallback fonts');
      }

      // Brief delay to ensure fonts are fully available
      await new Promise(resolve => setTimeout(resolve, 50));

      // Create UI elements now that fonts are ready
      this.createUIElements();

    } catch (error) {
      console.error('SplashScreen: Font loading failed:', error);
      this.fontErrorHandler.handleUnknownError('Orbitron', error);

      // No loading indicator to clean up

      // Ensure document fonts are ready even in error case
      try {
        await document.fonts.ready;
      } catch (fontReadyError) {
        console.warn('SplashScreen: document.fonts.ready failed:', fontReadyError);
      }

      // Still create UI with fallback fonts
      this.createUIElements();
    }
  }

  /**
   * Create all UI elements after fonts are ready using DOM text system
   */
  private createUIElements(): void {
    console.log('SplashScreen: Creating UI elements with DOM text system');

    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not initialized');
      return;
    }

    // Create title and subtitle using DOM text
    this.createTitleAndSubtitle();

    // Create interactive buttons using DOM text
    this.createInteractiveButtons();

    // Try to create logo with multiple retry attempts in case texture is still loading
    this.time.delayedCall(50, () => {
      if (!this.logo && this.textures.exists('logo')) {
        console.log('SplashScreen: First retry - creating logo');
        this.createLogo();
      }
    });
    
    // Additional retry attempts
    this.time.delayedCall(200, () => {
      if (!this.logo && this.textures.exists('logo')) {
        console.log('SplashScreen: Second retry - creating logo');
        this.createLogo();
      }
    });
    
    this.time.delayedCall(500, () => {
      if (!this.logo && this.textures.exists('logo')) {
        console.log('SplashScreen: Third retry - creating logo');
        this.createLogo();
      }
    });
    
    // Final retry attempt
    this.time.delayedCall(1000, () => {
      if (!this.logo && this.textures.exists('logo')) {
        console.log('SplashScreen: Final retry - creating logo');
        this.createLogo();
      } else if (!this.logo) {
        console.error('SplashScreen: Logo texture still not available after all retries');
      }
    });

    console.log('SplashScreen: UI elements created successfully');
  }


  create() {
    console.log('SplashScreen: Starting scene creation');

    // Create a simple loading state first
    this.createLoadingState();

    // Ensure scene is fully ready before proceeding
    this.time.delayedCall(50, () => {
      this.initializeScene();
    });
  }

  /**
   * Create a simple loading state while waiting for full initialization
   */
  private createLoadingState(): void {
    try {
      const { width, height } = this.scale;

      // Set camera background color to Deep Space Black
      this.cameras.main.setBackgroundColor(0x080808);

      // Create simple loading indicator using graphics only
      const loadingCircle = this.add.circle(width / 2, height / 2, 30, 0x00BFFF, 0.3);
      const loadingDot = this.add.circle(width / 2, height / 2 - 25, 8, 0x00BFFF);

      // Animate loading indicator
      this.tweens.add({
        targets: loadingDot,
        angle: 360,
        duration: 1000,
        repeat: -1,
        ease: 'Linear'
      });

      // Store references for cleanup
      (this as any).loadingCircle = loadingCircle;
      (this as any).loadingDot = loadingDot;

    } catch (error) {
      console.error('SplashScreen: Error creating loading state:', error);
    }
  }

  /**
   * Initialize the scene after ensuring Phaser is fully ready
   */
  private initializeScene(): void {
    try {
      console.log('SplashScreen: Initializing scene components');

      // Clean up loading state
      this.cleanupLoadingState();

      // Set camera background color to Deep Space Black
      this.cameras.main.setBackgroundColor(0x080808);

      // Fade in from black for smooth transition (with safety check for tests)
      if (this.cameras?.main?.fadeIn) {
        this.cameras.main.fadeIn(250, 0, 0, 0);
      }

      // Set up component lifecycle management
      this.setupComponentLifecycle();

      // Initialize layout with current screen dimensions
      const { width, height } = this.scale;
      this.layoutManager.updateLayout(width, height);

      // Set up proper resize event handling with throttling
      this.setupResizeEventHandling();

      // Create neon background system
      if (this.neonBackground) {
        this.neonBackground.createBackground();
      }
      
      // Note: No need to recreate background - neon background system handles it

      // Try to create logo immediately if texture is already available
      if (this.textures.exists('logo')) {
        this.createLogo();
      }
      
      // Start font preloading process with loading indicators
      this.initializeFontLoading();

      // Create interactive buttons (main app logic)
      this.createInteractiveButtons();

      // Test modal responsiveness in development (optional)
      if (process.env.NODE_ENV === 'development') {
        this.time.delayedCall(1000, () => {
          this.testModalResponsiveness();
        });
      }

    } catch (error) {
      console.error('SplashScreen: Error during scene initialization:', error);

      // Fallback: try again after a longer delay
      this.time.delayedCall(200, () => {
        this.createFallbackUI();
      });
    }
  }

  /**
   * Clean up the loading state elements
   */
  private cleanupLoadingState(): void {
    try {
      if ((this as any).loadingCircle) {
        (this as any).loadingCircle.destroy();
        (this as any).loadingCircle = null;
      }

      if ((this as any).loadingDot) {
        (this as any).loadingDot.destroy();
        (this as any).loadingDot = null;
      }

    } catch (error) {
      console.warn('SplashScreen: Error cleaning up loading state:', error);
    }
  }

  /**
   * Create a minimal fallback UI if normal initialization fails
   */
  private createFallbackUI(): void {
    try {
      console.log('SplashScreen: Creating fallback UI');

      // Set camera background color to Deep Space Black
      this.cameras.main.setBackgroundColor(0x080808);

      // Get screen dimensions
      const { width, height } = this.scale;

      // Initialize DOM text renderer if not already done
      if (!this.domTextRenderer) {
        this.domTextRenderer = new DOMTextRenderer('game-container');
      }

      // Create neon title
      const titleConfig: NeonTextConfig = {
        effectType: NeonTextEffectType.GLOW_BLUE,
        size: NeonTextSize.HERO,
        intensity: 0.8,
        animation: true,
        performance: 'high'
      };

      this.domTextRenderer.createNeonText(
        'fallback-title',
        'COLOR DOT RUSH',
        width / 2,
        height * 0.3,
        titleConfig
      );

      // Create neon subtitle
      const subtitleConfig: NeonTextConfig = {
        effectType: NeonTextEffectType.GLOW_WHITE,
        size: NeonTextSize.HUGE,
        intensity: 0.6,
        animation: true,
        performance: 'high'
      };

      this.domTextRenderer.createNeonText(
        'fallback-subtitle',
        'Tap into Chaos',
        width / 2,
        height * 0.45,
        subtitleConfig
      );

      // Create neon start button
      const fallbackButtonConfig: NeonButtonConfig = {
        variant: NeonButtonVariant.PRIMARY,
        size: NeonButtonSize.XLARGE,
        width: 200,
        height: 60
      };

      this.domTextRenderer.createNeonButton(
        'fallback-start-button',
        'START GAME',
        width / 2,
        height * 0.65,
        fallbackButtonConfig,
        () => this.handleStartGameClick()
      );

      console.log('SplashScreen: Fallback UI created successfully');

    } catch (error) {
      console.error('SplashScreen: Even fallback UI creation failed:', error);
    }
  }

  /**
   * Set up proper resize event handling with throttling to prevent performance issues
   */
  private setupResizeEventHandling(): void {
    console.log('SplashScreen: Setting up resize event handling');

    // Connect to Phaser's resize events with throttling
    this.scale.on('resize', this.handlePhaserResize, this);

    // Also listen for orientation changes with additional delay
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    }

    console.log('SplashScreen: Resize event handling configured');
  }

  /**
   * Handle Phaser resize events with throttling
   */
  private handlePhaserResize = (gameSize: Phaser.Structs.Size): void => {
    console.log(`SplashScreen: Phaser resize event - ${gameSize.width}x${gameSize.height}`);

    // Update layout manager with new dimensions
    this.layoutManager.updateLayout(gameSize.width, gameSize.height);
  };

  /**
   * Handle orientation changes with additional delay to allow completion
   */
  private handleOrientationChange = (): void => {
    console.log('SplashScreen: Orientation change detected');

    // Add delay to allow orientation change to complete
    setTimeout(() => {
      const { width, height } = this.scale;
      console.log(`SplashScreen: Orientation change complete - ${width}x${height}`);
      this.layoutManager.updateLayout(width, height);
    }, 100);
  };

  /**
   * Create logo and subtitle using DOM text with responsive layout positioning
   * The logo now serves as the main title, so we only create a subtitle
   */
  private createTitleAndSubtitle(): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not initialized');
      return;
    }

    // Log font status for debugging
    const status = this.fontPreloader.getLoadingStatus();
    console.log('SplashScreen: Creating logo and subtitle with font status:', status);

    // Create and position logo as the main title element
    this.createLogo();

    // Get responsive positions from layout manager
    const { width, height } = this.layoutManager.getCurrentDimensions();
    
    // Position subtitle below the logo (logo is at 25%, so subtitle goes at 40%)
    const subtitlePos = {
      x: width / 2,
      y: height * 0.40 // Position below the logo
    };

    // Create subtitle with neon text effects (White Glow as per specification)
    const subtitleConfig: NeonTextConfig = {
      effectType: NeonTextEffectType.GLOW_WHITE,
      size: NeonTextSize.HUGE,
      intensity: 0.6,
      animation: true,
      performance: 'high'
    };

    // Position subtitle centered below the logo with neon effects
    this.domTextRenderer.createNeonText(
      'subtitle',
      'Tap into Chaos',
      subtitlePos.x,
      subtitlePos.y,
      subtitleConfig
    );
  }

  /**
   * Create and position the logo image responsively
   */
  private createLogo(): void {
    const { width, height } = this.layoutManager.getCurrentDimensions();

    // Create logo if it doesn't exist
    if (!this.logo) {
      // Check if the logo texture is available before creating the image
      if (!this.textures.exists('logo')) {
        console.warn('SplashScreen: Logo texture not available yet, skipping logo creation');
        return;
      }
      
      try {
        this.logo = this.add.image(0, 0, 'logo');
        if (!this.logo) {
          console.warn('SplashScreen: Failed to create logo image - asset may not be loaded');
          return;
        }
        console.log('SplashScreen: Logo image created successfully');
      } catch (error) {
        console.error('SplashScreen: Error creating logo image:', error);
        return;
      }
    }

    // Position logo as the main title element (more centered)
    const logoY = height * 0.25; // Position at 25% from top (main title position)
    this.logo.setPosition(width / 2, logoY);

    // Scale logo responsively - make it larger since it's now the main title
    const maxLogoWidth = Math.min(width * 0.6, 300); // Max 60% of screen width or 300px
    const maxLogoHeight = Math.min(height * 0.25, 200); // Max 25% of screen height or 200px
    
    if (this.logo.width > 0 && this.logo.height > 0) {
      const scaleX = maxLogoWidth / this.logo.width;
      const scaleY = maxLogoHeight / this.logo.height;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size
      
      this.logo.setScale(scale);
      console.log(`SplashScreen: Logo scaled to ${scale} (${this.logo.width}x${this.logo.height})`);
    } else {
      console.warn('SplashScreen: Logo dimensions not available yet, using default scale');
      this.logo.setScale(0.5); // Default scale
    }

    // Make sure logo is visible
    this.logo.setVisible(true);
    this.logo.setDepth(10); // Ensure it's above the background

    console.log('SplashScreen: Logo created and positioned at', this.logo.x, this.logo.y);
  }

  /**
   * Create complete main menu layout according to specification mockup
   */
  private createInteractiveButtons(): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not initialized');
      return;
    }

    // Create main action buttons according to specification
    this.createMainMenuButtons();

    console.log('SplashScreen: Complete main menu layout created successfully');
  }


  /**
   * Create main menu buttons according to specification
   */
  private createMainMenuButtons(): void {
    const { width } = this.layoutManager.getCurrentDimensions();
    const buttonWidth = Math.min(width * 0.8, 400); // 80% of screen width, max 400px

    // Create "Start Game" button (Electric Blue Border Glow)
    const startButtonPos = this.layoutManager.getButtonPosition(ButtonType.PRIMARY);
    const startButtonConfig: NeonButtonConfig = {
      variant: NeonButtonVariant.PRIMARY, // Electric Blue
      size: NeonButtonSize.LARGE,
      width: buttonWidth,
      height: 60
    };

    if (this.domTextRenderer) {
      this.domTextRenderer.createNeonButton(
        'start-button',
        'START GAME',
        startButtonPos.x,
        startButtonPos.y,
        startButtonConfig,
        () => this.handleStartGameClick()
      );
    }

    // Create "How to Play" button (Cyber Pink Border Glow)
    const howToPlayButtonPos = this.layoutManager.getButtonPosition(ButtonType.SECONDARY);
    const howToPlayButtonConfig: NeonButtonConfig = {
      variant: NeonButtonVariant.SECONDARY, // Cyber Pink
      size: NeonButtonSize.MEDIUM,
      width: buttonWidth,
      height: 50
    };

    if (this.domTextRenderer) {
      this.domTextRenderer.createNeonButton(
        'how-to-play-button',
        'HOW TO PLAY',
        howToPlayButtonPos.x,
        howToPlayButtonPos.y,
        howToPlayButtonConfig,
        () => this.handleHowToPlayClick()
      );
    }

    // Create "View Leaderboard" button (White Border Glow)
    const leaderboardButtonPos = this.layoutManager.getButtonPosition(ButtonType.TERTIARY);
    const leaderboardButtonConfig: NeonButtonConfig = {
      variant: NeonButtonVariant.TERTIARY, // Volt Green (closest to white glow)
      size: NeonButtonSize.MEDIUM,
      width: buttonWidth,
      height: 50
    };

    if (this.domTextRenderer) {
      this.domTextRenderer.createNeonButton(
        'leaderboard-button',
        'VIEW LEADERBOARD',
        leaderboardButtonPos.x,
        leaderboardButtonPos.y,
        leaderboardButtonConfig,
        () => this.handleLeaderboardClick()
      );
    }

    // Create "Accessibility Settings" button (Purple Border Glow)
    const accessibilityButtonPos = this.layoutManager.getButtonPosition(ButtonType.QUATERNARY);
    const accessibilityButtonConfig: NeonButtonConfig = {
      variant: NeonButtonVariant.QUATERNARY, // Purple glow
      size: NeonButtonSize.MEDIUM,
      width: buttonWidth,
      height: 50
    };

    if (this.domTextRenderer) {
      this.domTextRenderer.createNeonButton(
        'accessibility-button',
        'ACCESSIBILITY SETTINGS',
        accessibilityButtonPos.x,
        accessibilityButtonPos.y,
        accessibilityButtonConfig,
        this.handleAccessibilityClick
      );
    }
  }


  /**
   * Handle Start Game button click with proper loading state management
   */
  private handleStartGameClick(): void {
    console.log('SplashScreen: Start Game button clicked');

    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not available');
      return;
    }

    try {
      // Disable buttons during transition
      this.domTextRenderer.setVisible('start-button', false);
      this.domTextRenderer.setVisible('how-to-play-button', false);
      this.domTextRenderer.setVisible('leaderboard-button', false);
      this.domTextRenderer.setVisible('accessibility-button', false);

      // Show loading state
      this.showLoadingState();

      // Add a delay to show loading state, then transition
      this.time.delayedCall(800, () => {
        this.performGameTransition();
      });
    } catch (error) {
      console.error('SplashScreen: Error handling start game click:', error);
      this.handleTransitionError(error);
    }
  }

  /**
   * Handle Leaderboard button click
   */
  private handleLeaderboardClick(): void {
    console.log('SplashScreen: Leaderboard button clicked');

    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not available');
      return;
    }

    try {
      // Disable buttons during transition
      this.domTextRenderer.setVisible('start-button', false);
      this.domTextRenderer.setVisible('how-to-play-button', false);
      this.domTextRenderer.setVisible('leaderboard-button', false);

      // Transition to leaderboard scene
      this.time.delayedCall(300, () => {
        try {
          // Clean up DOM elements before transitioning
          if (this.domTextRenderer) {
            this.domTextRenderer.destroy();
            this.domTextRenderer = null;
          }
          
          if (this.cameras?.main?.fadeOut) {
            this.cameras.main.fadeOut(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('Leaderboard');
            });
          } else {
            // Fallback for test environment
            this.scene.start('Leaderboard');
          }
        } catch (error) {
          console.error('SplashScreen: Error transitioning to leaderboard:', error);
        }
      });
    } catch (error) {
      console.error('SplashScreen: Error handling leaderboard click:', error);
    }
  }

  /**
   * Handle How to Play button click
   */
  private handleHowToPlayClick(): void {
    console.log('SplashScreen: How to Play button clicked');
    
    try {
      if (this.howToPlayModal) {
        this.howToPlayModal.show();
        console.log('SplashScreen: HowToPlayModal shown successfully');
      } else {
        console.warn('SplashScreen: HowToPlayModal not available, showing fallback');
        this.showFallbackInstructions();
      }
    } catch (error) {
      console.error('SplashScreen: Error showing HowToPlayModal:', error);
      this.showFallbackInstructions();
    }
  }

  /**
   * Handle Accessibility Settings button click
   */
  private handleAccessibilityClick = (): void => {
    console.log('SplashScreen: Accessibility Settings button clicked');
    
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not available');
      return;
    }

    try {
      // Hide main menu buttons
      this.domTextRenderer.setVisible('start-button', false);
      this.domTextRenderer.setVisible('how-to-play-button', false);
      this.domTextRenderer.setVisible('leaderboard-button', false);
      this.domTextRenderer.setVisible('accessibility-button', false);

      // Show accessibility settings panel
      this.showAccessibilitySettings();
    } catch (error) {
      console.error('SplashScreen: Error handling accessibility click:', error);
    }
  }

  /**
   * Show accessibility settings panel
   */
  private showAccessibilitySettings(): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOMTextRenderer not available for accessibility settings');
      return;
    }

    console.log('SplashScreen: Creating accessibility settings panel');
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    console.log('SplashScreen: Screen dimensions:', width, 'x', height);

    // Create background overlay
    this.domTextRenderer.createButton(
      'accessibility-overlay',
      '',
      centerX,
      centerY,
      width,
      height,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#FFFFFF',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'block',
        pointerEvents: 'auto',
        cursor: 'default'
      }
    );

    // Create settings panel background
    this.domTextRenderer.createButton(
      'accessibility-panel',
      '',
      centerX,
      centerY,
      Math.min(width * 0.8, 400),
      400,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#FFFFFF',
        textAlign: 'center',
        background: 'rgba(30, 30, 30, 0.95)',
        borderRadius: '12px',
        border: '2px solid #9B59B6',
        boxShadow: '0 0 30px rgba(155, 89, 182, 0.3)',
        display: 'block',
        pointerEvents: 'auto',
        cursor: 'default'
      }
    );

    // Create title
    this.domTextRenderer.createText(
      'accessibility-title',
      'ACCESSIBILITY SETTINGS',
      centerX,
      centerY - 150,
      {
        fontFamily: 'Orbitron, Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#9B59B6',
        textAlign: 'center',
        display: 'block'
      }
    );

    // Create High Contrast toggle
    console.log('SplashScreen: Creating High Contrast toggle');
    this.createAccessibilityToggle('high-contrast', 'High Contrast Mode', centerX, centerY - 80, 'highContrastMode');
    
    // Create Shape Overlays toggle
    console.log('SplashScreen: Creating Shape Overlays toggle');
    this.createAccessibilityToggle('shape-overlays', 'Shape Overlays (Color-blind support)', centerX, centerY - 20, 'shapeOverlays');
    
    // Create Reduced Motion toggle
    console.log('SplashScreen: Creating Reduced Motion toggle');
    this.createAccessibilityToggle('reduced-motion', 'Reduced Motion', centerX, centerY + 40, 'reducedMotion');
    
    // Create Large Tap Areas toggle
    console.log('SplashScreen: Creating Large Tap Areas toggle');
    this.createAccessibilityToggle('large-tap-areas', 'Large Tap Areas', centerX, centerY + 100, 'largeTapAreas');

    // Create Back button
    this.domTextRenderer.createButton(
      'accessibility-back',
      'BACK TO MENU',
      centerX,
      centerY + 150,
      Math.min(width * 0.6, 300),
      50,
      {
        fontFamily: 'Orbitron, Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        background: 'rgba(155, 89, 182, 0.8)',
        borderRadius: '8px',
        border: '2px solid #9B59B6',
        boxShadow: '0 0 20px rgba(155, 89, 182, 0.3)',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      },
      () => this.hideAccessibilitySettings()
    );
    
    console.log('SplashScreen: Accessibility settings panel created successfully');
  }

  /**
   * Create accessibility toggle button
   */
  private createAccessibilityToggle(id: string, label: string, x: number, y: number, settingKey: string): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOMTextRenderer not available for toggle creation');
      return;
    }
    
    console.log(`SplashScreen: Creating toggle for ${id} at position (${x}, ${y})`);

    // Load current setting from localStorage
    const savedSettings = localStorage.getItem('color-rush-accessibility');
    let currentSettings = {};
    if (savedSettings) {
      try {
        currentSettings = JSON.parse(savedSettings);
      } catch (e) {
        console.warn('Failed to parse accessibility settings');
      }
    }
    
    const isEnabled = (currentSettings as any)[settingKey] || false;
    const buttonText = `${isEnabled ? '✓' : '○'} ${label}`;

    this.domTextRenderer.createButton(
      `accessibility-toggle-${id}`,
      buttonText,
      x,
      y,
      Math.min(this.scale.width * 0.6, 350),
      40,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontWeight: 'normal',
        color: '#FFFFFF',
        textAlign: 'left',
        background: 'rgba(51, 51, 51, 0.8)',
        borderRadius: '6px',
        border: '1px solid #9B59B6',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '8px 16px',
        transition: 'all 0.2s ease'
      },
      () => this.toggleAccessibilitySetting(settingKey, id, label)
    );
    
    console.log(`SplashScreen: Toggle ${id} created successfully`);
  }

  /**
   * Toggle accessibility setting
   */
  private toggleAccessibilitySetting(settingKey: string, toggleId: string, label: string): void {
    if (!this.domTextRenderer) return;

    // Load current settings
    const savedSettings = localStorage.getItem('color-rush-accessibility');
    let currentSettings = {};
    if (savedSettings) {
      try {
        currentSettings = JSON.parse(savedSettings);
      } catch (e) {
        console.warn('Failed to parse accessibility settings');
      }
    }

    // Toggle the setting
    (currentSettings as any)[settingKey] = !(currentSettings as any)[settingKey];

    // Save settings
    localStorage.setItem('color-rush-accessibility', JSON.stringify(currentSettings));

    // Update button text
    const isEnabled = (currentSettings as any)[settingKey];
    const buttonText = `${isEnabled ? '✓' : '○'} ${label}`;
    this.domTextRenderer.updateText(`accessibility-toggle-${toggleId}`, buttonText);

    console.log(`Accessibility setting ${settingKey} toggled to:`, isEnabled);
  }

  /**
   * Hide accessibility settings and return to main menu
   */
  private hideAccessibilitySettings(): void {
    if (!this.domTextRenderer) return;

    // Remove accessibility settings elements
    this.domTextRenderer.removeText('accessibility-overlay');
    this.domTextRenderer.removeText('accessibility-panel');
    this.domTextRenderer.removeText('accessibility-title');
    this.domTextRenderer.removeText('accessibility-toggle-high-contrast');
    this.domTextRenderer.removeText('accessibility-toggle-shape-overlays');
    this.domTextRenderer.removeText('accessibility-toggle-reduced-motion');
    this.domTextRenderer.removeText('accessibility-toggle-large-tap-areas');
    this.domTextRenderer.removeText('accessibility-back');

    // Show main menu buttons again
    this.domTextRenderer.setVisible('start-button', true);
    this.domTextRenderer.setVisible('how-to-play-button', true);
    this.domTextRenderer.setVisible('leaderboard-button', true);
    this.domTextRenderer.setVisible('accessibility-button', true);
  }

  /**
   * Show fallback instructions if modal fails
   */
  private showFallbackInstructions(): void {
    const instructions = `
COLOR DOT RUSH - How to Play:

🎯 Tap dots that match the Target Color
❌ Avoid wrong colors and bombs  
⚡ Use Slow-Mo charges strategically
🏆 Survive as long as possible!

Good luck!
    `.trim();

    alert(instructions);
    console.log('SplashScreen: Showed fallback instructions');
  }

  /**
   * Validate modal functionality during initialization
   */
  private validateModalFunctionality(): void {
    if (!this.howToPlayModal) {
      throw new Error('Modal not initialized');
    }

    // Test basic modal methods
    try {
      const isVisible = this.howToPlayModal.isVisible();
      const config = this.howToPlayModal.getConfig();
      const layout = this.howToPlayModal.getLayout();
      
      if (typeof isVisible !== 'boolean') {
        throw new Error('Modal isVisible() method not working properly');
      }
      
      if (!config || typeof config !== 'object') {
        throw new Error('Modal getConfig() method not working properly');
      }
      
      if (!layout || typeof layout !== 'object') {
        throw new Error('Modal getLayout() method not working properly');
      }
      
      console.log('SplashScreen: Modal functionality validation passed');
    } catch (validationError) {
      console.error('SplashScreen: Modal functionality validation failed:', validationError);
      throw validationError;
    }
  }

  /**
   * Handle modal initialization errors with detailed logging
   */
  private handleModalInitializationError(error: Error): void {
    console.error('SplashScreen: Modal initialization failed with error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check for specific error types and provide appropriate fallbacks
    if (error.message.includes('DOM') || error.message.includes('document')) {
      console.warn('SplashScreen: DOM-related error detected, modal will use fallback instructions');
    } else if (error.message.includes('layout') || error.message.includes('responsive')) {
      console.warn('SplashScreen: Layout-related error detected, modal may have display issues');
    } else {
      console.warn('SplashScreen: Unknown modal error, falling back to alert-based instructions');
    }

    // Log environment information for debugging
    this.logEnvironmentInfo();
  }

  /**
   * Log environment information for debugging modal issues
   */
  private logEnvironmentInfo(): void {
    try {
      const envInfo = {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
        documentReady: typeof document !== 'undefined' ? document.readyState : 'Unknown',
        gameContainer: typeof document !== 'undefined' ? !!document.getElementById('game-container') : false,
        layoutManagerAvailable: !!this.layoutManager,
        domTextRendererAvailable: !!this.domTextRenderer
      };
      
      console.log('SplashScreen: Environment info for modal debugging:', envInfo);
    } catch (logError) {
      console.warn('SplashScreen: Could not log environment info:', logError);
    }
  }

  /**
   * Test modal behavior across different screen sizes (for debugging)
   */
  private testModalResponsiveness(): void {
    if (!this.howToPlayModal) {
      console.warn('SplashScreen: Cannot test modal responsiveness - modal not available');
      return;
    }

    try {
      // Test common screen sizes
      const testSizes = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 } // Desktop
      ];

      testSizes.forEach(size => {
        try {
          // Temporarily update layout manager for testing
          this.layoutManager.updateLayout(size.width, size.height);
          this.howToPlayModal!.updateLayout();
          
          const layout = this.howToPlayModal!.getLayout();
          console.log(`SplashScreen: Modal layout test for ${size.width}x${size.height}:`, {
            contentMaxWidth: layout.contentMaxWidth,
            fontSize: layout.fontSize,
            spacing: layout.spacing
          });
        } catch (testError) {
          console.error(`SplashScreen: Modal responsiveness test failed for ${size.width}x${size.height}:`, testError);
        }
      });

      // Restore original layout
      const currentDimensions = this.scale;
      this.layoutManager.updateLayout(currentDimensions.width, currentDimensions.height);
      this.howToPlayModal.updateLayout();
      
      console.log('SplashScreen: Modal responsiveness testing completed');
    } catch (error) {
      console.error('SplashScreen: Error during modal responsiveness testing:', error);
    }
  }

  /**
   * Perform smooth transition to game scenes
   */
  private performGameTransition(): void {
    try {
      console.log('SplashScreen: Starting game transition...');

      // Hide DOM text elements
      if (this.domTextRenderer) {
        this.domTextRenderer.setVisible('title', false);
        this.domTextRenderer.setVisible('subtitle', false);
      }

      // Hide logo during transition
      if (this.logo) {
        this.logo.setVisible(false);
        console.log('SplashScreen: Logo hidden during transition');
      }

      // Fade out background
      if (this.background) {
        this.tweens.add({
          targets: this.background,
          alpha: 0,
          duration: 300,
          ease: 'Power2.easeIn',
          onComplete: () => {
            this.transitionToGameScenes();
          }
        });
      } else {
        this.transitionToGameScenes();
      }
    } catch (error) {
      console.error('SplashScreen: Error during game transition:', error);
      this.handleTransitionError(error);
    }
  }

  /**
   * Transition to game scenes with proper error handling
   */
  private transitionToGameScenes(): void {
    try {
      console.log('SplashScreen: Fade out complete, starting scenes...');

      if (this.cameras?.main?.fadeOut) {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          console.log('SplashScreen: Camera fade complete, launching scenes...');
          this.launchGameScenes();
        });
      } else {
        console.log('SplashScreen: Direct scene transition (no camera fade)...');
        this.launchGameScenes();
      }
    } catch (error) {
      console.error('SplashScreen: Error transitioning to game scenes:', error);
      this.handleTransitionError(error);
    }
  }

  /**
   * Launch game scenes
   */
  private launchGameScenes(): void {
    try {
      // Clear any existing DOM elements from previous game session
      this.clearExistingDOMElements();
      
      console.log('SplashScreen: Preparing to start game...');
      
      // Stop SimpleUI if it's running - the Game scene will restart it properly
      if (this.scene.isActive('SimpleUI') || this.scene.isSleeping('SimpleUI')) {
        console.log('SplashScreen: Stopping existing SimpleUI scene for restart...');
        this.scene.stop('SimpleUI');
      }
      
      // Start Game scene - it will handle launching SimpleUI
      this.scene.start('Game');
      console.log('SplashScreen: Game scene started, will initialize UI scene');
    } catch (sceneError) {
      console.error('SplashScreen: Error launching scenes:', sceneError);
      this.handleTransitionError(sceneError);
    }
  }

  /**
   * Clear any existing DOM elements from previous game session
   */
  private clearExistingDOMElements(): void {
    try {
      console.log('SplashScreen: Clearing existing DOM elements...');
      
      // Clear any existing UI elements that might be left over
      const existingElements = [
        'game-ui-container',
        'score-display',
        'target-color-display',
        'timer-display',
        'slow-mo-charge-display',
        'game-over-modal'
      ];
      
      existingElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
          console.log(`SplashScreen: Removed existing element: ${elementId}`);
        }
      });
      
      // Clear any existing CSS styles
      const existingStyles = [
        'game-over-neon-styles',
        'game-ui-styles'
      ];
      
      existingStyles.forEach(styleId => {
        const styleElement = document.getElementById(styleId);
        if (styleElement) {
          styleElement.remove();
          console.log(`SplashScreen: Removed existing style: ${styleId}`);
        }
      });
      
      console.log('SplashScreen: DOM cleanup completed');
    } catch (error) {
      console.warn('SplashScreen: Error during DOM cleanup:', error);
    }
  }

  /**
   * Handle transition errors by restoring button state
   */
  private handleTransitionError(error: any): void {
    console.error('SplashScreen: Transition failed:', error);

    // Restore button visibility
    if (this.domTextRenderer) {
      this.domTextRenderer.setVisible('start-button', true);
      this.domTextRenderer.setVisible('how-to-play-button', true);
      this.domTextRenderer.setVisible('leaderboard-button', true);
      this.domTextRenderer.setVisible('accessibility-button', true);
    }

    // Show error indicator
    this.showTransitionError();
  }

  /**
   * Show transition error indicator
   */
  private showTransitionError(): void {
    const { width, height } = this.scale;

    // Create error indicator (graphics-only approach)
    const errorIndicator = this.add.circle(width / 2, height * 0.8, 20, 0xE74C3C, 1);
    errorIndicator.setStrokeStyle(3, 0xFFFFFF, 1);

    // Add an X mark inside the circle
    const xMark1 = this.add.line(width / 2, height * 0.8, -10, -10, 10, 10, 0xFFFFFF, 1).setLineWidth(3);
    const xMark2 = this.add.line(width / 2, height * 0.8, -10, 10, 10, -10, 0xFFFFFF, 1).setLineWidth(3);

    // Pulse animation for error indicator
    this.tweens.add({
      targets: [errorIndicator, xMark1, xMark2],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'Power2.easeInOut'
    });

    // Fade out error indicator after 3 seconds
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [errorIndicator, xMark1, xMark2],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          errorIndicator.destroy();
          xMark1.destroy();
          xMark2.destroy();
        }
      });
    });
  }

  /**
   * Show loading state with reusable loader
   */
  private showLoadingState(): void {
    try {
      const { width, height } = this.scale;
      
      // Hide subtitle text during loading
      if (this.domTextRenderer) {
        this.domTextRenderer.setVisible('subtitle', false);
      }
      
      // Create loading overlay
      const loadingOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x080808, 0.9);
      loadingOverlay.setDepth(1000);
      
      // Create reusable loader
      this.loader = new ReusableLoader(this);
      this.loader.createLoader(width / 2, height / 2, width, height);
      
      // Create loading text using DOM
      if (this.domTextRenderer) {
        const loadingStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Arial, sans-serif',
          fontSize: this.layoutManager.getResponsiveFontSize(18),
          fontWeight: '500',
          color: '#FFFFFF',
          textAlign: 'center',
          textShadow: '0 0 15px rgba(255, 255, 255, 0.8)',
          letterSpacing: '0.5px'
        };
        
        this.domTextRenderer.createText(
          'loading-text',
          'Loading Game...',
          width / 2,
          height / 2 + 80,
          loadingStyle
        );
      }
      
      console.log('SplashScreen: Loading state displayed with reusable loader');
    } catch (error) {
      console.error('SplashScreen: Error showing loading state:', error);
    }
  }

  /**
   * Clean up resources when scene is destroyed
   */
  shutdown(): void {
    if (this.loader) {
      this.loader.destroy();
      this.loader = null;
    }
  }

  /**
   * Override init to ensure proper cleanup on scene restart
   */
  init(): void {
    // Clean up all component resources from previous run
    this.cleanupComponentResources();

    // Reset visual elements
    this.background = null;
    this.logo = null;

    // Re-initialize components for scene restart
    this.initializeComponents();
    
    // Re-initialize neon background system
    this.neonBackground = new NeonBackgroundSystem(this);
  }

}
