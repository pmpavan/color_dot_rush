import { Scene, GameObjects } from 'phaser';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;
  startButton: GameObjects.Container | null = null;
  howToPlayButton: GameObjects.Container | null = null;

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
          // Scale down animation (click effect)
          this.tweens.add({
            targets: startButtonContainer,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 100,
            ease: 'Power2.easeOut'
          });
          this.scaleButtonText('start-button-text', 0.95);
          
          // Clean up DOM elements before transitioning
          this.cleanupDOMElements();
          // Smooth transition to game
          this.tweens.add({
            targets: [this.background, this.startButton, this.howToPlayButton],
            alpha: 0,
            duration: 200,
            ease: 'Power2.easeIn',
            onComplete: () => {
              try {
                if (this.cameras?.main?.fadeOut) {
                  this.cameras.main.fadeOut(250, 0, 0, 0);
                  this.cameras.main.once('camerafadeoutcomplete', () => {
                    // Start Game scene and launch UI scene concurrently
                    this.scene.start('Game');
                    this.scene.launch('UI');
                  });
                } else {
                  // Start Game scene and launch UI scene concurrently
                  this.scene.start('Game');
                  this.scene.launch('UI');
                }
              } catch (error) {
                console.error('Error starting game:', error);
              }
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
}
