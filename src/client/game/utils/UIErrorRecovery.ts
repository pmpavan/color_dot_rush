/**
 * UIErrorRecovery - Comprehensive error recovery mechanisms for UI system
 * Implements requirements: 5.2, 5.3, 5.5 - graceful error recovery and automatic fallback switching
 */

import { Scene } from 'phaser';
import { UIElement, UIElementType, LayoutConfig } from './UIElementFactory';
import { FallbackRenderer, FallbackMode, UIElementMap } from './FallbackRenderer';
import { uiLogger, LogLevel } from './UIErrorLogger';
import { NeonTextEffects, NeonTextEffectType, NeonTextSize } from './NeonTextEffects';
import { UIColor } from '../../../shared/types/game';

export interface RecoveryAttempt {
  timestamp: string;
  component: string;
  originalMethod: string;
  recoveryMethod: string;
  success: boolean;
  error?: string;
  retryCount: number;
}

export interface RecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  enableAutoFallback: boolean;
  enableRetryLogic: boolean;
  fallbackChain: string[];
}

/**
 * Comprehensive error recovery system for UI components
 */
export class UIErrorRecovery {
  private scene: Scene;
  private fallbackRenderer: FallbackRenderer;
  private recoveryAttempts: RecoveryAttempt[] = [];
  private config: RecoveryConfig;
  private isRecovering: boolean = false;
  private recoveryPromises: Map<string, Promise<UIElement | UIElementMap | null>> = new Map();

