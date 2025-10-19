import { Scene, GameObjects } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
// import { FontLoadingIndicator } from '../utils/FontLoadingIndicator'; // Not needed with WOFF2
import { FontErrorHandler } from '../utils/FontErrorHandler';
import { DOMTextRenderer, DOMTextStyle, GradientTextConfig } from '../utils/DOMTextRenderer';
import { ResponsiveLayoutManager, IResponsiveLayoutManager, ButtonType } from '../utils/ResponsiveLayoutManager';
import { HowToPlayModal, IHowToPlayModal } from '../utils/HowToPlayModal';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;

  // Component systems
  private fontPreloader: FontPreloader;
  private fontErrorHandler: FontErrorHandler;
  private domTextRenderer: DOMTextRenderer | null = null;
  private layoutManager: IResponsiveLayoutManager;
  private howToPlayModal: IHowToPlayModal | null = null;

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
      this.layoutManager = new ResponsiveLayoutManager();

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

    // Update DOM text renderer size
    if (this.domTextRenderer) {
      this.domTextRenderer.updateSize(width, height);

      // Update text positions
      const titlePos = this.layoutManager.getTitlePosition();
      this.domTextRenderer.updatePosition('title', titlePos.x, titlePos.y);

      const subtitlePos = this.layoutManager.getSubtitlePosition();
      this.domTextRenderer.updatePosition('subtitle', subtitlePos.x, subtitlePos.y);

      // Update button positions
      const startButtonPos = this.layoutManager.getButtonPosition(ButtonType.PRIMARY);
      this.domTextRenderer.updatePosition('start-button', startButtonPos.x, startButtonPos.y);

      const howToPlayButtonPos = this.layoutManager.getButtonPosition(ButtonType.SECONDARY);
      this.domTextRenderer.updatePosition('how-to-play-button', howToPlayButtonPos.x, howToPlayButtonPos.y);
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
      this.fontErrorHandler.handleUnknownError('Poppins', error);

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

    console.log('SplashScreen: UI elements created successfully');
  }

  /**
   * Create background using current layout dimensions
   */
  private createBackground(): void {
    const { width, height } = this.layoutManager.getCurrentDimensions();

    // Background – solid color rectangle (Dark Slate #2C3E50)
    this.background = this.add.rectangle(0, 0, width, height, 0x2C3E50).setOrigin(0);
    this.background.setDisplaySize(width, height);
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

      // Create background immediately
      this.background = this.add.rectangle(0, 0, width, height, 0x2C3E50).setOrigin(0);

      // Create simple loading indicator using graphics only
      const loadingCircle = this.add.circle(width / 2, height / 2, 30, 0x3498DB, 0.3);
      const loadingDot = this.add.circle(width / 2, height / 2 - 25, 8, 0x3498DB);

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

      // Recreate background (loading state already created one)
      this.createBackground();

      // Start font preloading process with loading indicators
      this.initializeFontLoading();

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

      // Create simple background
      const { width, height } = this.scale;
      this.background = this.add.rectangle(0, 0, width, height, 0x2C3E50).setOrigin(0);

      // Initialize DOM text renderer if not already done
      if (!this.domTextRenderer) {
        this.domTextRenderer = new DOMTextRenderer('game-container');
      }

      // Create simple title
      const titleStyle: DOMTextStyle = {
        fontFamily: 'Poppins, Arial, sans-serif',
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
      };

      this.domTextRenderer.createText(
        'fallback-title',
        'COLOR RUSH',
        width / 2,
        height * 0.3,
        titleStyle
      );

      // Create simple subtitle
      const subtitleStyle: DOMTextStyle = {
        fontFamily: 'Poppins, Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'normal',
        color: '#ECF0F1',
        textAlign: 'center',
        textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
      };

      this.domTextRenderer.createText(
        'fallback-subtitle',
        'Test Your Reflexes',
        width / 2,
        height * 0.45,
        subtitleStyle
      );

      // Create simple start button
      const buttonStyle: DOMTextStyle = {
        fontFamily: 'Poppins, Arial, sans-serif',
        fontSize: '18px',
        fontWeight: '500',
        color: '#FFFFFF',
        textAlign: 'center',
        background: '#3498DB',
        padding: '15px 30px',
        borderRadius: '8px',
        textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
      };

      this.domTextRenderer.createButton(
        'fallback-start-button',
        'START GAME',
        width / 2,
        height * 0.65,
        200,
        60,
        buttonStyle,
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
   * Create title and subtitle using DOM text with responsive layout positioning
   */
  private createTitleAndSubtitle(): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not initialized');
      return;
    }

    // Log font status for debugging
    const status = this.fontPreloader.getLoadingStatus();
    console.log('SplashScreen: Creating title and subtitle with font status:', status);

    // Get responsive positions from layout manager
    const titlePos = this.layoutManager.getTitlePosition();
    const subtitlePos = this.layoutManager.getSubtitlePosition();
    const layoutConfig = this.layoutManager.getLayoutConfig();

    // Create the main title with color-shifting gradient using responsive sizing
    const titleStyle: DOMTextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: `${layoutConfig.title.fontSize}px`,
      fontWeight: layoutConfig.title.fontWeight,
      color: '#FFFFFF',
      textAlign: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    };

    const gradientConfig: GradientTextConfig = {
      colors: ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'],
      animationDuration: 4000
    };

    // Position title centered
    this.domTextRenderer.createText(
      'title',
      'COLOR RUSH',
      titlePos.x,
      titlePos.y,
      titleStyle,
      gradientConfig
    );

    // Create subtitle with responsive sizing and positioning
    const subtitleStyle: DOMTextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: `${layoutConfig.subtitle.fontSize}px`,
      fontWeight: layoutConfig.subtitle.fontWeight,
      color: '#ECF0F1',
      textAlign: 'center',
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    };

    // Position subtitle centered
    this.domTextRenderer.createText(
      'subtitle',
      'Test Your Reflexes',
      subtitlePos.x,
      subtitlePos.y,
      subtitleStyle
    );
  }

  /**
   * Create interactive buttons using DOM text system
   */
  private createInteractiveButtons(): void {
    if (!this.domTextRenderer) {
      console.error('SplashScreen: DOM text renderer not initialized');
      return;
    }

    const layoutConfig = this.layoutManager.getLayoutConfig();

    // Create "Start Game" button (Primary Button - Bright Blue #3498DB)
    const startButtonPos = this.layoutManager.getButtonPosition(ButtonType.PRIMARY);
    const startButtonStyle: DOMTextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: `${layoutConfig.primaryButton.fontSize}px`,
      fontWeight: '500',
      color: '#FFFFFF',
      textAlign: 'center',
      background: '#3498DB',
      padding: '12px 24px',
      borderRadius: '8px',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    };

    this.domTextRenderer.createButton(
      'start-button',
      'START GAME',
      startButtonPos.x,
      startButtonPos.y,
      layoutConfig.primaryButton.width,
      layoutConfig.primaryButton.height,
      startButtonStyle,
      () => this.handleStartGameClick()
    );

    // Create "How to Play" button (Secondary Button - Mid Grey #95A5A6)
    const howToPlayButtonPos = this.layoutManager.getButtonPosition(ButtonType.SECONDARY);
    const howToPlayButtonStyle: DOMTextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: `${layoutConfig.secondaryButton.fontSize}px`,
      fontWeight: '500',
      color: '#FFFFFF',
      textAlign: 'center',
      background: '#95A5A6',
      padding: '10px 20px',
      borderRadius: '6px',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
    };

    this.domTextRenderer.createButton(
      'how-to-play-button',
      'HOW TO PLAY',
      howToPlayButtonPos.x,
      howToPlayButtonPos.y,
      layoutConfig.secondaryButton.width,
      layoutConfig.secondaryButton.height,
      howToPlayButtonStyle,
      () => this.handleHowToPlayClick()
    );

    console.log('SplashScreen: Interactive buttons created successfully');
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

      // Add a delay to show loading state, then transition
      this.time.delayedCall(300, () => {
        this.performGameTransition();
      });
    } catch (error) {
      console.error('SplashScreen: Error handling start game click:', error);
      this.handleTransitionError(error);
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
   * Show fallback instructions if modal fails
   */
  private showFallbackInstructions(): void {
    const instructions = `
COLOR RUSH - How to Play:

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
      // Start Game scene first
      this.scene.start('Game');
      console.log('SplashScreen: Game scene started');
      
      // Launch UI scene with a small delay to ensure Game scene is ready
      this.time.delayedCall(50, () => {
        this.scene.launch('UI');
        console.log('SplashScreen: UI scene launched (delayed)');
      });
    } catch (sceneError) {
      console.error('SplashScreen: Error launching scenes:', sceneError);
      this.handleTransitionError(sceneError);
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
   * Override init to ensure proper cleanup on scene restart
   */
  init(): void {
    // Clean up all component resources from previous run
    this.cleanupComponentResources();

    // Reset visual elements
    this.background = null;

    // Re-initialize components for scene restart
    this.initializeComponents();
  }

}
