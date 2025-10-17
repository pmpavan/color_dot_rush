import { Scene, GameObjects } from 'phaser';
import { GameColor, UIColor } from '../../../shared/types/game';

export class SplashScreen extends Scene {
  background: GameObjects.Image | null = null;
  logo: GameObjects.Image | null = null;
  title: GameObjects.Text | null = null;
  startButton: GameObjects.Text | null = null;
  howToPlayButton: GameObjects.Text | null = null;

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
    this.logo = null;
    this.title = null;
    this.startButton = null;
    this.howToPlayButton = null;
  }

  create() {
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }
    
    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    // Create interactive buttons instead of generic tap
    this.createButtons();
  }

  private createButtons(): void {
    const { width, height } = this.scale;
    
    // Start Game button (Primary - Bright Blue)
    if (!this.startButton) {
      this.startButton = this.add
        .text(Math.round(width / 2), Math.round(height * 0.7), 'Start Game', {
          fontFamily: 'Poppins',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#3498DB', // Bright Blue
          padding: { x: 25, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.startButton!.setScale(1.1); // Scale-up on hover
        })
        .on('pointerout', () => {
          this.startButton!.setScale(1.0);
        })
        .on('pointerdown', () => {
          this.startButton!.setScale(0.95); // Scale-down on press
          // Smooth transition to game with 250ms cross-fade (with safety check for tests)
          if (this.cameras?.main?.fadeOut) {
            this.cameras.main.fadeOut(250, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('Game');
              this.scene.launch('UI'); // Launch UIScene concurrently
            });
          } else {
            // Fallback for test environment
            this.scene.start('Game');
            this.scene.launch('UI'); // Launch UIScene concurrently
          }
        })
        .on('pointerup', () => {
          this.startButton!.setScale(1.1);
        });
    }

    // How to Play button (Secondary - Mid Grey)
    if (!this.howToPlayButton) {
      this.howToPlayButton = this.add
        .text(Math.round(width / 2), Math.round(height * 0.8), 'How to Play', {
          fontFamily: 'Poppins',
          fontSize: '20px',
          fontStyle: 'normal',
          color: '#ffffff',
          backgroundColor: '#95A5A6', // Mid Grey
          padding: { x: 25, y: 12 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          this.howToPlayButton!.setScale(1.1); // Scale-up on hover
        })
        .on('pointerout', () => {
          this.howToPlayButton!.setScale(1.0);
        })
        .on('pointerdown', () => {
          this.howToPlayButton!.setScale(0.95); // Scale-down on press
          // TODO: Show how to play instructions
          console.log('How to Play clicked - TODO: Implement instructions');
        })
        .on('pointerup', () => {
          this.howToPlayButton!.setScale(1.1);
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

    // Background – stretch to fill the whole canvas
    if (!this.background) {
      const backgroundImage = this.add.image(0, 0, 'background');
      if (backgroundImage) {
        this.background = backgroundImage.setOrigin(0);
      }
    }
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Logo – keep aspect but scale down for very small screens
    const scaleFactor = Math.min(width / 1024, height / 768);

    if (!this.logo) {
      const logoImage = this.add.image(0, 0, 'logo');
      if (logoImage) {
        this.logo = logoImage;
      }
    }
    if (this.logo) {
      // Use Math.round for pixel-perfect positioning
      this.logo.setPosition(Math.round(width / 2), Math.round(height * 0.38)).setScale(scaleFactor);
    }

    // Title text with color-shifting gradient effect (72pt Poppins Bold)
    const baseFontSize = 72;
    if (!this.title) {
      const titleText = this.add
        .text(0, 0, 'Color Rush', {
          fontFamily: 'Poppins',
          fontSize: `${Math.round(baseFontSize * scaleFactor)}px`,
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: Math.round(8 * scaleFactor),
          align: 'center',
        });
      
      if (titleText) {
        this.title = titleText.setOrigin(0.5);
        
        // Add subtle color-shifting gradient effect using game colors
        const gameColors = [
          GameColor.RED,
          GameColor.GREEN, 
          GameColor.BLUE,
          GameColor.YELLOW,
          GameColor.PURPLE
        ];
        
        let colorIndex = 0;
        this.tweens.add({
          targets: this.title,
          duration: 3000,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (this.title) {
              // Cycle through colors based on time
              const timeBasedIndex = Math.floor((Date.now() / 1000) % gameColors.length);
              const currentColor = gameColors[timeBasedIndex];
              this.title.setTint(parseInt(currentColor.replace('#', '0x')));
            }
          }
        });
      }
    }
    if (this.title) {
      this.title.setPosition(Math.round(width / 2), Math.round(height * 0.5));
      // Title already scaled in creation, don't double-scale
    }

    // Update button positions if they exist
    if (this.startButton) {
      this.startButton.setPosition(Math.round(width / 2), Math.round(height * 0.7));
    }
    
    if (this.howToPlayButton) {
      this.howToPlayButton.setPosition(Math.round(width / 2), Math.round(height * 0.8));
    }
  }
}
