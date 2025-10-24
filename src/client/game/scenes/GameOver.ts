import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { NeonBackgroundSystem } from '../utils/NeonBackgroundSystem';
import { DOMTextRenderer } from '../utils/DOMTextRenderer';

interface GameOverData {
  finalScore: number;
  sessionTime: number;
  bestScore: number;
  targetColor: string;
  userRank?: number;
}

export class GameOver extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Rectangle;
  private dimmedOverlay: Phaser.GameObjects.Rectangle;
  private gameOverData: GameOverData;
  private neonBackground: NeonBackgroundSystem | null = null;
  private domRenderer: DOMTextRenderer | null = null;

  constructor() {
    super('GameOver');
  }

  shutdown(): void {
    // Generate unique session ID for this GameOver shutdown
    const sessionId = `GAMEOVER_SHUTDOWN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] GameOver scene shutdown started`);
      
      // Clean up DOM modal
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] Cleaning up DOM modal...`);
      const modalContainer = document.getElementById('game-over-modal');
      if (modalContainer && modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
      }
      
      // Remove CSS animations
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] Removing CSS animations...`);
      const styleElement = document.getElementById('game-over-neon-styles');
      if (styleElement) {
        styleElement.remove();
      }
      
      
      // Clean up neon background system
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] Cleaning up neon background system...`);
      if (this.neonBackground) {
        this.neonBackground.destroy();
        this.neonBackground = null;
      }
      
      // Clean up DOM renderer
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] Cleaning up DOM renderer...`);
      if (this.domRenderer) {
        this.domRenderer.destroy();
        this.domRenderer = null;
      }
      
      // Kill all tweens
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] Killing all tweens...`);
      if (this.tweens) {
        this.tweens.killAll();
      }
      
      console.log(`[${sessionId}] [GAMEOVER_SHUTDOWN] GameOver scene shutdown completed`);
    } catch (error) {
      console.error(`[${sessionId}] [GAMEOVER_SHUTDOWN] Error during GameOver scene shutdown:`, error);
    }
  }

  init(data: GameOverData): void {
    // Generate unique session ID for this GameOver scene
    const sessionId = `GAMEOVER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_INIT] GameOver scene init called with data:`, data);
    
    try {
      // Add temporary error handler to catch destroy errors during GameOver init
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        if (typeof message === 'string' && message.includes('Cannot read properties of undefined (reading \'destroy\')')) {
          console.error(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_INIT] Caught destroy error during GameOver init:`, {
            message,
            source,
            lineno,
            colno,
            error,
            stack: error?.stack
          });
          // Restore original error handler
          window.onerror = originalOnError;
          return true; // Prevent default error handling
        }
        // Let other errors through to original handler
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      // Store game over data passed from Game scene
      this.gameOverData = data || {
        finalScore: 0,
        sessionTime: 0,
        bestScore: 0,
        targetColor: '#E74C3C',
        userRank: undefined
      };

      console.log(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_INIT] GameOver scene init completed`);
      
      // Restore original error handler after a short delay
      setTimeout(() => {
        window.onerror = originalOnError;
      }, 1000);
    } catch (error) {
      console.error(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_INIT] Error during GameOver scene init:`, error);
    }
  }

  create() {
    // Generate unique session ID for this GameOver scene creation
    const sessionId = `GAMEOVER_CREATE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_CREATE] GameOver scene create called`);
    
    try {
      // Add temporary error handler to catch destroy errors during GameOver create
      const originalOnError = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        if (typeof message === 'string' && message.includes('Cannot read properties of undefined (reading \'destroy\')')) {
          console.error(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_CREATE] Caught destroy error during GameOver create:`, {
            message,
            source,
            lineno,
            colno,
            error,
            stack: error?.stack
          });
          // Restore original error handler
          window.onerror = originalOnError;
          return true; // Prevent default error handling
        }
        // Let other errors through to original handler
        if (originalOnError) {
          return originalOnError(message, source, lineno, colno, error);
        }
        return false;
      };
      
      // Clear any existing DOM elements from previous sessions first
      console.log(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_CREATE] Clearing existing DOM elements...`);
      this.clearExistingDOMElements();
      
      // Configure camera
      this.camera = this.cameras.main;
      this.camera.setBackgroundColor(0x080808); // Deep Space Black background
      
      // Fade in from black for smooth transition (with safety check for tests)
      if (this.cameras?.main?.fadeIn) {
        this.cameras.main.fadeIn(250, 0, 0, 0);
      }
      
      console.log('[BLAST_DEBUG] GameOver scene camera configured');
      
      // Restore original error handler after a short delay
      setTimeout(() => {
        window.onerror = originalOnError;
      }, 1000);
    } catch (error) {
      console.error(`[BLAST_DEBUG] [${sessionId}] [GAMEOVER_CREATE] Error during GameOver scene create:`, error);
    }

    // Initialize and create neon background system
    this.neonBackground = new NeonBackgroundSystem(this);
    this.neonBackground.createBackground();

    // Initialize DOM renderer for text elements
    this.domRenderer = new DOMTextRenderer('game-container');

    // Create frozen game state background (graphics-only)
    this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x080808, 0).setOrigin(0);

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
    // Create DOM-based modal overlay similar to HowToPlayModal
    this.createDOMGameOverModal();
  }

  private createDOMGameOverModal(): void {
    if (!this.domRenderer) return;

    // Create modal overlay container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'game-over-modal';
    modalContainer.setAttribute('role', 'dialog');
    modalContainer.setAttribute('aria-modal', 'true');
    modalContainer.setAttribute('aria-labelledby', 'game-over-title');
    modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(8, 8, 8, 0.9);
      z-index: 2000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Orbitron', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal content container with glass morphism
    const contentContainer = document.createElement('div');
    contentContainer.className = 'modal-content';
    contentContainer.style.cssText = `
      background: rgba(30, 30, 30, 0.95);
      border-radius: 12px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      padding: 24px;
      box-shadow: 0 0 30px rgba(255, 0, 0, 0.3), 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 0, 0, 0.4);
      color: #ffffff;
      box-sizing: border-box;
      outline: none;
      backdrop-filter: blur(10px) saturate(180%);
    `;

    // Create close button (X)
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close Game Over modal');
    closeButton.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      width: 32px;
      height: 32px;
      min-width: 44px;
      min-height: 44px;
      border: 2px solid rgba(255, 0, 0, 0.6);
      background: rgba(30, 30, 30, 0.8);
      color: #ffffff;
      font-size: 20px;
      font-weight: bold;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      z-index: 1;
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 15px rgba(255, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(5px);
    `;

    // Add close button hover effects
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 0, 0, 0.3)';
      closeButton.style.transform = 'scale(1.1)';
      closeButton.style.boxShadow = '0 0 25px rgba(255, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(30, 30, 30, 0.8)';
      closeButton.style.transform = 'scale(1)';
      closeButton.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
    });

    closeButton.addEventListener('click', () => {
      this.handleMainMenu();
    });

    // Create modal header
    const header = this.createGameOverHeader();
    contentContainer.appendChild(header);

    // Create game over content sections
    const sectionsContainer = this.createGameOverSections();
    contentContainer.appendChild(sectionsContainer);

    // Create action buttons
    const buttonsContainer = this.createGameOverButtons();
    contentContainer.appendChild(buttonsContainer);

    // Add close button to content container
    contentContainer.appendChild(closeButton);

    // Add content container to modal
    modalContainer.appendChild(contentContainer);

    // Add modal to document body
    document.body.appendChild(modalContainer);

    // Inject CSS animations for neon effects
    this.injectGameOverAnimations();

    // Add entrance animation
    modalContainer.style.opacity = '0';
    contentContainer.style.transform = 'scale(0.9) translateY(-20px)';
    contentContainer.style.transition = 'all 0.3s ease-out';

    // Trigger animation
    requestAnimationFrame(() => {
      modalContainer.style.transition = 'opacity 0.3s ease-out';
      modalContainer.style.opacity = '1';
      contentContainer.style.transform = 'scale(1) translateY(0)';
    });

    // Modal is now managed by DOM, no need to store reference
  }

  private createGameOverHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = `
      text-align: center;
      margin-bottom: 24px;
      padding-right: 60px;
    `;

    const title = document.createElement('h1');
    title.className = 'modal-title';
    title.id = 'game-over-title';
    title.textContent = 'GAME OVER';
    title.style.cssText = `
      font-size: 28px;
      font-weight: bold;
      color: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.2;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 5px rgba(255, 0, 0, 0.8), 0 0 10px rgba(255, 0, 0, 0.6), 0 0 15px rgba(255, 0, 0, 0.4);
      text-transform: uppercase;
      letter-spacing: 1px;
      animation: titleGlow 3s ease-in-out infinite;
    `;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = 'COLOR DOT RUSH';
    subtitle.style.cssText = `
      font-size: 16px;
      color: rgba(255, 255, 255, 0.8);
      margin: 8px 0 0 0;
      padding: 0;
      font-weight: 400;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);

    return header;
  }

  private createGameOverSections(): HTMLElement {
    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'modal-sections';
    sectionsContainer.style.cssText = `
      padding: 20px;
      margin-bottom: 24px;
      border-radius: 8px;
      background: rgba(30, 30, 30, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Add rank/congratulations section if user has a rank
    if (this.gameOverData.userRank && this.gameOverData.userRank <= 5) {
      const rankSection = this.createRankSection();
      sectionsContainer.appendChild(rankSection);
    }

    // Final Score section
    const scoreSection = this.createGameOverInfoItem(
      '🎯',
      'FINAL SCORE',
      `${this.gameOverData.finalScore}`,
      'rgba(0, 191, 255, 0.8)',
      false
    );
    sectionsContainer.appendChild(scoreSection);

    // Session Time section
    const timeSection = this.createGameOverInfoItem(
      '⏱️',
      'SESSION TIME',
      `${this.gameOverData.sessionTime.toFixed(1)}s`,
      'rgba(0, 255, 0, 0.8)',
      false
    );
    sectionsContainer.appendChild(timeSection);

    // Best Score section (last item, no border)
    const isNewRecord = this.gameOverData.finalScore === this.gameOverData.bestScore && this.gameOverData.finalScore > 0;
    const bestScoreSection = this.createGameOverInfoItem(
      isNewRecord ? '🏆' : '📊',
      isNewRecord ? 'NEW RECORD!' : 'BEST SCORE',
      `${this.gameOverData.bestScore}`,
      isNewRecord ? 'rgba(255, 215, 0, 0.9)' : 'rgba(255, 255, 255, 0.7)',
      true // Last item, no border
    );
    sectionsContainer.appendChild(bestScoreSection);

    return sectionsContainer;
  }

  private createGameOverInfoItem(icon: string, title: string, value: string, glowColor: string, isLast: boolean = false): HTMLElement {
    const item = document.createElement('div');
    item.className = 'game-over-info-item';
    item.style.cssText = `
      padding: 12px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: ${isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'};
    `;

    const leftSide = document.createElement('div');
    leftSide.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const iconElement = document.createElement('div');
    iconElement.textContent = icon;
    iconElement.style.cssText = `
      font-size: 20px;
      filter: drop-shadow(0 0 8px ${glowColor});
    `;

    const titleElement = document.createElement('span');
    titleElement.textContent = title;
    titleElement.style.cssText = `
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      font-family: 'Orbitron', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    const valueElement = document.createElement('div');
    valueElement.textContent = value;
    valueElement.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: #ffffff;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 10px ${glowColor}, 0 0 20px ${glowColor}40;
    `;

    leftSide.appendChild(iconElement);
    leftSide.appendChild(titleElement);
    item.appendChild(leftSide);
    item.appendChild(valueElement);

    return item;
  }

  private createRankSection(): HTMLElement {
    const rankSection = document.createElement('div');
    rankSection.className = 'rank-section';
    rankSection.style.cssText = `
      padding: 16px 0;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 16px;
    `;

    // Congratulations message
    const congratsElement = document.createElement('div');
    congratsElement.textContent = '🎉 CONGRATULATIONS! 🎉';
    congratsElement.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #F1C40F;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 10px rgba(241, 196, 15, 0.8), 0 0 20px rgba(241, 196, 15, 0.6);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;

    // Rank display
    const rankElement = document.createElement('div');
    const rank = this.gameOverData.userRank!;
    const rankText = rank === 1 ? '🥇 1ST PLACE!' : 
                     rank === 2 ? '🥈 2ND PLACE!' : 
                     rank === 3 ? '🥉 3RD PLACE!' : 
                     `🏆 RANK: ${rank}`;
    rankElement.textContent = rankText;
    rankElement.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      color: #E74C3C;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 8px rgba(231, 76, 60, 0.8), 0 0 16px rgba(231, 76, 60, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    rankSection.appendChild(congratsElement);
    rankSection.appendChild(rankElement);

    return rankSection;
  }

  private createGameOverButtons(): HTMLElement {
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'modal-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Play Again button
    const playAgainButton = this.createGameOverButton(
      'PLAY AGAIN',
      'rgba(0, 255, 0, 0.2)',
      'rgba(0, 255, 0, 0.6)',
      '#00FF00',
      () => this.handlePlayAgain()
    );
    buttonsContainer.appendChild(playAgainButton);

    // Leaderboard button
    const leaderboardButton = this.createGameOverButton(
      'LEADERBOARD',
      'rgba(255, 105, 180, 0.2)',
      'rgba(255, 105, 180, 0.6)',
      '#FF69B4',
      () => this.handleLeaderboard()
    );
    buttonsContainer.appendChild(leaderboardButton);

    // Main Menu button
    const mainMenuButton = this.createGameOverButton(
      'MAIN MENU',
      'rgba(0, 191, 255, 0.2)',
      'rgba(0, 191, 255, 0.6)',
      '#00BFFF',
      () => this.handleMainMenu()
    );
    buttonsContainer.appendChild(mainMenuButton);

    return buttonsContainer;
  }

  private createGameOverButton(text: string, bgColor: string, borderColor: string, glowColor: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      background: ${bgColor};
      border: 2px solid ${borderColor};
      color: #ffffff;
      font-size: 16px;
      font-weight: bold;
      font-family: 'Orbitron', sans-serif;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-shadow: 0 0 5px ${glowColor};
      box-shadow: 0 0 15px ${borderColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(5px);
      outline: none;
    `;

    // Add hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = borderColor;
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = `0 0 25px ${glowColor}, 0 0 50px ${glowColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = bgColor;
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = `0 0 15px ${borderColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`;
    });

    button.addEventListener('click', onClick);

    return button;
  }

  private injectGameOverAnimations(): void {
    // Create or update style element for neon animations
    let styleElement = document.getElementById('game-over-neon-styles') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'game-over-neon-styles';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      @keyframes titleGlow {
        0%, 100% {
          text-shadow: 0 0 5px rgba(255, 0, 0, 0.8), 
                       0 0 10px rgba(255, 0, 0, 0.6), 
                       0 0 15px rgba(255, 0, 0, 0.4);
        }
        50% {
          text-shadow: 0 0 10px rgba(255, 0, 0, 1), 
                       0 0 20px rgba(255, 0, 0, 0.8), 
                       0 0 30px rgba(255, 0, 0, 0.6);
        }
      }
      
      @keyframes iconPulse {
        0%, 100% {
          filter: drop-shadow(0 0 8px rgba(255, 0, 0, 0.6));
          transform: scale(1);
        }
        50% {
          filter: drop-shadow(0 0 15px rgba(255, 0, 0, 0.9));
          transform: scale(1.1);
        }
      }
      
      .modal-title {
        animation: titleGlow 3s ease-in-out infinite;
      }
    `;
  }









  private handlePlayAgain(): void {
    this.hideModal(() => {
      try {
        // Clear any existing DOM elements from previous game session BEFORE starting Game scene
        this.clearExistingDOMElements();
        
        console.log('GameOver: Preparing to restart game...');
        
        // Stop SimpleUI if it's running - the Game scene will restart it properly
        if (this.scene.isActive('SimpleUI') || this.scene.isSleeping('SimpleUI')) {
          console.log('GameOver: Stopping existing SimpleUI scene for restart...');
          this.scene.stop('SimpleUI');
        }
        
        if (this.cameras?.main?.fadeOut) {
          this.cameras.main.fadeOut(250, 0, 0, 0);
          this.cameras.main.once('camerafadeoutcomplete', () => {
            // Start Game scene - it will handle launching SimpleUI via initializeUIScene()
            console.log('GameOver: Starting Game scene (will initialize UI scene)...');
            this.scene.start('Game');
          });
        } else {
          // Fallback for test environment
          console.log('GameOver: Starting Game scene (will initialize UI scene)...');
          this.scene.start('Game');
        }
      } catch (error) {
        console.error('Error restarting game:', error);
      }
    });
  }

  private clearExistingDOMElements(): void {
    try {
      console.log('GameOver: Clearing existing DOM elements...');
      
      // Clear DOM text overlay container
      const domTextOverlay = document.getElementById('dom-text-overlay');
      if (domTextOverlay) {
        domTextOverlay.innerHTML = '';
        console.log('GameOver: Cleared dom-text-overlay');
      }
      
      // Clear any remaining DOM elements that might be from previous game session
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        // Remove any DOM elements that might be lingering
        const domElements = gameContainer.querySelectorAll('[id^="dom-"], [class*="dom-"]');
        domElements.forEach(element => {
          if (element.parentNode) {
            element.parentNode.removeChild(element);
          }
        });
        console.log(`GameOver: Removed ${domElements.length} lingering DOM elements`);
      }
      
      // Clear any neon button CSS that might be cached
      const neonButtonStyles = document.getElementById('neon-button-styles');
      if (neonButtonStyles) {
        neonButtonStyles.remove();
      }
      
      // Clear any neon text CSS that might be cached
      const neonTextStyles = document.getElementById('neon-text-styles');
      if (neonTextStyles) {
        neonTextStyles.remove();
      }
      
      console.log('GameOver: DOM cleanup completed');
    } catch (error) {
      console.warn('GameOver: Error clearing DOM elements:', error);
    }
  }

  private handleLeaderboard(): void {
    this.hideModal(() => {
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
            });
          }

  private handleMainMenu(): void {
    this.hideModal(() => {
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
            });
          }

  private hideModal(onComplete?: () => void): void {
    const modalContainer = document.getElementById('game-over-modal');
    if (!modalContainer) {
      onComplete?.();
      return;
    }

    const contentContainer = modalContainer.querySelector('.modal-content') as HTMLElement;
    
    // Start hide animation
    modalContainer.style.transition = 'opacity 0.2s ease-in';
    modalContainer.style.opacity = '0';
    
    if (contentContainer) {
      contentContainer.style.transition = 'all 0.2s ease-in';
      contentContainer.style.transform = 'scale(0.9) translateY(-20px)';
    }

    // Complete hide after animation
    setTimeout(() => {
      if (modalContainer.parentNode) {
        modalContainer.parentNode.removeChild(modalContainer);
      }
      
      // Remove CSS animations
      const styleElement = document.getElementById('game-over-neon-styles');
      if (styleElement) {
        styleElement.remove();
      }
      
      onComplete?.();
    }, 200);
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
    
    // Update neon background system
    if (this.neonBackground) {
      this.neonBackground.updateDimensions(width, height);
    }

    // Update DOM renderer size
    if (this.domRenderer) {
      this.domRenderer.updateSize(width, height);
    }

    // Modal is now DOM-based, no need to reposition
  }
}
