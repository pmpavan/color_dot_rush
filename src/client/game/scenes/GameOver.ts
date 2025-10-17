import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;

  constructor() {
    super('GameOver');
  }

  create() {
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0xff0000);

    // Background – create once, full-screen
    this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.5);

    // "Game Over" text – created once and scaled responsively
    this.gameover_text = this.add
      .text(0, 0, 'Game Over', {
        fontFamily: 'Arial Black',
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

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
      this.gameover_text.setPosition(width / 2, height / 2);
      this.gameover_text.setScale(scaleFactor);
    }
  }
}
