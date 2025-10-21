import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { DOMTextRenderer, DOMTextStyle } from '../utils/DOMTextRenderer';

/**
 * Simplified UI Scene - Clean, minimal HUD using DOMTextRenderer for better performance
 */
export class SimpleUIScene extends Scene {
  // DOM Text Renderer
  private domTextRenderer: DOMTextRenderer | null = null;
  
  // Phaser Elements (for graphics)
  private targetColorBg: Phaser.GameObjects.Rectangle | null = null;
  // slowMoCharges removed - simplified slow mo logic

  // Game State
  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;
  
  // Track previous values for change detection
  private previousScore: number = 0;
  private previousTargetColor: GameColor = GameColor.RED;

  constructor() {
    super('SimpleUI');
  }

  init(): void {
    console.log('SimpleUIScene: Initializing simplified UI');
    
    // Reset game state
    this.score = 0;
    this.bestScore = this.getBestScore();
    this.targetColor = GameColor.RED;
    
    // Initialize previous values for change detection
    this.previousScore = 0;
    this.previousTargetColor = GameColor.RED;
  }

  create(): void {
    console.log('SimpleUIScene: Creating simplified DOM-based UI');
    
    // Configure camera
    const camera = this.cameras.main;
    camera.setBackgroundColor('rgba(0,0,0,0)');
    
    // Initialize DOM Text Renderer
    this.domTextRenderer = new DOMTextRenderer('game-container');
    
    // Create simple UI elements
    this.createSimpleHUD();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup resize handler for responsive updates
    this.setupResizeHandler();
  }

  /**
   * Create simple, clean HUD elements using DOMTextRenderer
   */
  private createSimpleHUD(): void {
    if (!this.domTextRenderer) {
      console.error('SimpleUIScene: DOMTextRenderer not available');
      return;
    }

    const { width, height } = this.scale;
    const margin = Math.max(15, width * 0.04); // 4% of screen width, minimum 15px
    const headerY = 25; // Adjust for better vertical centering in header bar

    // Header background (still using Phaser for the background)
    const headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.5).setOrigin(0, 0);
    headerBg.setDepth(100);

    // Define responsive text style
    const baseFontSize = Math.max(16, Math.min(24, width * 0.05)); // 5% of screen width, between 16-24px
    const textStyle: DOMTextStyle = {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: `${baseFontSize}px`,
      fontWeight: '500',
      color: '#FFFFFF',
      textAlign: 'left',
      textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
    };

    // slowMoCharges variables removed - simplified logic

    // Best score display (left side) - using DOMTextRenderer
    const bestScoreStyle: DOMTextStyle = {
      ...textStyle,
      textAlign: 'left'
    };
    this.domTextRenderer.createText(
      'bestScore',
      `Best: ${this.bestScore}`,
      margin,
      headerY,
      bestScoreStyle
    );

    // Score display (center) - using DOMTextRenderer
    const scoreStyle: DOMTextStyle = {
      ...textStyle,
      textAlign: 'center'
    };
    this.domTextRenderer.createText(
      'score',
      `Score: ${this.score}`,
      width / 2,
      headerY,
      scoreStyle
    );

    // Time display (right side) - using DOMTextRenderer
    const timeStyle: DOMTextStyle = {
      ...textStyle,
      textAlign: 'right'
    };
    this.domTextRenderer.createText(
      'time',
      '0:00',
      width - margin - 30, // Adjust for text centering
      headerY,
      timeStyle
    );
    
    // slowMoCharges creation removed - simplified logic

    // Target color display (below header) - responsive sizing
    const targetY = Math.max(80, height * 0.12); // 12% of screen height, minimum 80px
    const targetWidth = Math.max(200, Math.min(300, width * 0.6)); // 60% of screen width, between 200-300px
    const targetHeight = Math.max(40, Math.min(60, height * 0.08)); // 8% of screen height, between 40-60px
    
    this.targetColorBg = this.add.rectangle(width / 2, targetY, targetWidth, targetHeight, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    this.targetColorBg.setDepth(102);

    // Target color text - using DOMTextRenderer with responsive font size
    const targetFontSize = Math.max(18, Math.min(28, width * 0.06)); // 6% of screen width, between 18-28px
    const targetColorStyle: DOMTextStyle = {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: `${targetFontSize}px`,
      fontWeight: 'bold',
      color: this.getColorHex(this.targetColor),
      textAlign: 'center',
      textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
    };
    this.domTextRenderer.createText(
      'targetColor',
      `TAP: ${this.getColorName(this.targetColor)}`,
      width / 2,
      targetY,
      targetColorStyle
    );

    // No continuous animation - only animate when values change

    console.log('SimpleUIScene: DOMTextRenderer-based HUD created successfully');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.events.on('updateScore', this.updateScore, this);
    this.events.on('updateTime', this.updateTime, this);
    this.events.on('updateTargetColor', this.updateTargetColor, this);
    // updateSlowMoCharges event listener removed - simplified logic
  }

