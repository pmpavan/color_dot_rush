import { Scene } from 'phaser';
import * as Phaser from 'phaser';

interface GameOverData {
  finalScore: number;
  sessionTime: number;
  bestScore: number;
  targetColor: string;
}

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;
  private gameOverData: GameOverData;

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
  }

  create() {
    // Configure camera with dimmed background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background

    // Background – create once, full-screen with dimmed overlay
    this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.3);
    
    // Create dimmed overlay for modal effect
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.6
    );

    // Create modal card with scale-up animation
    const modalCard = this.add.container(this.scale.width / 2, this.scale.height / 2);
    
    // Modal background
    const modalBg = this.add.rectangle(0, 0, 400, 500, 0x34495E, 0.95);
    modalBg.setStrokeStyle(3, 0xECF0F1);
    modalCard.add(modalBg);

    // "Game Over" title (48pt Poppins Bold as per spec)
    this.gameover_text = this.add
      .text(0, -180, 'GAME OVER', {
        fontFamily: 'Poppins',
        fontSize: '48px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    modalCard.add(this.gameover_text);

    // Final score display
    const scoreText = this.add
      .text(0, -120, `Final Score: ${this.gameOverData.finalScore}`, {
        fontFamily: 'Poppins',
        fontSize: '24px',
        color: '#ECF0F1',
        align: 'center',
      })
      .setOrigin(0.5);
    modalCard.add(scoreText);

    // Session time display
    const timeText = this.add
      .text(0, -80, `Session Time: ${this.formatTime(this.gameOverData.sessionTime)}`, {
        fontFamily: 'Poppins',
        fontSize: '20px',
        color: '#95A5A6',
        align: 'center',
      })
      .setOrigin(0.5);
    modalCard.add(timeText);

    // Best score display
    const bestScoreText = this.add
      .text(0, -40, `Best Score: ${this.gameOverData.bestScore}`, {
        fontFamily: 'Poppins',
        fontSize: '18px',
        color: '#F1C40F',
        align: 'center',
      })
      .setOrigin(0.5);
    modalCard.add(bestScoreText);

    // Scale-up animation for modal (~250ms as per spec)
    modalCard.setScale(0.1);
    modalCard.setAlpha(0);
    
    this.tweens.add({
      targets: modalCard,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });

    // Initial responsive layout
    this.updateLayout(this.scale.width, this.scale.height);

    // Update layout on canvas resize / orientation change
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    // Create buttons for navigation
    this.createButtons();
  }

  private createButtons(): void {
    const { width, height } = this.scale;

    // Play Again button (auto-focused)
    const playAgainButton = this.add
      .text(width / 2, height * 0.7, 'Play Again', {
        fontFamily: 'Poppins',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#3498DB', // Bright Blue
        padding: { x: 25, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playAgainButton.setScale(1.1))
      .on('pointerout', () => playAgainButton.setScale(1.0))
      .on('pointerdown', () => {
        playAgainButton.setScale(0.95);
        // Restart game with UIScene
        this.scene.start('Game');
        this.scene.launch('UI');
      })
      .on('pointerup', () => playAgainButton.setScale(1.1));

    // View Leaderboard button
    const leaderboardButton = this.add
      .text(width / 2, height * 0.8, 'View Leaderboard', {
        fontFamily: 'Poppins',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#95A5A6', // Mid Grey
        padding: { x: 25, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => leaderboardButton.setScale(1.1))
      .on('pointerout', () => leaderboardButton.setScale(1.0))
      .on('pointerdown', () => {
        leaderboardButton.setScale(0.95);
        // TODO: Show leaderboard
        console.log('Leaderboard clicked - TODO: Implement leaderboard view');
      })
      .on('pointerup', () => leaderboardButton.setScale(1.1));

    // Return to Splash Screen button
    const mainMenuButton = this.add
      .text(width / 2, height * 0.9, 'Main Menu', {
        fontFamily: 'Poppins',
        fontSize: '18px',
        color: '#ffffff',
        backgroundColor: '#34495E', // Near Black
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => mainMenuButton.setScale(1.1))
      .on('pointerout', () => mainMenuButton.setScale(1.0))
      .on('pointerdown', () => {
        mainMenuButton.setScale(0.95);
        this.scene.start('SplashScreen');
      })
      .on('pointerup', () => mainMenuButton.setScale(1.1));
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

    // Compute scale factor (never enlarge above 1×)
    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    // Centre and scale the game-over text
    if (this.gameover_text) {
      this.gameover_text.setScale(scaleFactor);
    }
  }
}
