import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { ILeaderboardService, DevvitLeaderboardService, MockLeaderboardService } from '../../services/LeaderboardService';
import { LeaderboardEntry } from '../../../shared/types/api';

export class Leaderboard extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Image;
  private leaderboardService: ILeaderboardService;
  private leaderboardContainer: Phaser.GameObjects.Container | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private backButton: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Leaderboard');
    
    // Initialize leaderboard service based on environment
    if (process.env.NODE_ENV === 'production') {
      this.leaderboardService = new DevvitLeaderboardService();
    } else {
      this.leaderboardService = new MockLeaderboardService();
    }
  }

  init(): void {
    // Reset scene state
    this.leaderboardContainer = null;
    this.loadingText = null;
    this.backButton = null;
  }

  create(): void {
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background
    
    // Fade in from black for smooth transition
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    // Background image
    this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.3);

    // Create UI elements
    this.createHeader();
    this.createBackButton();
    this.showLoadingState();
    
    // Load leaderboard data
    this.loadLeaderboardData();

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });
  }

  private createHeader(): void {
    const { width } = this.scale;

    // Title
    const title = this.add.text(width / 2, 80, 'Weekly Leaderboard', {
      fontFamily: 'Poppins',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      align: 'center',
    }).setOrigin(0.5);

    // Subtitle with week info
    this.add.text(width / 2, 130, 'Top Players This Week', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#ECF0F1',
      align: 'center',
    }).setOrigin(0.5);

    // Add subtle glow effect to title
    this.tweens.add({
      targets: title,
      alpha: 0.8,
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private createBackButton(): void {

    this.backButton = this.add.text(50, 50, '← Back', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: '#34495E',
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0, 0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => {
      if (this.backButton) this.backButton.setScale(1.1);
    })
    .on('pointerout', () => {
      if (this.backButton) this.backButton.setScale(1.0);
    })
    .on('pointerdown', () => {
      if (this.backButton) {
        this.backButton.setScale(0.95);
        this.goBack();
      }
    })
    .on('pointerup', () => {
      if (this.backButton) this.backButton.setScale(1.1);
    });
  }

  private showLoadingState(): void {
    const { width, height } = this.scale;

    this.loadingText = this.add.text(width / 2, height / 2, 'Loading leaderboard...', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#3498DB',
      align: 'center',
    }).setOrigin(0.5);

    // Add loading animation
    this.tweens.add({
      targets: this.loadingText,
      alpha: 0.5,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private async loadLeaderboardData(): Promise<void> {
    try {
      console.log('Loading leaderboard data...');
      
      const leaderboardData = await this.leaderboardService.getTopScores();
      
      // Hide loading text
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }

      if (leaderboardData.entries.length === 0) {
        this.showEmptyLeaderboard();
      } else {
        this.displayLeaderboard(leaderboardData);
      }

    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      
      // Hide loading text
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }

      this.showErrorState();
    }
  }

  private displayLeaderboard(data: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number }): void {
    const { width, height } = this.scale;

    // Create container for leaderboard entries
    this.leaderboardContainer = this.add.container(width / 2, 200);

    // Header row
    const headerBg = this.add.rectangle(0, 0, width * 0.9, 50, 0x34495E, 0.8);
    headerBg.setStrokeStyle(2, 0xECF0F1, 0.5);
    this.leaderboardContainer.add(headerBg);

    const headerText = this.add.text(0, 0, 'Rank    Player    Score', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      align: 'center',
    }).setOrigin(0.5);
    this.leaderboardContainer.add(headerText);

    // Display entries
    data.entries.forEach((entry, index) => {
      this.createLeaderboardEntry(entry, index + 1, data.userRank);
    });

    // Show user's rank if not in top 10
    if (data.userRank && data.userRank > 10) {
      this.showUserRank(data.userRank, data.totalPlayers);
    }

    // Show total players
    this.add.text(width / 2, height - 120, 
      `Total Players This Week: ${data.totalPlayers}`, {
      fontFamily: 'Poppins',
      fontSize: '18px',
      color: '#95A5A6',
      align: 'center',
    }).setOrigin(0.5);

    // Animate entries appearing
    this.animateLeaderboardEntries();
  }

  private createLeaderboardEntry(entry: LeaderboardEntry, displayRank: number, userRank?: number): void {
    if (!this.leaderboardContainer) return;

    const { width } = this.scale;
    const yPosition = 60 + (displayRank * 50);
    
    // Highlight user's entry if it's in the top 10
    const isUserEntry = userRank === entry.rank;
    const bgColor = isUserEntry ? 0x3498DB : (displayRank % 2 === 0 ? 0x2C3E50 : 0x34495E);
    const textColor = isUserEntry ? '#FFFFFF' : '#ECF0F1';

    // Entry background
    const entryBg = this.add.rectangle(0, yPosition, width * 0.9, 45, bgColor, 0.6);
    entryBg.setStrokeStyle(1, 0x7F8C8D, 0.3);
    this.leaderboardContainer.add(entryBg);

    // Rank with medal icons for top 3
    let rankText = `${displayRank}`;
    if (displayRank === 1) rankText = '🥇';
    else if (displayRank === 2) rankText = '🥈';
    else if (displayRank === 3) rankText = '🥉';

    const rank = this.add.text(-width * 0.35, yPosition, rankText, {
      fontFamily: 'Poppins',
      fontSize: '18px',
      fontStyle: isUserEntry ? 'bold' : 'normal',
      color: textColor,
      align: 'center',
    }).setOrigin(0.5);
    this.leaderboardContainer.add(rank);

    // Player name (truncate if too long)
    const playerName = entry.username.length > 15 ? 
      entry.username.substring(0, 12) + '...' : entry.username;
    
    const player = this.add.text(-width * 0.1, yPosition, playerName, {
      fontFamily: 'Poppins',
      fontSize: '18px',
      fontStyle: isUserEntry ? 'bold' : 'normal',
      color: textColor,
      align: 'center',
    }).setOrigin(0.5);
    this.leaderboardContainer.add(player);

    // Score
    const score = this.add.text(width * 0.25, yPosition, entry.score.toString(), {
      fontFamily: 'Poppins',
      fontSize: '18px',
      fontStyle: isUserEntry ? 'bold' : 'normal',
      color: textColor,
      align: 'center',
    }).setOrigin(0.5);
    this.leaderboardContainer.add(score);

    // Add crown icon for #1 player
    if (displayRank === 1) {
      const crown = this.add.text(-width * 0.42, yPosition, '👑', {
        fontSize: '20px',
      }).setOrigin(0.5);
      this.leaderboardContainer.add(crown);
    }

    // Add "YOU" indicator for user's entry
    if (isUserEntry) {
      const youIndicator = this.add.text(width * 0.38, yPosition, 'YOU', {
        fontFamily: 'Poppins',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#F1C40F',
        backgroundColor: '#E74C3C',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5);
      this.leaderboardContainer.add(youIndicator);
    }
  }

  private showUserRank(userRank: number, totalPlayers: number): void {
    const { width, height } = this.scale;

    const userRankText = this.add.text(width / 2, height - 180, 
      `Your Rank: ${userRank} of ${totalPlayers}`, {
      fontFamily: 'Poppins',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#F1C40F',
      backgroundColor: '#2C3E50',
      padding: { x: 20, y: 10 },
      align: 'center',
    }).setOrigin(0.5);

    // Add pulsing animation to draw attention
    this.tweens.add({
      targets: userRankText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private showEmptyLeaderboard(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, 
      'No scores yet this week!\nBe the first to play and set a record!', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#95A5A6',
      align: 'center',
    }).setOrigin(0.5);

    const playButton = this.add.text(width / 2, height / 2 + 80, 'Play Now', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FFFFFF',
      backgroundColor: '#3498DB',
      padding: { x: 30, y: 15 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => playButton.setScale(1.1))
    .on('pointerout', () => playButton.setScale(1.0))
    .on('pointerdown', () => {
      playButton.setScale(0.95);
      this.startGame();
    })
    .on('pointerup', () => playButton.setScale(1.1));
  }

  private showErrorState(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, height / 2, 
      '⚠️ Could not load leaderboard\nPlease check your connection and try again', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      color: '#E74C3C',
      align: 'center',
    }).setOrigin(0.5);

    const retryButton = this.add.text(width / 2, height / 2 + 80, 'Retry', {
      fontFamily: 'Poppins',
      fontSize: '20px',
      color: '#FFFFFF',
      backgroundColor: '#95A5A6',
      padding: { x: 25, y: 12 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerover', () => retryButton.setScale(1.1))
    .on('pointerout', () => retryButton.setScale(1.0))
    .on('pointerdown', () => {
      retryButton.setScale(0.95);
      // Reload the scene to retry
      this.scene.restart();
    })
    .on('pointerup', () => retryButton.setScale(1.1));
  }

  private animateLeaderboardEntries(): void {
    if (!this.leaderboardContainer) return;

    // Animate container appearing
    this.leaderboardContainer.setAlpha(0);
    this.leaderboardContainer.setScale(0.9);

    this.tweens.add({
      targets: this.leaderboardContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Back.easeOut'
    });
  }

  private goBack(): void {
    // Smooth transition back to previous scene
    if (this.cameras?.main?.fadeOut) {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameOver');
      });
    } else {
      this.scene.start('GameOver');
    }
  }

  private startGame(): void {
    // Smooth transition to game
    if (this.cameras?.main?.fadeOut) {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Game');
        this.scene.launch('UI');
      });
    } else {
      this.scene.start('Game');
      this.scene.launch('UI');
    }
  }

  private updateLayout(width: number, height: number): void {
    // Resize camera viewport
    this.cameras.resize(width, height);

    // Stretch background to fill entire screen
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }
  }
}
