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
  private slowMoCharges: Phaser.GameObjects.Arc[] = [];

  // Game State
  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;
  private bombCountText: string | null = null;

  constructor() {
    super('SimpleUI');
  }

  init(): void {
    console.log('SimpleUIScene: Initializing simplified UI');
    
    // Reset game state
    this.score = 0;
    this.bestScore = this.getBestScore();
    this.targetColor = GameColor.RED;
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

    // Slow-mo charges (left side) - still using Phaser for graphics
    const chargeSize = Math.max(10, Math.min(16, width * 0.04)); // 4% of screen width, between 10-16px
    const chargeSpacing = Math.max(25, Math.min(35, width * 0.08)); // 8% of screen width, between 25-35px
    const chargeStartX = margin + chargeSize + 10;

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
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargeStartX + (i * chargeSpacing);
      const charge = this.add.circle(chargeX, headerY, chargeSize, 0x3498DB, 0.8);
      charge.setStrokeStyle(2, 0xFFFFFF, 0.6);
      charge.setDepth(101);
      this.slowMoCharges.push(charge);
    }

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

    // Add subtle pulsing animation to target color background
    this.tweens.add({
      targets: [this.targetColorBg],
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    console.log('SimpleUIScene: DOMTextRenderer-based HUD created successfully');
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.events.on('updateScore', this.updateScore, this);
    this.events.on('updateTime', this.updateTime, this);
    this.events.on('updateTargetColor', this.updateTargetColor, this);
    this.events.on('updateSlowMoCharges', this.updateSlowMoCharges, this);
    this.events.on('updateBombCount', this.updateBombCount, this);
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
    this.slowMoCharges.forEach(charge => charge.destroy());
    this.slowMoCharges = [];
    
    // Recreate with new dimensions
    this.createSimpleHUD();
  }

  /**
   * Update score display
   */
  private updateScore(score: number): void {
    this.score = score;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
    }

    if (this.domTextRenderer) {
      this.domTextRenderer.updateText('score', `Score: ${this.score}`);
      
      // Color feedback based on score
      const color = this.score > 10 ? '#FFD700' : this.score > 5 ? '#2ECC71' : '#FFFFFF';
      const scoreElement = this.domTextRenderer.getElement('score');
      if (scoreElement) {
        scoreElement.element.style.color = color;
        
        // Flash effect using CSS animation
        scoreElement.element.style.animation = 'none';
        setTimeout(() => {
          scoreElement.element.style.animation = 'scoreFlash 0.2s ease-in-out';
        }, 10);
      }
    }
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

    if (this.domTextRenderer) {
      this.domTextRenderer.updateText('targetColor', `TAP: ${this.getColorName(color)}`);
      
      // Update color and add flash effect
      const targetColorElement = this.domTextRenderer.getElement('targetColor');
      if (targetColorElement) {
        targetColorElement.element.style.color = this.getColorHex(color);
        
        // Flash effect when color changes using CSS animation
        targetColorElement.element.style.animation = 'none';
        setTimeout(() => {
          targetColorElement.element.style.animation = 'colorFlash 0.4s ease-in-out, pulse 1s ease-in-out infinite alternate 0.4s';
        }, 10);
      }
    }

    // Update background border color
    if (this.targetColorBg) {
      this.targetColorBg.setStrokeStyle(2, parseInt(this.getColorHex(color).replace('#', '0x')), 0.8);
    }
  }

  /**
   * Update slow-mo charges display
   */
  private updateSlowMoCharges(charges: number): void {
    this.slowMoCharges.forEach((charge, index) => {
      if (index < charges) {
        // Active charge
        charge.setFillStyle(0x3498DB, 1.0);
        charge.setStrokeStyle(2, 0xFFFFFF, 1.0);
        
        // Subtle pulsing animation
        this.tweens.add({
          targets: charge,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      } else {
        // Inactive charge
        charge.setFillStyle(0x7F8C8D, 0.4);
        charge.setStrokeStyle(2, 0x95A5A6, 0.6);
        
        // Stop pulsing animation
        this.tweens.killTweensOf(charge);
        charge.setScale(1.0);
      }
    });
  }

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
   * Update bomb count display
   */
  private updateBombCount(data: { currentBombs: number; maxBombs: number }): void {
    const { currentBombs, maxBombs } = data;
    
    if (!this.domTextRenderer) return;
    
    const bombCountText = `Bombs: ${currentBombs}/${maxBombs}`;
    
    if (!this.bombCountText) {
      // Create bomb count display
      this.domTextRenderer.createText('bombCount', bombCountText, this.scale.width - 120, 100, {
        fontSize: '16px',
        color: '#ff6b6b',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 'bold',
        textAlign: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '4px 8px',
        borderRadius: '4px'
      });
      this.bombCountText = bombCountText;
    } else {
      // Update existing bomb count display
      this.domTextRenderer.updateText('bombCount', bombCountText);
      this.bombCountText = bombCountText;
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

  public setSlowMoCharges(charges: number): void {
    this.events.emit('updateSlowMoCharges', charges);
  }

  public setBombCount(currentBombs: number, maxBombs: number): void {
    this.events.emit('updateBombCount', { currentBombs, maxBombs });
  }

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
    
    this.slowMoCharges.forEach(charge => {
      if (charge) charge.setVisible(visible);
    });
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
    this.events.off('updateSlowMoCharges');
    this.events.off('updateBombCount');
    
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
    this.slowMoCharges = [];
  }
}
