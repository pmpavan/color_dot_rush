import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { uiLogger, LogLevel } from './UIErrorLogger';

/**
 * Represents different types of UI elements that can be created
 */
export enum UIElementType {
  TEXT = 'text',
  GRAPHICS = 'graphics',
  MINIMAL = 'minimal'
}

/**
 * Interface for UI elements created by the factory
 */
export interface UIElement {
  container: Phaser.GameObjects.Container;
  textElement?: Phaser.GameObjects.Text;
  graphicsElements?: Phaser.GameObjects.GameObject[];
  type: UIElementType;
  updateMethod?: (value: any) => void;
}

/**
 * Configuration for layout positioning
 */
export interface LayoutConfig {
  header: {
    width: number;
    height: number;
    y: number;
  };
  score: { x: number; y: number };
  timer: { x: number; y: number };
  slowMoCharges: {
    startX: number;
    y: number;
    spacing: number;
  };
  targetColor: {
    x: number;
    y: number;
    width: number;
  };
}

/**
 * UIElementFactory creates UI components with comprehensive error handling and fallback mechanisms
 */
export class UIElementFactory {
  private scene: Scene;
  private fontFamily: string = 'Orbitron, Arial, sans-serif';
  private fallbackMode: UIElementType = UIElementType.TEXT;

  constructor(scene: Scene) {
    this.scene = scene;
    
    // Log system capabilities for debugging
    uiLogger.logSystemCapabilities();
    
    // Log factory initialization
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'constructor', 'Initializing UIElementFactory', {
      sceneKey: scene.scene.key,
      sceneActive: scene.scene.isActive()
    });
    
