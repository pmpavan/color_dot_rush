import { Scene } from 'phaser';
import { UIElement, UIElementType, LayoutConfig } from './UIElementFactory';
import { GameColor } from '../../../shared/types/game';
import { uiLogger, LogLevel } from './UIErrorLogger';

/**
 * Fallback modes for UI rendering
 */
export enum FallbackMode {
  TEXT = 'text',
  GRAPHICS = 'graphics',
  MINIMAL = 'minimal',
  EMERGENCY = 'emergency'
}

/**
 * Map of UI elements for the complete UI system
 */
export interface UIElementMap {
  header: UIElement;
  score: UIElement;
  timer: UIElement;
  slowMoCharges: UIElement[];
  targetColor: UIElement;
}

/**
 * FallbackRenderer provides maximum reliability for UI creation
 * with automatic switching between different rendering modes
 */
export class FallbackRenderer {
  private scene: Scene;
  private currentMode: FallbackMode = FallbackMode.TEXT;
  private fontAvailable: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(scene: Scene) {
    this.scene = scene;
    
    uiLogger.log(LogLevel.INFO, 'FallbackRenderer', 'constructor', 'Initializing FallbackRenderer', {
      sceneKey: scene.scene.key,
      sceneActive: scene.scene.isActive()
    });
    
    this.detectCapabilities();
  }

