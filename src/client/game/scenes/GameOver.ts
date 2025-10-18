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
  private background: Phaser.GameObjects.Rectangle;
  private dimmedOverlay: Phaser.GameObjects.Rectangle;
  private modalCard: Phaser.GameObjects.Container | null = null;
  private gameOverData: GameOverData;
  private playAgainButton: Phaser.GameObjects.Container | null = null;
  private leaderboardButton: Phaser.GameObjects.Container | null = null;
  private mainMenuButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('GameOver');
  }

  shutdown(): void {
    try {
      // Clean up button references
      this.playAgainButton = null;
      this.leaderboardButton = null;
      this.mainMenuButton = null;
      
      // Clean up container reference
      this.modalCard = null;
      
      // Kill all tweens
      if (this.tweens) {
        this.tweens.killAll();
      }
    } catch (error) {
      console.warn('Error during GameOver scene shutdown:', error);
    }
  }

  init(data: GameOverData): void {
    console.log('GameOver scene init called with data:', data);
    
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
    
    console.log('GameOver scene init completed');
  }

  create() {
    console.log('GameOver scene create called');
    
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background
    
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }
    
    console.log('GameOver scene camera configured');

    // Create frozen game state background (graphics-only)
    this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x34495E, 0.3).setOrigin(0);

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
    modalBg.setStrokeStyle(4, 0xECF0F1, 0.8);
    this.modalCard.add(modalBg);

    // "GAME OVER" title (graphics-only representation)
    const gameOverIcon = this.add.circle(0, -modalHeight * 0.35, 30, 0xFF0000, 1);
    gameOverIcon.setStrokeStyle(4, 0xFFFFFF, 1);
    this.modalCard.add(gameOverIcon);

    // Final score display (graphics-only - use colored circles to represent score level)
    const scoreLevel = this.gameOverData.finalScore > 20 ? 3 : this.gameOverData.finalScore > 10 ? 2 : 1;
    const scoreColors = [0xFF0000, 0xFFD700, 0x2ECC71]; // Red, Gold, Green
    const scoreIndicator = this.add.circle(0, -modalHeight * 0.2, 25, scoreColors[scoreLevel - 1], 1);
    scoreIndicator.setStrokeStyle(3, 0xFFFFFF, 1);
    this.modalCard.add(scoreIndicator);

    // Session time display (graphics-only - rotating clock hand)
    const timeCircle = this.add.circle(0, -modalHeight * 0.1, 20, 0x2ECC71, 0.8);
    if (timeCircle) {
      timeCircle.setStrokeStyle(2, 0xFFFFFF, 0.8);
      this.modalCard.add(timeCircle);
    }
    
    const timeHand = this.add.line(0, -modalHeight * 0.1, 0, 0, 0, -15, 0xFFFFFF, 1);
    if (timeHand) {
      timeHand.setLineWidth(2);
      const rotation = (this.gameOverData.sessionTime / 1000 * 6) * (Math.PI / 180);
      timeHand.setRotation(rotation);
      this.modalCard.add(timeHand);
    }

    // Best score display (graphics-only - trophy icon for new record)
    const isNewRecord = this.gameOverData.finalScore === this.gameOverData.bestScore && this.gameOverData.finalScore > 0;
    const bestScoreColor = isNewRecord ? 0xF1C40F : 0x95A5A6; // Gold for new record, grey otherwise
    
    const bestScoreIcon = this.add.circle(0, modalHeight * 0.02, 18, bestScoreColor, 1);
    bestScoreIcon.setStrokeStyle(3, 0xFFFFFF, 1);
    this.modalCard.add(bestScoreIcon);
    
    if (isNewRecord) {
      // Add crown effect for new record
      const crown = this.add.triangle(0, modalHeight * 0.02 - 10, 0, 0, -8, 12, 8, 12, 0xF1C40F);
      this.modalCard.add(crown);
      
      // Add new record celebration effect
      this.createNewRecordEffect(0, modalHeight * 0.02);
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

  private createNewRecordEffect(x: number, y: number): void {
    // Create sparkle effect with simple graphics for new record celebration
    for (let i = 0; i < 5; i++) {
      const sparkle = this.add.circle(x, y, 3, 0xF1C40F, 1);
      const angle = (i / 5) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      
      this.tweens.add({
        targets: sparkle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => sparkle.destroy()
      });
    }
  }

  private createModalButtons(modalHeight: number): void {
    // Play Again button (graphics-only - blue rectangle with play icon)
    const playAgainBg = this.add.rectangle(0, modalHeight * 0.2, 200, 50, 0x3498DB, 1);
    playAgainBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    
    // Add play triangle icon
    const playIcon = this.add.triangle(0, modalHeight * 0.2, 0, 0, 0, 15, 12, 7.5, 0xFFFFFF);
    
    // Create container for button
    const playAgainContainer = this.add.container(0, 0);
    playAgainContainer.add(playAgainBg);
    playAgainContainer.add(playIcon);
    
    if (playAgainContainer && this.modalCard) {
      this.playAgainButton = playAgainContainer;
      this.modalCard.add(playAgainContainer);
      
      playAgainContainer
        .setInteractive(new Phaser.Geom.Rectangle(-100, modalHeight * 0.2 - 25, 200, 50), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          playAgainContainer.setScale(1.1);
          this.tweens.killTweensOf(playAgainContainer);
          playAgainContainer.setAlpha(1);
        })
        .on('pointerout', () => {
          playAgainContainer.setScale(1.05);
        })
        .on('pointerdown', () => {
          playAgainContainer.setScale(0.95);
          // Smooth transition back to game with cross-fade
          this.tweens.add({
            targets: this.modalCard,
            scaleX: 0.1,
            scaleY: 0.1,
            alpha: 0,
            duration: 200,
            ease: 'Back.easeIn',
            onComplete: () => {
              try {
                if (this.cameras?.main?.fadeOut) {
                  this.cameras.main.fadeOut(250, 0, 0, 0);
                  this.cameras.main.once('camerafadeoutcomplete', () => {
                    // Start Game scene and ensure UI scene is running
                    this.scene.start('Game');
                    
                    // Check if UI scene exists, if not launch it
                    const uiScene = this.scene.get('UI') as any;
                    if (!uiScene || !uiScene.scene.isActive()) {
                      this.scene.launch('UI');
                    } else if (uiScene && uiScene.setVisible) {
                      uiScene.setVisible(true);
                    } else if (uiScene) {
                      // Fallback: make sure UI scene is running and visible
                      this.scene.setVisible(true, 'UI');
                    }
                  });
                } else {
                  // Fallback for test environment
                  // Start Game scene and ensure UI scene is running
                  this.scene.start('Game');
                  
                  // Check if UI scene exists, if not launch it
                  const uiScene = this.scene.get('UI') as any;
                  if (!uiScene || !uiScene.scene.isActive()) {
                    this.scene.launch('UI');
                  } else if (uiScene && uiScene.setVisible) {
                    uiScene.setVisible(true);
                  } else if (uiScene) {
                    // Fallback: make sure UI scene is running and visible
                    this.scene.setVisible(true, 'UI');
                  }
                }
              } catch (error) {
                console.error('Error restarting game:', error);
              }
            }
          });
        })
        .on('pointerup', () => {
          if (this.playAgainButton) {
            this.playAgainButton.setScale(1.1);
          }
        });
      this.modalCard.add(this.playAgainButton);
    }

    // View Leaderboard button (graphics-only - grey rectangle with trophy icon)
    const leaderboardBg = this.add.rectangle(0, modalHeight * 0.32, 180, 40, 0x95A5A6, 1);
    leaderboardBg.setStrokeStyle(2, 0xFFFFFF, 0.6);
    
    // Add trophy icon
    const trophyIcon = this.add.circle(0, modalHeight * 0.32, 8, 0xF1C40F);
    trophyIcon.setStrokeStyle(2, 0xFFFFFF, 1);
    
    const leaderboardContainer = this.add.container(0, 0);
    leaderboardContainer.add(leaderboardBg);
    leaderboardContainer.add(trophyIcon);
    
    if (leaderboardContainer) {
      this.leaderboardButton = leaderboardContainer;
      leaderboardContainer
        .setInteractive(new Phaser.Geom.Rectangle(-90, modalHeight * 0.32 - 20, 180, 40), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.1);
        })
        .on('pointerout', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.0);
        })
        .on('pointerdown', () => {
          if (this.leaderboardButton) {
            this.leaderboardButton.setScale(0.95);
            // Navigate to leaderboard scene with smooth transition
            this.tweens.add({
              targets: this.modalCard,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                try {
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
                  console.error('Error navigating to leaderboard:', error);
                }
              }
            });
          }
        })
        .on('pointerup', () => {
          if (this.leaderboardButton) this.leaderboardButton.setScale(1.1);
        });
      if (this.modalCard) {
        this.modalCard.add(this.leaderboardButton);
      }
    }

    // Main Menu button (graphics-only - dark rectangle with home icon)
    const mainMenuBg = this.add.rectangle(0, modalHeight * 0.42, 160, 35, 0x34495E, 1);
    mainMenuBg.setStrokeStyle(2, 0xFFFFFF, 0.4);
    
    // Add home icon (simple house shape)
    const homeIcon = this.add.rectangle(0, modalHeight * 0.42, 12, 8, 0xFFFFFF);
    const homeRoof = this.add.triangle(0, modalHeight * 0.42 - 6, 0, 0, -6, 8, 6, 8, 0xFFFFFF);
    
    const mainMenuContainer = this.add.container(0, 0);
    mainMenuContainer.add(mainMenuBg);
    mainMenuContainer.add(homeIcon);
    mainMenuContainer.add(homeRoof);
    
    if (mainMenuContainer) {
      this.mainMenuButton = mainMenuContainer;
      mainMenuContainer
        .setInteractive(new Phaser.Geom.Rectangle(-80, modalHeight * 0.42 - 17.5, 160, 35), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.1);
        })
        .on('pointerout', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.0);
        })
        .on('pointerdown', () => {
          if (this.mainMenuButton) {
            this.mainMenuButton.setScale(0.95);
            // Smooth transition to splash screen with cross-fade
            this.tweens.add({
              targets: this.modalCard,
              scaleX: 0.1,
              scaleY: 0.1,
              alpha: 0,
              duration: 200,
              ease: 'Back.easeIn',
              onComplete: () => {
                try {
                  if (this.cameras?.main?.fadeOut) {
                    this.cameras.main.fadeOut(250, 0, 0, 0);
                    this.cameras.main.once('camerafadeoutcomplete', () => {
                      this.scene.start('SplashScreen');
                    });
                  } else {
                    // Fallback for test environment
                    this.scene.start('SplashScreen');
                  }
                } catch (error) {
                  console.error('Error navigating to main menu:', error);
                }
              }
            });
          }
        })
        .on('pointerup', () => {
          if (this.mainMenuButton) this.mainMenuButton.setScale(1.1);
        });
      if (this.modalCard) {
        this.modalCard.add(this.mainMenuButton);
      }
    }
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