  /**
   * Setup resize handler for responsive updates
   */
  private setupResizeHandler(): void {
    // Listen for Phaser scale manager resize events
    this.scale.on('resize', this.handleResize, this);
    
    // Also listen for window resize events as backup
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  /**
   * Handle resize events to update UI layout
   */
  private handleResize(): void {
    console.log('SimpleUIScene: Handling resize event');
    
    // Update DOMTextRenderer container size
    if (this.domTextRenderer) {
      const { width, height } = this.scale;
      this.domTextRenderer.updateSize(width, height);
    }
    
    // Recreate HUD elements with new dimensions
    this.recreateHUD();
  }

  /**
   * Recreate HUD elements with current screen dimensions
   */
  private recreateHUD(): void {
    if (!this.domTextRenderer) return;
    
    // Clear existing elements
    this.domTextRenderer.clear();
    
    // Clear Phaser elements
    if (this.targetColorBg) {
      this.targetColorBg.destroy();
      this.targetColorBg = null;
    }
    // slowMoCharges cleanup removed - simplified logic
    
    // Recreate with new dimensions
    this.createSimpleHUD();
  }

  /**
   * Update score display
   */
  private updateScore(score: number): void {
    this.score = score;
    const scoreChanged = this.score !== this.previousScore;
    
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
    }

    if (this.domTextRenderer) {
      this.domTextRenderer.updateText('score', `Score: ${this.score}`);
      this.domTextRenderer.updateText('bestScore', `Best: ${this.bestScore}`);
      
      // Only animate if score actually changed
      if (scoreChanged) {
        // Color feedback based on score
        const color = this.score > 10 ? '#FFD700' : this.score > 5 ? '#2ECC71' : '#FFFFFF';
        const scoreElement = this.domTextRenderer.getElement('score');
        if (scoreElement) {
          scoreElement.element.style.color = color;
          
          // Flash effect using CSS animation only when score changes
          scoreElement.element.style.animation = 'none';
          setTimeout(() => {
            scoreElement.element.style.animation = 'scoreFlash 0.2s ease-in-out';
          }, 10);
        }
      }
    }
    
    // Update previous score
    this.previousScore = this.score;
  }

  /**
   * Update time display
   */
  private updateTime(elapsedTime: number): void {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (this.domTextRenderer) {
      this.domTextRenderer.updateText('time', timeString);
    }
  }

  /**
   * Update target color display
   */
  private updateTargetColor(color: GameColor): void {
    this.targetColor = color;
    const colorChanged = this.targetColor !== this.previousTargetColor;

    if (this.domTextRenderer) {
      this.domTextRenderer.updateText('targetColor', `TAP: ${this.getColorName(color)}`);
      
      // Only animate if color actually changed
      if (colorChanged) {
        // Update color and add flash effect
        const targetColorElement = this.domTextRenderer.getElement('targetColor');
        if (targetColorElement) {
          targetColorElement.element.style.color = this.getColorHex(color);
          
          // Flash effect when color changes using CSS animation
          targetColorElement.element.style.animation = 'none';
          setTimeout(() => {
            targetColorElement.element.style.animation = 'colorFlash 0.4s ease-in-out';
          }, 10);
        }
      }
    }

    // Update background border color
    if (this.targetColorBg) {
      this.targetColorBg.setStrokeStyle(2, parseInt(this.getColorHex(color).replace('#', '0x')), 0.8);
    }
    
    // Update previous color
    this.previousTargetColor = this.targetColor;
  }

  // updateSlowMoCharges method removed - simplified slow mo logic

  /**
   * Get color name for display
   */
  private getColorName(color: GameColor): string {
    switch (color) {
      case GameColor.RED: return 'RED';
      case GameColor.GREEN: return 'GREEN';
      case GameColor.BLUE: return 'BLUE';
      case GameColor.YELLOW: return 'YELLOW';
      case GameColor.PURPLE: return 'PURPLE';
      default: return 'RED';
    }
  }

  /**
   * Get color hex value for display
   */
  private getColorHex(color: GameColor): string {
    switch (color) {
      case GameColor.RED: return '#E74C3C';
      case GameColor.GREEN: return '#2ECC71';
      case GameColor.BLUE: return '#3498DB';
      case GameColor.YELLOW: return '#F1C40F';
      case GameColor.PURPLE: return '#9B59B6';
      default: return '#E74C3C';
    }
  }


  /**
   * Get best score from localStorage
   */
  private getBestScore(): number {
    return parseInt(localStorage.getItem('colorRushBestScore') || '0');
  }

  /**
   * Save best score to localStorage
   */
  private saveBestScore(score: number): void {
    localStorage.setItem('colorRushBestScore', score.toString());
  }

  /**
   * Public methods for GameScene to call
   */
  public setScore(score: number): void {
    this.events.emit('updateScore', score);
  }

  public setTime(elapsedTime: number): void {
    this.events.emit('updateTime', elapsedTime);
  }

  public setTargetColor(color: GameColor): void {
    this.events.emit('updateTargetColor', color);
  }

  // setSlowMoCharges removed - simplified slow mo logic


  /**
   * Show or hide the entire UI
   */
  public setVisible(visible: boolean): void {
    if (this.domTextRenderer) {
      this.domTextRenderer.setVisible('score', visible);
      this.domTextRenderer.setVisible('time', visible);
      this.domTextRenderer.setVisible('targetColor', visible);
    }
    
    if (this.targetColorBg) this.targetColorBg.setVisible(visible);
    
    // slowMoCharges visibility update removed - simplified logic
  }

  /**
   * Force show the UI (alias for setVisible(true))
   */
  public forceShowUI(): void {
    this.setVisible(true);
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    console.log('SimpleUIScene: Shutting down');
    
    // Remove event listeners
    this.events.off('updateScore');
    this.events.off('updateTime');
    this.events.off('updateTargetColor');
    // updateSlowMoCharges event listener removal removed - simplified logic
    
    // Remove resize handlers
    this.scale.off('resize', this.handleResize, this);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize.bind(this));
    }
    
    // Kill all tweens
    this.tweens.killAll();
    
    // Clean up DOMTextRenderer
    if (this.domTextRenderer) {
      this.domTextRenderer.destroy();
      this.domTextRenderer = null;
    }
    
    // Clear references
    this.targetColorBg = null;
    // slowMoCharges cleanup removed - simplified logic
  }
}
