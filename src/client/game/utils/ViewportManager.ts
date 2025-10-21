/**
 * ViewportManager for Color Dot Rush
 * Handles proper viewport and camera resize handling with device pixel ratio support
 */

import * as Phaser from 'phaser';

export interface ViewportDimensions {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export interface CameraBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IViewportManager {
  updateViewport(scene: Phaser.Scene): void;
  getCurrentViewport(): ViewportDimensions;
  getCameraBounds(): CameraBounds;
  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void;
  removeOrientationCallback(callback: (orientation: 'portrait' | 'landscape') => void): void;
  handleDevicePixelRatio(canvas: HTMLCanvasElement): void;
  destroy(): void;
}

export class ViewportManager implements IViewportManager {
  private currentViewport: ViewportDimensions;
  private cameraBounds: CameraBounds;
  private orientationCallbacks: Array<(orientation: 'portrait' | 'landscape') => void> = [];
  private resizeObserver: ResizeObserver | null = null;
  private orientationChangeTimeout: number | null = null;

  constructor() {
    this.currentViewport = this.calculateViewportDimensions();
    this.cameraBounds = this.calculateCameraBounds();
    this.setupOrientationHandler();
    this.setupResizeObserver();
  }

  /**
   * Calculate current viewport dimensions including device pixel ratio
   */
  private calculateViewportDimensions(): ViewportDimensions {
    const container = document.getElementById('game-container');
    const containerRect = container?.getBoundingClientRect();
    
    const width = containerRect?.width || window.innerWidth;
    const height = containerRect?.height || window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const orientation = width > height ? 'landscape' : 'portrait';

    return {
      width,
      height,
      devicePixelRatio,
      orientation
    };
  }

  /**
   * Calculate camera bounds based on viewport dimensions
   */
  private calculateCameraBounds(): CameraBounds {
    return {
      x: 0,
      y: 0,
      width: this.currentViewport.width,
      height: this.currentViewport.height
    };
  }

  /**
   * Set up orientation change detection and handling
   */
  private setupOrientationHandler(): void {
    const handleOrientationChange = () => {
      // Clear any existing timeout
      if (this.orientationChangeTimeout) {
        clearTimeout(this.orientationChangeTimeout);
      }

      // Delay to allow orientation change to complete
      this.orientationChangeTimeout = window.setTimeout(() => {
        const previousOrientation = this.currentViewport.orientation;
        this.currentViewport = this.calculateViewportDimensions();
        this.cameraBounds = this.calculateCameraBounds();

        // Trigger callbacks if orientation actually changed
        if (previousOrientation !== this.currentViewport.orientation) {
          this.orientationCallbacks.forEach(callback => {
            try {
              callback(this.currentViewport.orientation);
            } catch (error) {
              console.error('Error in orientation change callback:', error);
            }
          });
        }
      }, 100);
    };

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for resize events that might indicate orientation change
    window.addEventListener('resize', () => {
      const newViewport = this.calculateViewportDimensions();
      if (newViewport.orientation !== this.currentViewport.orientation) {
        handleOrientationChange();
      }
    });
  }

  /**
   * Set up ResizeObserver for more accurate container size detection
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      const container = document.getElementById('game-container');
      if (container) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            this.currentViewport.width = width;
            this.currentViewport.height = height;
            this.currentViewport.orientation = width > height ? 'landscape' : 'portrait';
            this.cameraBounds = this.calculateCameraBounds();
          }
        });
        
        this.resizeObserver.observe(container);
      }
    }
  }

  /**
   * Update viewport and camera for a Phaser scene
   */
  public updateViewport(scene: Phaser.Scene): void {
    if (!scene || !scene.cameras || !scene.cameras.main) {
      console.warn('ViewportManager: Invalid scene or camera provided');
      return;
    }

    // Update viewport dimensions
    this.currentViewport = this.calculateViewportDimensions();
    this.cameraBounds = this.calculateCameraBounds();

    const camera = scene.cameras.main;
    const { width, height } = this.currentViewport;

    try {
      // Update camera bounds
      camera.setBounds(
        this.cameraBounds.x,
        this.cameraBounds.y,
        this.cameraBounds.width,
        this.cameraBounds.height
      );

      // Update camera viewport
      camera.setViewport(0, 0, width, height);

      // Update scene scale
      if (scene.scale) {
        scene.scale.resize(width, height);
      }

      // Handle device pixel ratio for crisp rendering
      if (scene.game && scene.game.canvas) {
        this.handleDevicePixelRatio(scene.game.canvas);
      }

      console.log(`ViewportManager: Updated viewport to ${width}x${height}, DPR: ${this.currentViewport.devicePixelRatio}`);
    } catch (error) {
      console.error('ViewportManager: Error updating viewport:', error);
    }
  }

  /**
   * Get current viewport dimensions
   */
  public getCurrentViewport(): ViewportDimensions {
    return { ...this.currentViewport };
  }

  /**
   * Get current camera bounds
   */
  public getCameraBounds(): CameraBounds {
    return { ...this.cameraBounds };
  }

  /**
   * Register callback for orientation changes
   */
  public onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.orientationCallbacks.push(callback);
  }

  /**
   * Remove orientation change callback
   */
  public removeOrientationCallback(callback: (orientation: 'portrait' | 'landscape') => void): void {
    const index = this.orientationCallbacks.indexOf(callback);
    if (index > -1) {
      this.orientationCallbacks.splice(index, 1);
    }
  }

  /**
   * Handle device pixel ratio for crisp rendering on high-DPI displays
   */
  public handleDevicePixelRatio(canvas: HTMLCanvasElement): void {
    const dpr = this.currentViewport.devicePixelRatio;
    
    if (dpr !== 1) {
      const context = canvas.getContext('2d');
      if (context) {
        // Scale the canvas for high-DPI displays
        const rect = canvas.getBoundingClientRect();
        
        // Set the actual canvas size in memory (scaled up for high-DPI)
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Scale the canvas back down using CSS
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Scale the drawing context so everything draws at the correct size
        context.scale(dpr, dpr);
      }
    }
  }

  /**
   * Check if the current viewport is in mobile portrait mode
   */
  public isMobilePortrait(): boolean {
    return this.currentViewport.orientation === 'portrait' && this.currentViewport.width < 768;
  }

  /**
   * Check if the current viewport is in mobile landscape mode
   */
  public isMobileLandscape(): boolean {
    return this.currentViewport.orientation === 'landscape' && this.currentViewport.height < 768;
  }

  /**
   * Get safe area insets for mobile devices (notches, etc.)
   */
  public getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
      bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
      left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
      right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0')
    };
  }

  /**
   * Clean up event listeners and observers
   */
  public destroy(): void {
    // Clear orientation change timeout
    if (this.orientationChangeTimeout) {
      clearTimeout(this.orientationChangeTimeout);
      this.orientationChangeTimeout = null;
    }

    // Disconnect resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear callbacks
    this.orientationCallbacks = [];

    // Remove event listeners
    window.removeEventListener('orientationchange', this.setupOrientationHandler);
    window.removeEventListener('resize', this.setupOrientationHandler);
  }
}
