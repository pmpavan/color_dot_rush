import { Scene, GameObjects } from 'phaser';
import { FontPreloader } from '../utils/FontPreloader';
import { FontLoadingIndicator } from '../utils/FontLoadingIndicator';
import { FontErrorHandler } from '../utils/FontErrorHandler';
import { PhaserTextRenderer, TextStyle, GradientConfig } from '../utils/PhaserTextRenderer';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;
  startButton: GameObjects.Container | null = null;
  howToPlayButton: GameObjects.Container | null = null;
  loadingContainer: GameObjects.Container | null = null;
  loadingDots: GameObjects.Arc[] = [];
  
  // Text elements
  private titleText: GameObjects.Text | null = null;
  private subtitleText: GameObjects.Text | null = null;
  private startButtonText: GameObjects.Text | null = null;
  private howToPlayButtonText: GameObjects.Text | null = null;
  
  // Font preloading system
  private fontPreloader: FontPreloader;
  private fontLoadingIndicator: FontLoadingIndicator | null = null;
  private fontErrorHandler: FontErrorHandler;
  
  // Text rendering system
  private textRenderer: PhaserTextRenderer | null = null;

  constructor() {
    super('SplashScreen');
    // Ensure scene key is properly set for testing
    if (this.scene) {
      this.scene.key = 'SplashScreen';
    }
    
    // Initialize font preloading system
    this.fontPreloader = FontPreloader.getInstance();
    this.fontErrorHandler = FontErrorHandler.getInstance();
  }

  /**
   * Reset cached GameObject references every time the scene starts.
   * The same Scene instance is reused by Phaser, so we must ensure
   * stale (destroyed) objects are cleared out when the scene restarts.
   */
  init(): void {
    this.background = null;
    this.startButton = null;
    this.howToPlayButton = null;
    this.loadingContainer = null;
    this.loadingDots = [];

    // Reset text elements
    this.titleText = null;
    this.subtitleText = null;
    this.startButtonText = null;
    this.howToPlayButtonText = null;
    this.textRenderer = null;

    // Clean up font loading indicator
    if (this.fontLoadingIndicator) {
      this.fontLoadingIndicator.destroy();
      this.fontLoadingIndicator = null;
    }
  }



  /**
   * Initialize font loading process with proper error handling
   */
  private async initializeFontLoading(): Promise<void> {
    try {
      console.log('SplashScreen: Starting font preloading...');
      
      // Inject font CSS for fallback loading method
      this.fontPreloader.injectFontCSS();
      
      // Create and show loading indicator
      this.fontLoadingIndicator = new FontLoadingIndicator(this, this.fontPreloader);
      this.fontLoadingIndicator.create();
      
      // Start font preloading
      const fontsLoaded = await this.fontPreloader.preloadFonts();
      
      if (fontsLoaded) {
        console.log('SplashScreen: Fonts loaded successfully');
      } else {
        console.log('SplashScreen: Using fallback fonts');
      }
      
      // Create UI elements now that fonts are ready
      this.createUIElements();
      
    } catch (error) {
      console.error('SplashScreen: Font loading failed:', error);
      this.fontErrorHandler.handleUnknownError('Poppins', error);
      
      // Show error state and proceed with fallbacks
      if (this.fontLoadingIndicator) {
        this.fontLoadingIndicator.showError('Font loading failed');
      }
      
      // Still create UI with fallback fonts
      this.createUIElements();
    }
  }

  /**
   * Create all UI elements after fonts are ready
   */
  private createUIElements(): void {
    // Initialize text renderer with loaded font family
    const fontFamily = this.fontPreloader.getFontFamily();
    this.textRenderer = new PhaserTextRenderer(this, fontFamily);

    // Add title with color-shifting gradient
    this.createTitle();

    // Create interactive buttons with Phaser text
    this.createButtons();
  }

  create() {
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    // Start font preloading process
    this.initializeFontLoading();
  }

  private createTitle(): void {
    if (!this.textRenderer) return;

    const { width, height } = this.scale;
    
    // Log font status for debugging
    const status = this.fontPreloader.getLoadingStatus();
    console.log('SplashScreen: Creating title with font status:', status);

    // Create the main title with color-shifting gradient (H1: 72pt Bold)
    const titleStyle: TextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: '72px',
      fontWeight: 'bold',
      color: '#FFFFFF', // Base color, will be overridden by gradient
      align: 'center'
    };

    const gradientConfig: GradientConfig = {
      colors: ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'],
      angle: 45,
      animationDuration: 4000
    };

    this.titleText = this.textRenderer.createGradientText(
      width / 2,
      height * 0.18,
      'COLOR RUSH',
      titleStyle,
      gradientConfig
    );

    // Create subtitle with proper spacing
    const subtitleStyle: TextStyle = {
      fontFamily: this.fontPreloader.getFontFamily(),
      fontSize: '24px',
      fontWeight: '400',
      color: '#ECF0F1', // Light Grey as per spec
      align: 'center'
    };

    this.subtitleText = this.textRenderer.createTitle(
      width / 2,
      height * 0.38,
      'Test Your Reflexes',
      subtitleStyle
    );
  }

  private createButtons(): void {
    const { width, height } = this.scale;

    // Create "Start Game" button (Primary Button - Bright Blue #3498DB)
    const startButtonBg = this.add.rectangle(width / 2, height * 0.55, 240, 70, 0x3498DB, 1);
    startButtonBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

    // Create button text using Phaser text renderer
    if (this.textRenderer) {
      const startButtonTextStyle: TextStyle = {
        fontFamily: this.fontPreloader.getFontFamily(),
        fontSize: '20px',
        fontWeight: '500',
        color: '#FFFFFF',
        align: 'center'
      };

      this.startButtonText = this.textRenderer.createButtonText(
        width / 2,
        height * 0.55,
        'START GAME',
        startButtonTextStyle
      );
    }

    // Create container for button
    const startButtonContainer = this.add.container(0, 0);
    startButtonContainer.add(startButtonBg);
    if (this.startButtonText) {
      startButtonContainer.add(this.startButtonText);
    }

    if (startButtonContainer) {
      this.startButton = startButtonContainer;

      startButtonContainer
        .setInteractive(new Phaser.Geom.Rectangle(width / 2 - 120, height * 0.55 - 35, 240, 70), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          // Simple scale up animation (hover effect)
          this.tweens.add({
            targets: startButtonContainer,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150,
            ease: 'Power2.easeOut'
          });
        })
        .on('pointerout', () => {
          // Return to normal scale
          this.tweens.add({
            targets: startButtonContainer,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Power2.easeOut'
          });
        })
        .on('pointerdown', () => {
          // Disable button to prevent multiple clicks
          startButtonContainer.disableInteractive();

          // Scale down animation (click effect)
          this.tweens.add({
            targets: startButtonContainer,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            ease: 'Power2.easeOut'
          });

          // Show loading state
          this.showLoadingState();

          // Add a small delay to show loading state, then transition
          this.time.delayedCall(800, () => {
            try {
              console.log('SplashScreen: Starting game transition...');

              // Smooth transition to game
              this.tweens.add({
                targets: [this.background, this.startButton, this.howToPlayButton, this.loadingContainer],
                alpha: 0,
                duration: 300,
                ease: 'Power2.easeIn',
                onComplete: () => {
                  try {
                    console.log('SplashScreen: Fade out complete, starting scenes...');

                    if (this.cameras?.main?.fadeOut) {
                      this.cameras.main.fadeOut(250, 0, 0, 0);
                      this.cameras.main.once('camerafadeoutcomplete', () => {
                        console.log('SplashScreen: Camera fade complete, launching scenes...');
                        try {
                          // Start Game scene and launch UI scene concurrently
                          this.scene.start('Game');
                          console.log('SplashScreen: Game scene started');
                          this.scene.launch('UI');
                          console.log('SplashScreen: UI scene launched');
                        } catch (sceneError) {
                          console.error('Error launching scenes:', sceneError);
                          this.handleLoadingError(sceneError);
                        }
                      });
                    } else {
                      console.log('SplashScreen: Direct scene transition (no camera fade)...');
                      try {
                        // Start Game scene and launch UI scene concurrently
                        this.scene.start('Game');
                        console.log('SplashScreen: Game scene started');
                        this.scene.launch('UI');
                        console.log('SplashScreen: UI scene launched');
                      } catch (sceneError) {
                        console.error('Error launching scenes:', sceneError);
                        this.handleLoadingError(sceneError);
                      }
                    }
                  } catch (error) {
                    console.error('Error starting game:', error);
                    this.handleLoadingError(error);
                  }
                }
              });
            } catch (error) {
              console.error('Error during transition:', error);
              this.handleLoadingError(error);
            }
          });
        })
        .on('pointerup', () => {
          // Scale back up to hover state
          if (this.startButton) {
            this.tweens.add({
              targets: this.startButton,
              scaleX: 1.05,
              scaleY: 1.05,
              duration: 100,
              ease: 'Power2.easeOut'
            });
          }
        });
    }

    // Create "How to Play" button (Secondary Button - Mid Grey #95A5A6)
    const howToPlayBg = this.add.rectangle(width / 2, height * 0.68, 200, 55, 0x95A5A6, 1);
    howToPlayBg.setStrokeStyle(2, 0xFFFFFF, 0.7);

    // Create button text using Phaser text renderer
    if (this.textRenderer) {
      const howToPlayButtonTextStyle: TextStyle = {
        fontFamily: this.fontPreloader.getFontFamily(),
        fontSize: '18px',
        fontWeight: '500',
        color: '#FFFFFF',
        align: 'center'
      };

      this.howToPlayButtonText = this.textRenderer.createButtonText(
        width / 2,
        height * 0.68,
        'HOW TO PLAY',
        howToPlayButtonTextStyle
      );
    }

    const howToPlayContainer = this.add.container(0, 0);
    howToPlayContainer.add(howToPlayBg);
    if (this.howToPlayButtonText) {
      howToPlayContainer.add(this.howToPlayButtonText);
    }

    if (howToPlayContainer) {
      this.howToPlayButton = howToPlayContainer;
      howToPlayContainer
        .setInteractive(new Phaser.Geom.Rectangle(width / 2 - 100, height * 0.68 - 27.5, 200, 55), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          // Simple scale up animation (hover effect)
          this.tweens.add({
            targets: howToPlayContainer,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 150,
            ease: 'Power2.easeOut'
          });
        })
        .on('pointerout', () => {
          // Return to normal scale
          this.tweens.add({
            targets: howToPlayContainer,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Power2.easeOut'
          });
        })
        .on('pointerdown', () => {
          // Scale down animation (click effect)
          this.tweens.add({
            targets: howToPlayContainer,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            ease: 'Power2.easeOut'
          });
          // TODO: Show How to Play modal
          console.log('How to Play clicked - modal not implemented yet');
        })
        .on('pointerup', () => {
          // Scale back up to hover state
          this.tweens.add({
            targets: howToPlayContainer,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 100,
            ease: 'Power2.easeOut'
          });
        });
    }

  }

  /**
   * Positions and (lightly) scales all UI elements based on the current game size.
   * Call this from create() and from any resize events.
   */
  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Resize camera to new viewport to prevent black bars
    this.cameras.resize(width, height);

    // Background – solid color rectangle (Dark Slate #2C3E50)
    if (!this.background) {
      this.background = this.add.rectangle(0, 0, width, height, 0x2C3E50).setOrigin(0);
    }
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Update text positions if they exist
    if (this.titleText && this.textRenderer) {
      this.textRenderer.updateTextPosition(this.titleText, width / 2, height * 0.18);
    }

    if (this.subtitleText && this.textRenderer) {
      this.textRenderer.updateTextPosition(this.subtitleText, width / 2, height * 0.38);
    }

    // Update button positions if they exist
    if (this.startButton) {
      this.startButton.setPosition(Math.round(width / 2), Math.round(height * 0.55));
    }

    if (this.howToPlayButton) {
      this.howToPlayButton.setPosition(Math.round(width / 2), Math.round(height * 0.68));
    }

    // Update button text positions if they exist
    if (this.startButtonText && this.textRenderer) {
      this.textRenderer.updateTextPosition(this.startButtonText, width / 2, height * 0.55);
    }

    if (this.howToPlayButtonText && this.textRenderer) {
      this.textRenderer.updateTextPosition(this.howToPlayButtonText, width / 2, height * 0.68);
    }

    // Update font loading indicator position if it exists
    if (this.fontLoadingIndicator) {
      this.fontLoadingIndicator.updatePosition(
        Math.round(width / 2), 
        Math.round(height * 0.85)
      );
    }
  }

  private showLoadingState(): void {
    const { width, height } = this.scale;

    // Create loading container
    this.loadingContainer = this.add.container(width / 2, height * 0.75);

    // Create a more sophisticated loading spinner
    const spinnerRadius = 30;
    const spinnerThickness = 4;

    // Create multiple arc segments for a modern loading spinner
    const segments = 8;
    this.loadingDots = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * spinnerRadius;
      const y = Math.sin(angle) * spinnerRadius;

      const dot = this.add.circle(x, y, spinnerThickness, 0x3498DB);

      // Create a fading effect - dots further along the circle are more transparent
      const alpha = 1 - (i / segments) * 0.8; // From 1.0 to 0.2
      dot.setAlpha(alpha);

      this.loadingDots.push(dot);
      this.loadingContainer.add(dot);
    }

    // Rotate the entire spinner
    this.tweens.add({
      targets: this.loadingContainer,
      rotation: Math.PI * 2,
      duration: 1200,
      repeat: -1,
      ease: 'Linear'
    });

    // Add a subtle pulsing effect to the center
    const centerDot = this.add.circle(0, 0, 6, 0x3498DB, 0.8);
    this.tweens.add({
      targets: centerDot,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.loadingContainer.add(centerDot);

    // Fade in the loading state
    this.loadingContainer.setAlpha(0);
    this.tweens.add({
      targets: this.loadingContainer,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
  }

  private handleLoadingError(error: any): void {
    console.error('Loading failed:', error);

    // Hide loading state
    if (this.loadingContainer) {
      this.loadingContainer.setVisible(false);
    }

    // Re-enable the start button
    if (this.startButton) {
      this.startButton.setInteractive();

      // Reset button scale
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Power2.easeOut'
      });
    }

    // Show error indicator (graphics-only approach)
    const { width, height } = this.scale;
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
}
