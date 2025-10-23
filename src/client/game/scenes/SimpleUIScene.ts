import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { DOMTextRenderer } from '../utils/DOMTextRenderer';
import { NeonTextConfig, NeonTextEffectType, NeonTextSize } from '../utils/NeonTextEffects';

/**
 * Simplified UI Scene - Clean, minimal HUD using DOMTextRenderer for better performance
 */
export default class SimpleUIScene extends Scene {
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
  
  // Border element for target color
  private targetColorBorder: Phaser.GameObjects.Rectangle | null = null;

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
   * Create neon-styled HUD elements according to specification mockup
   */
  private createSimpleHUD(): void {
    if (!this.domTextRenderer) {
      console.error('SimpleUIScene: DOMTextRenderer not available');
      return;
    }

    const { width } = this.scale;
    const margin = Math.max(20, width * 0.06);
    const headerY = 30;

    // Create top bar elements according to specification
    this.createTopBar(margin, headerY, width);

    // Create target color prompt zone (center of screen)
    this.createTargetColorPrompt();


    console.log('SimpleUIScene: Neon HUD created successfully');
  }

  /**
   * Create top bar with scores and time
   */
  private createTopBar(margin: number, headerY: number, width: number): void {
    if (!this.domTextRenderer) {
      console.error('SimpleUIScene: DOMTextRenderer not available in createTopBar');
      return;
    }


    // Create BEST score (white text)
    const bestScoreConfig: NeonTextConfig = {
      effectType: NeonTextEffectType.GLOW_WHITE,
      size: NeonTextSize.MEDIUM,
      intensity: 0.6,
      animation: false,
      performance: 'high'
    };

    // Calculate safe position for best score (left side with same padding as timer)
    const bestScoreX = margin; // Use same margin as timer on the right
    
    this.domTextRenderer.createNeonText(
      'best-score',
      `BEST: ${this.bestScore.toLocaleString()}`,
      bestScoreX,
      headerY,
      bestScoreConfig
    );

    // Create SCORE (Plasma Orange glow)
    const scoreConfig: NeonTextConfig = {
      effectType: NeonTextEffectType.GLOW_ORANGE,
      size: NeonTextSize.MEDIUM,
      intensity: 0.8,
      animation: false,
      performance: 'high'
    };

    this.domTextRenderer.createNeonText(
      'score',
      `SCORE: ${this.score.toLocaleString()}`,
      width / 2,
      headerY,
      scoreConfig
    );

    // Create time display (white text)
    const timeConfig: NeonTextConfig = {
      effectType: NeonTextEffectType.GLOW_WHITE,
      size: NeonTextSize.MEDIUM,
      intensity: 0.6,
      animation: false,
      performance: 'high'
    };

    this.domTextRenderer.createNeonText(
      'time',
      '0:00',
      width - margin,
      headerY,
      timeConfig
    );
  }

  /**
   * Create target color prompt zone with instant color changes
   */
  private createTargetColorPrompt(): void {
    if (!this.domTextRenderer) {
      console.error('SimpleUIScene: DOMTextRenderer not available in createTargetColorPrompt');
      return;
    }

    const { width, height } = this.scale;
    const targetY = height * 0.15; // 15% from top

    // Create target color text with instant color changes
    const targetColorConfig: NeonTextConfig = {
      effectType: NeonTextEffectType.GLOW_WHITE, // Will be overridden by color
      size: NeonTextSize.TITLE,
      intensity: 0.9,
      animation: false,
      performance: 'high'
    };

    this.domTextRenderer.createNeonText(
      'target-color',
      `TAP: ${this.getColorName(this.targetColor)}`,
      width / 2,
      targetY,
      targetColorConfig
    );

    // Update the color immediately
    this.updateTargetColorDisplay();
    
    // Create colored border around the target color text after text is created
    // Add small delay to ensure text is fully rendered
    this.time.delayedCall(50, () => {
      this.createTargetColorBorder();
    });
  }



