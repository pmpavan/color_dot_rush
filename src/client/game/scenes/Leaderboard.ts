import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { ILeaderboardService, DevvitLeaderboardService, MockLeaderboardService } from '../../services/LeaderboardService';
import { LeaderboardEntry } from '../../../shared/types/api';
import { DOMTextRenderer, DOMTextStyle } from '../utils/DOMTextRenderer';
import { ResponsiveLayoutManager } from '../utils/ResponsiveLayoutManager';
import { NeonBackgroundSystem } from '../utils/NeonBackgroundSystem';
import { NeonButtonConfig, NeonButtonVariant, NeonButtonSize } from '../utils/NeonButtonSystem';
import { NeonTextEffects, NeonTextEffectType, NeonTextSize } from '../utils/NeonTextEffects';
import { GlowEffects } from '../utils/GlowEffects';
import { UIColor } from '../../../shared/types/game';
import { injectGoogleFontsCSS } from '../assets/FontAssets';

export class Leaderboard extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Rectangle;
  private leaderboardService: ILeaderboardService;
  private loadingText: Phaser.GameObjects.Text | null = null;
  private backButton: Phaser.GameObjects.Container | null = null;
  private domTextRenderer: DOMTextRenderer | null = null;
  private layoutManager: ResponsiveLayoutManager;
  private currentLeaderboardData: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number } | null = null;
  private neonBackground: NeonBackgroundSystem | null = null;
  private orientationChangeHandler: (() => void) | null = null;

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

    // Clean up neon background system
    if (this.neonBackground) {
      this.neonBackground.destroy();
      this.neonBackground = null;
    }

    // Remove neon animations CSS
    const styleElement = document.getElementById('leaderboard-neon-styles');
    if (styleElement) {
      styleElement.remove();
    }

    // Clear DOM elements
    this.clearDOMElements();

    // Clear stored data
    this.currentLeaderboardData = null;

    // Remove resize event listener
    this.scale.off('resize');

    // Remove orientation change event listeners
    if (typeof window !== 'undefined' && this.orientationChangeHandler) {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
    }
  }

  init(): void {
    // Reset scene state
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
    this.camera.setBackgroundColor(0x080808); // Deep Space Black background

    // Fade in from black for smooth transition
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    // Inject Google Fonts (Orbitron) for Neon Pulse theme
    injectGoogleFontsCSS();
    
    // Initialize DOM text renderer for usernames
    this.domTextRenderer = new DOMTextRenderer('game-container');
    
    // Debug: Check if DOMTextRenderer was created successfully
    console.log('Leaderboard: DOMTextRenderer created:', !!this.domTextRenderer);
    const gameContainer = document.getElementById('game-container');
    const domOverlay = document.getElementById('dom-text-overlay');
    console.log('Leaderboard: Game container exists:', !!gameContainer);
    console.log('Leaderboard: DOM overlay exists:', !!domOverlay);

    // Initialize and create neon background system
    this.neonBackground = new NeonBackgroundSystem(this);
    this.neonBackground.createBackground();

    // Inject CSS animations for neon effects
    this.injectNeonAnimations();

    // Background rectangle (since no background texture is loaded)
    this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x080808, 0).setOrigin(0) as any;

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

    // Simple orientation change handling
    if (typeof window !== 'undefined') {
      this.orientationChangeHandler = () => {
        setTimeout(() => {
          const { width, height } = this.scale;
          this.updateLayout(width, height);
          this.handleResize(width, height);
        }, 100);
      };
      window.addEventListener('orientationchange', this.orientationChangeHandler);
    }
  }

  private injectNeonAnimations(): void {
    // Create or update style element for neon animations
    let styleElement = document.getElementById('leaderboard-neon-styles') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'leaderboard-neon-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      @keyframes medalPulse {
        0%, 100% {
          box-shadow: 0 0 10px rgba(241, 196, 15, 0.5), 0 0 20px rgba(241, 196, 15, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(241, 196, 15, 0.8), 0 0 40px rgba(241, 196, 15, 0.5);
        }
      }
      
      @keyframes championGlow {
        0%, 100% {
          box-shadow: 0 0 30px rgba(241, 196, 15, 0.5), 0 0 60px rgba(241, 196, 15, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.3);
        }
        50% {
          box-shadow: 0 0 40px rgba(241, 196, 15, 0.8), 0 0 80px rgba(241, 196, 15, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.5);
        }
      }
      
      @keyframes silverPulse {
        0%, 100% {
          box-shadow: 0 0 10px rgba(192, 192, 192, 0.5), 0 0 20px rgba(192, 192, 192, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(192, 192, 192, 0.8), 0 0 40px rgba(192, 192, 192, 0.5);
        }
      }
      
      @keyframes bronzePulse {
        0%, 100% {
          box-shadow: 0 0 10px rgba(205, 127, 50, 0.5), 0 0 20px rgba(205, 127, 50, 0.3);
        }
        50% {
          box-shadow: 0 0 20px rgba(205, 127, 50, 0.8), 0 0 40px rgba(205, 127, 50, 0.5);
        }
      }
    `;
  }

  private createBackButton(): void {
    // Create back button with blue border but no background or glow
    const buttonBg = this.add.rectangle(50, 70, 80, 40, 0x000000, 0); // Transparent background - increased top margin
    buttonBg.setStrokeStyle(2, 0x00BFFF, 0.8); // Electric Blue border

    // Add arrow icon (left-pointing triangle) - centered in the button
    const arrow = this.add.triangle(50, 70, -8, 0, 8, -6, 8, 6, 0xFFFFFF);

    // Create container for the button
    const backButtonContainer = this.add.container(0, 0);
    backButtonContainer.add(buttonBg);
    backButtonContainer.add(arrow);

    this.backButton = backButtonContainer as any;

    backButtonContainer
      .setInteractive(new Phaser.Geom.Rectangle(10, 50, 80, 40), Phaser.Geom.Rectangle.Contains)
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
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '24px',
        color: '#00BFFF',
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
      console.log('Entries count:', leaderboardData.entries.length);
      console.log('Entries:', leaderboardData.entries);

      // Hide loading text
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }

      // For testing: Create mock data if no entries
      if (leaderboardData.entries.length === 0) {
        console.log('No leaderboard entries, creating mock data for testing');
        const mockData = {
          entries: [
            { rank: 1, username: 'TestPlayer1', score: 1500, timestamp: Date.now() },
            { rank: 2, username: 'TestPlayer2', score: 1200, timestamp: Date.now() },
            { rank: 3, username: 'TestPlayer3', score: 1000, timestamp: Date.now() },
            { rank: 4, username: 'TestPlayer4', score: 800, timestamp: Date.now() },
            { rank: 5, username: 'TestPlayer5', score: 600, timestamp: Date.now() }
          ],
          userRank: 6,
          totalPlayers: 25
        };
        console.log('Using mock data:', mockData);
        this.displayLeaderboard(mockData);
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

    // Debug: Test DOMTextRenderer visibility (removed for production)
    console.log('Leaderboard: DOMTextRenderer is working, creating leaderboard content');

    // Create page title
    console.log('Leaderboard: Creating page header');
    this.createPageHeader(width);

    // Create champion section for 1st place
    if (data.entries.length > 0) {
      console.log('Leaderboard: Creating champion section for:', data.entries[0]);
      this.createChampionSection(data.entries[0], width);
    }

    // Create regular leaderboard for ranks 2+
    if (data.entries.length > 1) {
      console.log('Leaderboard: Creating regular leaderboard with', data.entries.length - 1, 'entries');
      this.createRegularLeaderboardFromData(data.entries.slice(1), width, data.userRank);
    } else {
      console.log('Leaderboard: Only 1 entry (champion), no regular entries to create');
    }

    // Calculate the bottom position based on content
    const entriesCount = data.entries.length;
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

    // Enable scrolling after content is created
    // Delay to ensure DOM elements are created
    setTimeout(() => {
      this.enableScrolling();
    }, 100);
    
    // Debug: Log container dimensions and content height
    console.log('Leaderboard: Content analysis:', {
      entriesCount: data.entries.length,
      lastEntryY: 340 + (data.entries.length - 1) * 60,
      totalPlayersY: 340 + (data.entries.length - 1) * 60 + 80
    });

    // Debug: Check DOM text elements visibility
    this.debugDOMTextVisibility();
  }



  private showUserRank(userRank: number, totalPlayers: number, yPosition: number): void {
    const { width } = this.scale;

    // Use DOM text for user rank
    if (this.domTextRenderer) {
      const userRankStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
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
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
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

    // Calculate content height based on leaderboard data
    const entriesCount = this.currentLeaderboardData?.entries.length || 0;
    const entryHeight = 60;
    const championHeight = 200;
    const regularEntriesHeight = Math.max(0, entriesCount - 1) * entryHeight;
    const totalPlayersHeight = 80;
    const padding = 100;
    
    const totalContentHeight = championHeight + regularEntriesHeight + totalPlayersHeight + padding;
    
    console.log('Leaderboard: Content height calculation:', {
      entriesCount,
      championHeight,
      regularEntriesHeight,
      totalPlayersHeight,
      totalContentHeight,
      viewportHeight: height
    });

    // Configure ONLY the DOM text overlay container for scrolling
    const domContainer = document.getElementById('dom-text-overlay');
    if (domContainer) {
      domContainer.style.overflowY = 'auto';
      domContainer.style.overflowX = 'hidden';
      domContainer.style.height = `${height}px`;
      domContainer.style.width = `${width}px`;
      domContainer.style.position = 'absolute';
      domContainer.style.top = '0';
      domContainer.style.left = '0';
      domContainer.style.zIndex = '1000';
      domContainer.style.pointerEvents = 'auto'; // Enable scroll interaction
      (domContainer.style as any).webkitOverflowScrolling = 'touch'; // Smooth scrolling on iOS
      console.log('Leaderboard: DOM container configured for scrolling');
    }

    // Add invisible spacer to ensure scrolling works if content is tall enough
    if (totalContentHeight > height) {
      this.addScrollingSpacer(width, totalContentHeight + 100);
      console.log('Leaderboard: Added scrolling spacer for content height:', totalContentHeight);
    }

    // Verify scrolling is working
    setTimeout(() => {
      this.verifyScrolling();
    }, 200);
  }

  private showEmptyLeaderboard(): void {
    const { width, height } = this.scale;

    // Use DOM text for empty state
    if (this.domTextRenderer) {
      const emptyStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'normal',
        color: '#95A5A6',
        textAlign: 'center'
      };

      const playButtonConfig: NeonButtonConfig = {
        variant: NeonButtonVariant.PRIMARY,
        size: NeonButtonSize.LARGE,
        width: 200,
        height: 50
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

        renderer.createNeonButton(
          'play-now-button',
          'Play Now',
          width / 2,
          height / 2 + 80,
          playButtonConfig,
          () => this.startGame()
        );
      }
    }
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
    console.log('Leaderboard: Creating page header, DOMTextRenderer available:', !!this.domTextRenderer);
    // Add page header text using DOM with Electric Blue glow
    if (this.domTextRenderer) {
      const titleStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        textShadow: NeonTextEffects.createTextShadow({
          effectType: NeonTextEffectType.GLOW_BLUE,
          size: NeonTextSize.TITLE,
          intensity: 0.8,
          animation: true
        })
      };

      const titleX = width / 2;
      const titleY = 120; // Page header at top - moved higher

      const renderer = this.domTextRenderer;
      if (renderer) {
        console.log('Leaderboard: Creating title text at', titleX, titleY);
        const textElement = renderer.createText(
          'leaderboard-title',
          'WEEKLY LEADERBOARD',
          titleX,
          titleY,
          titleStyle
        );
        console.log('Leaderboard: Title text element created:', !!textElement);
      } else {
        console.log('Leaderboard: No DOMTextRenderer available for title');
      }
    }
  }

  private createChampionSection(champion: LeaderboardEntry | any, width: number): void {
    const centerX = width / 2;
    const championY = 200; // Moved up from 240

    // Create champion avatar using DOM element with special glow
    this.createChampionAvatarDOM(centerX, championY);

    // Add champion text using DOM with neon effects
    if (this.domTextRenderer) {
      const championNameStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#FFFFFF',
        textAlign: 'center',
        textShadow: NeonTextEffects.createTextShadow({
          effectType: NeonTextEffectType.GLOW_WHITE,
          size: NeonTextSize.LARGE,
          intensity: 0.7,
          animation: true
        })
      };

      const championScoreStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '28px',
        fontWeight: 'bold',
        color: '#F1C40F',
        textAlign: 'center',
        textShadow: NeonTextEffects.createTextShadow({
          effectType: NeonTextEffectType.GLOW_ORANGE,
          size: NeonTextSize.HERO,
          intensity: 0.9,
          animation: true
        })
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        // Champion name (below avatar)
        renderer.createText(
          'champion-name',
          champion.username || 'CHAMPION',
          centerX,
          championY + 60,
          championNameStyle
        );

        // Champion score (below name)
        renderer.createText(
          'champion-score',
          `${champion.score} POINTS`,
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

      // Avatars removed - using medal symbols for ranks 2 and 3 instead

      // Add username using DOM text
      if (this.domTextRenderer) {
        const usernameStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
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

      // Add score using DOM text with Volt Green glow
      if (this.domTextRenderer) {
        const scoreStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#00FF00',
          textAlign: 'center',
          textShadow: NeonTextEffects.createTextShadow({
            effectType: NeonTextEffectType.GLOW_GREEN,
            size: NeonTextSize.LARGE,
            intensity: 0.8,
            animation: false
          })
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
    console.log('Leaderboard: createRegularLeaderboardFromData called with', entries.length, 'entries');
    console.log('Leaderboard: DOMTextRenderer available:', !!this.domTextRenderer);
    const layout = this.getResponsiveLayout(width);
    const startY = 340; // Start below champion section - moved up from 380

    entries.forEach((entry, index) => {
      console.log(`Leaderboard: Creating entry ${index + 1}:`, entry);
      const yPos = startY + (index * 60); // Increased spacing for better padding
      const displayRank = entry.rank; // Use actual rank from data
      const isUserEntry = userRank === entry.rank;

      // Create entry background using DOM element instead of Phaser graphics
      this.createEntryBackground(layout.centerX, yPos, layout.entryWidth, displayRank);

      // Avatars removed - using medal symbols for ranks 2 and 3 instead

      // Add rank using DOM text
      if (this.domTextRenderer) {
        let rankText = `${displayRank}`;
        if (displayRank === 2) rankText = '🥈';
        else if (displayRank === 3) rankText = '🥉';

        const rankStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '18px',
          fontWeight: isUserEntry ? 'bold' : 'normal',
          color: isUserEntry ? '#F1C40F' : '#FFFFFF',
          textAlign: 'center'
        };

        const renderer = this.domTextRenderer;
        if (renderer) {
          console.log(`Leaderboard: Creating rank text for rank ${displayRank} at (${layout.rankX}, ${yPos})`);
          const rankElement = renderer.createText(
            `rank-${displayRank}`,
            rankText,
            layout.rankX,
            yPos,
            rankStyle
          );
          console.log(`Leaderboard: Rank text element created:`, !!rankElement);
        } else {
          console.log(`Leaderboard: No DOMTextRenderer for rank ${displayRank}`);
        }
      }

      // Add username using DOM text
      if (this.domTextRenderer) {
        const playerName = entry.username.length > 15 ?
          entry.username.substring(0, 12) + '...' : entry.username;

        const usernameStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '16px',
          fontWeight: isUserEntry ? 'bold' : 'normal',
          color: isUserEntry ? '#F1C40F' : '#FFFFFF',
          textAlign: 'center'
        };

        const usernameX = layout.playerX; // Responsive center position
        const renderer = this.domTextRenderer;
        if (renderer) {
          console.log(`Leaderboard: Creating username text for rank ${displayRank}: "${playerName}" at (${usernameX}, ${yPos})`);
          const usernameElement = renderer.createText(
            `username-${displayRank}`,
            playerName,
            usernameX,
            yPos,
            usernameStyle
          );
          console.log(`Leaderboard: Username text element created:`, !!usernameElement);
        } else {
          console.log(`Leaderboard: No DOMTextRenderer for username ${displayRank}`);
        }
      }

      // Add score using DOM text with Volt Green glow
      if (this.domTextRenderer) {
        const scoreStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '18px',
          fontWeight: 'bold',
          color: isUserEntry ? '#F1C40F' : '#00FF00',
          textAlign: 'center',
          textShadow: NeonTextEffects.createTextShadow({
            effectType: isUserEntry ? NeonTextEffectType.GLOW_ORANGE : NeonTextEffectType.GLOW_GREEN,
            size: NeonTextSize.LARGE,
            intensity: 0.8,
            animation: false
          })
        };

        const scoreX = layout.scoreX; // Responsive right side
        const renderer = this.domTextRenderer;
        if (renderer) {
          console.log(`Leaderboard: Creating score text for rank ${displayRank}: ${entry.score} at (${scoreX}, ${yPos})`);
          const scoreElement = renderer.createText(
            `score-${displayRank}`,
            entry.score.toString(),
            scoreX,
            yPos,
            scoreStyle
          );
          console.log(`Leaderboard: Score text element created:`, !!scoreElement);
        } else {
          console.log(`Leaderboard: No DOMTextRenderer for score ${displayRank}`);
        }
      }

      // Add "YOU" indicator for user's entry with distinct background glow
      if (isUserEntry) {
        const youStyle: DOMTextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#FFFFFF',
          textAlign: 'center',
          background: 'rgba(231, 76, 60, 0.8)',
          padding: '6px 12px',
          borderRadius: '6px',
          border: '2px solid #FF0000',
          textShadow: NeonTextEffects.createTextShadow({
            effectType: NeonTextEffectType.GLOW_RED,
            size: NeonTextSize.SMALL,
            intensity: 0.9,
            animation: true
          }),
          boxShadow: '0 0 15px rgba(255, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
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
    
    // Update neon background system
    if (this.neonBackground) {
      this.neonBackground.updateDimensions(width, height);
    }

    // Update scrolling container to match new dimensions
    this.updateScrollingContainer(width, height);
  }

  private updateScrollingContainer(width: number, height: number): void {
    const domContainer = document.getElementById('dom-text-overlay');
    if (domContainer) {
      domContainer.style.width = `${width}px`;
      domContainer.style.height = `${height}px`;
    }
    
    console.log('Leaderboard: Updated DOM container dimensions to', width, 'x', height);
  }

  private addScrollingSpacer(width: number, yPosition: number): void {
    // Add invisible DOM element to ensure content extends beyond viewport
    if (this.domTextRenderer) {
      const spacerStyle: DOMTextStyle = {
        fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
        fontSize: '1px',
        fontWeight: 'normal',
        color: 'transparent',
        textAlign: 'center',
        width: '1px',
        height: '1px'
      };

      const renderer = this.domTextRenderer;
      if (renderer) {
        renderer.createText(
          'scrolling-spacer',
          ' ', // Invisible space
          width / 2,
          yPosition, // Use the calculated position
          spacerStyle
        );

        console.log('Leaderboard: Added scrolling spacer at Y:', yPosition);
      }
    }
  }

  private createEntryBackground(centerX: number, yPos: number, width: number, rank: number): void {
    if (this.domTextRenderer) {
      // Create a DOM element for the entry background with digital structured look
      const bgElement = document.createElement('div');
      bgElement.id = `entry-bg-${rank}`;
      
      // Determine if this is a top 3 entry for special styling
      const isTop3 = rank <= 3;
      const glowColor = rank === 1 ? '#F1C40F' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : '#00BFFF';
      
      bgElement.style.cssText = `
        position: absolute;
        left: ${centerX - width / 2}px;
        top: ${yPos - 25}px;
        width: ${width}px;
        height: 50px;
        background: ${isTop3 ? 
          `linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(50, 50, 50, 0.8) 100%)` : 
          `linear-gradient(135deg, rgba(20, 20, 20, 0.8) 0%, rgba(40, 40, 40, 0.6) 100%)`
        };
        border: 2px solid ${glowColor};
        border-radius: 8px;
        pointer-events: none;
        z-index: 999;
        padding: 8px 0;
        box-sizing: border-box;
        box-shadow: ${isTop3 ? 
          `0 0 20px ${glowColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.1)` :
          `0 0 10px ${glowColor}30, inset 0 1px 0 rgba(255, 255, 255, 0.05)`
        };
        backdrop-filter: blur(5px);
      `;

      const container = document.getElementById('dom-text-overlay');
      if (container) {
        container.appendChild(bgElement);
      }
    }
  }

  // Avatar creation method removed - using medal symbols for ranks 2 and 3 instead

  // Medal DOM creation method removed - using medal symbols in rank text instead

  private createChampionAvatarDOM(x: number, y: number): void {
    if (this.domTextRenderer) {
      // Create champion avatar background circle with special gold glow
      const avatarElement = document.createElement('div');
      avatarElement.id = 'champion-avatar';
      avatarElement.style.cssText = `
        position: absolute;
        left: ${x - 35}px;
        top: ${y - 35}px;
        width: 70px;
        height: 70px;
        background: radial-gradient(circle, #F1C40F 0%, #E67E22 100%);
        border: 4px solid #FFFFFF;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 0 30px #F1C40F80, 0 0 60px #F1C40F40, inset 0 2px 0 rgba(255, 255, 255, 0.3);
        animation: championGlow 3s ease-in-out infinite;
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
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
      `;
      silhouetteElement.innerHTML = '👤'; // Person emoji as placeholder

      avatarElement.appendChild(silhouetteElement);

      // Create gold medal with special glow
      const medalElement = document.createElement('div');
      medalElement.id = 'champion-medal';
      medalElement.style.cssText = `
        position: absolute;
        left: ${x + 25 - 12}px;
        top: ${y - 25 - 12}px;
        width: 24px;
        height: 24px;
        background: radial-gradient(circle, #F1C40F 0%, #E67E22 100%);
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 0 20px #F1C40F80, 0 0 40px #F1C40F40;
        animation: medalPulse 2s ease-in-out infinite;
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

    // Update DOM text renderer size
    if (this.domTextRenderer) {
      this.domTextRenderer.updateSize(width, height);
    }

    // Update scrolling container dimensions
    this.updateScrollingContainer(width, height);

    // Re-enable scrolling with new dimensions
    this.enableScrolling();
  }

  private clearDOMElements(): void {
    const container = document.getElementById('dom-text-overlay');
    if (container) {
      // Remove all custom DOM elements (backgrounds only - avatars and medals removed)
      const elementsToRemove = container.querySelectorAll('[id^="entry-bg-"], #champion-avatar, #champion-medal');
      elementsToRemove.forEach(element => {
        element.remove();
      });
      console.log('Leaderboard: Cleared', elementsToRemove.length, 'DOM elements');
    }
  }

  private recreateLeaderboardDOM(data: { entries: LeaderboardEntry[]; userRank?: number; totalPlayers: number }, width: number): void {
    console.log('Leaderboard: Recreating leaderboard DOM for width:', width);
    
    // Simple approach - just update the layout without recreating everything
    if (this.domTextRenderer) {
      this.domTextRenderer.updateSize(width, this.scale.height);
    }
    
    console.log('Leaderboard: Updated layout for', data.entries.length, 'entries');
  }

  private getResponsiveLayout(width: number) {
    // Use ResponsiveLayoutManager approach for consistent responsive behavior
    const isDesktop = !this.layoutManager.isMobileLayout();
    const margins = this.layoutManager.getMinimumMargins();
    console.log('Leaderboard: getResponsiveLayout called with width:', width, 'isDesktop:', isDesktop);

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

    const layout = {
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
    
    console.log('Leaderboard: Layout calculated:', layout);
    return layout;
  }


  private verifyScrolling(): void {
    const domContainer = document.getElementById('dom-text-overlay');
    
    if (domContainer) {
      const scrollHeight = domContainer.scrollHeight;
      const clientHeight = domContainer.clientHeight;
      const canScroll = scrollHeight > clientHeight;
      
      console.log('Leaderboard: Scrolling verification:', {
        scrollHeight,
        clientHeight,
        canScroll,
        overflowY: domContainer.style.overflowY,
        pointerEvents: domContainer.style.pointerEvents,
        isScrollable: canScroll ? 'YES - Content can scroll' : 'NO - Content fits in viewport'
      });
      
      if (!canScroll) {
        console.warn('Leaderboard: Content does not exceed viewport height. No scrolling needed.');
      } else {
        console.log('Leaderboard: ✅ Scrolling enabled successfully!');
      }
    } else {
      console.error('Leaderboard: DOM text overlay container not found!');
    }
  }

  private debugDOMTextVisibility(): void {
    if (!this.domTextRenderer) {
      console.log('Leaderboard: No DOMTextRenderer available for debugging');
      return;
    }

    const container = this.domTextRenderer.getContainer();
    console.log('Leaderboard: DOM Text Container Debug:', {
      containerExists: !!container,
      containerVisible: container ? container.offsetWidth > 0 && container.offsetHeight > 0 : false,
      containerStyles: container ? {
        position: container.style.position,
        zIndex: container.style.zIndex,
        display: container.style.display,
        visibility: container.style.visibility,
        opacity: container.style.opacity,
        overflow: container.style.overflow
      } : null,
      containerRect: container ? container.getBoundingClientRect() : null
    });

    // Check a few sample text elements
    const sampleIds = ['leaderboard-title', 'champion-name', 'username-2', 'score-2'];
    sampleIds.forEach(id => {
      const element = document.getElementById(`dom-text-${id}`);
      if (element) {
        console.log(`Leaderboard: Element ${id} debug:`, {
          exists: !!element,
          visible: element.offsetWidth > 0 && element.offsetHeight > 0,
          styles: {
            position: element.style.position,
            zIndex: element.style.zIndex,
            display: element.style.display,
            visibility: element.style.visibility,
            opacity: element.style.opacity,
            color: element.style.color,
            fontSize: element.style.fontSize
          },
          rect: element.getBoundingClientRect()
        });
      } else {
        console.log(`Leaderboard: Element ${id} not found in DOM`);
      }
    });
  }
}
