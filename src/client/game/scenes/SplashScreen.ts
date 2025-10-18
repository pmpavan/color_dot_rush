import { Scene, GameObjects } from 'phaser';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;
  startButton: GameObjects.Container | null = null;
  howToPlayButton: GameObjects.Container | null = null;
  loadingContainer: GameObjects.Container | null = null;
  loadingDots: GameObjects.Arc[] = [];

  constructor() {
    super('SplashScreen');
    // Ensure scene key is properly set for testing
    if (this.scene) {
      this.scene.key = 'SplashScreen';
    }
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

    // Clean up any existing DOM text elements
    this.cleanupDOMElements();
  }

  /**
   * Clean up DOM text elements
   */
  private cleanupDOMElements(): void {
    const elementsToRemove = ['splash-title', 'splash-subtitle', 'start-button-text', 'howtoplay-button-text'];
    elementsToRemove.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.remove();
      }
    });
  }

  create() {
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    // Add title with color-shifting gradient
    this.createTitle();

    // Create interactive buttons with DOM text
    this.createButtons();
  }

  private createTitle(): void {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    // Create the main title with color-shifting gradient (H1: 72pt Bold)
    const titleElement = document.createElement('div');
    titleElement.innerHTML = 'COLOR RUSH';
    titleElement.style.position = 'absolute';
    titleElement.style.left = '50%';
    titleElement.style.top = '18%';
    titleElement.style.transform = 'translate(-50%, -50%)';
    titleElement.style.fontSize = '72px'; // H1 size as per spec
    titleElement.style.fontFamily = 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; // Poppins with system fallbacks
    titleElement.style.fontWeight = 'bold';
    titleElement.style.textAlign = 'center';
    titleElement.style.pointerEvents = 'none';
    titleElement.style.zIndex = '1000';
    titleElement.style.background = 'linear-gradient(45deg, #E74C3C, #3498DB, #2ECC71, #F1C40F, #9B59B6)';
    titleElement.style.backgroundSize = '400% 400%';
    titleElement.style.webkitBackgroundClip = 'text';
    titleElement.style.backgroundClip = 'text';
    titleElement.style.webkitTextFillColor = 'transparent';
    titleElement.style.animation = 'gradientShift 4s ease-in-out infinite';
    titleElement.id = 'splash-title';

    // Add subtitle with proper spacing - much further down
    const subtitleElement = document.createElement('div');
    subtitleElement.innerHTML = 'Test Your Reflexes';
    subtitleElement.style.position = 'absolute';
    subtitleElement.style.left = '50%';
    subtitleElement.style.top = '38%';
    subtitleElement.style.transform = 'translate(-50%, -50%)';
    subtitleElement.style.fontSize = '24px'; // Header UI text size as per spec
    subtitleElement.style.color = '#ECF0F1'; // Light Grey as per spec
    subtitleElement.style.fontFamily = 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    subtitleElement.style.fontWeight = '400'; // Regular
    subtitleElement.style.textAlign = 'center';
    subtitleElement.style.pointerEvents = 'none';
    subtitleElement.style.zIndex = '1000';
    subtitleElement.id = 'splash-subtitle';

    // Add CSS animation for color shifting
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);

    gameContainer.appendChild(titleElement);
    gameContainer.appendChild(subtitleElement);
  }

  private createButtons(): void {
    const { width, height } = this.scale;

    // Create "Start Game" button (Primary Button - Bright Blue #3498DB)
    const startButtonBg = this.add.rectangle(width / 2, height * 0.55, 240, 70, 0x3498DB, 1);
    startButtonBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

    // Create container for button
    const startButtonContainer = this.add.container(0, 0);
    startButtonContainer.add(startButtonBg);

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
          this.scaleButtonText('start-button-text', 1.05);
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
          this.scaleButtonText('start-button-text', 1.0);
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
          this.scaleButtonText('start-button-text', 0.95);

          // Show loading state
          this.showLoadingState();

          // Clean up DOM elements before transitioning
          this.cleanupDOMElements();

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
            this.scaleButtonText('start-button-text', 1.05);
          }
        });
    }

    // Create "How to Play" button (Secondary Button - Mid Grey #95A5A6)
    const howToPlayBg = this.add.rectangle(width / 2, height * 0.68, 200, 55, 0x95A5A6, 1);
    howToPlayBg.setStrokeStyle(2, 0xFFFFFF, 0.7);

    const howToPlayContainer = this.add.container(0, 0);
    howToPlayContainer.add(howToPlayBg);

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
          this.scaleButtonText('howtoplay-button-text', 1.05);
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
          this.scaleButtonText('howtoplay-button-text', 1.0);
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
          this.scaleButtonText('howtoplay-button-text', 0.95);
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
          this.scaleButtonText('howtoplay-button-text', 1.05);
        });
    }

    // Add DOM text for buttons
    this.createButtonText();
  }

  /**
   * Scale button text and move it slightly down and right to match button scaling
   */
  private scaleButtonText(elementId: string, scale: number): void {
    const element = document.getElementById(elementId);
    if (element) {
      // Simple movement: when scaling up, move down and right slightly
      const moveX = (scale - 1) * 3; // Move right by 3px per 0.1 scale
      const moveY = (scale - 1) * 3; // Move down by 3px per 0.1 scale

      // Use simple easing to match Phaser's Power2.easeOut
      const duration = scale === 1.0 ? '150ms' : scale > 1.0 ? '150ms' : '100ms';
      element.style.transition = `transform ${duration} ease-out`;
      element.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px)) scale(${scale})`;
    }
  }

  private createButtonText(): void {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    // "Start Game" button text (20pt Medium as per spec)
    const startButtonText = document.createElement('div');
    startButtonText.innerHTML = 'START GAME';
    startButtonText.style.position = 'absolute';
    startButtonText.style.left = '50%';
    startButtonText.style.top = '55%';
    startButtonText.style.transform = 'translate(-50%, -50%)';
    startButtonText.style.fontSize = '20px'; // 20pt as per spec
    startButtonText.style.color = '#FFFFFF';
    startButtonText.style.fontFamily = 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    startButtonText.style.fontWeight = '500'; // Medium
    startButtonText.style.textAlign = 'center';
    startButtonText.style.pointerEvents = 'none';
    startButtonText.style.zIndex = '1001';
    startButtonText.style.transition = 'transform 150ms ease-out'; // Simple scaling transition
    startButtonText.id = 'start-button-text';

    // "How to Play" button text
    const howToPlayButtonText = document.createElement('div');
    howToPlayButtonText.innerHTML = 'HOW TO PLAY';
    howToPlayButtonText.style.position = 'absolute';
    howToPlayButtonText.style.left = '50%';
    howToPlayButtonText.style.top = '68%';
    howToPlayButtonText.style.transform = 'translate(-50%, -50%)';
    howToPlayButtonText.style.fontSize = '18px';
    howToPlayButtonText.style.color = '#FFFFFF';
    howToPlayButtonText.style.fontFamily = 'Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    howToPlayButtonText.style.fontWeight = '500';
    howToPlayButtonText.style.textAlign = 'center';
    howToPlayButtonText.style.pointerEvents = 'none';
    howToPlayButtonText.style.zIndex = '1001';
    howToPlayButtonText.style.transition = 'transform 150ms ease-out'; // Simple scaling transition
    howToPlayButtonText.id = 'howtoplay-button-text';

    gameContainer.appendChild(startButtonText);
    gameContainer.appendChild(howToPlayButtonText);
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

    // Update button positions if they exist
    if (this.startButton) {
      this.startButton.setPosition(Math.round(width / 2), Math.round(height * 0.55));
    }

    if (this.howToPlayButton) {
      this.howToPlayButton.setPosition(Math.round(width / 2), Math.round(height * 0.68));
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