  /**
   * Create colored border around the target color text
   */
  private createTargetColorBorder(): void {
    if (!this.domTextRenderer) return;
    
    // Get the actual text element to measure its dimensions
    const textElement = this.domTextRenderer.getElement('target-color');
    if (!textElement) return;
    
    const { width, height } = this.scale;
    const targetY = height * 0.15;
    
    // Get actual text dimensions from DOM element
    const textWidth = textElement.element.offsetWidth;
    const textHeight = textElement.element.offsetHeight;
    
    console.log('Target color text dimensions:', { textWidth, textHeight });
    
    // Add more padding around the text to prevent overlap
    const padding = 25;
    const borderWidth = textWidth + (padding * 2);
    const borderHeight = textHeight + (padding * 2);
    
    console.log('Border dimensions:', { borderWidth, borderHeight });
    
    // Center the border around the text
    const borderX = (width - borderWidth) / 2;
    const borderY = targetY - borderHeight / 2;
    
    // Create border rectangle
    this.targetColorBorder = this.add.rectangle(
      borderX + borderWidth / 2,
      borderY + borderHeight / 2,
      borderWidth,
      borderHeight,
      0x000000,
      0
    );
    
    // Set border properties with thinner stroke
    this.targetColorBorder.setStrokeStyle(2, this.getColorHex(this.targetColor), 1);
    this.targetColorBorder.setDepth(1); // Ensure it's above background but below text
  }

  /**
   * Update target color display with instant color changes
   */
  private updateTargetColorDisplay(): void {
    if (!this.domTextRenderer) return;

    // Get the color-specific glow effect
    const colorGlowEffect = this.getColorGlowEffect(this.targetColor);
    
    // Update the text content and color
    this.domTextRenderer.updateText('target-color', `TAP: ${this.getColorName(this.targetColor)}`);
    
    // Update the glow effect by recreating the element with new color
    const { width, height } = this.scale;
    const targetY = height * 0.15;
    
    const targetColorConfig: NeonTextConfig = {
      effectType: colorGlowEffect,
      size: NeonTextSize.TITLE,
      intensity: 0.9,
      animation: false,
      performance: 'high'
    };

    this.domTextRenderer.createNeonText(
      'target-color',
      `TAP: ${this.getColorName(this.targetColor)}`,
      width / 2,
      targetY,
      targetColorConfig
    );
  }

  /**
   * Get the appropriate glow effect for a game color
   */
  private getColorGlowEffect(color: GameColor): NeonTextEffectType {
    switch (color) {
      case GameColor.RED:
        return NeonTextEffectType.GLOW_RED;
      case GameColor.GREEN:
        return NeonTextEffectType.GLOW_GREEN;
      case GameColor.BLUE:
        return NeonTextEffectType.GLOW_BLUE;
      case GameColor.YELLOW:
        return NeonTextEffectType.GLOW_ORANGE;
      case GameColor.PURPLE:
        return NeonTextEffectType.GLOW_PINK;
      default:
        return NeonTextEffectType.GLOW_WHITE;
    }
  }

  /**
   * Get hex color value for a game color
   */
  private getColorHex(color: GameColor): number {
    switch (color) {
      case GameColor.RED:
        return 0xff0000;
      case GameColor.GREEN:
        return 0x00ff00;
      case GameColor.BLUE:
        return 0x0000ff;
      case GameColor.YELLOW:
        return 0xffff00;
      case GameColor.PURPLE:
        return 0xff00ff;
      default:
        return 0xffffff;
    }
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
    
    if (this.targetColorBorder) {
      this.targetColorBorder.destroy();
      this.targetColorBorder = null;
    }
    // slowMoCharges cleanup removed - simplified logic
    
    // Recreate with new dimensions
    this.createSimpleHUD();
  }

  /**
   * Update score display with neon styling
   */
  private updateScore(score: number): void {
    this.score = score;
    const scoreChanged = this.score !== this.previousScore;
    
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
    }

    if (this.domTextRenderer) {
      // Update score with Plasma Orange glow
      this.domTextRenderer.updateText('score', `SCORE: ${this.score.toLocaleString()}`);
      
      // Update best score with white glow
      this.domTextRenderer.updateText('best-score', `BEST: ${this.bestScore.toLocaleString()}`);
      
      // Only animate if score actually changed
      if (scoreChanged) {
        // Flash effect for score update
        const scoreElement = this.domTextRenderer.getElement('score');
        if (scoreElement) {
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
   * Update target color display with instant color changes
   */
  private updateTargetColor(color: GameColor): void {
    this.targetColor = color;
    const colorChanged = this.targetColor !== this.previousTargetColor;

    if (colorChanged) {
      // Update the target color display with new neon glow
      this.updateTargetColorDisplay();
      
      // Recreate border with new text dimensions
      if (this.targetColorBorder) {
        this.targetColorBorder.destroy();
        this.targetColorBorder = null;
      }
      this.createTargetColorBorder();
    }
    
    // Update previous target color
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
    if (this.targetColorBorder) this.targetColorBorder.setVisible(visible);
    
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
    this.targetColorBorder = null;
    // slowMoCharges cleanup removed - simplified logic
  }
}