  /**
   * Detect system capabilities and set appropriate fallback mode
   */
  private detectCapabilities(): void {
    uiLogger.log(LogLevel.INFO, 'FallbackRenderer', 'detectCapabilities', 'Starting system capabilities detection');
    
    try {
      // Check font availability
      if (typeof document !== 'undefined' && document.fonts) {
        this.fontAvailable = document.fonts.check('16px Poppins') || document.fonts.check('16px Arial');
        uiLogger.log(LogLevel.DEBUG, 'FallbackRenderer', 'detectCapabilities', 'Font availability detected', { fontAvailable: this.fontAvailable });
      } else {
        this.fontAvailable = false;
        uiLogger.log(LogLevel.WARN, 'FallbackRenderer', 'detectCapabilities', 'Font API not available');
      }

      // Check WebGL/Canvas capabilities
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const canvasSupported = !!canvas.getContext('2d');
      
      const capabilities = {
        webglSupported: !!gl,
        canvasSupported,
        fontAvailable: this.fontAvailable,
        documentAvailable: typeof document !== 'undefined'
      };
      
      uiLogger.log(LogLevel.INFO, 'FallbackRenderer', 'detectCapabilities', 'System capabilities detected', capabilities);

      // Set initial mode based on capabilities
      if (this.fontAvailable && canvasSupported) {
        this.currentMode = FallbackMode.TEXT;
      } else if (canvasSupported) {
        this.currentMode = FallbackMode.GRAPHICS;
      } else {
        this.currentMode = FallbackMode.MINIMAL;
      }

      uiLogger.log(LogLevel.INFO, 'FallbackRenderer', 'detectCapabilities', 'Initial fallback mode determined', {
        mode: this.currentMode,
        reasoning: {
          fontAvailable: this.fontAvailable,
          canvasSupported,
          webglSupported: !!gl
        }
      });
      
    } catch (error) {
      this.currentMode = FallbackMode.EMERGENCY;
      uiLogger.log(LogLevel.ERROR, 'FallbackRenderer', 'detectCapabilities', 'Error detecting capabilities, using emergency mode', {
        mode: this.currentMode,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Create complete UI with automatic fallback handling
   */
  public createUIWithFallback(layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating UI with fallback, mode:', this.currentMode);
    
    let uiElements: UIElementMap | null = null;

    // Try each fallback mode in order
    const modes = [FallbackMode.TEXT, FallbackMode.GRAPHICS, FallbackMode.MINIMAL, FallbackMode.EMERGENCY];
    
    for (const mode of modes) {
      try {
        console.log(`FallbackRenderer: Attempting UI creation with mode: ${mode}`);
        uiElements = this.createUIForMode(mode, layout);
        this.currentMode = mode;
        console.log(`FallbackRenderer: Successfully created UI with mode: ${mode}`);
        break;
      } catch (error) {
        console.warn(`FallbackRenderer: Mode ${mode} failed:`, error);
        
        // Clean up any partially created elements
        this.cleanupPartialUI();
        
        // Continue to next fallback mode
        continue;
      }
    }

    if (!uiElements) {
      console.error('FallbackRenderer: All fallback modes failed, creating emergency UI');
      uiElements = this.createEmergencyUI(layout);
    }

    return uiElements;
  }

  /**
   * Create UI for a specific mode
   */
  private createUIForMode(mode: FallbackMode, layout: LayoutConfig): UIElementMap {
    switch (mode) {
      case FallbackMode.TEXT:
        return this.createTextUI(layout);
      case FallbackMode.GRAPHICS:
        return this.createGraphicsUI(layout);
      case FallbackMode.MINIMAL:
        return this.createMinimalUI(layout);
      case FallbackMode.EMERGENCY:
        return this.createEmergencyUI(layout);
      default:
        throw new Error(`Unknown fallback mode: ${mode}`);
    }
  }

  /**
   * Create text-based UI (preferred mode)
   */
  private createTextUI(layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating text-based UI');
    
    // Test font rendering capability first
    const testText = this.scene.add.text(0, 0, 'Test', {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    
    if (!testText) {
      throw new Error('Text rendering not available');
    }
    
    testText.destroy(); // Clean up test

    return {
      header: this.createTextHeader(layout.header),
      score: this.createTextScore(layout.score),
      timer: this.createTextTimer(layout.timer),
      slowMoCharges: this.createTextSlowMoCharges(layout.slowMoCharges),
      targetColor: this.createTextTargetColor(layout.targetColor)
    };
  }

  /**
   * Create graphics-based UI (fallback mode)
   */
  private createGraphicsUI(layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating graphics-based UI');
    
    // Test graphics rendering capability first
    const testRect = this.scene.add.rectangle(0, 0, 10, 10, 0xFF0000);
    if (!testRect) {
      throw new Error('Graphics rendering not available');
    }
    testRect.destroy(); // Clean up test

    return {
      header: this.createGraphicsHeader(layout.header),
      score: this.createGraphicsScore(layout.score),
      timer: this.createGraphicsTimer(layout.timer),
      slowMoCharges: this.createGraphicsSlowMoCharges(layout.slowMoCharges),
      targetColor: this.createGraphicsTargetColor(layout.targetColor)
    };
  }

  /**
   * Create minimal UI (basic shapes only)
   * Implements requirements: 5.3, 5.5
   * Ensures minimal UI provides all essential game information with proper error handling
   */
  public createMinimalUI(layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating minimal UI with basic shapes and colors');
    console.log('FallbackRenderer: Minimal UI activated - fallback system engaged');
    
    try {
      // Validate layout configuration
      if (!layout || !layout.header || !layout.score || !layout.timer || !layout.slowMoCharges || !layout.targetColor) {
        throw new Error('Invalid layout configuration for minimal UI');
      }

      // Create all essential UI elements with error handling for each component
      const uiElements: UIElementMap = {
        header: this.createMinimalHeaderWithErrorHandling(layout.header),
        score: this.createMinimalScoreWithErrorHandling(layout.score),
        timer: this.createMinimalTimerWithErrorHandling(layout.timer),
        slowMoCharges: this.createMinimalSlowMoChargesWithErrorHandling(layout.slowMoCharges),
        targetColor: this.createMinimalTargetColorWithErrorHandling(layout.targetColor)
      };

      // Validate that all essential elements were created successfully
      this.validateMinimalUIElements(uiElements);

      console.log('FallbackRenderer: Minimal UI created successfully - all essential game information available');
      console.log('FallbackRenderer: Minimal UI elements count:', {
        header: uiElements.header ? 'created' : 'failed',
        score: uiElements.score ? 'created' : 'failed',
        timer: uiElements.timer ? 'created' : 'failed',
        slowMoCharges: uiElements.slowMoCharges?.length || 0,
        targetColor: uiElements.targetColor ? 'created' : 'failed'
      });

      return uiElements;
    } catch (error) {
      console.error('FallbackRenderer: Error creating minimal UI:', error);
      console.log('FallbackRenderer: Attempting emergency fallback for minimal UI');
      
      // If minimal UI creation fails, create absolute emergency UI
      return this.createAbsoluteEmergencyUI(layout);
    }
  }

  /**
   * Create emergency UI (absolute last resort)
   */
  private createEmergencyUI(_layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating emergency UI');
    
    const { width } = this.scene.scale;
    
    // Create the most basic possible UI elements
    const headerContainer = this.scene.add.container(0, 0);
    const scoreContainer = this.scene.add.container(20, 30);
    const timerContainer = this.scene.add.container(width / 2, 30);
    const targetContainer = this.scene.add.container(width / 2, 100);
    
    // Emergency visual indicators - just colored rectangles
    const headerRect = this.scene.add.rectangle(0, 0, width, 60, 0x000000, 0.8).setOrigin(0, 0);
    const scoreRect = this.scene.add.rectangle(0, 0, 40, 20, 0x3498DB);
    const timerRect = this.scene.add.rectangle(0, 0, 40, 20, 0x2ECC71);
    const targetRect = this.scene.add.rectangle(0, 0, 60, 60, 0xE74C3C);
    
    headerContainer.add(headerRect);
    scoreContainer.add(scoreRect);
    timerContainer.add(timerRect);
    targetContainer.add(targetRect);
    
    // Create minimal slow-mo charges
    const charges: UIElement[] = [];
    for (let i = 0; i < 3; i++) {
      const chargeContainer = this.scene.add.container(width - 60 - (i * 30), 30);
      const chargeRect = this.scene.add.rectangle(0, 0, 20, 20, 0x3498DB);
      chargeContainer.add(chargeRect);
      
      charges.push({
        container: chargeContainer,
        graphicsElements: [chargeRect],
        type: UIElementType.MINIMAL,
        updateMethod: (isActive: boolean) => {
          chargeRect.setAlpha(isActive ? 1.0 : 0.3);
        }
      });
    }

    return {
      header: {
        container: headerContainer,
        graphicsElements: [headerRect],
        type: UIElementType.MINIMAL
      },
      score: {
        container: scoreContainer,
        graphicsElements: [scoreRect],
        type: UIElementType.MINIMAL,
        updateMethod: (data: { score: number; bestScore: number }) => {
          const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x2ECC71 : 0x3498DB;
          scoreRect.setFillStyle(color);
        }
      },
      timer: {
        container: timerContainer,
        graphicsElements: [timerRect],
        type: UIElementType.MINIMAL,
        updateMethod: (elapsedTime: number) => {
          const alpha = 0.5 + (Math.sin(elapsedTime * 0.001) * 0.5);
          timerRect.setAlpha(alpha);
        }
      },
      slowMoCharges: charges,
      targetColor: {
        container: targetContainer,
        graphicsElements: [targetRect],
        type: UIElementType.MINIMAL,
        updateMethod: (color: GameColor) => {
          const colorValue = parseInt(color.replace('#', '0x'));
          targetRect.setFillStyle(colorValue);
        }
      }
    };
  }

  // Text UI creation methods

  private createTextHeader(headerLayout: { width: number; height: number; y: number }): UIElement {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, headerLayout.width, headerLayout.height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(100);
    
    container.add(background);
    
    return {
      container,
      graphicsElements: [background],
      type: UIElementType.TEXT
    };
  }

  private createTextScore(scoreLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(scoreLayout.x, scoreLayout.y);
    container.setDepth(101);

    const scoreText = this.scene.add.text(0, 0, 'Score: 0 | Best: 0', {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5);
    
    scoreText.setDepth(102);
    container.add(scoreText);

    const updateMethod = (data: { score: number; bestScore: number }) => {
      scoreText.setText(`Score: ${data.score} | Best: ${data.bestScore}`);
      const color = data.score > 10 ? '#FFD700' : data.score > 5 ? '#2ECC71' : '#FFFFFF';
      scoreText.setColor(color);
    };

    return {
      container,
      textElement: scoreText,
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  private createTextTimer(timerLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(timerLayout.x, timerLayout.y);
    container.setDepth(101);

    const timeText = this.scene.add.text(0, 0, 'Time: 0:00', {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: '24px',
      color: '#FFFFFF'
    }).setOrigin(0.5, 0.5);
    
    timeText.setDepth(102);
    container.add(timeText);

    const updateMethod = (elapsedTime: number) => {
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      timeText.setText(`Time: ${timeString}`);
    };

    return {
      container,
      textElement: timeText,
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  private createTextSlowMoCharges(chargesLayout: { startX: number; y: number; spacing: number }): UIElement[] {
    const charges: UIElement[] = [];
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargesLayout.startX - (i * chargesLayout.spacing);
      const container = this.scene.add.container(chargeX, chargesLayout.y);
      container.setDepth(101);

      // Clock icon background circle
      const charge = this.scene.add.circle(0, 0, 15, 0xECF0F1);
      charge.setStrokeStyle(2, 0x3498DB);
      charge.setDepth(101);

      // Clock hands
      const hourHand = this.scene.add.line(0, 0, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.scene.add.line(0, 0, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);
      hourHand.setDepth(102);
      minuteHand.setDepth(102);

      container.add([charge, hourHand, minuteHand]);

      const updateMethod = (isActive: boolean) => {
        if (isActive) {
          charge.setFillStyle(0xECF0F1);
          charge.setAlpha(1.0);
          charge.setStrokeStyle(2, 0x3498DB, 1.0);
        } else {
          charge.setFillStyle(0x95A5A6);
          charge.setAlpha(0.4);
          charge.setStrokeStyle(2, 0x7F8C8D, 0.6);
        }
      };

      charges.push({
        container,
        graphicsElements: [charge, hourHand, minuteHand],
        type: UIElementType.TEXT,
        updateMethod
      });
    }

    return charges;
  }

  private createTextTargetColor(targetLayout: { x: number; y: number; width: number }): UIElement {
    const container = this.scene.add.container(targetLayout.x, targetLayout.y);
    container.setDepth(103);

    // Background
    const background = this.scene.add.rectangle(0, 0, targetLayout.width, 60, 0x000000, 0.8);
    background.setStrokeStyle(3, 0xFFFFFF, 0.9);
    background.setDepth(103);

    // TAP text
    const tapText = this.scene.add.text(-50, 0, 'TAP', {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5, 0.5);
    tapText.setDepth(104);

    // Colored dot
    const colorDot = this.scene.add.circle(20, 0, 20, 0xE74C3C);
    colorDot.setStrokeStyle(3, 0xFFFFFF, 1);
    colorDot.setDepth(104);

    container.add([background, tapText, colorDot]);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    const updateMethod = (color: GameColor) => {
      const colorValue = parseInt(color.replace('#', '0x'));
      colorDot.setFillStyle(colorValue);
      background.setStrokeStyle(3, colorValue, 0.9);
    };

    return {
      container,
      textElement: tapText,
      graphicsElements: [background, colorDot],
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  // Graphics UI creation methods (similar structure but without text)

  private createGraphicsHeader(headerLayout: { width: number; height: number; y: number }): UIElement {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, headerLayout.width, headerLayout.height, 0x000000, 0.5)
      .setOrigin(0, 0)
      .setDepth(100);
    
    container.add(background);
    
    return {
      container,
      graphicsElements: [background],
      type: UIElementType.GRAPHICS
    };
  }

  private createGraphicsScore(scoreLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(scoreLayout.x, scoreLayout.y);
    container.setDepth(101);

    const scoreBg = this.scene.add.rectangle(0, 0, 80, 30, 0x3498DB, 0.8);
    scoreBg.setStrokeStyle(2, 0xFFFFFF, 0.6);
    scoreBg.setDepth(102);

    const scoreIndicator = this.scene.add.circle(0, 0, 8, 0xFFFFFF, 1);
    scoreIndicator.setStrokeStyle(2, 0x3498DB, 1);
    scoreIndicator.setDepth(103);

    container.add([scoreBg, scoreIndicator]);

    const updateMethod = (data: { score: number; bestScore: number }) => {
      const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x2ECC71 : 0xFFFFFF;
      scoreIndicator.setFillStyle(color);
    };

    return {
      container,
      graphicsElements: [scoreBg, scoreIndicator],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  private createGraphicsTimer(timerLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(timerLayout.x, timerLayout.y);
    container.setDepth(101);

    const timeBg = this.scene.add.circle(0, 0, 18, 0x2ECC71, 0.8);
    timeBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    timeBg.setDepth(102);

    const timeHand = this.scene.add.line(0, 0, 0, 0, 0, -12, 0xFFFFFF, 1).setLineWidth(2);
    timeHand.setDepth(103);

    container.add([timeBg, timeHand]);

    const updateMethod = (elapsedTime: number) => {
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const rotation = (totalSeconds * 6) * (Math.PI / 180);
      timeHand.setRotation(rotation);
    };

    return {
      container,
      graphicsElements: [timeBg, timeHand],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  private createGraphicsSlowMoCharges(chargesLayout: { startX: number; y: number; spacing: number }): UIElement[] {
    const charges: UIElement[] = [];
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargesLayout.startX - (i * chargesLayout.spacing);
      const container = this.scene.add.container(chargeX, chargesLayout.y);
      container.setDepth(101);

      const charge = this.scene.add.circle(0, 0, 15, 0xECF0F1);
      charge.setStrokeStyle(2, 0x3498DB);
      charge.setDepth(101);

      const hourHand = this.scene.add.line(0, 0, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.scene.add.line(0, 0, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);
      hourHand.setDepth(102);
      minuteHand.setDepth(102);

      container.add([charge, hourHand, minuteHand]);

      const updateMethod = (isActive: boolean) => {
        if (isActive) {
          charge.setFillStyle(0xECF0F1);
          charge.setAlpha(1.0);
        } else {
          charge.setFillStyle(0x95A5A6);
          charge.setAlpha(0.4);
        }
      };

      charges.push({
        container,
        graphicsElements: [charge, hourHand, minuteHand],
        type: UIElementType.GRAPHICS,
        updateMethod
      });
    }

    return charges;
  }

  private createGraphicsTargetColor(targetLayout: { x: number; y: number; width: number }): UIElement {
    const container = this.scene.add.container(targetLayout.x, targetLayout.y);
    container.setDepth(103);

    const background = this.scene.add.rectangle(0, 0, targetLayout.width, 60, 0x000000, 0.8);
    background.setStrokeStyle(3, 0xFFFFFF, 0.9);
    background.setDepth(103);

    const targetCircle = this.scene.add.circle(0, 0, 25, 0xE74C3C);
    targetCircle.setStrokeStyle(4, 0xFFFFFF, 1);
    targetCircle.setDepth(104);

    container.add([background, targetCircle]);

    const updateMethod = (color: GameColor) => {
      const colorValue = parseInt(color.replace('#', '0x'));
      targetCircle.setFillStyle(colorValue);
      background.setStrokeStyle(3, colorValue, 0.9);
    };

    return {
      container,
      graphicsElements: [background, targetCircle],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  // Minimal UI creation methods (basic shapes only)

  private createMinimalHeader(headerLayout: { width: number; height: number; y: number }): UIElement {
    const container = this.scene.add.container(0, 0);
    const background = this.scene.add.rectangle(0, 0, headerLayout.width, headerLayout.height, 0x333333, 0.8)
      .setOrigin(0, 0)
      .setDepth(100);
    
    container.add(background);
    
    return {
      container,
      graphicsElements: [background],
      type: UIElementType.MINIMAL
    };
  }

  private createMinimalScore(scoreLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(scoreLayout.x, scoreLayout.y);
    container.setDepth(101);

    const scoreCircle = this.scene.add.circle(0, 0, 15, 0x3498DB);
    scoreCircle.setDepth(102);
    container.add(scoreCircle);

    const updateMethod = (data: { score: number; bestScore: number }) => {
      const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x2ECC71 : 0x3498DB;
      scoreCircle.setFillStyle(color);
    };

    return {
      container,
      graphicsElements: [scoreCircle],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  private createMinimalTimer(timerLayout: { x: number; y: number }): UIElement {
    const container = this.scene.add.container(timerLayout.x, timerLayout.y);
    container.setDepth(101);

    const timeCircle = this.scene.add.circle(0, 0, 15, 0x2ECC71);
    timeCircle.setDepth(102);
    container.add(timeCircle);

    const updateMethod = (elapsedTime: number) => {
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const alpha = 0.5 + (Math.sin(totalSeconds * 0.5) * 0.5);
      timeCircle.setAlpha(alpha);
    };

    return {
      container,
      graphicsElements: [timeCircle],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  private createMinimalSlowMoCharges(chargesLayout: { startX: number; y: number; spacing: number }): UIElement[] {
    const charges: UIElement[] = [];
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargesLayout.startX - (i * chargesLayout.spacing);
      const container = this.scene.add.container(chargeX, chargesLayout.y);
      container.setDepth(101);

      const charge = this.scene.add.circle(0, 0, 10, 0x3498DB);
      charge.setDepth(101);
      container.add(charge);

      const updateMethod = (isActive: boolean) => {
        if (isActive) {
          charge.setFillStyle(0x3498DB);
          charge.setAlpha(1.0);
        } else {
          charge.setFillStyle(0x95A5A6);
          charge.setAlpha(0.4);
        }
      };

      charges.push({
        container,
        graphicsElements: [charge],
        type: UIElementType.MINIMAL,
        updateMethod
      });
    }

    return charges;
  }

  private createMinimalTargetColor(targetLayout: { x: number; y: number; width: number }): UIElement {
    const container = this.scene.add.container(targetLayout.x, targetLayout.y);
    container.setDepth(103);

    const targetCircle = this.scene.add.circle(0, 0, 30, 0xE74C3C);
    targetCircle.setStrokeStyle(4, 0xFFFFFF, 1);
    targetCircle.setDepth(104);

    container.add(targetCircle);

    const updateMethod = (color: GameColor) => {
      const colorValue = parseInt(color.replace('#', '0x'));
      targetCircle.setFillStyle(colorValue);
    };

    return {
      container,
      graphicsElements: [targetCircle],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  /**
   * Clean up any partially created UI elements
   */
  private cleanupPartialUI(): void {
    try {
      console.log('FallbackRenderer: Cleaning up partial UI elements');
      
      // Remove all children from the scene to start fresh
      this.scene.children.removeAll(true);
      
      // Kill any running tweens
      if (this.scene.tweens) {
        this.scene.tweens.killAll();
      }
      
      console.log('FallbackRenderer: Cleanup completed');
    } catch (error) {
      console.warn('FallbackRenderer: Error during cleanup:', error);
    }
  }

  /**
   * Switch to a different fallback mode
   */
  public switchToFallbackMode(mode: FallbackMode): void {
    console.log(`FallbackRenderer: Switching to fallback mode: ${mode}`);
    this.currentMode = mode;
  }

  /**
   * Check if currently in fallback mode
   */
  public isInFallbackMode(): boolean {
    return this.currentMode !== FallbackMode.TEXT;
  }

  /**
   * Get current fallback mode
   */
  public getCurrentMode(): FallbackMode {
    return this.currentMode;
  }

  /**
   * Add font loading detection and fallback handling
   * Implements requirements: 5.1, 5.2, 5.4
   * Implements font availability checking before UI creation and automatic fallback to system fonts
   */
  public async checkFontLoading(): Promise<boolean> {
    console.log('FallbackRenderer: Starting comprehensive font loading detection');
    
    try {
      // Check if font API is available
      if (typeof document === 'undefined' || !document.fonts) {
        console.warn('FallbackRenderer: Font API not available - graceful degradation to system fonts');
        this.fontAvailable = false;
        this.switchToSystemFontFallback();
        return false;
      }

      console.log('FallbackRenderer: Font API available, checking Poppins font availability');

      // Check if Poppins is already loaded
      const poppinsAlreadyLoaded = document.fonts.check('16px Poppins');
      if (poppinsAlreadyLoaded) {
        console.log('FallbackRenderer: Poppins font already loaded and available');
        this.fontAvailable = true;
        return true;
      }

      // Attempt to load Poppins with timeout
      console.log('FallbackRenderer: Attempting to load Poppins font with 2-second timeout');
      
      const fontLoadPromise = Promise.race([
        document.fonts.load('16px Poppins'),
        document.fonts.load('24px Poppins'), // Load multiple sizes
        document.fonts.load('32px Poppins'),
        new Promise<FontFace[]>((_, reject) => 
          setTimeout(() => reject(new Error('Font loading timeout after 2 seconds')), 2000)
        )
      ]);

      await fontLoadPromise;

      // Verify Poppins is now available
      const poppinsAvailable = document.fonts.check('16px Poppins') && 
                              document.fonts.check('24px Poppins') && 
                              document.fonts.check('32px Poppins');
      
      console.log('FallbackRenderer: Poppins font loading result:', poppinsAvailable);
      
      if (poppinsAvailable) {
        console.log('FallbackRenderer: Poppins font successfully loaded and verified');
        this.fontAvailable = true;
        return true;
      } else {
        console.warn('FallbackRenderer: Poppins font loaded but verification failed');
        this.handlePoppinsFontFailure();
        return false;
      }

    } catch (error) {
      console.error('FallbackRenderer: Font loading failed with error:', error);
      this.handlePoppinsFontFailure();
      return false;
    }
  }

  /**
   * Handle Poppins font failure and switch to system font fallback
   * Implements requirement 5.2: automatic fallback to system fonts when Poppins fails to load
   */
  private handlePoppinsFontFailure(): void {
    console.warn('FallbackRenderer: Poppins font failed to load, implementing system font fallback');
    this.fontAvailable = false;
    this.switchToSystemFontFallback();
  }

  /**
   * Switch to system font fallback mode
   * Implements requirement 5.4: ensure graceful degradation without blocking UI creation
   */
  private switchToSystemFontFallback(): void {
    console.log('FallbackRenderer: Switching to system font fallback (Arial, sans-serif)');
    
    // Test system font availability
    if (this.testSystemFontAvailability()) {
      console.log('FallbackRenderer: System fonts available, maintaining text-based UI with Arial fallback');
      // Stay in text mode but use system fonts
      this.currentMode = FallbackMode.TEXT;
    } else {
      console.warn('FallbackRenderer: System fonts also unavailable, switching to graphics-only mode');
      this.switchToFallbackMode(FallbackMode.GRAPHICS);
    }
  }

  /**
   * Test system font availability
   */
  private testSystemFontAvailability(): boolean {
    try {
      if (typeof document === 'undefined') return false;

      // Test creating text with system fonts
      const testElement = document.createElement('div');
      testElement.style.fontFamily = 'Arial, sans-serif';
      testElement.style.fontSize = '16px';
      testElement.textContent = 'Test';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      
      document.body.appendChild(testElement);
      const hasSystemFont = testElement.offsetWidth > 0 && testElement.offsetHeight > 0;
      document.body.removeChild(testElement);
      
      console.log('FallbackRenderer: System font availability test result:', hasSystemFont);
      return hasSystemFont;
    } catch (error) {
      console.error('FallbackRenderer: System font test failed:', error);
      return false;
    }
  }

  /**
   * Get appropriate font family based on availability
   * Implements requirement 5.2: automatic fallback to system fonts
   */
  public getFontFamily(): string {
    if (this.fontAvailable) {
      return 'Poppins, Arial, sans-serif';
    } else {
      console.log('FallbackRenderer: Using system font fallback');
      return 'Arial, sans-serif';
    }
  }

  /**
   * Check font availability before UI creation
   * Implements requirement 5.1: font availability checking before UI creation
   */
  public async ensureFontAvailabilityBeforeUICreation(): Promise<void> {
    console.log('FallbackRenderer: Ensuring font availability before UI creation');
    
    try {
      const fontLoadingSuccess = await this.checkFontLoading();
      
      if (!fontLoadingSuccess) {
        console.log('FallbackRenderer: Font loading failed, but continuing with system font fallback');
        console.log('FallbackRenderer: UI creation will proceed with graceful degradation');
      } else {
        console.log('FallbackRenderer: Font loading successful, UI creation can proceed with Poppins');
      }

      // Additional font readiness check
      await this.waitForFontReadiness();
      
    } catch (error) {
      console.error('FallbackRenderer: Font availability check failed:', error);
      console.log('FallbackRenderer: Proceeding with graphics-only fallback to ensure UI creation is not blocked');
      this.switchToFallbackMode(FallbackMode.GRAPHICS);
    }
  }

  /**
   * Wait for font readiness to prevent UI creation blocking
   * Implements requirement 5.4: ensure graceful degradation without blocking UI creation
   */
  private async waitForFontReadiness(): Promise<void> {
    try {
      if (typeof document === 'undefined' || !document.fonts) {
        return; // Skip if font API not available
      }

      // Wait for fonts to be ready, but don't block indefinitely
      await Promise.race([
        document.fonts.ready,
        new Promise<void>((resolve) => setTimeout(resolve, 1000)) // 1-second timeout
      ]);

      console.log('FallbackRenderer: Font readiness check completed');
    } catch (error) {
      console.warn('FallbackRenderer: Font readiness wait failed, but continuing:', error);
      // Don't throw - ensure UI creation is never blocked
    }
  }

  /**
   * Create UI with font-aware fallback handling
   * Implements comprehensive font fallback before UI creation
   */
  public async createUIWithFontFallback(layout: LayoutConfig): Promise<UIElementMap> {
    console.log('FallbackRenderer: Creating UI with font-aware fallback handling');
    
    // Ensure fonts are ready before UI creation
    await this.ensureFontAvailabilityBeforeUICreation();
    
    // Create UI with appropriate fallback mode based on font availability
    return this.createUIWithFallback(layout);
  }

  /**
   * Retry UI creation with error recovery
   */
  public retryUICreation(layout: LayoutConfig): UIElementMap | null {
    if (this.retryCount >= this.maxRetries) {
      console.error('FallbackRenderer: Maximum retry attempts reached');
      return null;
    }

    this.retryCount++;
    console.log(`FallbackRenderer: Retry attempt ${this.retryCount}/${this.maxRetries}`);

    try {
      // Clean up before retry
      this.cleanupPartialUI();
      
      // Try with next fallback mode
      const nextMode = this.getNextFallbackMode();
      this.switchToFallbackMode(nextMode);
      
      return this.createUIWithFallback(layout);
    } catch (error) {
      console.error(`FallbackRenderer: Retry ${this.retryCount} failed:`, error);
      return null;
    }
  }

  /**
   * Get the next fallback mode to try
   */
  private getNextFallbackMode(): FallbackMode {
    switch (this.currentMode) {
      case FallbackMode.TEXT:
        return FallbackMode.GRAPHICS;
      case FallbackMode.GRAPHICS:
        return FallbackMode.MINIMAL;
      case FallbackMode.MINIMAL:
        return FallbackMode.EMERGENCY;
      default:
        return FallbackMode.EMERGENCY;
    }
  }

  // Enhanced minimal UI creation methods with error handling

  /**
   * Create minimal header with comprehensive error handling
   */
  private createMinimalHeaderWithErrorHandling(headerLayout: { width: number; height: number; y: number }): UIElement {
    try {
      console.log('FallbackRenderer: Creating minimal header with error handling');
      return this.createMinimalHeader(headerLayout);
    } catch (error) {
      console.error('FallbackRenderer: Minimal header creation failed:', error);
      
      // Create absolute minimal header as last resort
      const container = this.scene.add.container(0, 0);
      const background = this.scene.add.rectangle(0, 0, headerLayout.width, 40, 0x222222, 1)
        .setOrigin(0, 0)
        .setDepth(100);
      
      container.add(background);
      console.log('FallbackRenderer: Emergency minimal header created');
      
      return {
        container,
        graphicsElements: [background],
        type: UIElementType.MINIMAL
      };
    }
  }

  /**
   * Create minimal score with comprehensive error handling
   */
  private createMinimalScoreWithErrorHandling(scoreLayout: { x: number; y: number }): UIElement {
    try {
      console.log('FallbackRenderer: Creating minimal score with error handling');
      return this.createMinimalScore(scoreLayout);
    } catch (error) {
      console.error('FallbackRenderer: Minimal score creation failed:', error);
      
      // Create absolute minimal score indicator
      const container = this.scene.add.container(scoreLayout.x, scoreLayout.y);
      container.setDepth(101);

      // Simple square indicator for score
      const scoreSquare = this.scene.add.rectangle(0, 0, 20, 20, 0x3498DB);
      scoreSquare.setDepth(102);
      container.add(scoreSquare);

      const updateMethod = (data: { score: number; bestScore: number }) => {
        try {
          const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x2ECC71 : 0x3498DB;
          scoreSquare.setFillStyle(color);
        } catch (updateError) {
          console.warn('FallbackRenderer: Score update failed in emergency mode:', updateError);
        }
      };

      console.log('FallbackRenderer: Emergency minimal score created');
      return {
        container,
        graphicsElements: [scoreSquare],
        type: UIElementType.MINIMAL,
        updateMethod
      };
    }
  }

  /**
   * Create minimal timer with comprehensive error handling
   */
  private createMinimalTimerWithErrorHandling(timerLayout: { x: number; y: number }): UIElement {
    try {
      console.log('FallbackRenderer: Creating minimal timer with error handling');
      return this.createMinimalTimer(timerLayout);
    } catch (error) {
      console.error('FallbackRenderer: Minimal timer creation failed:', error);
      
      // Create absolute minimal timer indicator
      const container = this.scene.add.container(timerLayout.x, timerLayout.y);
      container.setDepth(101);

      // Simple triangle indicator for timer
      const timeTriangle = this.scene.add.triangle(0, 0, 0, -10, 10, 10, -10, 10, 0x2ECC71);
      timeTriangle.setDepth(102);
      container.add(timeTriangle);

      const updateMethod = (elapsedTime: number) => {
        try {
          // Rotate triangle based on time
          const totalSeconds = Math.floor(elapsedTime / 1000);
          const rotation = (totalSeconds * 6) * (Math.PI / 180);
          timeTriangle.setRotation(rotation);
        } catch (updateError) {
          console.warn('FallbackRenderer: Timer update failed in emergency mode:', updateError);
        }
      };

      console.log('FallbackRenderer: Emergency minimal timer created');
      return {
        container,
        graphicsElements: [timeTriangle],
        type: UIElementType.MINIMAL,
        updateMethod
      };
    }
  }

  /**
   * Create minimal slow-mo charges with comprehensive error handling
   */
  private createMinimalSlowMoChargesWithErrorHandling(chargesLayout: { startX: number; y: number; spacing: number }): UIElement[] {
    try {
      console.log('FallbackRenderer: Creating minimal slow-mo charges with error handling');
      return this.createMinimalSlowMoCharges(chargesLayout);
    } catch (error) {
      console.error('FallbackRenderer: Minimal slow-mo charges creation failed:', error);
      
      // Create absolute minimal charge indicators
      const charges: UIElement[] = [];
      
      for (let i = 0; i < 3; i++) {
        try {
          const chargeX = chargesLayout.startX - (i * Math.max(chargesLayout.spacing, 25));
          const container = this.scene.add.container(chargeX, chargesLayout.y);
          container.setDepth(101);

          // Simple diamond shape for charges
          const chargeDiamond = this.scene.add.polygon(0, 0, [0, -8, 8, 0, 0, 8, -8, 0], 0x3498DB);
          chargeDiamond.setDepth(101);
          container.add(chargeDiamond);

          const updateMethod = (isActive: boolean) => {
            try {
              if (isActive) {
                chargeDiamond.setFillStyle(0x3498DB);
                chargeDiamond.setAlpha(1.0);
              } else {
                chargeDiamond.setFillStyle(0x95A5A6);
                chargeDiamond.setAlpha(0.4);
              }
            } catch (updateError) {
              console.warn(`FallbackRenderer: Charge ${i} update failed in emergency mode:`, updateError);
            }
          };

          charges.push({
            container,
            graphicsElements: [chargeDiamond],
            type: UIElementType.MINIMAL,
            updateMethod
          });
        } catch (chargeError) {
          console.warn(`FallbackRenderer: Failed to create emergency charge ${i}:`, chargeError);
          // Continue with other charges even if one fails
        }
      }

      console.log('FallbackRenderer: Emergency minimal slow-mo charges created, count:', charges.length);
      return charges;
    }
  }

  /**
   * Create minimal target color with comprehensive error handling
   */
  private createMinimalTargetColorWithErrorHandling(targetLayout: { x: number; y: number; width: number }): UIElement {
    try {
      console.log('FallbackRenderer: Creating minimal target color with error handling');
      return this.createMinimalTargetColor(targetLayout);
    } catch (error) {
      console.error('FallbackRenderer: Minimal target color creation failed:', error);
      
      // Create absolute minimal target color indicator
      const container = this.scene.add.container(targetLayout.x, targetLayout.y);
      container.setDepth(103);

      // Simple hexagon for target color
      const targetHexagon = this.scene.add.polygon(0, 0, [
        20, 0, 10, 17, -10, 17, -20, 0, -10, -17, 10, -17
      ], 0xE74C3C);
      targetHexagon.setDepth(104);
      container.add(targetHexagon);

      const updateMethod = (color: GameColor) => {
        try {
          const colorValue = parseInt(color.replace('#', '0x'));
          targetHexagon.setFillStyle(colorValue);
        } catch (updateError) {
          console.warn('FallbackRenderer: Target color update failed in emergency mode:', updateError);
        }
      };

      console.log('FallbackRenderer: Emergency minimal target color created');
      return {
        container,
        graphicsElements: [targetHexagon],
        type: UIElementType.MINIMAL,
        updateMethod
      };
    }
  }

  /**
   * Validate that all essential minimal UI elements were created successfully
   */
  private validateMinimalUIElements(uiElements: UIElementMap): void {
    const missingElements: string[] = [];

    if (!uiElements.header) missingElements.push('header');
    if (!uiElements.score) missingElements.push('score');
    if (!uiElements.timer) missingElements.push('timer');
    if (!uiElements.slowMoCharges || uiElements.slowMoCharges.length === 0) missingElements.push('slowMoCharges');
    if (!uiElements.targetColor) missingElements.push('targetColor');

    if (missingElements.length > 0) {
      const errorMsg = `Essential UI elements missing: ${missingElements.join(', ')}`;
      console.error('FallbackRenderer: Validation failed -', errorMsg);
      throw new Error(errorMsg);
    }

    console.log('FallbackRenderer: All essential minimal UI elements validated successfully');
  }

  /**
   * Create absolute emergency UI when even minimal UI fails
   */
  private createAbsoluteEmergencyUI(_layout: LayoutConfig): UIElementMap {
    console.log('FallbackRenderer: Creating absolute emergency UI - last resort');
    
    try {
      const { width } = this.scene.scale;
      
      // Create the most basic possible UI elements with maximum error tolerance
      const headerContainer = this.scene.add.container(0, 0);
      const scoreContainer = this.scene.add.container(20, 30);
      const timerContainer = this.scene.add.container(width / 2, 30);
      const targetContainer = this.scene.add.container(width / 2, 100);
      
      // Emergency visual indicators - just basic rectangles with high visibility
      const headerRect = this.scene.add.rectangle(0, 0, width, 60, 0xFF0000, 0.8).setOrigin(0, 0);
      const scoreRect = this.scene.add.rectangle(0, 0, 40, 20, 0x00FF00);
      const timerRect = this.scene.add.rectangle(0, 0, 40, 20, 0x0000FF);
      const targetRect = this.scene.add.rectangle(0, 0, 60, 60, 0xFFFF00);
      
      // Set high depths to ensure visibility
      headerRect.setDepth(10000);
      scoreRect.setDepth(10001);
      timerRect.setDepth(10001);
      targetRect.setDepth(10001);
      
      headerContainer.add(headerRect);
      scoreContainer.add(scoreRect);
      timerContainer.add(timerRect);
      targetContainer.add(targetRect);
      
      // Create emergency slow-mo charges
      const charges: UIElement[] = [];
      for (let i = 0; i < 3; i++) {
        try {
          const chargeContainer = this.scene.add.container(width - 60 - (i * 30), 30);
          const chargeRect = this.scene.add.rectangle(0, 0, 20, 20, 0xFF00FF);
          chargeRect.setDepth(10001);
          chargeContainer.add(chargeRect);
          
          charges.push({
            container: chargeContainer,
            graphicsElements: [chargeRect],
            type: UIElementType.MINIMAL,
            updateMethod: (isActive: boolean) => {
              try {
                chargeRect.setAlpha(isActive ? 1.0 : 0.3);
              } catch (error) {
                console.warn('FallbackRenderer: Emergency charge update failed:', error);
              }
            }
          });
        } catch (error) {
          console.warn(`FallbackRenderer: Emergency charge ${i} creation failed:`, error);
        }
      }

      console.log('FallbackRenderer: Absolute emergency UI created with maximum visibility');
      
      return {
        header: {
          container: headerContainer,
          graphicsElements: [headerRect],
          type: UIElementType.MINIMAL
        },
        score: {
          container: scoreContainer,
          graphicsElements: [scoreRect],
          type: UIElementType.MINIMAL,
          updateMethod: (data: { score: number; bestScore: number }) => {
            try {
              const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x2ECC71 : 0x00FF00;
              scoreRect.setFillStyle(color);
            } catch (error) {
              console.warn('FallbackRenderer: Emergency score update failed:', error);
            }
          }
        },
        timer: {
          container: timerContainer,
          graphicsElements: [timerRect],
          type: UIElementType.MINIMAL,
          updateMethod: (elapsedTime: number) => {
            try {
              const alpha = 0.5 + (Math.sin(elapsedTime * 0.001) * 0.5);
              timerRect.setAlpha(alpha);
            } catch (error) {
              console.warn('FallbackRenderer: Emergency timer update failed:', error);
            }
          }
        },
        slowMoCharges: charges,
        targetColor: {
          container: targetContainer,
          graphicsElements: [targetRect],
          type: UIElementType.MINIMAL,
          updateMethod: (color: GameColor) => {
            try {
              const colorValue = parseInt(color.replace('#', '0x'));
              targetRect.setFillStyle(colorValue);
            } catch (error) {
              console.warn('FallbackRenderer: Emergency target color update failed:', error);
            }
          }
        }
      };
    } catch (error) {
      console.error('FallbackRenderer: Even absolute emergency UI creation failed:', error);
      throw new Error('Complete UI system failure - unable to create any UI elements');
    }
  }
}
