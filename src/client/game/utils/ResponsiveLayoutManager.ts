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
      if (this.resizeThrottleTimeout) {
        clearTimeout(this.resizeThrottleTimeout);
      }

      this.resizeThrottleTimeout = window.setTimeout(() => {
        const container = document.getElementById('game-container');
        if (container) {
          const rect = container.getBoundingClientRect();
          this.updateLayout(rect.width, rect.height);
        }
      }, this.RESIZE_THROTTLE_MS);
    };

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Listen for orientation changes with delay to allow completion
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100);
    });
  }

  /**
   * Update layout calculations for new dimensions
   */
  public updateLayout(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    // Adjust layout config for different screen sizes
    this.adjustLayoutForScreenSize(width, height);

    // Trigger all registered callbacks
    this.resizeCallbacks.forEach(callback => {
      try {
        callback(width, height);
      } catch (error) {
        console.error('Error in resize callback:', error);
      }
    });
  }

  /**
   * Adjust layout configuration based on screen size
   */
  private adjustLayoutForScreenSize(width: number, height: number): void {
    const aspectRatio = width / height;
    const isPortrait = aspectRatio < 1;
    const isMobile = width < 768;

    // Create responsive adjustments
    if (isMobile && isPortrait) {
      // Mobile portrait adjustments
      this.layoutConfig.title.fontSize = Math.max(48, Math.min(72, width * 0.12));
      this.layoutConfig.subtitle.fontSize = Math.max(18, Math.min(24, width * 0.04));
      this.layoutConfig.primaryButton.width = Math.min(240, width * 0.8);
      this.layoutConfig.secondaryButton.width = Math.min(200, width * 0.7);
    } else if (isMobile && !isPortrait) {
      // Mobile landscape adjustments
      this.layoutConfig.title.fontSize = Math.max(36, Math.min(60, height * 0.15));
      this.layoutConfig.subtitle.fontSize = Math.max(16, Math.min(20, height * 0.06));
      this.layoutConfig.primaryButton.width = Math.min(200, width * 0.4);
      this.layoutConfig.secondaryButton.width = Math.min(180, width * 0.35);
    } else {
      // Desktop - use default values
      this.layoutConfig = this.createDefaultLayoutConfig();
    }

    // Ensure minimum button sizes for accessibility (44px minimum touch target)
    this.layoutConfig.primaryButton.height = Math.max(44, this.layoutConfig.primaryButton.height);
    this.layoutConfig.secondaryButton.height = Math.max(44, this.layoutConfig.secondaryButton.height);
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
    if (this.resizeThrottleTimeout) {
      clearTimeout(this.resizeThrottleTimeout);
      this.resizeThrottleTimeout = null;
    }

    // Clear callbacks
    this.resizeCallbacks = [];

    // Remove event listeners
    window.removeEventListener('resize', this.setupResizeHandler);
    window.removeEventListener('orientationchange', this.setupResizeHandler);
  }
}