    this.detectFontAvailability();
  }

  /**
   * Detect font availability and set appropriate fallback mode
   * Enhanced with comprehensive font detection and graceful degradation
   */
  private detectFontAvailability(): void {
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'detectFontAvailability', 'Starting font availability detection');
    
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        uiLogger.log(LogLevel.DEBUG, 'UIElementFactory', 'detectFontAvailability', 'Font API available, checking Orbitron availability');
        
        // Wait a bit for fonts to potentially load, then check
        setTimeout(() => {
          this.performFontCheck();
        }, 100);
      } else {
        this.fontFamily = 'Orbitron, Arial, sans-serif';
        uiLogger.logFontStatus({
          poppinsAvailable: false,
          systemFontsAvailable: true,
          fontApiSupported: false,
          currentFontFamily: this.fontFamily,
          fallbackActivated: true,
          lastError: 'Font API not available'
        });
        uiLogger.log(LogLevel.WARN, 'UIElementFactory', 'detectFontAvailability', 'Font API not available, using Arial fallback');
        this.testFontFamily();
      }
      
    } catch (error) {
      this.fontFamily = 'Arial, sans-serif';
      uiLogger.logFontStatus({
        poppinsAvailable: false,
        systemFontsAvailable: true,
        fontApiSupported: false,
        currentFontFamily: this.fontFamily,
        fallbackActivated: true,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      });
      uiLogger.log(LogLevel.ERROR, 'UIElementFactory', 'detectFontAvailability', 'Error detecting font availability, falling back to system fonts', { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : undefined);
      this.testFontFamily();
    }
  }

  private performFontCheck(): void {
    try {
      // Check if Orbitron is available in multiple sizes
      const orbitron16Available = document.fonts.check('16px Orbitron');
      const orbitron24Available = document.fonts.check('24px Orbitron');
      const orbitron32Available = document.fonts.check('32px Orbitron');
      
      const orbitronFullyAvailable = orbitron16Available && orbitron24Available && orbitron32Available;
      
      const fontCheckResults = {
        '16px': orbitron16Available,
        '24px': orbitron24Available,
        '32px': orbitron32Available,
        'fully_available': orbitronFullyAvailable
      };
      
      uiLogger.log(LogLevel.DEBUG, 'UIElementFactory', 'performFontCheck', 'Orbitron font availability check completed', fontCheckResults);
      
      if (orbitronFullyAvailable) {
        this.fontFamily = 'Orbitron, Arial, sans-serif';
        uiLogger.logFontStatus({
          orbitronAvailable: true,
          fontApiSupported: true,
          currentFontFamily: this.fontFamily
        });
        uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'performFontCheck', 'Orbitron font fully available');
      } else if (orbitron16Available || orbitron24Available) {
        this.fontFamily = 'Orbitron, Arial, sans-serif';
        uiLogger.logFontStatus({
          orbitronAvailable: true,
          fontApiSupported: true,
          currentFontFamily: this.fontFamily,
          fallbackActivated: true,
          lastError: 'Orbitron partially available'
        });
        uiLogger.log(LogLevel.WARN, 'UIElementFactory', 'performFontCheck', 'Orbitron partially available, using with Arial fallback');
      } else {
        this.fontFamily = 'Orbitron, Arial, sans-serif';
        uiLogger.logFontStatus({
          orbitronAvailable: false,
          systemFontsAvailable: true,
          fontApiSupported: true,
          currentFontFamily: this.fontFamily,
          fallbackActivated: true,
          lastError: 'Orbitron not available'
        });
        uiLogger.log(LogLevel.WARN, 'UIElementFactory', 'performFontCheck', 'Orbitron font not available, using Arial fallback');
      }
      
      // Test the selected font family
      this.testFontFamily();
      
    } catch (error) {
      this.fontFamily = 'Arial, sans-serif';
      uiLogger.logFontStatus({
        poppinsAvailable: false,
        systemFontsAvailable: true,
        fontApiSupported: true,
        currentFontFamily: this.fontFamily,
        fallbackActivated: true,
        lastError: error instanceof Error ? error.message : 'Font check error'
      });
      uiLogger.log(LogLevel.ERROR, 'UIElementFactory', 'performFontCheck', 'Error during font check, falling back to system fonts', { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : undefined);
      this.testFontFamily();
    }
  }

  /**
   * Test the selected font family to ensure it works
   */
  private testFontFamily(): void {
    uiLogger.log(LogLevel.DEBUG, 'UIElementFactory', 'testFontFamily', 'Testing font family rendering', { fontFamily: this.fontFamily });
    
    try {
      if (typeof document === 'undefined') {
        uiLogger.log(LogLevel.WARN, 'UIElementFactory', 'testFontFamily', 'Document not available, skipping font test');
        return;
      }

      // Create a test element to verify font rendering
      const testElement = document.createElement('div');
      testElement.style.fontFamily = this.fontFamily;
      testElement.style.fontSize = '16px';
      testElement.textContent = 'Font Test';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.visibility = 'hidden';
      
      document.body.appendChild(testElement);
      
      // Check if the element renders properly
      const hasValidDimensions = testElement.offsetWidth > 0 && testElement.offsetHeight > 0;
      const dimensions = {
        width: testElement.offsetWidth,
        height: testElement.offsetHeight
      };
      
      document.body.removeChild(testElement);
      
      if (!hasValidDimensions) {
        const previousFont = this.fontFamily;
        this.fontFamily = 'sans-serif';
        
        uiLogger.logFontStatus({
          systemFontsAvailable: false,
          currentFontFamily: this.fontFamily,
          fallbackActivated: true,
          lastError: 'Font rendering test failed'
        });
        
        uiLogger.log(LogLevel.WARN, 'UIElementFactory', 'testFontFamily', 'Font family test failed, switching to basic fallback', {
          previousFont,
          newFont: this.fontFamily,
          dimensions
        });
      } else {
        uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'testFontFamily', 'Font family test passed', {
          fontFamily: this.fontFamily,
          dimensions
        });
      }
      
    } catch (error) {
      const previousFont = this.fontFamily;
      this.fontFamily = 'sans-serif';
      
      uiLogger.logFontStatus({
        systemFontsAvailable: false,
        currentFontFamily: this.fontFamily,
        fallbackActivated: true,
        lastError: error instanceof Error ? error.message : 'Font test error'
      });
      
      uiLogger.log(LogLevel.ERROR, 'UIElementFactory', 'testFontFamily', 'Font family test error, switching to basic fallback', {
        previousFont,
        newFont: this.fontFamily,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get current font family with fallback awareness
   */
  public getCurrentFontFamily(): string {
    return this.fontFamily;
  }

  /**
   * Update font family (for use with FallbackRenderer)
   */
  public updateFontFamily(fontFamily: string): void {
    console.log('UIElementFactory: Updating font family to:', fontFamily);
    this.fontFamily = fontFamily;
  }

  /**
   * Create score display with text and graphics fallbacks
   */
  createScoreDisplay(x: number, y: number): UIElement {
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'createScoreDisplay', 'Creating score display', { x, y });
    uiLogger.logUICreationStep('scoreDisplay', 'initialization', true, { x, y, fontFamily: this.fontFamily });
    
    const fallbacksUsed: string[] = [];
    
    try {
      uiLogger.logUICreationStep('scoreDisplay', 'attemptTextCreation', true);
      const result = this.createTextScoreDisplay(x, y);
      uiLogger.logUICreation('scoreDisplay', 'text', true, undefined, fallbacksUsed, 0, 1);
      return result;
    } catch (error) {
      fallbacksUsed.push('text');
      uiLogger.logFallbackActivation('scoreDisplay', 'text', 'graphics', 'Text creation failed', error instanceof Error ? error : undefined);
      uiLogger.logUICreationStep('scoreDisplay', 'textCreationFailed', false, undefined, error instanceof Error ? error : undefined);
      
      try {
        uiLogger.logUICreationStep('scoreDisplay', 'attemptGraphicsCreation', true);
        const result = this.createGraphicsScoreDisplay(x, y);
        uiLogger.logUICreation('scoreDisplay', 'graphics', true, undefined, fallbacksUsed, 1, 1);
        return result;
      } catch (fallbackError) {
        fallbacksUsed.push('graphics');
        uiLogger.logFallbackActivation('scoreDisplay', 'graphics', 'minimal', 'Graphics creation failed', fallbackError instanceof Error ? fallbackError : undefined);
        uiLogger.logUICreationStep('scoreDisplay', 'graphicsCreationFailed', false, undefined, fallbackError instanceof Error ? fallbackError : undefined);
        
        try {
          uiLogger.logUICreationStep('scoreDisplay', 'attemptMinimalCreation', true);
          const result = this.createMinimalScoreDisplay(x, y);
          uiLogger.logUICreation('scoreDisplay', 'minimal', true, undefined, fallbacksUsed, 2, 1);
          return result;
        } catch (minimalError) {
          fallbacksUsed.push('minimal');
          uiLogger.logUICreation('scoreDisplay', 'minimal', false, minimalError instanceof Error ? minimalError : undefined, fallbacksUsed, 2, 0);
          throw minimalError;
        }
      }
    }
  }

  /**
   * Create time display with text and graphics fallbacks
   */
  createTimeDisplay(x: number, y: number): UIElement {
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'createTimeDisplay', 'Creating time display', { x, y });
    uiLogger.logUICreationStep('timeDisplay', 'initialization', true, { x, y, fontFamily: this.fontFamily });
    
    const fallbacksUsed: string[] = [];
    
    try {
      uiLogger.logUICreationStep('timeDisplay', 'attemptTextCreation', true);
      const result = this.createTextTimeDisplay(x, y);
      uiLogger.logUICreation('timeDisplay', 'text', true, undefined, fallbacksUsed, 0, 1);
      return result;
    } catch (error) {
      fallbacksUsed.push('text');
      uiLogger.logFallbackActivation('timeDisplay', 'text', 'graphics', 'Text creation failed', error instanceof Error ? error : undefined);
      uiLogger.logUICreationStep('timeDisplay', 'textCreationFailed', false, undefined, error instanceof Error ? error : undefined);
      
      try {
        uiLogger.logUICreationStep('timeDisplay', 'attemptGraphicsCreation', true);
        const result = this.createGraphicsTimeDisplay(x, y);
        uiLogger.logUICreation('timeDisplay', 'graphics', true, undefined, fallbacksUsed, 1, 1);
        return result;
      } catch (fallbackError) {
        fallbacksUsed.push('graphics');
        uiLogger.logFallbackActivation('timeDisplay', 'graphics', 'minimal', 'Graphics creation failed', fallbackError instanceof Error ? fallbackError : undefined);
        uiLogger.logUICreationStep('timeDisplay', 'graphicsCreationFailed', false, undefined, fallbackError instanceof Error ? fallbackError : undefined);
        
        try {
          uiLogger.logUICreationStep('timeDisplay', 'attemptMinimalCreation', true);
          const result = this.createMinimalTimeDisplay(x, y);
          uiLogger.logUICreation('timeDisplay', 'minimal', true, undefined, fallbacksUsed, 2, 1);
          return result;
        } catch (minimalError) {
          fallbacksUsed.push('minimal');
          uiLogger.logUICreation('timeDisplay', 'minimal', false, minimalError instanceof Error ? minimalError : undefined, fallbacksUsed, 2, 0);
          throw minimalError;
        }
      }
    }
  }

  /**
   * Create slow-mo charges with proper icon creation
   */
  createSlowMoCharges(startX: number, y: number, count: number): UIElement[] {
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'createSlowMoCharges', 'Creating slow-mo charges', { startX, y, count });
    uiLogger.logUICreationStep('slowMoCharges', 'initialization', true, { startX, y, count, spacing: 35 });
    
    const charges: UIElement[] = [];
    const spacing = 35;
    const fallbacksUsed: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < count; i++) {
      const chargeX = startX - (i * spacing);
      
      try {
        uiLogger.logUICreationStep('slowMoCharges', `createCharge${i}`, true, { chargeX, y, index: i });
        charges.push(this.createSlowMoCharge(chargeX, y, i));
        successCount++;
      } catch (error) {
        failureCount++;
        fallbacksUsed.push(`charge${i}-graphics`);
        uiLogger.logFallbackActivation(`slowMoCharge${i}`, 'graphics', 'minimal', 'Graphics creation failed', error instanceof Error ? error : undefined);
        uiLogger.logUICreationStep('slowMoCharges', `createCharge${i}Failed`, false, { chargeX, y, index: i }, error instanceof Error ? error : undefined);
        
        try {
          charges.push(this.createMinimalSlowMoCharge(chargeX, y, i));
          successCount++;
        } catch (minimalError) {
          uiLogger.log(LogLevel.ERROR, 'UIElementFactory', 'createSlowMoCharges', `Failed to create charge ${i} even with minimal fallback`, { chargeX, y, index: i }, minimalError instanceof Error ? minimalError : undefined);
        }
      }
    }

    uiLogger.logUICreation('slowMoCharges', successCount === count ? 'graphics' : 'minimal', successCount > 0, undefined, fallbacksUsed, failureCount, successCount);
    uiLogger.log(LogLevel.INFO, 'UIElementFactory', 'createSlowMoCharges', 'Slow-mo charges creation completed', {
      totalRequested: count,
      successCount,
      failureCount,
      fallbacksUsed: fallbacksUsed.length
    });

    return charges;
  }

  /**
   * Create target color display with "TAP" text and colored dot icon
   */
  createTargetColorDisplay(x: number, y: number, width: number): UIElement {
    console.log('UIElementFactory: Creating target color display at', x, y, 'width:', width);
    
    try {
      return this.createTextTargetColorDisplay(x, y, width);
    } catch (error) {
      console.warn('UIElementFactory: Text target color display failed, using graphics fallback:', error);
      try {
        return this.createGraphicsTargetColorDisplay(x, y, width);
      } catch (fallbackError) {
        console.error('UIElementFactory: Graphics target color display failed, using minimal fallback:', fallbackError);
        return this.createMinimalTargetColorDisplay(x, y, width);
      }
    }
  }

  /**
   * Create header background with full-width coverage
   */
  createHeaderBackground(width: number, height: number): UIElement {
    console.log('UIElementFactory: Creating header background', width, 'x', height);
    
    try {
      const container = this.scene.add.container(0, 0);
      
      // Create header background that spans full screen width
      // Position at y: 0 (top of screen) with proper height and transparency
      const background = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.5)
        .setOrigin(0, 0)
        .setPosition(0, 0) // Ensure it's at the very top
        .setDepth(100);
      
      // Ensure the background covers the full width by setting it directly on the scene
      // rather than in a container to avoid any positioning issues
      background.setScrollFactor(0); // Make it stay in place during camera movements
      
      container.add(background);
      
      const updateMethod = (newWidth: number, newHeight?: number) => {
        const actualHeight = newHeight || height;
        background.setSize(newWidth, actualHeight);
        background.setPosition(0, 0); // Ensure it stays at top
        console.log('UIElementFactory: Header background resized to', newWidth, 'x', actualHeight);
      };
      
      return {
        container,
        graphicsElements: [background],
        type: UIElementType.GRAPHICS,
        updateMethod
      };
    } catch (error) {
      console.error('UIElementFactory: Failed to create header background:', error);
      // Create minimal fallback with same full-width behavior
      const container = this.scene.add.container(0, 0);
      const background = this.scene.add.rectangle(0, 0, width, height, 0x333333, 0.8)
        .setOrigin(0, 0)
        .setPosition(0, 0)
        .setDepth(100);
      
      background.setScrollFactor(0);
      container.add(background);
      
      const updateMethod = (newWidth: number, newHeight?: number) => {
        const actualHeight = newHeight || height;
        background.setSize(newWidth, actualHeight);
        background.setPosition(0, 0);
      };
      
      return {
        container,
        graphicsElements: [background],
        type: UIElementType.MINIMAL,
        updateMethod
      };
    }
  }

  // Private methods for text-based UI creation

  private createTextScoreDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);

    // Create text with robust error handling
    let scoreText: Phaser.GameObjects.Text;
    try {
      scoreText = this.scene.add.text(0, 0, 'Score: 0 | Best: 0', {
        fontFamily: this.fontFamily,
        fontSize: '24px',
        color: '#FFFFFF',
        // Add fallback font stack
        font: `${this.fontFamily}, Arial, sans-serif`
      }).setOrigin(0, 0.5);
    } catch (error) {
      console.error('UIElementFactory: Failed to create score text, using fallback:', error);
      // Create with minimal styling as fallback
      scoreText = this.scene.add.text(0, 0, 'Score: 0 | Best: 0', {
        fontSize: '24px',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5);
    }
    
    scoreText.setDepth(102);
    container.add(scoreText);

    const updateMethod = (data: { score: number; bestScore: number }) => {
      try {
        scoreText.setText(`Score: ${data.score} | Best: ${data.bestScore}`);
        
        // Change color based on score level
        const color = data.score > 10 ? '#FFD700' : data.score > 5 ? '#2ECC71' : '#FFFFFF';
        scoreText.setColor(color);
      } catch (error) {
        console.warn('UIElementFactory: Failed to update score text:', error);
      }
    };

    return {
      container,
      textElement: scoreText,
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  private createTextTimeDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);

    // Time display positioned at screen center (requirement 2.4)
    let timeText: Phaser.GameObjects.Text;
    try {
      timeText = this.scene.add.text(0, 0, 'Time: 0:00', {
        fontFamily: this.fontFamily,
        fontSize: '24px',
        color: '#FFFFFF',
        // Add fallback font stack
        font: `${this.fontFamily}, Arial, sans-serif`
      }).setOrigin(0.5, 0.5); // Centered origin for proper center positioning
    } catch (error) {
      console.error('UIElementFactory: Failed to create time text, using fallback:', error);
      // Create with minimal styling as fallback
      timeText = this.scene.add.text(0, 0, 'Time: 0:00', {
        fontSize: '24px',
        color: '#FFFFFF'
      }).setOrigin(0.5, 0.5);
    }
    
    timeText.setDepth(102);
    container.add(timeText);

    const updateMethod = (elapsedTime: number) => {
      try {
        const totalSeconds = Math.floor(elapsedTime / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        // MM:SS format (requirement 2.1)
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timeText.setText(`Time: ${timeString}`);
      } catch (error) {
        console.warn('UIElementFactory: Failed to update time text:', error);
      }
    };

    return {
      container,
      textElement: timeText,
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  private createTextTargetColorDisplay(x: number, y: number, width: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(103);

    // Background
    const background = this.scene.add.rectangle(0, 0, width, 60, 0x000000, 0.8);
    background.setStrokeStyle(3, 0xFFFFFF, 0.9);
    background.setDepth(103);

    // TAP text (requirement 4.1 - "TAP" text with colored dot icon instead of color name)
    let tapText: Phaser.GameObjects.Text;
    try {
      tapText = this.scene.add.text(-30, 0, 'TAP', {
        fontFamily: this.fontFamily,
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#FFFFFF',
        // Add fallback font stack
        font: `${this.fontFamily}, Arial, sans-serif`
      }).setOrigin(0.5, 0.5);
    } catch (error) {
      console.error('UIElementFactory: Failed to create TAP text, using fallback:', error);
      // Create with minimal styling as fallback
      tapText = this.scene.add.text(-30, 0, 'TAP', {
        fontSize: '32px',
        color: '#FFFFFF'
      }).setOrigin(0.5, 0.5);
    }
    tapText.setDepth(104);

    // Colored dot icon (requirement 4.2 - dot icon instead of color name)
    const colorDot = this.scene.add.circle(30, 0, 20, 0xE74C3C);
    colorDot.setStrokeStyle(3, 0xFFFFFF, 1);
    colorDot.setDepth(104);

    container.add([background, tapText, colorDot]);

    // Add pulsing animation (requirement 4.4)
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
      try {
        const colorValue = parseInt(color.replace('#', '0x'));
        colorDot.setFillStyle(colorValue);
        // Update background border color to match target color (requirement 7.5)
        background.setStrokeStyle(3, colorValue, 0.9);
      } catch (error) {
        console.warn('UIElementFactory: Failed to update target color:', error);
      }
    };

    return {
      container,
      textElement: tapText,
      graphicsElements: [background, colorDot],
      type: UIElementType.TEXT,
      updateMethod
    };
  }

  // Private methods for graphics-based UI creation

  private createGraphicsScoreDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
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
      
      // Scale indicator based on score
      const scale = Math.min(1 + (data.score * 0.1), 2);
      scoreIndicator.setScale(scale);
    };

    return {
      container,
      graphicsElements: [scoreBg, scoreIndicator],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  private createGraphicsTimeDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);

    const timeBg = this.scene.add.circle(0, 0, 18, 0x2ECC71, 0.8);
    timeBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    timeBg.setDepth(102);

    const timeHand = this.scene.add.line(0, 0, 0, 0, 0, -12, 0xFFFFFF, 1).setLineWidth(2);
    timeHand.setDepth(103);

    container.add([timeBg, timeHand]);

    const updateMethod = (elapsedTime: number) => {
      const totalSeconds = Math.floor(elapsedTime / 1000);
      const rotation = (totalSeconds * 6) * (Math.PI / 180); // 6 degrees per second
      timeHand.setRotation(rotation);
    };

    return {
      container,
      graphicsElements: [timeBg, timeHand],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  private createGraphicsTargetColorDisplay(x: number, y: number, width: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(103);

    const background = this.scene.add.rectangle(0, 0, width, 60, 0x000000, 0.8);
    background.setStrokeStyle(3, 0xFFFFFF, 0.9);
    background.setDepth(103);

    // Large target color circle
    const targetCircle = this.scene.add.circle(0, 0, 25, 0xE74C3C);
    targetCircle.setStrokeStyle(4, 0xFFFFFF, 1);
    targetCircle.setDepth(104);

    // Arrow pointing to circle
    const arrow = this.scene.add.triangle(-40, 0, 0, -10, 15, 0, 0, 10, 0xFFFFFF);
    arrow.setDepth(104);

    container.add([background, targetCircle, arrow]);

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
      targetCircle.setFillStyle(colorValue);
      background.setStrokeStyle(3, colorValue, 0.9);
    };

    return {
      container,
      graphicsElements: [background, targetCircle, arrow],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  private createSlowMoCharge(x: number, y: number, _index: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);

    // Transparent circle without border
    const charge = this.scene.add.circle(0, 0, 15, 0xFFFFFF, 0); // Transparent fill
    charge.setDepth(101);

    // Create a more visible bright cyan indicator in the center
    const slowIndicator = this.scene.add.circle(0, 0, 6, 0x00FFFF);
    slowIndicator.setDepth(102);

    container.add([charge, slowIndicator]);

    const updateMethod = (isActive: boolean) => {
      if (isActive) {
        // Active charge - bright and visible
        charge.setFillStyle(0xFFFFFF, 0); // Transparent
        charge.setAlpha(1.0);
        slowIndicator.setAlpha(1.0);
        
        // Pulsing animation for active charges
        this.scene.tweens.add({
          targets: container,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      } else {
        // Inactive charge - dimmed effect for used charges
        charge.setFillStyle(0xFFFFFF, 0); // Transparent
        charge.setAlpha(0.4); // Dimming effect
        slowIndicator.setAlpha(0.4);
        
        // Stop pulsing animation
        this.scene.tweens.killTweensOf(container);
        container.setScale(1.0);
      }
    };

    return {
      container,
      graphicsElements: [charge, slowIndicator],
      type: UIElementType.GRAPHICS,
      updateMethod
    };
  }

  // Private methods for minimal UI creation

  private createMinimalScoreDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
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

  private createMinimalTimeDisplay(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(101);

    const timeCircle = this.scene.add.circle(0, 0, 15, 0x2ECC71);
    timeCircle.setDepth(102);
    container.add(timeCircle);

    const updateMethod = (elapsedTime: number) => {
      // Pulse based on time
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

  private createMinimalTargetColorDisplay(x: number, y: number, _width: number): UIElement {
    const container = this.scene.add.container(x, y);
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

  private createMinimalSlowMoCharge(x: number, y: number, _index: number): UIElement {
    const container = this.scene.add.container(x, y);
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

    return {
      container,
      graphicsElements: [charge],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  /**
   * Get current fallback mode
   */
  public getFallbackMode(): UIElementType {
    return this.fallbackMode;
  }

  /**
   * Set fallback mode for testing
   */
  public setFallbackMode(mode: UIElementType): void {
    this.fallbackMode = mode;
  }

  /**
   * Cleanup method with comprehensive error handling patterns
   * Uses SafeCleanupHelpers for consistent error handling across all utility classes
   */
  public destroy(): void {
    // Import the helper functions (dynamic import to avoid circular dependencies)
    const { 
      handlePartialDestructionState, 
      validateSceneState,
      safelyKillTweens
    } = require('./SafeCleanupHelpers');

    console.log('UIElementFactory: Starting destruction with comprehensive error handling');

    // Validate scene state before attempting cleanup
    const sceneValidation = validateSceneState(this.scene, 'UIElementFactory');
    
    if (!sceneValidation.isValid) {
      console.warn('UIElementFactory: Scene validation failed, proceeding with limited cleanup', {
        validationErrors: sceneValidation.validationErrors
      });
    }

    // Define cleanup operations for partial destruction state handling
    const cleanupOperations = [
      {
        name: 'killAllSceneTweens',
        operation: () => {
          // Use the safe tween killing helper
          if (safelyKillTweens(this.scene, undefined, 'UIElementFactory')) {
            console.log('UIElementFactory: All scene animations stopped successfully');
          }
        },
        required: false
      },
      {
        name: 'resetFontFamily',
        operation: () => {
          // Reset font family to safe default
          this.fontFamily = 'Orbitron, Arial, sans-serif';
          console.log('UIElementFactory: Font family reset to safe default');
        },
        required: true
      },
      {
        name: 'resetFallbackMode',
        operation: () => {
          // Reset fallback mode to safe default
          this.fallbackMode = UIElementType.TEXT;
          console.log('UIElementFactory: Fallback mode reset to safe default');
        },
        required: true
      }
    ];

    // Execute cleanup with partial destruction state handling
    const cleanupStatus = handlePartialDestructionState(
      this.scene,
      cleanupOperations,
      'UIElementFactory'
    );

    // Log final cleanup status
    if (cleanupStatus.completed) {
      console.log('UIElementFactory: Destruction completed successfully', {
        tweensKilled: cleanupStatus.tweensKilled,
        errorCount: cleanupStatus.errors.length
      });
    } else {
      console.warn('UIElementFactory: Destruction completed with errors', {
        errors: cleanupStatus.errors,
        tweensKilled: cleanupStatus.tweensKilled
      });
    }

    console.log('UIElementFactory: Destroyed and cleaned up');
  }
}
