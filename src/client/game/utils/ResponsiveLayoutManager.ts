/**
 * ResponsiveLayoutManager for Color Rush Splash Screen
 * Manages responsive layout calculations and button positioning across different screen sizes
 */

import * as Phaser from 'phaser';

export enum ButtonType {
  PRIMARY = 'primary',
  SECONDARY = 'secondary'
}

export interface LayoutConfig {
  title: {
    yPercent: number; // 0.18 (18% from top)
    fontSize: number; // 72px
    fontWeight: string; // 'bold'
  };
  subtitle: {
    yPercent: number; // 0.38 (38% from top)
    fontSize: number; // 24px
    fontWeight: string; // '400'
  };
  primaryButton: {
    yPercent: number; // 0.55 (55% from top)
    width: number; // 240px
    height: number; // 70px
    fontSize: number; // 20px
  };
  secondaryButton: {
    yPercent: number; // 0.68 (68% from top)
    width: number; // 200px
    height: number; // 55px
    fontSize: number; // 18px
  };
}

export interface IResponsiveLayoutManager {
  updateLayout(width: number, height: number): void;
  getButtonBounds(buttonType: ButtonType): Phaser.Geom.Rectangle;
  onResize(callback: (width: number, height: number) => void): void;
  removeResizeCallback(callback: (width: number, height: number) => void): void;
  getCurrentDimensions(): { width: number; height: number };
  getLayoutConfig(): LayoutConfig;
  getTitlePosition(): { x: number; y: number };
  getSubtitlePosition(): { x: number; y: number };
  getButtonPosition(buttonType: ButtonType): { x: number; y: number };
  destroy(): void;
}

export class ResponsiveLayoutManager implements IResponsiveLayoutManager {
  private layoutConfig: LayoutConfig;
  private resizeCallbacks: Array<(width: number, height: number) => void> = [];
  private currentWidth: number = 0;
  private currentHeight: number = 0;
  private resizeThrottleTimeout: number | null = null;
  private readonly RESIZE_THROTTLE_MS = 16; // ~60fps throttling
  
  // Error handling properties
  private resizeEventCount: number = 0;
  private lastResizeTime: number = 0;
  private resizeFloodProtection: boolean = false;
  private readonly MAX_RESIZE_EVENTS_PER_SECOND = 60;
  private readonly MIN_DIMENSION = 200; // Minimum supported dimension
  private readonly MAX_DIMENSION = 8192; // Maximum supported dimension
  private fallbackDimensions = { width: 800, height: 600 }; // Safe fallback dimensions

  constructor() {
    this.layoutConfig = this.createDefaultLayoutConfig();
    this.setupResizeHandler();
  }

  /**
   * Create default layout configuration based on design specifications
   */
  private createDefaultLayoutConfig(): LayoutConfig {
    return {
      title: {
        yPercent: 0.18, // 18% from top
        fontSize: 72,
        fontWeight: 'bold'
      },
      subtitle: {
        yPercent: 0.38, // 38% from top
        fontSize: 24,
        fontWeight: '400'
      },
      primaryButton: {
        yPercent: 0.55, // 55% from top
        width: 240,
        height: 70,
        fontSize: 20
      },
      secondaryButton: {
        yPercent: 0.68, // 68% from top
        width: 200,
        height: 55,
        fontSize: 18
      }
    };
  }

