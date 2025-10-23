/**
 * UIErrorLogger - Comprehensive error logging and debugging utility for UI system
 * Implements requirements: 5.4, 5.5 - detailed error logging for debugging
 * Updated with Neon Pulse theme styling for error displays
 */

import { Scene } from 'phaser';
import { NeonTextEffects, NeonTextEffectType, NeonTextSize } from './NeonTextEffects';
import { UIColor } from '../../../shared/types/game';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface UILogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  operation: string;
  message: string;
  data?: any;
  error?: Error;
  stackTrace?: string;
}

export interface FontLoadingStatus {
  poppinsAvailable: boolean;
  systemFontsAvailable: boolean;
  fontApiSupported: boolean;
  loadingAttempts: number;
  lastError?: string;
  fallbackActivated: boolean;
  currentFontFamily: string;
}

export interface UICreationStatus {
  component: string;
  creationMethod: 'text' | 'graphics' | 'minimal' | 'emergency';
  success: boolean;
  error?: string;
  fallbacksUsed: string[];
  retryCount: number;
  elementCount: number;
}

/**
 * Comprehensive UI error logging and debugging system
 */
export class UIErrorLogger {
  private static instance: UIErrorLogger | null = null;
  private logs: UILogEntry[] = [];
  private maxLogs: number = 1000;
  private fontStatus: FontLoadingStatus;
  private uiCreationHistory: UICreationStatus[] = [];
  private debugMode: boolean = false;

  private constructor() {
    this.fontStatus = {
      poppinsAvailable: false,
      systemFontsAvailable: false,
      fontApiSupported: false,
      loadingAttempts: 0,
      fallbackActivated: false,
      currentFontFamily: 'Arial, sans-serif'
    };

    // Enable debug mode in development
    this.debugMode = process.env.NODE_ENV === 'development' || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }

  /**
   * Get singleton instance of UIErrorLogger
   */
  public static getInstance(): UIErrorLogger {
    if (!UIErrorLogger.instance) {
      UIErrorLogger.instance = new UIErrorLogger();
    }
    return UIErrorLogger.instance;
  }