  constructor(scene: Scene, config?: Partial<RecoveryConfig>) {
    this.scene = scene;
    this.fallbackRenderer = new FallbackRenderer(scene);
    
    this.config = {
      maxRetries: 3,
      retryDelay: 100,
      enableAutoFallback: true,
      enableRetryLogic: true,
      fallbackChain: ['text', 'graphics', 'minimal', 'emergency'],
      ...config
    };

    uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'constructor', 'Error recovery system initialized', {
      config: this.config,
      sceneKey: scene.scene.key
    });
  }

  /**
   * Attempt to recover from UI element creation failure with retry logic
   * Implements requirement: Implement retry logic for failed UI element creation
   */
  public async recoverUIElement(
    component: string,
    createFunction: () => UIElement,
    fallbackFunction?: () => UIElement
  ): Promise<UIElement | null> {
    
    if (this.recoveryPromises.has(component)) {
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'recoverUIElement', 'Recovery already in progress, returning existing promise', { component });
      return this.recoveryPromises.get(component) as Promise<UIElement | null>;
    }

    const recoveryPromise = this.performUIElementRecovery(component, createFunction, fallbackFunction);
    this.recoveryPromises.set(component, recoveryPromise);

    try {
      const result = await recoveryPromise;
      return result;
    } finally {
      this.recoveryPromises.delete(component);
    }
  }

  /**
   * Perform the actual UI element recovery with retry logic
   */
  private async performUIElementRecovery(
    component: string,
    createFunction: () => UIElement,
    fallbackFunction?: () => UIElement
  ): Promise<UIElement | null> {
    
    uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'performUIElementRecovery', 'Starting UI element recovery', {
      component,
      maxRetries: this.config.maxRetries,
      enableRetryLogic: this.config.enableRetryLogic
    });

    let lastError: Error | null = null;
    
    // First, try the original creation function with retries
    if (this.config.enableRetryLogic) {
      for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
        try {
          uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'performUIElementRecovery', `Retry attempt ${attempt + 1}/${this.config.maxRetries}`, { component });
          
          if (attempt > 0) {
            // Add delay between retries
            await this.delay(this.config.retryDelay * attempt);
          }

          const result = createFunction();
          
          this.recordRecoveryAttempt(component, 'original', 'retry', true, attempt + 1);
          uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'performUIElementRecovery', 'Recovery successful with retry', {
            component,
            attempt: attempt + 1,
            totalAttempts: this.config.maxRetries
          });
          
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'performUIElementRecovery', `Retry attempt ${attempt + 1} failed`, {
            component,
            attempt: attempt + 1,
            error: lastError.message
          }, lastError);
          
          this.recordRecoveryAttempt(component, 'original', 'retry', false, attempt + 1, lastError.message);
        }
      }
    }

    // If retries failed, try fallback function
    if (fallbackFunction && this.config.enableAutoFallback) {
      try {
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'performUIElementRecovery', 'Attempting fallback function', { component });
        
        const result = fallbackFunction();
        
        this.recordRecoveryAttempt(component, 'original', 'fallback', true, this.config.maxRetries + 1);
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'performUIElementRecovery', 'Recovery successful with fallback function', { component });
        
        return result;
      } catch (fallbackError) {
        const error = fallbackError instanceof Error ? fallbackError : new Error('Unknown fallback error');
        
        uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'performUIElementRecovery', 'Fallback function also failed', {
          component,
          error: error.message
        }, error);
        
        this.recordRecoveryAttempt(component, 'original', 'fallback', false, this.config.maxRetries + 1, error.message);
      }
    }

    // Final attempt: use FallbackRenderer emergency creation
    try {
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'performUIElementRecovery', 'Attempting emergency recovery with FallbackRenderer', { component });
      
      const emergencyResult = await this.createEmergencyUIElement(component);
      
      if (emergencyResult) {
        this.recordRecoveryAttempt(component, 'original', 'emergency', true, this.config.maxRetries + 2);
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'performUIElementRecovery', 'Recovery successful with emergency method', { component });
        return emergencyResult;
      }
    } catch (emergencyError) {
      const error = emergencyError instanceof Error ? emergencyError : new Error('Unknown emergency error');
      
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'performUIElementRecovery', 'Emergency recovery failed', {
        component,
        error: error.message
      }, error);
      
      this.recordRecoveryAttempt(component, 'original', 'emergency', false, this.config.maxRetries + 2, error.message);
    }

    // Complete failure
    uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'performUIElementRecovery', 'All recovery attempts failed', {
      component,
      totalAttempts: this.recoveryAttempts.filter(a => a.component === component).length,
      lastError: lastError?.message
    }, lastError || undefined);

    return null;
  }

  /**
   * Recover complete UI system with automatic fallback switching
   * Implements requirement: Add automatic fallback switching when errors occur
   */
  public async recoverUISystem(layout: LayoutConfig): Promise<UIElementMap | null> {
    uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'recoverUISystem', 'Starting complete UI system recovery');
    
    if (this.isRecovering) {
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'recoverUISystem', 'UI system recovery already in progress');
      return null;
    }

    this.isRecovering = true;

    try {
      // Try each fallback mode in the configured chain
      for (const mode of this.config.fallbackChain) {
        try {
          uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'recoverUISystem', `Attempting UI recovery with mode: ${mode}`);
          
          const fallbackMode = this.stringToFallbackMode(mode);
          this.fallbackRenderer.switchToFallbackMode(fallbackMode);
          
          const uiElements = this.fallbackRenderer.createUIWithFallback(layout);
          
          if (this.validateUIElements(uiElements)) {
            uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'recoverUISystem', `UI system recovery successful with mode: ${mode}`);
            this.recordRecoveryAttempt('UISystem', 'complete', mode, true, 1);
            return uiElements;
          } else {
            throw new Error(`UI validation failed for mode: ${mode}`);
          }
          
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error('Unknown error');
          
          uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'recoverUISystem', `UI recovery failed with mode: ${mode}`, {
            mode,
            error: errorObj.message
          }, errorObj);
          
          this.recordRecoveryAttempt('UISystem', 'complete', mode, false, 1, errorObj.message);
          
          // Clean up partial UI before trying next mode
          await this.cleanupPartialUI();
        }
      }

      // If all modes failed, return null
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'recoverUISystem', 'All UI system recovery attempts failed');
      return null;

    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Ensure game remains playable even with UI creation failures
   * Implements requirement: Ensure game remains playable even with UI creation failures
   */
  public async ensureGamePlayability(layout: LayoutConfig): Promise<boolean> {
    uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'ensureGamePlayability', 'Ensuring minimum game playability');

    try {
      // Check if any UI elements exist
      const hasAnyUI = this.checkExistingUI();
      
      if (hasAnyUI) {
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'ensureGamePlayability', 'Existing UI found, game is playable');
        return true;
      }

      // Try to create minimal playable UI
      const minimalUI = await this.createMinimalPlayableUI(layout);
      
      if (minimalUI) {
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'ensureGamePlayability', 'Minimal playable UI created successfully');
        return true;
      }

      // Last resort: create emergency indicators
      const emergencyIndicators = await this.createEmergencyGameIndicators(layout);
      
      if (emergencyIndicators) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'ensureGamePlayability', 'Emergency game indicators created, basic playability ensured');
        return true;
      }

      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'ensureGamePlayability', 'Failed to ensure game playability');
      return false;

    } catch (error) {
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'ensureGamePlayability', 'Error ensuring game playability', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      
      return false;
    }
  }

  /**
   * Create emergency UI element for specific component
   */
  private async createEmergencyUIElement(component: string): Promise<UIElement | null> {
    try {
      const { width } = this.scene.scale;
      
      // Create basic emergency element based on component type
      switch (component) {
        case 'scoreDisplay':
          return this.createEmergencyScore(20, 30);
        case 'timeDisplay':
          return this.createEmergencyTimer(width / 2, 30);
        case 'targetColor':
          return this.createEmergencyTargetColor(width / 2, 100);
        default:
          return this.createGenericEmergencyElement(100, 100);
      }
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'createEmergencyUIElement', 'Failed to create emergency UI element', {
        component,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      
      return null;
    }
  }

  /**
   * Create emergency score display
   */
  private createEmergencyScore(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(10000);

    // Bright, visible emergency indicator
    const scoreRect = this.scene.add.rectangle(0, 0, 60, 30, 0x00FF00, 1);
    scoreRect.setStrokeStyle(2, 0xFFFFFF, 1);
    scoreRect.setDepth(10001);
    
    container.add(scoreRect);

    const updateMethod = (data: { score: number; bestScore: number }) => {
      try {
        // Change color based on score for visual feedback
        const color = data.score > 10 ? 0xFFD700 : data.score > 5 ? 0x00FFFF : 0x00FF00;
        scoreRect.setFillStyle(color);
      } catch (error) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'emergencyScoreUpdate', 'Emergency score update failed', undefined, error instanceof Error ? error : undefined);
      }
    };

    return {
      container,
      graphicsElements: [scoreRect],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  /**
   * Create emergency timer display
   */
  private createEmergencyTimer(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(10000);

    // Bright, visible emergency indicator
    const timerCircle = this.scene.add.circle(0, 0, 20, 0x0000FF, 1);
    timerCircle.setStrokeStyle(2, 0xFFFFFF, 1);
    timerCircle.setDepth(10001);
    
    container.add(timerCircle);

    const updateMethod = (elapsedTime: number) => {
      try {
        // Pulse based on time for visual feedback
        const totalSeconds = Math.floor(elapsedTime / 1000);
        const alpha = 0.5 + (Math.sin(totalSeconds * 0.5) * 0.5);
        timerCircle.setAlpha(alpha);
      } catch (error) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'emergencyTimerUpdate', 'Emergency timer update failed', undefined, error instanceof Error ? error : undefined);
      }
    };

    return {
      container,
      graphicsElements: [timerCircle],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  /**
   * Create emergency target color display
   */
  private createEmergencyTargetColor(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(10000);

    // Large, bright emergency indicator
    const targetRect = this.scene.add.rectangle(0, 0, 80, 80, 0xFF0000, 1);
    targetRect.setStrokeStyle(4, 0xFFFFFF, 1);
    targetRect.setDepth(10001);
    
    container.add(targetRect);

    const updateMethod = (color: string) => {
      try {
        const colorValue = parseInt(color.replace('#', '0x'));
        targetRect.setFillStyle(colorValue);
      } catch (error) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'emergencyTargetColorUpdate', 'Emergency target color update failed', undefined, error instanceof Error ? error : undefined);
      }
    };

    return {
      container,
      graphicsElements: [targetRect],
      type: UIElementType.MINIMAL,
      updateMethod
    };
  }

  /**
   * Create generic emergency element
   */
  private createGenericEmergencyElement(x: number, y: number): UIElement {
    const container = this.scene.add.container(x, y);
    container.setDepth(10000);

    const element = this.scene.add.rectangle(0, 0, 40, 40, 0xFFFF00, 1);
    element.setStrokeStyle(2, 0xFF0000, 1);
    element.setDepth(10001);
    
    container.add(element);

    return {
      container,
      graphicsElements: [element],
      type: UIElementType.MINIMAL
    };
  }

  /**
   * Check if any existing UI elements are present
   */
  private checkExistingUI(): boolean {
    try {
      const children = this.scene.children.list;
      const hasVisibleElements = children.some(child => 
        'visible' in child && 'active' in child && 
        (child as any).visible && (child as any).active
      );
      
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'checkExistingUI', 'Checking existing UI elements', {
        totalChildren: children.length,
        hasVisibleElements
      });
      
      return hasVisibleElements;
    } catch (error) {
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'checkExistingUI', 'Error checking existing UI', undefined, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Create minimal playable UI for game functionality
   */
  private async createMinimalPlayableUI(layout: LayoutConfig): Promise<boolean> {
    try {
      uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'createMinimalPlayableUI', 'Creating minimal playable UI');
      
      // Create only essential elements for gameplay
      const essentialElements = [
        this.createEmergencyTargetColor(layout.targetColor.x, layout.targetColor.y),
        this.createEmergencyScore(layout.score.x, layout.score.y)
      ];

      // Validate that essential elements were created
      const validElements = essentialElements.filter(element => element !== null);
      
      if (validElements.length >= 1) { // At least target color is essential
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'createMinimalPlayableUI', 'Minimal playable UI created', {
          elementsCreated: validElements.length,
          totalAttempted: essentialElements.length
        });
        return true;
      }

      return false;
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'createMinimalPlayableUI', 'Failed to create minimal playable UI', undefined, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Create emergency game indicators as last resort
   */
  private async createEmergencyGameIndicators(_layout: LayoutConfig): Promise<boolean> {
    try {
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'createEmergencyGameIndicators', 'Creating emergency game indicators');
      
      const { width, height } = this.scene.scale;
      
      // Create highly visible emergency indicator in center of screen
      const emergencyIndicator = this.scene.add.rectangle(width / 2, height / 2, 200, 100, 0xFF0000, 1);
      emergencyIndicator.setStrokeStyle(5, 0xFFFFFF, 1);
      emergencyIndicator.setDepth(20000);
      
      // Add pulsing animation to make it very obvious
      this.scene.tweens.add({
        targets: emergencyIndicator,
        alpha: 0.3,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'createEmergencyGameIndicators', 'Emergency game indicators created');
      return true;
    } catch (error) {
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'createEmergencyGameIndicators', 'Failed to create emergency game indicators', undefined, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Validate UI elements are functional
   */
  private validateUIElements(uiElements: UIElementMap): boolean {
    try {
      const requiredElements = ['header', 'score', 'timer', 'targetColor'];
      const missingElements = requiredElements.filter(key => !uiElements[key as keyof UIElementMap]);
      
      if (missingElements.length > 0) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'validateUIElements', 'UI validation failed - missing elements', {
          missingElements,
          totalRequired: requiredElements.length
        });
        return false;
      }

      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'validateUIElements', 'UI validation passed');
      return true;
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'validateUIElements', 'Error validating UI elements', undefined, error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Clean up partial UI elements with comprehensive error handling patterns
   * Uses SafeCleanupHelpers for consistent error handling across all utility classes
   */
  private async cleanupPartialUI(): Promise<void> {
    // Import the helper functions (dynamic import to avoid circular dependencies)
    const { 
      performSafeCleanup, 
      validateSceneState,
      logDestructionError 
    } = require('./SafeCleanupHelpers');

    try {
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'cleanupPartialUI', 'Starting partial UI cleanup with comprehensive error handling');
      
      // Validate scene state before attempting cleanup
      const sceneValidation = validateSceneState(this.scene, 'UIErrorRecovery');
      
      if (!sceneValidation.isValid) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'cleanupPartialUI', 'Scene validation failed, proceeding with limited cleanup', {
          validationErrors: sceneValidation.validationErrors
        });
      }

      // Use the comprehensive safe cleanup function
      const cleanupResult = performSafeCleanup(this.scene, {
        killTweens: true,
        removeChildren: true,
        removeEventListeners: [], // No specific event listeners to remove in this context
        componentName: 'UIErrorRecovery'
      });

      // Log cleanup results
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'cleanupPartialUI', 'Partial UI cleanup completed', {
        tweensCleared: cleanupResult.tweensCleared,
        childrenRemoved: cleanupResult.childrenRemoved,
        totalOperations: cleanupResult.totalOperations,
        successfulOperations: cleanupResult.successfulOperations,
        cleanupCompleted: cleanupResult.cleanupStatus.completed,
        errorCount: cleanupResult.cleanupStatus.errors.length
      });

      if (!cleanupResult.cleanupStatus.completed) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'cleanupPartialUI', 'Partial UI cleanup completed with errors', {
          errors: cleanupResult.cleanupStatus.errors
        });
      }
      
      // Small delay to ensure cleanup is complete
      await this.delay(50);
      
    } catch (error) {
      logDestructionError('UIErrorRecovery', 'cleanupPartialUI', error, {
        sceneExists: !!this.scene
      });
      
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'cleanupPartialUI', 'Error during partial UI cleanup', {
        error: error instanceof Error ? error.message : String(error),
        sceneExists: !!this.scene,
        timestamp: new Date().toISOString()
      }, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Record recovery attempt for analysis
   */
  private recordRecoveryAttempt(component: string, originalMethod: string, recoveryMethod: string, success: boolean, retryCount: number, error?: string): void {
    const attempt: RecoveryAttempt = {
      timestamp: new Date().toISOString(),
      component,
      originalMethod,
      recoveryMethod,
      success,
      retryCount,
      ...(error && { error })
    };

    this.recoveryAttempts.push(attempt);
    
    // Keep only last 100 attempts to prevent memory issues
    if (this.recoveryAttempts.length > 100) {
      this.recoveryAttempts = this.recoveryAttempts.slice(-100);
    }
  }

  /**
   * Convert string to FallbackMode enum
   */
  private stringToFallbackMode(mode: string): FallbackMode {
    switch (mode.toLowerCase()) {
      case 'text': return FallbackMode.TEXT;
      case 'graphics': return FallbackMode.GRAPHICS;
      case 'minimal': return FallbackMode.MINIMAL;
      case 'emergency': return FallbackMode.EMERGENCY;
      default: return FallbackMode.EMERGENCY;
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStats(): {
    totalAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    mostCommonFailures: string[];
  } {
    const totalAttempts = this.recoveryAttempts.length;
    const successfulRecoveries = this.recoveryAttempts.filter(a => a.success).length;
    const failedRecoveries = totalAttempts - successfulRecoveries;
    
    // Count failure reasons
    const failureReasons = this.recoveryAttempts
      .filter(a => !a.success && a.error)
      .map(a => a.error!)
      .reduce((acc, reason) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const mostCommonFailures = Object.entries(failureReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      totalAttempts,
      successfulRecoveries,
      failedRecoveries,
      mostCommonFailures
    };
  }

  /**
   * Get recent recovery attempts
   */
  public getRecentRecoveryAttempts(count: number = 10): RecoveryAttempt[] {
    return this.recoveryAttempts.slice(-count);
  }

  /**
   * Create non-intrusive glowing error banner
   */
  public createErrorBanner(message: string, type: 'warning' | 'error' | 'info' = 'error'): Phaser.GameObjects.Container | null {
    try {
      const { width, height } = this.scene.scale;
      
      // Create banner container
      const banner = this.scene.add.container(width / 2, 50);
      banner.setDepth(15000);
      
      // Choose colors based on type
      let bgColor: number;
      let glowColor: number;
      let textColor: string;
      
      switch (type) {
        case 'warning':
          bgColor = 0xFFA500; // Orange
          glowColor = 0xFF8C00;
          textColor = '#FFFFFF';
          break;
        case 'error':
          bgColor = 0xFF0000; // Red
          glowColor = 0xDC143C;
          textColor = '#FFFFFF';
          break;
        case 'info':
        default:
          bgColor = 0x00BFFF; // Electric Blue
          glowColor = 0x0080FF;
          textColor = '#FFFFFF';
          break;
      }
      
      // Create background with glow effect
      const bg = this.scene.add.rectangle(0, 0, 400, 60, bgColor, 0.9);
      bg.setStrokeStyle(2, glowColor, 0.8);
      
      // Add glow effect
      const glow = this.scene.add.rectangle(0, 0, 420, 80, glowColor, 0.3);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      
      // Create text with neon effects
      const text = this.scene.add.text(0, 0, message, {
        fontSize: '18px',
        color: textColor,
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      // Apply neon text effects
      text.setStroke('#000000', 2);
      text.setShadow(0, 0, 10, glowColor, 0.8, true);
      
      banner.add([glow, bg, text]);
      
      // Add entrance animation
      banner.setAlpha(0);
      banner.setScale(0.8);
      
      this.scene.tweens.add({
        targets: banner,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });
      
      // Auto-hide after 3 seconds
      this.scene.time.delayedCall(3000, () => {
        this.hideErrorBanner(banner);
      });
      
      uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'createErrorBanner', `Created ${type} banner: ${message}`);
      return banner;
      
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'createErrorBanner', 'Failed to create error banner', {
        message,
        type,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Hide error banner with animation
   */
  private hideErrorBanner(banner: Phaser.GameObjects.Container): void {
    if (!banner || !banner.active) return;
    
    this.scene.tweens.add({
      targets: banner,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 200,
      ease: 'Power2.easeIn',
      onComplete: () => {
        banner.destroy();
      }
    });
  }

  /**
   * Create connection lost message with retry indicator
   */
  public createConnectionLostMessage(): Phaser.GameObjects.Container | null {
    try {
      const { width, height } = this.scene.scale;
      
      const container = this.scene.add.container(width / 2, height / 2);
      container.setDepth(15000);
      
      // Background with glass morphism effect
      const bg = this.scene.add.rectangle(0, 0, 350, 120, 0x1E1E1E, 0.95);
      bg.setStrokeStyle(2, 0xFF0000, 0.8);
      
      // Glow effect
      const glow = this.scene.add.rectangle(0, 0, 370, 140, 0xFF0000, 0.2);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      
      // Main message
      const message = this.scene.add.text(0, -20, 'CONNECTION LOST', {
        fontSize: '24px',
        color: '#FF0000',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      // Apply neon effects
      message.setStroke('#000000', 2);
      message.setShadow(0, 0, 15, 0xFF0000, 0.8, true);
      
      // Retry message
      const retryText = this.scene.add.text(0, 20, 'Retrying...', {
        fontSize: '16px',
        color: '#FFFFFF',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      retryText.setShadow(0, 0, 8, 0x00BFFF, 0.6, true);
      
      // Animated dots
      const dots = this.scene.add.text(0, 40, '...', {
        fontSize: '20px',
        color: '#00BFFF',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      // Animate dots
      this.scene.tweens.add({
        targets: dots,
        alpha: 0.3,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      container.add([glow, bg, message, retryText, dots]);
      
      // Entrance animation
      container.setAlpha(0);
      container.setScale(0.9);
      
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Back.easeOut'
      });
      
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'createConnectionLostMessage', 'Created connection lost message');
      return container;
      
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'createConnectionLostMessage', 'Failed to create connection lost message', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Create system malfunction screen with glitch effects
   */
  public createSystemMalfunctionScreen(): Phaser.GameObjects.Container | null {
    try {
      const { width, height } = this.scene.scale;
      
      const container = this.scene.add.container(width / 2, height / 2);
      container.setDepth(20000);
      
      // Dark background
      const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.9);
      
      // Glitch overlay
      const glitchOverlay = this.scene.add.rectangle(0, 0, width, height, 0xFF0000, 0.1);
      glitchOverlay.setBlendMode(Phaser.BlendModes.ADD);
      
      // Main error text
      const errorText = this.scene.add.text(0, -50, 'SYSTEM MALFUNCTION', {
        fontSize: '36px',
        color: '#FF0000',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      errorText.setStroke('#000000', 3);
      errorText.setShadow(0, 0, 20, 0xFF0000, 1, true);
      
      // Subtitle
      const subtitle = this.scene.add.text(0, 0, 'Attempting Recovery...', {
        fontSize: '20px',
        color: '#FFFFFF',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      subtitle.setShadow(0, 0, 10, 0x00BFFF, 0.8, true);
      
      // Error code
      const errorCode = this.scene.add.text(0, 50, 'ERROR: 0xNEON_PULSE_FAIL', {
        fontSize: '16px',
        color: '#00FF00',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      errorCode.setShadow(0, 0, 8, 0x00FF00, 0.6, true);
      
      container.add([bg, glitchOverlay, errorText, subtitle, errorCode]);
      
      // Glitch animation
      this.scene.tweens.add({
        targets: glitchOverlay,
        alpha: 0.3,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Power2.easeInOut'
      });
      
      // Text glitch effect
      this.scene.tweens.add({
        targets: errorText,
        x: errorText.x + 5,
        duration: 100,
        yoyo: true,
        repeat: -1,
        ease: 'Power2.easeInOut'
      });
      
      // Entrance animation
      container.setAlpha(0);
      
      this.scene.tweens.add({
        targets: container,
        alpha: 1,
        duration: 500,
        ease: 'Power2.easeOut'
      });
      
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'createSystemMalfunctionScreen', 'Created system malfunction screen');
      return container;
      
    } catch (error) {
      uiLogger.log(LogLevel.CRITICAL, 'UIErrorRecovery', 'createSystemMalfunctionScreen', 'Failed to create system malfunction screen', {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Hide system malfunction screen
   */
  public hideSystemMalfunctionScreen(container: Phaser.GameObjects.Container): void {
    if (!container || !container.active) return;
    
    this.scene.tweens.add({
      targets: container,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        container.destroy();
      }
    });
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
      logDestructionError 
    } = require('./SafeCleanupHelpers');

    try {
      uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'destroy', 'Starting UIErrorRecovery cleanup with comprehensive error handling');

      // Validate scene state before attempting cleanup
      const sceneValidation = validateSceneState(this.scene, 'UIErrorRecovery');
      
      if (!sceneValidation.isValid) {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'destroy', 'Scene validation failed, proceeding with limited cleanup', {
          validationErrors: sceneValidation.validationErrors
        });
      }

      // Define cleanup operations for partial destruction state handling
      const cleanupOperations = [
        {
          name: 'clearRecoveryPromises',
          operation: () => {
            // Clear recovery promises to prevent memory leaks
            this.recoveryPromises.clear();
            uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'destroy', 'Recovery promises cleared successfully');
          },
          required: true
        },
        {
          name: 'clearRecoveryAttempts',
          operation: () => {
            // Clear recovery attempts history
            this.recoveryAttempts = [];
            uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'destroy', 'Recovery attempts history cleared successfully');
          },
          required: true
        },
        {
          name: 'resetRecoveryState',
          operation: () => {
            // Reset recovery state
            this.isRecovering = false;
            uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'destroy', 'Recovery state reset successfully');
          },
          required: true
        },
        {
          name: 'destroyFallbackRenderer',
          operation: () => {
            // Safe cleanup of fallback renderer
            if (this.fallbackRenderer && typeof this.fallbackRenderer.destroy === 'function') {
              this.fallbackRenderer.destroy();
              uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'destroy', 'FallbackRenderer destroyed successfully');
            }
          },
          required: false
        },
        {
          name: 'finalUICleanup',
          operation: () => {
            // Final cleanup of any remaining UI elements
            this.cleanupPartialUI();
            uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'destroy', 'Final UI cleanup completed successfully');
          },
          required: false
        }
      ];

      // Execute cleanup with partial destruction state handling
      const cleanupStatus = handlePartialDestructionState(
        this.scene,
        cleanupOperations,
        'UIErrorRecovery'
      );

      // Log final cleanup status
      if (cleanupStatus.completed) {
        uiLogger.log(LogLevel.INFO, 'UIErrorRecovery', 'destroy', 'UIErrorRecovery cleanup completed successfully', {
          errorCount: cleanupStatus.errors.length
        });
      } else {
        uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'destroy', 'UIErrorRecovery cleanup completed with errors', {
          errors: cleanupStatus.errors
        });
      }

    } catch (error) {
      logDestructionError('UIErrorRecovery', 'destroy', error, {
        sceneExists: !!this.scene
      });
      
      uiLogger.log(LogLevel.ERROR, 'UIErrorRecovery', 'destroy', 'Error during UIErrorRecovery cleanup', {
        error: error instanceof Error ? error.message : String(error),
        sceneExists: !!this.scene,
        timestamp: new Date().toISOString()
      }, error instanceof Error ? error : undefined);
    }

    console.log('UIErrorRecovery: Destroyed and cleaned up');
  }
}