  /**
   * Set up throttled resize event handling to prevent performance issues
   */
  private setupResizeHandler(): void {
    const handleResize = () => {
      try {
        // Check for resize event flooding
        if (this.isResizeEventFlooding()) {
          console.warn('ResponsiveLayoutManager: Resize event flooding detected, throttling more aggressively');
          return;
        }

        if (this.resizeThrottleTimeout) {
          clearTimeout(this.resizeThrottleTimeout);
        }

        this.resizeThrottleTimeout = window.setTimeout(() => {
          try {
            const container = document.getElementById('game-container');
            if (container) {
              const rect = container.getBoundingClientRect();
              this.updateLayoutSafely(rect.width, rect.height);
            } else {
              console.warn('ResponsiveLayoutManager: Game container not found, using fallback dimensions');
              this.updateLayoutSafely(this.fallbackDimensions.width, this.fallbackDimensions.height);
            }
          } catch (error) {
            console.error('ResponsiveLayoutManager: Error in resize timeout handler:', error);
            this.handleResizeError(error);
          }
        }, this.getAdaptiveThrottleDelay());

      } catch (error) {
        console.error('ResponsiveLayoutManager: Error in resize handler:', error);
        this.handleResizeError(error);
      }
    };

    const handleOrientationChange = () => {
      try {
        // Orientation changes need extra delay to complete
        setTimeout(() => {
          handleResize();
        }, 150); // Increased delay for orientation changes
      } catch (error) {
        console.error('ResponsiveLayoutManager: Error in orientation change handler:', error);
        this.handleResizeError(error);
      }
    };

    // Listen for resize events with error handling
    try {
      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
      
      // Also listen for visual viewport changes (mobile browsers)
      if ('visualViewport' in window) {
        (window as any).visualViewport.addEventListener('resize', handleResize, { passive: true });
      }
      
      console.log('ResponsiveLayoutManager: Resize event listeners registered successfully');
    } catch (error) {
      console.error('ResponsiveLayoutManager: Failed to register resize event listeners:', error);
      this.handleResizeError(error);
    }
  }

  /**
   * Update layout calculations for new dimensions with error handling
   */
  public updateLayout(width: number, height: number): void {
    this.updateLayoutSafely(width, height);
  }

  /**
   * Safely update layout with comprehensive error handling
   */
  private updateLayoutSafely(width: number, height: number): void {
    try {
      // Validate dimensions before processing
      const validatedDimensions = this.validateAndSanitizeDimensions(width, height);
      
      if (!validatedDimensions.isValid) {
        console.warn(`ResponsiveLayoutManager: Invalid dimensions (${width}x${height}), using fallback (${validatedDimensions.width}x${validatedDimensions.height})`);
        console.log('ResponsiveLayoutManager: Dimension validation details:', validatedDimensions.issues);
      }

      this.currentWidth = validatedDimensions.width;
      this.currentHeight = validatedDimensions.height;

      // Adjust layout config for different screen sizes
      this.adjustLayoutForScreenSizeSafely(validatedDimensions.width, validatedDimensions.height);

      // Trigger all registered callbacks with error handling
      this.triggerResizeCallbacksSafely(validatedDimensions.width, validatedDimensions.height);

      // Log successful layout update for debugging
      console.log(`ResponsiveLayoutManager: Layout updated successfully to ${validatedDimensions.width}x${validatedDimensions.height}`);

    } catch (error) {
      console.error('ResponsiveLayoutManager: Critical error in updateLayoutSafely:', error);
      this.handleLayoutUpdateError(error, width, height);
    }
  }



  /**
   * Safely adjust layout configuration with comprehensive error handling
   */
  private adjustLayoutForScreenSizeSafely(width: number, height: number): void {
    try {
      const aspectRatio = width / height;
      const isPortrait = aspectRatio < 1;
      const isMobile = width < 768;

      // Validate aspect ratio for extreme cases
      if (aspectRatio < 0.1 || aspectRatio > 10) {
        console.warn(`ResponsiveLayoutManager: Extreme aspect ratio detected (${aspectRatio.toFixed(2)}), using fallback layout`);
        this.layoutConfig = this.createFallbackLayoutConfig(width, height);
        return;
      }

      // Create responsive adjustments with bounds checking
      if (isMobile && isPortrait) {
        // Mobile portrait adjustments
        this.layoutConfig.title.fontSize = this.clampValue(width * 0.12, 32, 72);
        this.layoutConfig.subtitle.fontSize = this.clampValue(width * 0.04, 14, 24);
        this.layoutConfig.primaryButton.width = this.clampValue(width * 0.8, 180, 300);
        this.layoutConfig.secondaryButton.width = this.clampValue(width * 0.7, 160, 250);
      } else if (isMobile && !isPortrait) {
        // Mobile landscape adjustments
        this.layoutConfig.title.fontSize = this.clampValue(height * 0.15, 28, 60);
        this.layoutConfig.subtitle.fontSize = this.clampValue(height * 0.06, 12, 20);
        this.layoutConfig.primaryButton.width = this.clampValue(width * 0.4, 160, 240);
        this.layoutConfig.secondaryButton.width = this.clampValue(width * 0.35, 140, 200);
      } else {
        // Desktop - use default values with validation
        this.layoutConfig = this.createDefaultLayoutConfig();
        
        // Scale for very large screens
        if (width > 1920) {
          const scaleFactor = Math.min(width / 1920, 2); // Max 2x scaling
          this.scaleLayoutConfig(scaleFactor);
        }
      }

      // Ensure minimum button sizes for accessibility (44px minimum touch target)
      this.layoutConfig.primaryButton.height = Math.max(44, this.layoutConfig.primaryButton.height);
      this.layoutConfig.secondaryButton.height = Math.max(44, this.layoutConfig.secondaryButton.height);

      // Validate final layout configuration
      this.validateLayoutConfig();

    } catch (error) {
      console.error('ResponsiveLayoutManager: Error in adjustLayoutForScreenSizeSafely:', error);
      console.warn('ResponsiveLayoutManager: Using fallback layout configuration');
      this.layoutConfig = this.createFallbackLayoutConfig(width, height);
    }
  }

