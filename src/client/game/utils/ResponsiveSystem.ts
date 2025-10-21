/**
 * ResponsiveSystem for Color Dot Rush Splash Screen
 * Coordinates ResponsiveLayoutManager and ViewportManager for unified responsive behavior
 */

import * as Phaser from 'phaser';
import { ResponsiveLayoutManager, IResponsiveLayoutManager, ButtonType } from './ResponsiveLayoutManager';
import { ViewportManager, IViewportManager, ViewportDimensions } from './ViewportManager';

export interface IResponsiveSystem {
  initialize(scene: Phaser.Scene): void;
  updateLayout(): void;
  onResize(callback: (width: number, height: number) => void): void;
  onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void;
  getLayoutManager(): IResponsiveLayoutManager;
  getViewportManager(): IViewportManager;
  destroy(): void;
}

export class ResponsiveSystem implements IResponsiveSystem {
  private layoutManager: ResponsiveLayoutManager;
  private viewportManager: ViewportManager;
  private currentScene: Phaser.Scene | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.layoutManager = new ResponsiveLayoutManager();
    this.viewportManager = new ViewportManager();
    this.setupIntegratedHandlers();
  }

  /**
   * Set up integrated event handlers between layout and viewport managers
   */
  private setupIntegratedHandlers(): void {
    // When viewport changes, update layout
    this.viewportManager.onOrientationChange((_orientation) => {
      const viewport = this.viewportManager.getCurrentViewport();
      this.layoutManager.updateLayout(viewport.width, viewport.height);
      
      // Update scene viewport if available
      if (this.currentScene) {
        this.viewportManager.updateViewport(this.currentScene);
      }
    });
  }

  /**
   * Initialize the responsive system with a Phaser scene
   */
  public initialize(scene: Phaser.Scene): void {
    if (this.isInitialized) {
      console.warn('ResponsiveSystem: Already initialized, skipping...');
      return;
    }

    this.currentScene = scene;

    // Set up scene resize handler
    if (scene.scale) {
      scene.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
        this.handleSceneResize(gameSize.width, gameSize.height);
      });
    }

    // Initial viewport and layout update
    this.updateLayout();
    
    this.isInitialized = true;
    console.log('ResponsiveSystem: Initialized successfully');
  }

  /**
   * Handle Phaser scene resize events
   */
  private handleSceneResize(width: number, height: number): void {
    // Update viewport manager
    if (this.currentScene) {
      this.viewportManager.updateViewport(this.currentScene);
    }

    // Update layout manager
    this.layoutManager.updateLayout(width, height);
  }

  /**
   * Update layout and viewport
   */
  public updateLayout(): void {
    const viewport = this.viewportManager.getCurrentViewport();
    
    // Update layout calculations
    this.layoutManager.updateLayout(viewport.width, viewport.height);
    
    // Update viewport and camera if scene is available
    if (this.currentScene) {
      this.viewportManager.updateViewport(this.currentScene);
    }
  }

  /**
   * Register callback for resize events (delegates to layout manager)
   */
  public onResize(callback: (width: number, height: number) => void): void {
    this.layoutManager.onResize(callback);
  }

  /**
   * Register callback for orientation changes (delegates to viewport manager)
   */
  public onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
    this.viewportManager.onOrientationChange(callback);
  }

  /**
   * Get the layout manager instance
   */
  public getLayoutManager(): IResponsiveLayoutManager {
    return this.layoutManager;
  }

  /**
   * Get the viewport manager instance
   */
  public getViewportManager(): IViewportManager {
    return this.viewportManager;
  }

  /**
   * Get current responsive state information
   */
  public getResponsiveState(): {
    viewport: ViewportDimensions;
    layout: any;
    isMobile: boolean;
    isPortrait: boolean;
  } {
    const viewport = this.viewportManager.getCurrentViewport();
    const layout = this.layoutManager.getLayoutConfig();
    
    return {
      viewport,
      layout,
      isMobile: viewport.width < 768,
      isPortrait: viewport.orientation === 'portrait'
    };
  }

  /**
   * Convenience method to get button bounds
   */
  public getButtonBounds(buttonType: ButtonType): Phaser.Geom.Rectangle {
    return this.layoutManager.getButtonBounds(buttonType);
  }

  /**
   * Convenience method to get element positions
   */
  public getElementPositions(): {
    title: { x: number; y: number };
    subtitle: { x: number; y: number };
    primaryButton: { x: number; y: number };
    secondaryButton: { x: number; y: number };
  } {
    return {
      title: this.layoutManager.getTitlePosition(),
      subtitle: this.layoutManager.getSubtitlePosition(),
      primaryButton: this.layoutManager.getButtonPosition(ButtonType.PRIMARY),
      secondaryButton: this.layoutManager.getButtonPosition(ButtonType.SECONDARY)
    };
  }

  /**
   * Clean up all resources
   */
  public destroy(): void {
    // Clean up managers
    this.layoutManager.destroy();
    this.viewportManager.destroy();

    // Clear scene reference
    this.currentScene = null;
    this.isInitialized = false;

    console.log('ResponsiveSystem: Destroyed successfully');
  }
}
