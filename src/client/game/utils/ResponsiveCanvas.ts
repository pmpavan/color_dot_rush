/**
 * Responsive Canvas Utility for Color Rush
 * Handles dynamic canvas resizing for mobile-first Reddit experience
 */

export class ResponsiveCanvas {
  private game: Phaser.Game;
  private resizeTimeout: number | null = null;

  constructor(game: Phaser.Game) {
    this.game = game;
    this.setupResizeHandler();
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      // Debounce resize events to prevent excessive calls
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }
      
      this.resizeTimeout = window.setTimeout(() => {
        this.handleResize();
      }, 100);
    });

    // Handle orientation change on mobile
    window.addEventListener('orientationchange', () => {
      // Small delay to allow orientation change to complete
      setTimeout(() => {
        this.handleResize();
      }, 500);
    });
  }

  private handleResize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate optimal game dimensions maintaining aspect ratio
    const targetAspectRatio = 4 / 3; // 1024x768 base ratio
    let gameWidth = containerWidth;
    let gameHeight = containerHeight;

    // Adjust dimensions to maintain aspect ratio
    if (containerWidth / containerHeight > targetAspectRatio) {
      // Container is wider than target ratio
      gameWidth = containerHeight * targetAspectRatio;
    } else {
      // Container is taller than target ratio
      gameHeight = containerWidth / targetAspectRatio;
    }

    // Ensure minimum dimensions for playability
    gameWidth = Math.max(320, gameWidth);
    gameHeight = Math.max(240, gameHeight);

    // Ensure maximum dimensions for performance
    gameWidth = Math.min(2048, gameWidth);
    gameHeight = Math.min(1536, gameHeight);

    // Resize the game
    this.game.scale.resize(gameWidth, gameHeight);

    // Update canvas styling for proper centering
    const canvas = this.game.canvas;
    if (canvas) {
      canvas.style.width = `${gameWidth}px`;
      canvas.style.height = `${gameHeight}px`;
    }
  }

  /**
   * Get current game dimensions
   */
  public getDimensions(): { width: number; height: number } {
    return {
      width: this.game.scale.width,
      height: this.game.scale.height,
    };
  }

  /**
   * Check if the game is in mobile/portrait orientation
   */
  public isMobilePortrait(): boolean {
    return window.innerWidth < window.innerHeight && window.innerWidth < 768;
  }

  /**
   * Get safe area dimensions (accounting for mobile notches, etc.)
   */
  public getSafeArea(): { top: number; bottom: number; left: number; right: number } {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    };
  }

  /**
   * Clean up event listeners
   */
  public destroy(): void {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
  }
}