  /**
   * Get button bounds for interactive area calculation
   */
  public getButtonBounds(buttonType: ButtonType): Phaser.Geom.Rectangle {
    const position = this.getButtonPosition(buttonType);
    const config = buttonType === ButtonType.PRIMARY 
      ? this.layoutConfig.primaryButton 
      : this.layoutConfig.secondaryButton;

    return new Phaser.Geom.Rectangle(
      position.x - config.width / 2,
      position.y - config.height / 2,
      config.width,
      config.height
    );
  }

  /**
   * Register callback for resize events
   */
  public onResize(callback: (width: number, height: number) => void): void {
    this.resizeCallbacks.push(callback);
  }

  /**
   * Remove resize callback
   */
  public removeResizeCallback(callback: (width: number, height: number) => void): void {
    const index = this.resizeCallbacks.indexOf(callback);
    if (index > -1) {
      this.resizeCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current screen dimensions
   */
  public getCurrentDimensions(): { width: number; height: number } {
    return {
      width: this.currentWidth,
      height: this.currentHeight
    };
  }

  /**
   * Get current layout configuration
   */
  public getLayoutConfig(): LayoutConfig {
    return { ...this.layoutConfig }; // Return copy to prevent external modification
  }

  /**
   * Get title position based on current layout
   */
  public getTitlePosition(): { x: number; y: number } {
    return {
      x: this.currentWidth / 2,
      y: this.currentHeight * this.layoutConfig.title.yPercent
    };
  }

  /**
   * Get subtitle position based on current layout
   */
  public getSubtitlePosition(): { x: number; y: number } {
    return {
      x: this.currentWidth / 2,
      y: this.currentHeight * this.layoutConfig.subtitle.yPercent
    };
  }

  /**
   * Get button position based on current layout
   */
  public getButtonPosition(buttonType: ButtonType): { x: number; y: number } {
    const config = buttonType === ButtonType.PRIMARY 
      ? this.layoutConfig.primaryButton 
      : this.layoutConfig.secondaryButton;

    return {
      x: this.currentWidth / 2,
      y: this.currentHeight * config.yPercent
    };
  }

  /**
   * Clean up event listeners and resources
   */
  public destroy(): void {
    try {
      if (this.resizeThrottleTimeout) {
        clearTimeout(this.resizeThrottleTimeout);
        this.resizeThrottleTimeout = null;
      }

      // Clear callbacks
      this.resizeCallbacks = [];

      // Remove event listeners safely
      try {
        window.removeEventListener('resize', this.setupResizeHandler);
        window.removeEventListener('orientationchange', this.setupResizeHandler);
        
        // Remove visual viewport listener if it exists
        if ('visualViewport' in window) {
          (window as any).visualViewport.removeEventListener('resize', this.setupResizeHandler);
        }
      } catch (error) {
        console.warn('ResponsiveLayoutManager: Error removing event listeners during destroy:', error);
      }

      console.log('ResponsiveLayoutManager: Destroyed successfully');
    } catch (error) {
      console.error('ResponsiveLayoutManager: Error during destroy:', error);
    }
  }

  /**
   * Validate and sanitize dimensions to prevent layout errors
   */
  private validateAndSanitizeDimensions(width: number, height: number): {
    width: number;
    height: number;
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    let sanitizedWidth = width;
    let sanitizedHeight = height;
    let isValid = true;

    // Check for invalid numbers
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      issues.push('Non-finite dimensions detected');
      sanitizedWidth = this.fallbackDimensions.width;
      sanitizedHeight = this.fallbackDimensions.height;
      isValid = false;
    }

    // Check for negative dimensions
    if (sanitizedWidth < 0 || sanitizedHeight < 0) {
      issues.push('Negative dimensions detected');
      sanitizedWidth = Math.abs(sanitizedWidth) || this.fallbackDimensions.width;
      sanitizedHeight = Math.abs(sanitizedHeight) || this.fallbackDimensions.height;
      isValid = false;
    }

    // Check for dimensions that are too small
    if (sanitizedWidth < this.MIN_DIMENSION) {
      issues.push(`Width too small (${sanitizedWidth} < ${this.MIN_DIMENSION})`);
      sanitizedWidth = this.MIN_DIMENSION;
      isValid = false;
    }

    if (sanitizedHeight < this.MIN_DIMENSION) {
      issues.push(`Height too small (${sanitizedHeight} < ${this.MIN_DIMENSION})`);
      sanitizedHeight = this.MIN_DIMENSION;
      isValid = false;
    }

    // Check for dimensions that are too large
    if (sanitizedWidth > this.MAX_DIMENSION) {
      issues.push(`Width too large (${sanitizedWidth} > ${this.MAX_DIMENSION})`);
      sanitizedWidth = this.MAX_DIMENSION;
      isValid = false;
    }

    if (sanitizedHeight > this.MAX_DIMENSION) {
      issues.push(`Height too large (${sanitizedHeight} > ${this.MAX_DIMENSION})`);
      sanitizedHeight = this.MAX_DIMENSION;
      isValid = false;
    }

    // Check for extreme aspect ratios
    const aspectRatio = sanitizedWidth / sanitizedHeight;
    if (aspectRatio < 0.1 || aspectRatio > 10) {
      issues.push(`Extreme aspect ratio detected (${aspectRatio.toFixed(2)})`);
      isValid = false;
    }

    return {
      width: Math.round(sanitizedWidth),
      height: Math.round(sanitizedHeight),
      isValid,
      issues
    };
  }

  /**
   * Check if resize events are flooding (too many events per second)
   */
  private isResizeEventFlooding(): boolean {
    const now = performance.now();
    
    // Reset counter if more than 1 second has passed
    if (now - this.lastResizeTime > 1000) {
      this.resizeEventCount = 0;
      this.resizeFloodProtection = false;
    }
    
    this.resizeEventCount++;
    this.lastResizeTime = now;
    
    // Enable flood protection if too many events
    if (this.resizeEventCount > this.MAX_RESIZE_EVENTS_PER_SECOND) {
      this.resizeFloodProtection = true;
      return true;
    }
    
    return this.resizeFloodProtection;
  }

  /**
   * Get adaptive throttle delay based on resize event frequency
   */
  private getAdaptiveThrottleDelay(): number {
    if (this.resizeFloodProtection) {
      return Math.min(this.RESIZE_THROTTLE_MS * 4, 100); // Increase throttling during floods
    }
    
    return this.RESIZE_THROTTLE_MS;
  }

  /**
   * Safely trigger resize callbacks with error handling
   */
  private triggerResizeCallbacksSafely(width: number, height: number): void {
    const failedCallbacks: number[] = [];
    
    this.resizeCallbacks.forEach((callback, index) => {
      try {
        callback(width, height);
      } catch (error) {
        console.error(`ResponsiveLayoutManager: Error in resize callback ${index}:`, error);
        failedCallbacks.push(index);
      }
    });

    // Remove failed callbacks to prevent repeated errors
    if (failedCallbacks.length > 0) {
      console.warn(`ResponsiveLayoutManager: Removing ${failedCallbacks.length} failed resize callbacks`);
      failedCallbacks.reverse().forEach(index => {
        this.resizeCallbacks.splice(index, 1);
      });
    }
  }

  /**
   * Handle resize-related errors
   */
  private handleResizeError(error: any): void {
    console.error('ResponsiveLayoutManager: Resize error details:', {
      errorMessage: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown',
      currentDimensions: { width: this.currentWidth, height: this.currentHeight },
      resizeEventCount: this.resizeEventCount,
      resizeFloodProtection: this.resizeFloodProtection,
      callbackCount: this.resizeCallbacks.length,
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio
        }
      }
    });