  /**
   * Log a message with specified level and component context
   */
  public log(level: LogLevel, component: string, operation: string, message: string, data?: any, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logEntry: UILogEntry = {
      timestamp,
      level,
      component,
      operation,
      message,
      data,
      error,
      stackTrace: error?.stack
    };

    // Add to internal log storage
    this.logs.push(logEntry);
    
    // Trim logs if exceeding max size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with appropriate level
    const consoleMessage = `[${timestamp}] ${level} [${component}:${operation}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        if (this.debugMode) {
          console.debug(consoleMessage, data || '');
        }
        break;
      case LogLevel.INFO:
        console.log(consoleMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, data || '', error || '');
        break;
      case LogLevel.ERROR:
        console.error(consoleMessage, data || '', error || '');
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${consoleMessage}`, data || '', error || '');
        break;
    }
  }

  /**
   * Log font loading status and fallback activations
   * Implements requirement: Log font loading status and fallback activations
   */
  public logFontStatus(status: Partial<FontLoadingStatus>): void {
    this.fontStatus = { ...this.fontStatus, ...status };
    
    this.log(
      LogLevel.INFO,
      'FontLoader',
      'statusUpdate',
      'Font loading status updated',
      {
        poppinsAvailable: this.fontStatus.poppinsAvailable,
        systemFontsAvailable: this.fontStatus.systemFontsAvailable,
        fontApiSupported: this.fontStatus.fontApiSupported,
        loadingAttempts: this.fontStatus.loadingAttempts,
        fallbackActivated: this.fontStatus.fallbackActivated,
        currentFontFamily: this.fontStatus.currentFontFamily
      }
    );

    if (this.fontStatus.fallbackActivated) {
      this.log(
        LogLevel.WARN,
        'FontLoader',
        'fallbackActivated',
        `Font fallback activated: ${this.fontStatus.currentFontFamily}`,
        {
          reason: this.fontStatus.lastError,
          attempts: this.fontStatus.loadingAttempts
        }
      );
    }
  }

  /**
   * Log font loading attempt with detailed information
   */
  public logFontLoadingAttempt(fontFamily: string, success: boolean, error?: Error): void {
    this.fontStatus.loadingAttempts++;
    
    if (error) {
      this.fontStatus.lastError = error.message;
    }

    this.log(
      success ? LogLevel.INFO : LogLevel.WARN,
      'FontLoader',
      'loadAttempt',
      `Font loading attempt ${this.fontStatus.loadingAttempts}: ${fontFamily}`,
      {
        fontFamily,
        success,
        totalAttempts: this.fontStatus.loadingAttempts,
        error: error?.message
      },
      error
    );
  }

  /**
   * Log UI element creation with success/failure details
   * Implements requirement: Add error reporting for failed UI element creation
   */
  public logUICreation(component: string, method: 'text' | 'graphics' | 'minimal' | 'emergency', 
                      success: boolean, error?: Error, fallbacksUsed: string[] = [], retryCount: number = 0, 
                      elementCount: number = 0): void {
    
    const creationStatus: UICreationStatus = {
      component,
      creationMethod: method,
      success,
      error: error?.message,
      fallbacksUsed,
      retryCount,
      elementCount
    };

    this.uiCreationHistory.push(creationStatus);

    const level = success ? LogLevel.INFO : LogLevel.ERROR;
    const operation = success ? 'createSuccess' : 'createFailure';
    
    this.log(
      level,
      'UIFactory',
      operation,
      `UI creation ${success ? 'succeeded' : 'failed'}: ${component} (${method})`,
      {
        component,
        method,
        success,
        fallbacksUsed,
        retryCount,
        elementCount,
        totalCreationAttempts: this.uiCreationHistory.length
      },
      error
    );

    // Log critical failures
    if (!success && fallbacksUsed.length > 2) {
      this.log(
        LogLevel.CRITICAL,
        'UIFactory',
        'multipleFailures',
        `Multiple UI creation failures for ${component}`,
        {
          component,
          failedMethods: fallbacksUsed,
          retryCount,
          lastError: error?.message
        },
        error
      );
    }
  }

  /**
   * Log UI element creation step with detailed context
   */
  public logUICreationStep(component: string, step: string, success: boolean, details?: any, error?: Error): void {
    this.log(
      success ? LogLevel.DEBUG : LogLevel.WARN,
      'UIFactory',
      'creationStep',
      `${component} creation step: ${step} - ${success ? 'SUCCESS' : 'FAILED'}`,
      {
        component,
        step,
        success,
        details
      },
      error
    );
  }

  /**
   * Log fallback activation with reason and context
   */
  public logFallbackActivation(component: string, fromMethod: string, toMethod: string, reason: string, error?: Error): void {
    this.log(
      LogLevel.WARN,
      'FallbackRenderer',
      'fallbackActivated',
      `Fallback activated for ${component}: ${fromMethod} → ${toMethod}`,
      {
        component,
        fromMethod,
        toMethod,
        reason,
        error: error?.message
      },
      error
    );
  }

  /**
   * Log scene lifecycle events for debugging
   */
  public logSceneEvent(sceneName: string, event: string, success: boolean, details?: any, error?: Error): void {
    this.log(
      success ? LogLevel.INFO : LogLevel.ERROR,
      'SceneManager',
      event,
      `Scene ${sceneName} ${event}: ${success ? 'SUCCESS' : 'FAILED'}`,
      {
        sceneName,
        event,
        success,
        details
      },
      error
    );
  }

  /**
   * Log layout calculation and positioning
   */
  public logLayoutCalculation(screenWidth: number, screenHeight: number, layout: any, success: boolean, error?: Error): void {
    this.log(
      success ? LogLevel.DEBUG : LogLevel.ERROR,
      'LayoutManager',
      'calculateLayout',
      `Layout calculation for ${screenWidth}x${screenHeight}: ${success ? 'SUCCESS' : 'FAILED'}`,
      {
        screenWidth,
        screenHeight,
        layout,
        success
      },
      error
    );
  }

  /**
   * Log UI update operations
   */
  public logUIUpdate(component: string, operation: string, data: any, success: boolean, error?: Error): void {
    this.log(
      success ? LogLevel.DEBUG : LogLevel.WARN,
      'UpdateHandler',
      operation,
      `UI update ${component}.${operation}: ${success ? 'SUCCESS' : 'FAILED'}`,
      {
        component,
        operation,
        data,
        success
      },
      error
    );
  }

  /**
   * Get current font loading status
   */
  public getFontStatus(): FontLoadingStatus {
    return { ...this.fontStatus };
  }

  /**
   * Get UI creation history
   */
  public getUICreationHistory(): UICreationStatus[] {
    return [...this.uiCreationHistory];
  }

  /**
   * Get recent logs with optional filtering
   */
  public getRecentLogs(count: number = 50, level?: LogLevel, component?: string): UILogEntry[] {
    let filteredLogs = this.logs;

    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(log => log.component === component);
    }

    return filteredLogs.slice(-count);
  }

  /**
   * Generate comprehensive debug report
   */
  public generateDebugReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      fontStatus: this.fontStatus,
      uiCreationHistory: this.uiCreationHistory,
      recentErrors: this.getRecentLogs(20, LogLevel.ERROR),
      recentWarnings: this.getRecentLogs(20, LogLevel.WARN),
      totalLogs: this.logs.length,
      debugMode: this.debugMode
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Export logs for external analysis
   */
  public exportLogs(): UILogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all logs (useful for testing)
   */
  public clearLogs(): void {
    this.logs = [];
    this.uiCreationHistory = [];
    this.log(LogLevel.INFO, 'UIErrorLogger', 'clearLogs', 'All logs cleared');
  }

  /**
   * Set debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log(LogLevel.INFO, 'UIErrorLogger', 'setDebugMode', `Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Log system capabilities for debugging
   */
  public logSystemCapabilities(): void {
    const capabilities = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      screen: typeof screen !== 'undefined' ? {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio || 1
      } : 'unknown',
      webgl: this.checkWebGLSupport(),
      canvas: this.checkCanvasSupport(),
      fontApi: typeof document !== 'undefined' && !!document.fonts,
      localStorage: this.checkLocalStorageSupport()
    };

    this.log(
      LogLevel.INFO,
      'SystemCheck',
      'capabilities',
      'System capabilities detected',
      capabilities
    );
  }

  /**
   * Create neon-themed error display for critical errors
   */
  public createNeonErrorDisplay(scene: Scene, error: Error, context: string): Phaser.GameObjects.Container | null {
    try {
      const { width, height } = scene.scale;
      
      const container = scene.add.container(width / 2, height / 2);
      container.setDepth(25000);
      
      // Dark background with transparency
      const bg = scene.add.rectangle(0, 0, width * 0.8, height * 0.6, 0x000000, 0.95);
      bg.setStrokeStyle(3, 0xFF0000, 0.8);
      
      // Glow effect
      const glow = scene.add.rectangle(0, 0, width * 0.85, height * 0.65, 0xFF0000, 0.2);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      
      // Error title
      const title = scene.add.text(0, -100, 'CRITICAL ERROR', {
        fontSize: '32px',
        color: '#FF0000',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      title.setStroke('#000000', 3);
      title.setShadow(0, 0, 20, 0xFF0000, 1, true);
      
      // Context
      const contextText = scene.add.text(0, -50, `Context: ${context}`, {
        fontSize: '18px',
        color: '#FFFFFF',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      contextText.setShadow(0, 0, 10, 0x00BFFF, 0.8, true);
      
      // Error message
      const errorText = scene.add.text(0, 0, error.message, {
        fontSize: '16px',
        color: '#FFA500',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center',
        wordWrap: { width: width * 0.7 }
      }).setOrigin(0.5);
      
      errorText.setShadow(0, 0, 8, 0xFFA500, 0.6, true);
      
      // Error code
      const errorCode = scene.add.text(0, 80, `Error Code: ${error.name}`, {
        fontSize: '14px',
        color: '#00FF00',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      errorCode.setShadow(0, 0, 6, 0x00FF00, 0.6, true);
      
      // Close button
      const closeButton = scene.add.rectangle(0, 120, 120, 40, 0x1E1E1E, 0.8);
      closeButton.setStrokeStyle(2, 0x00BFFF, 0.8);
      closeButton.setInteractive();
      
      const closeText = scene.add.text(0, 120, 'CLOSE', {
        fontSize: '16px',
        color: '#00BFFF',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center'
      }).setOrigin(0.5);
      
      closeText.setShadow(0, 0, 8, 0x00BFFF, 0.6, true);
      
      // Close button interaction
      closeButton.on('pointerdown', () => {
        this.hideNeonErrorDisplay(container);
      });
      
      closeButton.on('pointerover', () => {
        closeButton.setFillStyle(0x2E2E2E, 0.9);
        closeButton.setStrokeStyle(2, 0x00BFFF, 1);
      });
      
      closeButton.on('pointerout', () => {
        closeButton.setFillStyle(0x1E1E1E, 0.8);
        closeButton.setStrokeStyle(2, 0x00BFFF, 0.8);
      });
      
      container.add([glow, bg, title, contextText, errorText, errorCode, closeButton, closeText]);
      
      // Entrance animation
      container.setAlpha(0);
      container.setScale(0.8);
      
      scene.tweens.add({
        targets: container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        ease: 'Back.easeOut'
      });
      
      this.log(LogLevel.CRITICAL, 'UIErrorLogger', 'createNeonErrorDisplay', `Created neon error display for: ${context}`, {
        error: error.message,
        context
      }, error);
      
      return container;
      
    } catch (displayError) {
      this.log(LogLevel.ERROR, 'UIErrorLogger', 'createNeonErrorDisplay', 'Failed to create neon error display', {
        originalError: error.message,
        context,
        displayError: displayError instanceof Error ? displayError.message : 'Unknown error'
      }, displayError instanceof Error ? displayError : undefined);
      return null;
    }
  }

  /**
   * Hide neon error display
   */
  public hideNeonErrorDisplay(container: Phaser.GameObjects.Container): void {
    if (!container || !container.active) return;
    
    const scene = container.scene;
    scene.tweens.add({
      targets: container,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        container.destroy();
      }
    });
  }

  /**
   * Create neon-themed warning notification
   */
  public createNeonWarningNotification(scene: Scene, message: string, duration: number = 3000): Phaser.GameObjects.Container | null {
    try {
      const { width } = scene.scale;
      
      const container = scene.add.container(width - 200, 100);
      container.setDepth(20000);
      
      // Background with glass morphism
      const bg = scene.add.rectangle(0, 0, 350, 80, 0x1E1E1E, 0.95);
      bg.setStrokeStyle(2, 0xFFA500, 0.8);
      
      // Glow effect
      const glow = scene.add.rectangle(0, 0, 370, 100, 0xFFA500, 0.2);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      
      // Warning icon
      const icon = scene.add.text(-120, 0, '⚠️', {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif'
      }).setOrigin(0.5);
      
      // Warning text
      const text = scene.add.text(0, 0, message, {
        fontSize: '16px',
        color: '#FFA500',
        fontFamily: 'Orbitron, Arial, sans-serif',
        align: 'center',
        wordWrap: { width: 250 }
      }).setOrigin(0.5);
      
      text.setShadow(0, 0, 8, 0xFFA500, 0.6, true);
      
      container.add([glow, bg, icon, text]);
      
      // Entrance animation
      container.setAlpha(0);
      container.setX(width);
      
      scene.tweens.add({
        targets: container,
        alpha: 1,
        x: width - 200,
        duration: 400,
        ease: 'Back.easeOut'
      });
      
      // Auto-hide after duration
      scene.time.delayedCall(duration, () => {
        this.hideNeonWarningNotification(container);
      });
      
      this.log(LogLevel.WARN, 'UIErrorLogger', 'createNeonWarningNotification', `Created warning notification: ${message}`);
      return container;
      
    } catch (error) {
      this.log(LogLevel.ERROR, 'UIErrorLogger', 'createNeonWarningNotification', 'Failed to create warning notification', {
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error instanceof Error ? error : undefined);
      return null;
    }
  }

  /**
   * Hide neon warning notification
   */
  public hideNeonWarningNotification(container: Phaser.GameObjects.Container): void {
    if (!container || !container.active) return;
    
    const scene = container.scene;
    const { width } = scene.scale;
    
    scene.tweens.add({
      targets: container,
      alpha: 0,
      x: width,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        container.destroy();
      }
    });
  }

  /**
   * Check WebGL support
   */
  private checkWebGLSupport(): boolean {
    try {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check Canvas support
   */
  private checkCanvasSupport(): boolean {
    try {
      if (typeof document === 'undefined') return false;
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('2d');
    } catch (error) {
      return false;
    }
  }

  /**
   * Check localStorage support
   */
  private checkLocalStorageSupport(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance for easy access
export const uiLogger = UIErrorLogger.getInstance();
