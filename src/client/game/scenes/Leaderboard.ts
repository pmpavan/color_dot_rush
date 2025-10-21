import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { ILeaderboardService, DevvitLeaderboardService, MockLeaderboardService } from '../../services/LeaderboardService';
import { LeaderboardEntry } from '../../../shared/types/api';
import { DOMTextRenderer, DOMTextStyle } from '../utils/DOMTextRenderer';
import { ResponsiveLayoutManager } from '../utils/ResponsiveLayoutManager';

export class Leaderboard extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Rectangle;
  private leaderboardService: ILeaderboardService;
  private leaderboardContainer: Phaser.GameObjects.Container | null = null;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private backButton: Phaser.GameObjects.Container | null = null;
  private domTextRenderer: DOMTextRenderer | null = null;
  private layoutManager: ResponsiveLayoutManager;
  private currentLeaderboardData: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number } | null = null;

  constructor() {
    super('Leaderboard');

    // Initialize leaderboard service based on environment
    if (process.env.NODE_ENV === 'production') {
      this.leaderboardService = new DevvitLeaderboardService();
    } else {
      this.leaderboardService = new MockLeaderboardService();
    }

    // Initialize responsive layout manager
    this.layoutManager = new ResponsiveLayoutManager(this);
  }

  shutdown(): void {
    // Clean up DOM text renderer
    if (this.domTextRenderer) {
      this.domTextRenderer.destroy();
      this.domTextRenderer = null;
    }

    // Clean up layout manager
    if (this.layoutManager) {
      this.layoutManager.destroy();
    }

    // Clear DOM elements
    this.clearDOMElements();

    // Clear stored data
    this.currentLeaderboardData = null;

    // Remove resize event listener
    this.scale.off('resize');
  }

  init(): void {
    // Reset scene state
    this.leaderboardContainer = null;
    this.loadingText = null;
    this.backButton = null;
    this.domTextRenderer = null;
  }

  preload(): void {
    // Create a simple fallback to prevent font loading errors
    // This ensures text objects can be created without external font dependencies
    console.log('Leaderboard: Preload started - using graphics-only mode');
  }

  create(): void {
    // Configure camera
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background

    // Fade in from black for smooth transition
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    // Initialize DOM text renderer for usernames
    this.domTextRenderer = new DOMTextRenderer('game-container');

    // Background rectangle (since no background texture is loaded)
    this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x34495E, 0.3).setOrigin(0) as any;

    // Create UI elements
    // this.();
    this.createBackButton();
    this.showLoadingState();

    // Load leaderboard data
    this.loadLeaderboardData();

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
      this.handleResize(width, height);
    });
  }

  private createBackButton(): void {

    // Create graphics-based back button instead of text
    const buttonBg = this.add.rectangle(50, 50, 80, 40, 0x34495E, 1);
    buttonBg.setStrokeStyle(2, 0xFFFFFF, 0.8);

    // Add arrow icon (left-pointing triangle)
    const arrow = this.add.triangle(35, 50, 0, 0, 10, -8, 10, 8, 0xFFFFFF);

    // Create container for the button
    const backButtonContainer = this.add.container(0, 0);
    backButtonContainer.add(buttonBg);
    backButtonContainer.add(arrow);

    this.backButton = backButtonContainer as any;

    backButtonContainer
      .setInteractive(new Phaser.Geom.Rectangle(10, 30, 80, 40), Phaser.Geom.Rectangle.Contains)
      .setData('useHandCursor', true)
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

    // Use basic system fonts to avoid font loading issues
    try {
      this.loadingText = this.add.text(width / 2, height / 2, 'Loading leaderboard...', {
        fontFamily: 'Arial, sans-serif',
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
    } catch (error) {
      console.warn('Leaderboard: Could not create loading text, using graphics fallback');
      // Fallback to graphics if text creation fails
      const loadingCircle = this.add.circle(width / 2, height / 2, 30, 0x3498DB, 0.3);
      this.loadingText = loadingCircle as any;
    }
  }

  private async loadLeaderboardData(): Promise<void> {
    try {
      console.log('Loading leaderboard data...');

      const leaderboardData = await this.leaderboardService.getTopScores();
      console.log('Leaderboard data received:', leaderboardData);

      // Hide loading text
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }

      if (leaderboardData.entries.length === 0) {
        console.log('No leaderboard entries, showing empty state');
        this.showEmptyLeaderboard();
      } else {
        console.log(`Displaying ${leaderboardData.entries.length} leaderboard entries`);
        try {
          this.displayLeaderboard(leaderboardData);
        } catch (displayError) {
          console.warn('Text-based leaderboard failed, using graphics fallback:', displayError);
          this.showGraphicsLeaderboard(leaderboardData);
        }
      }

    } catch (error) {
      console.error('Failed to load leaderboard:', error);

      // Hide loading text
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }

      // Show a simple graphics-based leaderboard as fallback
      this.showGraphicsLeaderboard();
    }
  }

  private displayLeaderboard(data: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number }): void {
    const { width } = this.scale;

    // Store current data for resize handling
    this.currentLeaderboardData = data;

    // Create page title
    this.createPageHeader(width);

    // Create champion section for 1st place
    if (data.entries.length > 0) {
      this.createChampionSection(data.entries[0], width);
    }

    // Create regular leaderboard for ranks 2+
    if (data.entries.length > 1) {
      this.createRegularLeaderboardFromData(data.entries.slice(1), width, data.userRank);
    }

    // Calculate the bottom position based on content
    const entriesCount = data.entries.length;
    const championSectionHeight = 150; // Champion section takes about 150px
    const entryHeight = 60; // Each entry is 60px (increased for padding)
    const regularEntriesHeight = Math.max(0, entriesCount - 1) * entryHeight;
    let currentY = 340 + regularEntriesHeight + 60; // Start after regular entries + padding - moved up from 380

    // Show user's rank if not in top 10
    if (data.userRank && data.userRank > 10) {
      this.showUserRank(data.userRank, data.totalPlayers, currentY);
      currentY += 80; // Add space after user rank
    }

    // Show total players at the bottom
    this.showTotalPlayers(data.totalPlayers, width, currentY);

    // Enable scrolling by making the DOM container scrollable
    // Delay to ensure DOM elements are created
    setTimeout(() => {
      this.enableScrolling();
    }, 50);
  }



  private showUserRank(userRank: number, totalPlayers: number, yPosition: number): void {
    const { width } = this.scale;

    // Use DOM text for user rank
    if (this.domTextRenderer) {
      const userRankStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        fontWeight: 'bold',
        color: '#F1C40F',
        textAlign: 'center',
        background: '#2C3E50',
        padding: '10px 20px',
        borderRadius: '8px'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'user-rank',
          `Your Rank: ${userRank} of ${totalPlayers}`,
          width / 2,
          yPosition,
          userRankStyle
        );
      }
    }
  }

  private showTotalPlayers(totalPlayers: number, width: number, yPosition: number): void {
    // Show total players using DOM text at the bottom
    if (this.domTextRenderer) {
      const totalPlayersStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontWeight: 'normal',
        color: '#95A5A6',
        textAlign: 'center'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'total-players',
          `Total Players This Week: ${totalPlayers}`,
          width / 2,
          yPosition,
          totalPlayersStyle
        );
      }
    }
  }

  private enableScrolling(): void {
    const { width, height } = this.scale;

    console.log('Leaderboard: Enabling scrolling for', width, 'x', height);

    // Enable scrolling for the DOM text overlay container
    if (this.domTextRenderer) {
      const container = document.getElementById('dom-text-overlay');
      if (container) {
        console.log('Leaderboard: Configuring DOM text overlay for scrolling');

        // Reset any existing styles that might interfere
        container.style.cssText = '';

        // Set up scrollable container
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
        container.style.overflowY = 'scroll'; // Force scrollbar to always show
        container.style.overflowX = 'hidden';
        container.style.scrollBehavior = 'smooth';
        container.style.zIndex = '1000';

        // Add significant bottom padding to ensure scrolling works
        container.style.paddingBottom = '200px';

        // Force minimum content height to ensure scrolling
        const minContentHeight = height + 300; // Always taller than viewport
        container.style.minHeight = `${minContentHeight}px`;

        console.log('Leaderboard: DOM container configured for scrolling');
      } else {
        console.warn('Leaderboard: DOM text overlay container not found');
      }
    }

    // Also configure the game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      console.log('Leaderboard: Configuring game container for scrolling');

      // Ensure game container allows scrolling
      gameContainer.style.overflowY = 'auto';
      gameContainer.style.height = `${height}px`;
      gameContainer.style.width = `${width}px`;
      gameContainer.style.position = 'relative';

      console.log('Leaderboard: Game container configured');
    } else {
      console.warn('Leaderboard: Game container not found');
    }

    // Force a layout recalculation
    setTimeout(() => {
      const container = document.getElementById('dom-text-overlay');
      if (container) {
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        console.log('Leaderboard: Scroll check - scrollHeight:', scrollHeight, 'clientHeight:', clientHeight, 'scrollable:', scrollHeight > clientHeight);

        // If content isn't scrollable, add more padding
        if (scrollHeight <= clientHeight) {
          container.style.paddingBottom = '400px';
          console.log('Leaderboard: Added extra padding to force scrolling');
        }
      }
    }, 100);
  }

  private showEmptyLeaderboard(): void {
    const { width, height } = this.scale;

    // Use DOM text for empty state
    if (this.domTextRenderer) {
      const emptyStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'normal',
        color: '#95A5A6',
        textAlign: 'center'
      };

      const playButtonStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        background: '#3498DB',
        padding: '15px 30px',
        borderRadius: '8px'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'empty-message',
          'No scores yet this week!\nBe the first to play and set a record!',
          width / 2,
          height / 2,
          emptyStyle
        );

        renderer.createButton(
          'play-now-button',
          'Play Now',
          width / 2,
          height / 2 + 80,
          200,
          50,
          playButtonStyle,
          () => this.startGame()
        );
      }
    }
  }

  private showErrorState(): void {
    const { width, height } = this.scale;

    // Use DOM text for error state
    if (this.domTextRenderer) {
      const errorStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'normal',
        color: '#E74C3C',
        textAlign: 'center'
      };

      const retryButtonStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'normal',
        color: '#FFFFFF',
        textAlign: 'center',
        background: '#95A5A6',
        padding: '12px 25px',
        borderRadius: '6px'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'error-message',
          '⚠️ Could not load leaderboard\nPlease check your connection and try again',
          width / 2,
          height / 2,
          errorStyle
        );

        renderer.createButton(
          'retry-button',
          'Retry',
          width / 2,
          height / 2 + 80,
          120,
          45,
          retryButtonStyle,
          () => this.scene.restart()
        );
      }
    }
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
    // Clean up DOM text renderer
    if (this.domTextRenderer) {
      this.domTextRenderer.destroy();
      this.domTextRenderer = null;
    }

    // Smooth transition back to splash screen (main menu)
    if (this.cameras?.main?.fadeOut) {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('SplashScreen');
      });
    } else {
      this.scene.start('SplashScreen');
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

  private showGraphicsLeaderboard(data?: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number }): void {
    const { width } = this.scale;

    // Store current data for resize handling
    if (data) {
      this.currentLeaderboardData = data;
    }

    // Use actual data if provided, otherwise use sample data
    let displayData;
    let totalPlayers = 5;
    let userRank: number | undefined;

    if (data && data.entries.length > 0) {
      displayData = data.entries.slice(0, 5).map((entry, index) => ({
        rank: entry.rank,
        color: index === 0 ? 0xF1C40F : index === 1 ? 0xC0C0C0 : index === 2 ? 0xCD7F32 : 0x95A5A6,
        score: entry.score,
        username: entry.username
      }));
      totalPlayers = data.totalPlayers;
      userRank = data.userRank;
    } else {
      // Fallback sample data
      displayData = [
        { rank: 1, color: 0xF1C40F, score: 156, username: 'ColorMaster' }, // Gold
        { rank: 2, color: 0xC0C0C0, score: 142, username: 'DotHunter' }, // Silver  
        { rank: 3, color: 0xCD7F32, score: 138, username: 'ReflexKing' }, // Bronze
        { rank: 4, color: 0x95A5A6, score: 125, username: 'SpeedTapper' }, // Gray
        { rank: 5, color: 0x95A5A6, score: 119, username: 'BombDodger' }, // Gray
      ];

      // Create mock data for resize handling
      this.currentLeaderboardData = {
        entries: displayData.map(item => ({
          rank: item.rank,
          score: item.score,
          username: item.username,
          timestamp: Date.now() - (item.rank * 3600000) // Mock timestamps, 1 hour apart
        })),
        ...(userRank !== undefined && { userRank }),
        totalPlayers
      };
    }

    // Create page header
    this.createPageHeader(width);

    // Create champion section for 1st place
    if (displayData.length > 0) {
      this.createChampionSection(displayData[0], width);
    }

    // Create regular leaderboard for ranks 2-5
    if (displayData.length > 1) {
      this.createRegularLeaderboard(displayData.slice(1), width);
    }

    // Calculate the bottom position based on content
    const entriesCount = displayData.length;
    const regularEntriesHeight = Math.max(0, entriesCount - 1) * 60; // Each entry is 60px (increased for padding)
    let currentY = 340 + regularEntriesHeight + 60; // Start after regular entries + padding - moved up from 380

    // Show user's rank if not in top 10
    if (userRank && userRank > 10) {
      this.showUserRank(userRank, totalPlayers, currentY);
      currentY += 80; // Add space after user rank
    }

    // Show total players at the bottom
    this.showTotalPlayers(totalPlayers, width, currentY);

    // Add invisible spacer to ensure scrolling works
    this.addScrollingSpacer(width, currentY + 100);

    // Add invisible spacer to ensure scrolling works
    this.addScrollingSpacer(width, currentY + 100);

    // Enable scrolling
    // Delay to ensure DOM elements are created
    setTimeout(() => {
      this.enableScrolling();
    }, 50);
  }

  private createPageHeader(width: number): void {
    // Add page header text using DOM
    if (this.domTextRenderer) {
      const titleStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center'
      };

      const titleX = width / 2;
      const titleY = 120; // Page header at top - moved higher

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'leaderboard-title',
          'Weekly Leaderboard',
          titleX,
          titleY,
          titleStyle
        );
      }
    }
  }

  private createChampionSection(champion: LeaderboardEntry | any, width: number): void {
    const centerX = width / 2;
    const championY = 200; // Moved up from 240

    // Create champion avatar using DOM element
    this.createChampionAvatarDOM(centerX, championY);

    // Add champion text using DOM
    if (this.domTextRenderer) {
      const championNameStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center'
      };

      const championScoreStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#F1C40F',
        textAlign: 'center'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        // Champion name (below avatar)
        renderer.createText(
          'champion-name',
          champion.username || 'Champion',
          centerX,
          championY + 60,
          championNameStyle
        );

        // Champion score (below name)
        renderer.createText(
          'champion-score',
          `${champion.score} points`,
          centerX,
          championY + 85,
          championScoreStyle
        );
      }
    }
  }

  private createRegularLeaderboard(entries: any[], width: number): void {
    const layout = this.getResponsiveLayout(width);
    const startY = 340; // Start below champion section - moved up from 380

    entries.forEach((entry, index) => {
      const yPos = startY + (index * 60); // Increased spacing for better padding

      // Create entry background using DOM element instead of Phaser graphics
      this.createEntryBackground(layout.centerX, yPos, layout.entryWidth, entry.rank);

      // Create avatar using DOM element instead of Phaser graphics
      const avatarX = layout.centerX - (layout.avatarOffset * 0.6); // Slightly less offset for regular entries
      this.createAvatarDOM(avatarX, yPos, entry.rank);

      // Medal is now handled in createAvatarDOM method

      // Add username using DOM text
      if (this.domTextRenderer) {
        const usernameStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'normal',
          color: '#FFFFFF',
          textAlign: 'center'
        };

        const usernameX = layout.playerX; // Responsive center position
        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `username-${index + 1}`, // +1 because champion is index 0
            entry.username || `Player ${entry.rank}`,
            usernameX,
            yPos - 8,
            usernameStyle
          );
        }
      }

      // Add score using DOM text
      if (this.domTextRenderer) {
        const scoreStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#2ECC71',
          textAlign: 'center'
        };

        const scoreX = layout.scoreX; // Responsive right side
        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `score-${index + 1}`, // +1 because champion is index 0
            entry.score.toString(),
            scoreX,
            yPos - 8,
            scoreStyle
          );
        }
      }
    });
  }

  private createRegularLeaderboardFromData(entries: LeaderboardEntry[], width: number, userRank?: number): void {
    const layout = this.getResponsiveLayout(width);
    const startY = 340; // Start below champion section - moved up from 380

    entries.forEach((entry, index) => {
      const yPos = startY + (index * 60); // Increased spacing for better padding
      const displayRank = entry.rank; // Use actual rank from data
      const isUserEntry = userRank === entry.rank;

      // Create entry background using DOM element instead of Phaser graphics
      this.createEntryBackground(layout.centerX, yPos, layout.entryWidth, displayRank);

      // Create avatar using DOM element instead of Phaser graphics
      const avatarX = layout.centerX - layout.avatarOffset;
      this.createAvatarDOM(avatarX, yPos, displayRank);

      // Medal is now handled in createAvatarDOM method

      // Add rank using DOM text
      if (this.domTextRenderer) {
        let rankText = `${displayRank}`;
        // if (displayRank === 2) rankText = '🥈';
        // else if (displayRank === 3) rankText = '🥉';

        const rankStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          fontWeight: isUserEntry ? 'bold' : 'normal',
          color: isUserEntry ? '#F1C40F' : '#FFFFFF',
          textAlign: 'center'
        };

        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `rank-${displayRank}`,
            rankText,
            layout.rankX,
            yPos,
            rankStyle
          );
        }
      }

      // Add username using DOM text
      if (this.domTextRenderer) {
        const playerName = entry.username.length > 15 ?
          entry.username.substring(0, 12) + '...' : entry.username;

        const usernameStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          fontWeight: isUserEntry ? 'bold' : 'normal',
          color: isUserEntry ? '#F1C40F' : '#FFFFFF',
          textAlign: 'center'
        };

        const usernameX = layout.playerX; // Responsive center position
        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `username-${displayRank}`,
            playerName,
            usernameX,
            yPos,
            usernameStyle
          );
        }
      }

      // Add score using DOM text
      if (this.domTextRenderer) {
        const scoreStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          fontWeight: 'bold',
          color: isUserEntry ? '#F1C40F' : '#2ECC71',
          textAlign: 'center'
        };

        const scoreX = layout.scoreX; // Responsive right side
        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `score-${displayRank}`,
            entry.score.toString(),
            scoreX,
            yPos,
            scoreStyle
          );
        }
      }

      // Add "YOU" indicator for user's entry
      if (isUserEntry) {
        const youStyle: DOMTextStyle = {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
          background: '#E74C3C',
          padding: '4px 8px',
          borderRadius: '4px'
        };

        const renderer = this.domTextRenderer;
        if (renderer) {
          renderer.createText(
            `you-${displayRank}`,
            'YOU',
            layout.youX,
            yPos,
            youStyle
          );
        }
      }
    });
  }

  private createAvatarPlaceholder(x: number, y: number, radius: number, color: number): void {
    // Create a proper person silhouette placeholder
    const scale = radius / 35; // Scale based on avatar size (35 is the champion size)

    // Head (circle)
    const headRadius = 8 * scale;
    const headY = y - (12 * scale);
    this.add.circle(x, headY, headRadius, color, 1);

    // Neck (small rectangle)
    const neckWidth = 4 * scale;
    const neckHeight = 4 * scale;
    const neckY = y - (4 * scale);
    this.add.rectangle(x, neckY, neckWidth, neckHeight, color, 1);

    // Torso (rounded rectangle)
    const torsoWidth = 16 * scale;
    const torsoHeight = 18 * scale;
    const torsoY = y + (6 * scale);
    this.add.rectangle(x, torsoY, torsoWidth, torsoHeight, color, 1);

    // Arms (ellipses on sides)
    const armWidth = 6 * scale;
    const armHeight = 14 * scale;
    const armOffset = 10 * scale;
    const armY = y + (2 * scale);
    this.add.ellipse(x - armOffset, armY, armWidth, armHeight, color, 0.9);
    this.add.ellipse(x + armOffset, armY, armWidth, armHeight, color, 0.9);

    // Legs (rectangles at bottom)
    const legWidth = 5 * scale;
    const legHeight = 12 * scale;
    const legOffset = 4 * scale;
    const legY = y + (18 * scale);
    this.add.rectangle(x - legOffset, legY, legWidth, legHeight, color, 0.9);
    this.add.rectangle(x + legOffset, legY, legWidth, legHeight, color, 0.9);
  }

  private updateLayout(width: number, height: number): void {
    // Resize camera viewport
    this.cameras.resize(width, height);

    // Stretch background to fill entire screen
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Update DOM text renderer container size
    if (this.domTextRenderer) {
      this.domTextRenderer.updateSize(width, height);
    }

    // Update scrolling container to match new dimensions
    this.updateScrollingContainer(width, height);
  }

  private updateScrollingContainer(width: number, height: number): void {
    const container = document.getElementById('dom-text-overlay');
    if (container) {
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;
      container.style.maxHeight = `${height}px`;
    }

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.width = `${width}px`;
      gameContainer.style.height = `${height}px`;
    }
  }

  private addScrollingSpacer(width: number, yPosition: number): void {
    // Add invisible DOM element to ensure content extends beyond viewport
    if (this.domTextRenderer) {
      const spacerStyle: DOMTextStyle = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '1px',
        fontWeight: 'normal',
        color: 'transparent',
        textAlign: 'center'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'scrolling-spacer',
          ' ', // Invisible space
          width / 2,
          yPosition + 200, // Add significant space below content
          spacerStyle
        );

        console.log('Leaderboard: Added scrolling spacer at Y:', yPosition + 200);
      }
    }
  }

  private createEntryBackground(centerX: number, yPos: number, width: number, rank: number): void {
    if (this.domTextRenderer) {
      // Create a DOM element for the entry background with padding
      const bgElement = document.createElement('div');
      bgElement.id = `entry-bg-${rank}`;
      bgElement.style.cssText = `
        position: absolute;
        left: ${centerX - width / 2}px;
        top: ${yPos - 25}px;
        width: ${width}px;
        height: 50px;
        background-color: rgba(52, 73, 94, 0.6);
        border: 1px solid rgba(127, 140, 141, 0.3);
        border-radius: 6px;
        pointer-events: none;
        z-index: 999;
        padding: 8px 0;
        box-sizing: border-box;
      `;

      const container = document.getElementById('dom-text-overlay');
      if (container) {
        container.appendChild(bgElement);
      }
    }
  }

  private createAvatarDOM(x: number, y: number, rank: number): void {
    if (this.domTextRenderer) {
      // Determine avatar color based on rank
      let avatarColor = '#95A5A6'; // Default gray
      if (rank === 2) avatarColor = '#C0C0C0'; // Silver
      else if (rank === 3) avatarColor = '#CD7F32'; // Bronze

      // Create avatar background circle
      const avatarElement = document.createElement('div');
      avatarElement.id = `avatar-${rank}`;
      avatarElement.style.cssText = `
        position: absolute;
        left: ${x - 18}px;
        top: ${y - 18}px;
        width: 36px;
        height: 36px;
        background-color: ${avatarColor};
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        opacity: 0.8;
        pointer-events: none;
        z-index: 1000;
      `;

      // Create person silhouette inside avatar
      const silhouetteElement = document.createElement('div');
      silhouetteElement.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 24px;
        height: 24px;
        color: #FFFFFF;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      silhouetteElement.innerHTML = '👤'; // Person emoji as placeholder

      avatarElement.appendChild(silhouetteElement);

      const container = document.getElementById('dom-text-overlay');
      if (container) {
        container.appendChild(avatarElement);
      }

      // Add medal for ranks 2-3
      if (rank === 2 || rank === 3) {
        this.createMedalDOM(x + 13, y - 13, rank);
      }
    }
  }

  private createMedalDOM(x: number, y: number, rank: number): void {
    if (this.domTextRenderer) {
      // Create medal background
      const medalBgElement = document.createElement('div');
      medalBgElement.id = `medal-bg-${rank}`;
      medalBgElement.style.cssText = `
        position: absolute;
        left: ${x - 8}px;
        top: ${y - 8}px;
        width: 16px;
        height: 16px;
        background-color: #FFFFFF;
        border: 1px solid #95A5A6;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
      `;

      const medalEmoji = rank === 2 ? '🥈' : '🥉';
      medalBgElement.innerHTML = medalEmoji;

      const container = document.getElementById('dom-text-overlay');
      if (container) {
        container.appendChild(medalBgElement);
      }
    }
  }

  private createChampionAvatarDOM(x: number, y: number): void {
    if (this.domTextRenderer) {
      // Create champion avatar background circle
      const avatarElement = document.createElement('div');
      avatarElement.id = 'champion-avatar';
      avatarElement.style.cssText = `
        position: absolute;
        left: ${x - 35}px;
        top: ${y - 35}px;
        width: 70px;
        height: 70px;
        background-color: #F1C40F;
        border: 4px solid #FFFFFF;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
      `;

      // Create person silhouette inside avatar
      const silhouetteElement = document.createElement('div');
      silhouetteElement.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 50px;
        height: 50px;
        color: #FFFFFF;
        font-size: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      silhouetteElement.innerHTML = '👤'; // Person emoji as placeholder

      avatarElement.appendChild(silhouetteElement);

      // Create gold medal
      const medalElement = document.createElement('div');
      medalElement.id = 'champion-medal';
      medalElement.style.cssText = `
        position: absolute;
        left: ${x + 25 - 12}px;
        top: ${y - 25 - 12}px;
        width: 24px;
        height: 24px;
        background-color: #FFFFFF;
        border: 2px solid #F1C40F;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      `;
      medalElement.innerHTML = '🥇';

      const container = document.getElementById('dom-text-overlay');
      if (container) {
        container.appendChild(avatarElement);
        container.appendChild(medalElement);
      }
    }
  }

  private handleResize(width: number, height: number): void {
    console.log('Leaderboard: Handling resize to', width, 'x', height);

    // Clear existing DOM elements (except text which is handled by DOMTextRenderer)
    this.clearDOMElements();

    // Update scrolling container dimensions
    this.updateScrollingContainer(width, height);

    // Recreate leaderboard with new dimensions if we have data
    if (this.currentLeaderboardData) {
      console.log('Leaderboard: Recreating DOM elements for new dimensions');
      this.recreateLeaderboardDOM(this.currentLeaderboardData, width);
    }

    // Re-enable scrolling with new dimensions
    setTimeout(() => {
      this.enableScrolling();
    }, 50);
  }

  private clearDOMElements(): void {
    const container = document.getElementById('dom-text-overlay');
    if (container) {
      // Remove all custom DOM elements (backgrounds, avatars, medals)
      const elementsToRemove = container.querySelectorAll('[id^="entry-bg-"], [id^="avatar-"], [id^="medal-bg-"], #champion-avatar, #champion-medal');
      elementsToRemove.forEach(element => {
        element.remove();
      });
      console.log('Leaderboard: Cleared', elementsToRemove.length, 'DOM elements');
    }
  }

  private recreateLeaderboardDOM(data: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number }, width: number): void {
    const layout = this.getResponsiveLayout(width);

    // Recreate champion avatar if we have entries
    if (data.entries.length > 0) {
      const centerX = width / 2;
      const championY = 200;
      this.createChampionAvatarDOM(centerX, championY);
    }

    // Recreate regular leaderboard entries
    if (data.entries.length > 1) {
      const startY = 340;
      data.entries.slice(1).forEach((entry, index) => {
        const yPos = startY + (index * 60); // Increased spacing for better padding
        const displayRank = entry.rank;

        // Recreate entry background
        this.createEntryBackground(layout.centerX, yPos, layout.entryWidth, displayRank);

        // Recreate avatar
        const avatarX = layout.centerX - layout.avatarOffset;
        this.createAvatarDOM(avatarX, yPos, displayRank);
      });
    }

    console.log('Leaderboard: Recreated DOM elements for', data.entries.length, 'entries');
  }

  private getResponsiveLayout(width: number) {
    // Use ResponsiveLayoutManager approach for consistent responsive behavior
    const isDesktop = !this.layoutManager.isMobileLayout();
    const margins = this.layoutManager.getMinimumMargins();

    // For desktop, cap content width and center it
    const maxContentWidth = 600; // Maximum content width for desktop
    const contentWidth = isDesktop ? Math.min(maxContentWidth, width - (margins.horizontal * 2)) : width * 0.9;
    const centerX = width / 2;

    // Calculate responsive spacing - use fixed spacing for desktop, percentage for mobile
    let spacing: number;
    if (isDesktop) {
      // Fixed spacing for desktop to prevent overly wide layouts
      spacing = Math.min(180, contentWidth * 0.3); // Increased spacing
    } else {
      // Percentage-based spacing for mobile
      spacing = contentWidth * 0.35;
    }

    return {
      centerX,
      contentWidth,
      spacing,
      isDesktop,
      margins,
      // Responsive positions with better spacing
      rankX: centerX - spacing - 20, // Move rank further left
      playerX: centerX,
      scoreX: centerX + spacing,
      youX: centerX + spacing + 60,
      // Entry background width - constrained for desktop
      entryWidth: isDesktop ? contentWidth : width * 0.8,
      // Avatar positioning with more space from rank
      avatarOffset: isDesktop ? Math.min(140, contentWidth * 0.23) : width * 0.25 // Increased offset
    };
  }
}