    // Try to recover with fallback dimensions
    try {
      console.log('ResponsiveLayoutManager: Attempting error recovery with fallback dimensions');
      this.updateLayoutSafely(this.fallbackDimensions.width, this.fallbackDimensions.height);
    } catch (recoveryError) {
      console.error('ResponsiveLayoutManager: Failed to recover from resize error:', recoveryError);
    }
  }

  /**
   * Handle layout update errors
   */
  private handleLayoutUpdateError(error: any, originalWidth: number, originalHeight: number): void {
    console.error('ResponsiveLayoutManager: Layout update error:', error);
    console.log('ResponsiveLayoutManager: Layout update error context:', {
      originalDimensions: { width: originalWidth, height: originalHeight },
      currentDimensions: { width: this.currentWidth, height: this.currentHeight },
      fallbackDimensions: this.fallbackDimensions,
      layoutConfig: this.layoutConfig
    });

    // Force fallback layout
    try {
      this.layoutConfig = this.createFallbackLayoutConfig(originalWidth, originalHeight);
      this.currentWidth = this.fallbackDimensions.width;
      this.currentHeight = this.fallbackDimensions.height;
      console.log('ResponsiveLayoutManager: Applied fallback layout configuration');
    } catch (fallbackError) {
      console.error('ResponsiveLayoutManager: Failed to apply fallback layout:', fallbackError);
    }
  }

  /**
   * Create fallback layout configuration for error recovery
   */
  private createFallbackLayoutConfig(width: number, _height: number): LayoutConfig {
    // Use safe, conservative values that should work on any screen
    return {
      title: {
        yPercent: 0.2,
        fontSize: 48, // Conservative size
        fontWeight: 'bold'
      },
      subtitle: {
        yPercent: 0.35,
        fontSize: 18, // Conservative size
        fontWeight: '400'
      },
      primaryButton: {
        yPercent: 0.55,
        width: Math.min(200, width * 0.6), // Conservative width
        height: 50, // Safe height
        fontSize: 16 // Conservative size
      },
      secondaryButton: {
        yPercent: 0.7,
        width: Math.min(180, width * 0.5), // Conservative width
        height: 44, // Minimum accessibility size
        fontSize: 14 // Conservative size
      }
    };
  }

  /**
   * Clamp value between min and max bounds
   */
  private clampValue(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Scale layout configuration by a factor
   */
  private scaleLayoutConfig(scaleFactor: number): void {
    const safeFactor = this.clampValue(scaleFactor, 0.5, 3); // Reasonable scaling limits
    
    this.layoutConfig.title.fontSize *= safeFactor;
    this.layoutConfig.subtitle.fontSize *= safeFactor;
    this.layoutConfig.primaryButton.width *= safeFactor;
    this.layoutConfig.primaryButton.height *= safeFactor;
    this.layoutConfig.primaryButton.fontSize *= safeFactor;
    this.layoutConfig.secondaryButton.width *= safeFactor;
    this.layoutConfig.secondaryButton.height *= safeFactor;
    this.layoutConfig.secondaryButton.fontSize *= safeFactor;
  }

  /**
   * Validate layout configuration for sanity
   */
  private validateLayoutConfig(): void {
    const issues: string[] = [];

    // Check font sizes
    if (this.layoutConfig.title.fontSize < 12 || this.layoutConfig.title.fontSize > 200) {
      issues.push(`Invalid title font size: ${this.layoutConfig.title.fontSize}`);
      this.layoutConfig.title.fontSize = this.clampValue(this.layoutConfig.title.fontSize, 24, 72);
    }

    if (this.layoutConfig.subtitle.fontSize < 8 || this.layoutConfig.subtitle.fontSize > 100) {
      issues.push(`Invalid subtitle font size: ${this.layoutConfig.subtitle.fontSize}`);
      this.layoutConfig.subtitle.fontSize = this.clampValue(this.layoutConfig.subtitle.fontSize, 12, 24);
    }

    // Check button dimensions
    if (this.layoutConfig.primaryButton.width < 100 || this.layoutConfig.primaryButton.width > 500) {
      issues.push(`Invalid primary button width: ${this.layoutConfig.primaryButton.width}`);
      this.layoutConfig.primaryButton.width = this.clampValue(this.layoutConfig.primaryButton.width, 150, 300);
    }

    if (this.layoutConfig.primaryButton.height < 30 || this.layoutConfig.primaryButton.height > 150) {
      issues.push(`Invalid primary button height: ${this.layoutConfig.primaryButton.height}`);
      this.layoutConfig.primaryButton.height = this.clampValue(this.layoutConfig.primaryButton.height, 44, 80);
    }

    // Check Y positions
    if (this.layoutConfig.title.yPercent < 0.05 || this.layoutConfig.title.yPercent > 0.95) {
      issues.push(`Invalid title Y position: ${this.layoutConfig.title.yPercent}`);
      this.layoutConfig.title.yPercent = 0.18;
    }

    if (issues.length > 0) {
      console.warn('ResponsiveLayoutManager: Layout configuration issues found and corrected:', issues);
    }
  }

  /**
   * Get comprehensive error summary for debugging
   */
  public getErrorSummary(): {
    hasErrors: boolean;
    resizeEventCount: number;
    isFloodProtected: boolean;
    currentDimensions: { width: number; height: number };
    layoutValidation: { isValid: boolean; issues: string[] };
    recommendations: string[];
  } {
    const layoutValidation = this.validateCurrentLayout();
    const recommendations: string[] = [];

    if (this.resizeFloodProtection) {
      recommendations.push('Reduce resize event frequency or increase throttling');
    }

    if (this.resizeEventCount > this.MAX_RESIZE_EVENTS_PER_SECOND / 2) {
      recommendations.push('Monitor for excessive resize events');
    }

    if (!layoutValidation.isValid) {
      recommendations.push('Check layout configuration and screen dimensions');
    }

    if (this.currentWidth < 400 || this.currentHeight < 300) {
      recommendations.push('Consider minimum screen size requirements');
    }

    return {
      hasErrors: this.resizeFloodProtection || !layoutValidation.isValid,
      resizeEventCount: this.resizeEventCount,
      isFloodProtected: this.resizeFloodProtection,
      currentDimensions: { width: this.currentWidth, height: this.currentHeight },
      layoutValidation,
      recommendations
    };
  }

  /**
   * Validate current layout configuration
   */
  private validateCurrentLayout(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if dimensions are reasonable
    if (this.currentWidth < this.MIN_DIMENSION || this.currentHeight < this.MIN_DIMENSION) {
      issues.push('Screen dimensions below minimum supported size');
    }

    // Check aspect ratio
    const aspectRatio = this.currentWidth / this.currentHeight;
    if (aspectRatio < 0.2 || aspectRatio > 5) {
      issues.push('Extreme aspect ratio may cause layout issues');
    }

    // Check if layout config exists and is valid
    if (!this.layoutConfig) {
      issues.push('Layout configuration is missing');
    } else {
      if (this.layoutConfig.title.fontSize < 12) {
        issues.push('Title font size too small');
      }
      if (this.layoutConfig.primaryButton.width < 100) {
        issues.push('Primary button too narrow');
      }
      if (this.layoutConfig.primaryButton.height < 44) {
        issues.push('Primary button below accessibility minimum');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}
