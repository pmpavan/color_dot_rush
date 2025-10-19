/**
 * UIErrorRecovery - Comprehensive error recovery mechanisms for UI system
 * Implements requirements: 5.2, 5.3, 5.5 - graceful error recovery and automatic fallback switching
 */

import { Scene } from 'phaser';
import { UIElement, UIElementType, LayoutConfig } from './UIElementFactory';
import { FallbackRenderer, FallbackMode, UIElementMap } from './FallbackRenderer';
import { uiLogger, LogLevel } from './UIErrorLogger';

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
    }, lastError);

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
      const { width, height } = this.scene.scale;
      
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
      const hasVisibleElements = children.some(child => child.visible && child.active);
      
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
   * Clean up partial UI elements
   */
  private async cleanupPartialUI(): Promise<void> {
    try {
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'cleanupPartialUI', 'Cleaning up partial UI elements');
      
      // Kill all tweens to prevent issues
      if (this.scene.tweens) {
        this.scene.tweens.killAll();
      }
      
      // Remove all children
      this.scene.children.removeAll(true);
      
      // Small delay to ensure cleanup is complete
      await this.delay(50);
      
      uiLogger.log(LogLevel.DEBUG, 'UIErrorRecovery', 'cleanupPartialUI', 'Partial UI cleanup completed');
    } catch (error) {
      uiLogger.log(LogLevel.WARN, 'UIErrorRecovery', 'cleanupPartialUI', 'Error during partial UI cleanup', undefined, error instanceof Error ? error : undefined);
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
      error,
      retryCount
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
}
