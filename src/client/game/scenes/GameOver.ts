import { Scene } from 'phaser';
import * as Phaser from 'phaser';

interface GameOverData {
  finalScore: number;
  sessionTime: number;
  bestScore: number;
  targetColor: string;
}

export class GameOver extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Image;
  private dimmedOverlay: Phaser.GameObjects.Rectangle;
  private modalCard: Phaser.GameObjects.Container;
  private gameOverData: GameOverData;
  private playAgainButton: Phaser.GameObjects.Text | null = null;
  private leaderboardButton: Phaser.GameObjects.Text | null = null;
  private mainMenuButton: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('GameOver');
  }

  init(data: GameOverData): void {
    // Store game over data passed from Game scene
    this.gameOverData = data || {
      finalScore: 0,
      sessionTime: 0,
      bestScore: 0,
      targetColor: '#E74C3C'
    };

    // Reset button references for scene reuse
    this.playAgainButton = null;
    this.leaderboardButton = null;
    this.mainMenuButton = null;
  }

  create() {
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background

    // Create frozen game state background
    const backgroundImage = this.add.image(0, 0, 'background');
    if (backgroundImage) {
      this.background = backgroundImage.setOrigin(0).setAlpha(0.3);
    }

    // Create dimmed overlay for modal effect (overlaying frozen game state)
    this.dimmedOverlay = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7 // Stronger dimming for better modal contrast
    );

    // Create centered modal card
    this.createModalCard();

    // Initial responsive layout
    this.updateLayout(this.scale.width, this.scale.height);

    // Update layout on canvas resize / orientation change
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });
  }

  private createModalCard(): void {
    // Create modal container positioned at screen center
    const container = this.add.container(this.scale.width / 2, this.scale.height / 2);
    if (!container) {
      return; // Exit early if container creation fails
    }
    this.modalCard = container;

    // Calculate responsive modal size
    const modalWidth = Math.min(400, this.scale.width * 0.9);
    const modalHeight = Math.min(500, this.scale.height * 0.8);

    // Modal background with rounded corners effect
    const modalBg = this.add.rectangle(0, 0, modalWidth, modalHeight, 0x34495E, 0.98);
    if (modalBg) {
      modalBg.setStrokeStyle(4, 0xECF0F1, 0.8);
      this.modalCard.add(modalBg);
    }

    // "GAME OVER" title (48pt Poppins Bold as per spec)
    const gameOverTitle = this.add
      .text(0, -modalHeight * 0.35, 'GAME OVER', {
        fontFamily: 'Poppins',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      });
    if (gameOverTitle) {
      gameOverTitle.setOrigin(0.5);
      this.modalCard.add(gameOverTitle);
    }

    // Final score display (prominent)
    const scoreText = this.add
      .text(0, -modalHeight * 0.2, `Final Score: ${this.gameOverData.finalScore}`, {
        fontFamily: 'Poppins',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#3498DB', // Bright Blue for emphasis
        align: 'center',
      });
    if (scoreText) {
      scoreText.setOrigin(0.5);
      this.modalCard.add(scoreText);
    }

    // Session time display
    const timeText = this.add
      .text(0, -modalHeight * 0.1, `Session Time: ${this.formatTime(this.gameOverData.sessionTime)}`, {
        fontFamily: 'Poppins',
        fontSize: '22px',
        color: '#ECF0F1',
        align: 'center',
      });
    if (timeText) {
      timeText.setOrigin(0.5);
      this.modalCard.add(timeText);
    }

    // Best score display (if it's a new record, highlight it)
    const isNewRecord = this.gameOverData.finalScore === this.gameOverData.bestScore && this.gameOverData.finalScore > 0;
    const bestScoreColor = isNewRecord ? '#F1C40F' : '#95A5A6'; // Gold for new record, grey otherwise
    const bestScorePrefix = isNewRecord ? '🏆 NEW BEST: ' : 'Best Score: ';

    const bestScoreText = this.add
      .text(0, modalHeight * 0.02, `${bestScorePrefix}${this.gameOverData.bestScore}`, {
        fontFamily: 'Poppins',
        fontSize: '20px',
        fontStyle: isNewRecord ? 'bold' : 'normal',
        color: bestScoreColor,
        align: 'center',
      });
    if (bestScoreText) {
      bestScoreText.setOrigin(0.5);
      this.modalCard.add(bestScoreText);

      // Add new record celebration effect if applicable
      if (isNewRecord) {
        this.createNewRecordEffect(bestScoreText);
      }
    }



    // Create navigation buttons within the modal
    this.createModalButtons(modalHeight);

    // Scale-up and fade-in animation (~250ms as per spec)
    this.modalCard.setScale(0.1);
    this.modalCard.setAlpha(0);

    this.tweens.add({
      targets: this.modalCard,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Auto-focus the Play Again button after animation
        if (this.playAgainButton) {
          this.playAgainButton.setScale(1.05);
          // Add subtle glow effect to indicate focus
          this.tweens.add({
            targets: this.playAgainButton,
            alpha: 0.8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }
    });
  }

  private createNewRecordEffect(textObject: Phaser.GameObjects.Text): void {
    // Create sparkle particles for new record celebration
    const sparkles = this.add.particles(textObject.x, textObject.y, 'dot-yellow', {
      tint: 0xF1C40F,
      speed: { min: 50, max: 150 },
      scale: { start: 0.3, end: 0 },
      lifespan: 1000,
      quantity: 2,
      frequency: 200,
      blendMode: 'ADD'
    });

    // Stop sparkles after 3 seconds
    this.time.delayedCall(3000, () => {
      sparkles.destroy();
    });
  }

  private createModalButtons(modalHeight: number): void {
    // Play Again button (auto-focused, primary action)
    const playAgainText = this.add
      .text(0, modalHeight * 0.2, 'Play Again', {
        fontFamily: 'Poppins',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#3498DB', // Bright Blue
        padding: { x: 30, y: 15 },
      });

    if (playAgainText) {
      this.playAgainButton = playAgainText
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (this.playAgainButton) {
            this.playAgainButton.setScale(1.1);
            this.tweens.killTweensOf(this.playAgainButton); // Stop auto-focus animation
            this.playAgainButton.setAlpha(1);
          }
        })
        .on('pointerout', () => {
          if (this.playAgainButton) {
            this.playAgainButton.setScale(1.05);
          }
        })
        .on('pointerdown', () => {
          if (this.playAgainButton) {
            this.playAgainButton.setScale(0.95);
            // Smooth transition back to game
            this.tweens.add({
              targets: this.modalCard,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.scene.start('Game');
                this.scene.launch('UI');
              }
            });
          }
        })
        .on('pointerup', () => {
          if (this.playAgainButton) {
            this.playAgainButton.setScale(1.1);
          }
        });
      this.modalCard.add(this.playAgainButton);
    }

    // View Leaderboard button (secondary action)
    const leaderboardText = this.add
      .text(0, modalHeight * 0.32, 'View Leaderboard', {
        fontFamily: 'Poppins',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#95A5A6', // Mid Grey
        padding: { x: 25, y: 12 },
      });

    if (leaderboardText) {
      this.leaderboardButton = leaderboardText
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.1);
        })
        .on('pointerout', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.0);
        })
        .on('pointerdown', () => {
          if (this.leaderboardButton) {
            this.leaderboardButton.setScale(0.95);
            // TODO: Implement leaderboard view with smooth transition
            console.log('Leaderboard clicked - TODO: Implement leaderboard view');
            // For now, show a placeholder message
            this.showLeaderboardPlaceholder();
          }
        })
        .on('pointerup', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.1);
        });
      this.modalCard.add(this.leaderboardButton);
    }

    // Main Menu button (tertiary action, smaller)
    const mainMenuText = this.add
      .text(0, modalHeight * 0.42, 'Main Menu', {
        fontFamily: 'Poppins',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#34495E', // Near Black
        padding: { x: 20, y: 10 },
      });

    if (mainMenuText) {
      this.mainMenuButton = mainMenuText
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.1);
        })
        .on('pointerout', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.0);
        })
        .on('pointerdown', () => {
          if (this.mainMenuButton) {
            this.mainMenuButton.setScale(0.95);
            // Smooth transition to splash screen
            this.tweens.add({
              targets: this.modalCard,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                this.scene.start('SplashScreen');
              }
            });
          }
        })
        .on('pointerup', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.1);
        });
      this.modalCard.add(this.mainMenuButton);
    }
  }

  private showLeaderboardPlaceholder(): void {
    // Create a temporary message for leaderboard placeholder
    const placeholderText = this.add
      .text(0, this.modalCard.y + 200, 'Leaderboard coming soon!', {
        fontFamily: 'Poppins',
        fontSize: '16px',
        color: '#F1C40F',
        backgroundColor: '#2C3E50',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Fade in and out
    this.tweens.add({
      targets: placeholderText,
      alpha: 1,
      duration: 300,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        placeholderText.destroy();
      }
    });
  }



  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private updateLayout(width: number, height: number): void {
    // Resize camera viewport to prevent black bars
    this.cameras.resize(width, height);

    // Stretch background to fill entire screen
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Update dimmed overlay size
    if (this.dimmedOverlay) {
      this.dimmedOverlay.setPosition(width / 2, height / 2);
      this.dimmedOverlay.setDisplaySize(width, height);
    }

    // Reposition modal card to center
    if (this.modalCard) {
      this.modalCard.setPosition(width / 2, height / 2);
    }
  }
}
