import { Scene } from 'phaser';
import { UIElement, LayoutConfig } from './UIElementFactory';
import {
  safeEventListenerRemoval,
  handlePartialDestructionState,
  validateSceneState
} from './SafeCleanupHelpers';

/**
 * Button types for layout positioning
 */
export enum ButtonType {
  PRIMARY = 'primary',      // Start Game - Electric Blue
  SECONDARY = 'secondary',  // How to Play - Cyber Pink
  TERTIARY = 'tertiary',    // View Leaderboard - White
  QUATERNARY = 'quaternary' // Additional buttons
}

/**
 * Position configuration for UI elements
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Dimensions interface
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Layout configuration interface for splash screen elements
 */
export interface SplashLayoutConfig {
  title: Position;
  subtitle: Position;
  highScore: Position;
  primaryButton: Position;
  secondaryButton: Position;
  tertiaryButton: Position;
  settingsIcon: Position;
  shopIcon: Position;
}

/**
 * Interface for ResponsiveLayoutManager
 */
export interface IResponsiveLayoutManager {
  updateLayout(width: number, height: number): void;
  getCurrentDimensions(): Dimensions;
  getTitlePosition(): Position;
  getSubtitlePosition(): Position;
  getHighScorePosition(): Position;
  getButtonPosition(buttonType: ButtonType): Position;
  getButtonBounds(buttonType: ButtonType): Phaser.Geom.Rectangle;
  getSettingsIconPosition(): Position;
  getShopIconPosition(): Position;
  getLayoutConfig(): SplashLayoutConfig;
  getResponsiveFontSize(baseSize: number): string;
  onResize(callback: (width: number, height: number) => void): void;
  destroy(): void;
}

/**
 * Map of UI elements for layout management
 */
export interface UIElementMap {
  header?: UIElement;
  score?: UIElement;
  timer?: UIElement;
  slowMoCharges?: UIElement[];
  targetColor?: UIElement;
}

/**
 * ResponsiveLayoutManager handles proper positioning and sizing of UI elements
 * based on screen dimensions with responsive calculations and minimum margins
 */
export class ResponsiveLayoutManager implements IResponsiveLayoutManager {
  private scene: Scene;
  private resizeCallbacks: Array<(layout: LayoutConfig) => void> = [];
  private legacyResizeCallbacks: Array<(width: number, height: number) => void> = [];
  private currentLayout: LayoutConfig | null = null;
  private currentDimensions: Dimensions = { width: 800, height: 600 };

  constructor(scene?: Scene) {
    this.scene = scene!;
    if (scene) {
      this.setupResizeListener();
    }
  }

  /**
   * Calculate responsive layout based on screen dimensions
   */
  calculateLayout(screenWidth: number, screenHeight: number): LayoutConfig {
    console.log('ResponsiveLayoutManager: Calculating layout for', screenWidth, 'x', screenHeight);

    // Calculate responsive margin - minimum 50px, 5% of screen width for better visibility
    const margin = Math.max(50, screenWidth * 0.05);

    // Header configuration
    const headerHeight = 60;
    const headerY = headerHeight / 2; // Center of header bar

    // Target color display configuration
    const targetColorY = headerHeight + 40; // Below header with spacing
    const targetColorWidth = Math.min(300, screenWidth * 0.8); // Max 80% of screen width

    // Slow-mo charges configuration
    const chargeSpacing = 35;
    const chargeStartX = screenWidth - margin - 60; // Start from right edge with margin

    const layout: LayoutConfig = {
      header: {
        width: screenWidth,
        height: headerHeight,
        y: 0
      },
      score: {
        x: margin,
        y: headerY
      },
      timer: {
        x: screenWidth / 2,
        y: headerY
      },
      slowMoCharges: {
        startX: chargeStartX,
        y: headerY,
        spacing: chargeSpacing
      },
      targetColor: {
        x: screenWidth / 2,
        y: targetColorY,
        width: targetColorWidth
      }
    };

    console.log('ResponsiveLayoutManager: Layout calculated:', {
      margin,
      headerHeight,
      targetColorWidth,
      chargeStartX,
      scoreX: layout.score.x,
      timerX: layout.timer.x,
      screenWidth
    });

    this.currentLayout = layout;
    return layout;
  }

  /**
   * Update positions of all UI elements based on layout configuration
   */
  updateElementPositions(elements: UIElementMap, layout: LayoutConfig): void {
    console.log('ResponsiveLayoutManager: Updating element positions');

    try {
      // Update header background
      if (elements.header?.container) {
        elements.header.container.setPosition(0, layout.header.y);

        // Update header background size if it has graphics elements
        if (elements.header.graphicsElements && elements.header.graphicsElements[0]) {
          const headerBg = elements.header.graphicsElements[0] as Phaser.GameObjects.Rectangle;
          if (headerBg.setSize) {
            headerBg.setSize(layout.header.width, layout.header.height);
          }
        }
        console.log('ResponsiveLayoutManager: Header updated');
      }

      // Update score display position
      if (elements.score?.container) {
        elements.score.container.setPosition(layout.score.x, layout.score.y);
        console.log('ResponsiveLayoutManager: Score position updated to', layout.score.x, layout.score.y);
      }

      // Update timer display position
      if (elements.timer?.container) {
        elements.timer.container.setPosition(layout.timer.x, layout.timer.y);
        console.log('ResponsiveLayoutManager: Timer position updated to', layout.timer.x, layout.timer.y);
      }

      // Update slow-mo charges positions
      if (elements.slowMoCharges && elements.slowMoCharges.length > 0) {
        elements.slowMoCharges.forEach((charge, index) => {
          if (charge?.container) {
            const chargeX = layout.slowMoCharges.startX - (index * layout.slowMoCharges.spacing);
            charge.container.setPosition(chargeX, layout.slowMoCharges.y);
          }
        });
        console.log('ResponsiveLayoutManager: Slow-mo charges positions updated');
      }

      // Update target color display position and size
      if (elements.targetColor?.container) {
        elements.targetColor.container.setPosition(layout.targetColor.x, layout.targetColor.y);

        // Update target color background size if it has graphics elements
        if (elements.targetColor.graphicsElements && elements.targetColor.graphicsElements[0]) {
          const targetBg = elements.targetColor.graphicsElements[0] as Phaser.GameObjects.Rectangle;
          if (targetBg.setSize) {
            targetBg.setSize(layout.targetColor.width, 60);
          }
        }
        console.log('ResponsiveLayoutManager: Target color position and size updated');
      }

      console.log('ResponsiveLayoutManager: All element positions updated successfully');
    } catch (error) {
      console.error('ResponsiveLayoutManager: Error updating element positions:', error);
    }
  }

  /**
   * Register a callback to be called when layout changes (overloaded for compatibility)
   */
  onResize(callback: (layout: LayoutConfig) => void): void;
  onResize(callback: (width: number, height: number) => void): void;
  onResize(callback: ((layout: LayoutConfig) => void) | ((width: number, height: number) => void)): void {
    // Check if it's a legacy callback (2 parameters) or new callback (1 parameter)
    if (callback.length === 2) {
      this.legacyResizeCallbacks.push(callback as (width: number, height: number) => void);
      console.log('ResponsiveLayoutManager: Legacy resize callback registered, total callbacks:', this.legacyResizeCallbacks.length);
    } else {
      this.resizeCallbacks.push(callback as (layout: LayoutConfig) => void);
      console.log('ResponsiveLayoutManager: Resize callback registered, total callbacks:', this.resizeCallbacks.length);
    }
  }

  /**
   * Remove a resize callback
   */
  removeResizeCallback(callback: (layout: LayoutConfig) => void): void {
    const index = this.resizeCallbacks.indexOf(callback);
    if (index > -1) {
      this.resizeCallbacks.splice(index, 1);
      console.log('ResponsiveLayoutManager: Resize callback removed');
    }
  }

  /**
   * Setup resize event listener
   */
  private setupResizeListener(): void {
    if (this.scene.scale) {
      this.scene.scale.on('resize', this.handleResize, this);
      console.log('ResponsiveLayoutManager: Resize listener setup complete');
    }
  }

  /**
   * Handle resize events
   */
  private handleResize(): void {
    console.log('ResponsiveLayoutManager: Resize event triggered');

    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available during resize');
      return;
    }

    const newLayout = this.calculateLayout(this.scene.scale.width, this.scene.scale.height);

    // Notify all registered callbacks
    this.resizeCallbacks.forEach(callback => {
      try {
        callback(newLayout);
      } catch (error) {
        console.error('ResponsiveLayoutManager: Error in resize callback:', error);
      }
    });

    console.log('ResponsiveLayoutManager: Resize handling complete');
  }

  /**
   * Get current layout configuration
   */
  getCurrentLayout(): LayoutConfig | null {
    return this.currentLayout;
  }

  /**
   * Force a layout recalculation and update
   */
  forceLayoutUpdate(elements: UIElementMap): void {
    console.log('ResponsiveLayoutManager: Forcing layout update');

    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available for layout update');
      return;
    }

    const layout = this.calculateLayout(this.scene.scale.width, this.scene.scale.height);
    this.updateElementPositions(elements, layout);

    // Notify callbacks
    this.resizeCallbacks.forEach(callback => {
      try {
        callback(layout);
      } catch (error) {
        console.error('ResponsiveLayoutManager: Error in forced layout callback:', error);
      }
    });
  }

  /**
   * Validate that UI elements are within screen bounds
   */
  validateElementBounds(elements: UIElementMap): boolean {
    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available for validation');
      return true; // Assume valid if we can't check
    }

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    let allValid = true;

    console.log('ResponsiveLayoutManager: Validating element bounds for screen', screenWidth, 'x', screenHeight);

    // Check score element
    if (elements.score?.container) {
      const inBounds = elements.score.container.x >= 0 &&
        elements.score.container.x <= screenWidth &&
        elements.score.container.y >= 0 &&
        elements.score.container.y <= screenHeight;

      if (!inBounds) {
        console.warn('ResponsiveLayoutManager: Score element out of bounds:',
          elements.score.container.x, elements.score.container.y);
        allValid = false;
      }
    }

    // Check timer element
    if (elements.timer?.container) {
      const inBounds = elements.timer.container.x >= 0 &&
        elements.timer.container.x <= screenWidth &&
        elements.timer.container.y >= 0 &&
        elements.timer.container.y <= screenHeight;

      if (!inBounds) {
        console.warn('ResponsiveLayoutManager: Timer element out of bounds:',
          elements.timer.container.x, elements.timer.container.y);
        allValid = false;
      }
    }

    // Check target color element
    if (elements.targetColor?.container) {
      const inBounds = elements.targetColor.container.x >= 0 &&
        elements.targetColor.container.x <= screenWidth &&
        elements.targetColor.container.y >= 0 &&
        elements.targetColor.container.y <= screenHeight;

      if (!inBounds) {
        console.warn('ResponsiveLayoutManager: Target color element out of bounds:',
          elements.targetColor.container.x, elements.targetColor.container.y);
        allValid = false;
      }
    }

    // Check slow-mo charges
    if (elements.slowMoCharges) {
      elements.slowMoCharges.forEach((charge, index) => {
        if (charge?.container) {
          const inBounds = charge.container.x >= 0 &&
            charge.container.x <= screenWidth &&
            charge.container.y >= 0 &&
            charge.container.y <= screenHeight;

          if (!inBounds) {
            console.warn(`ResponsiveLayoutManager: Slow-mo charge ${index} out of bounds:`,
              charge.container.x, charge.container.y);
            allValid = false;
          }
        }
      });
    }

    console.log('ResponsiveLayoutManager: Bounds validation complete, all valid:', allValid);
    return allValid;
  }

  /**
   * Get minimum margins for the current screen size
   */
  getMinimumMargins(): { horizontal: number; vertical: number } {
    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available, using default margins');
      return { horizontal: 20, vertical: 20 };
    }

    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;

    return {
      horizontal: Math.max(20, screenWidth * 0.03),
      vertical: Math.max(20, screenHeight * 0.03)
    };
  }

  /**
   * Check if current screen size is mobile-like
   */
  isMobileLayout(): boolean {
    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available, assuming desktop layout');
      return false;
    }

    const screenWidth = this.scene.scale.width;
    return screenWidth < 768; // Common mobile breakpoint
  }

  /**
   * Get responsive font size based on screen dimensions
   */
  getResponsiveFontSize(baseSize: number): string {
    // Safety check for scene availability
    if (!this.scene || !this.scene.scale) {
      console.warn('ResponsiveLayoutManager: Scene not available, using base font size');
      return `${baseSize}px`;
    }

    const screenWidth = this.scene.scale.width;
    const scaleFactor = Math.max(0.8, Math.min(1.2, screenWidth / 800)); // Scale between 0.8x and 1.2x
    const responsiveSize = Math.round(baseSize * scaleFactor);

    return `${responsiveSize}px`;
  }

  /**
   * Update layout with new dimensions (legacy interface compatibility)
   */
  updateLayout(width: number, height: number): void {
    console.log('ResponsiveLayoutManager: updateLayout called with', width, 'x', height);
    this.currentDimensions = { width, height };

    // Update the UI layout if we have UI elements and scene
    if (this.scene) {
      this.calculateLayout(width, height);
    }

    // Notify legacy callbacks
    this.legacyResizeCallbacks.forEach(callback => {
      try {
        callback(width, height);
      } catch (error) {
        console.error('ResponsiveLayoutManager: Error in legacy resize callback:', error);
      }
    });
  }

  /**
   * Get current dimensions
   */
  getCurrentDimensions(): Dimensions {
    return { ...this.currentDimensions };
  }

  /**
   * Get title position for splash screen
   */
  getTitlePosition(): Position {
    const { width, height } = this.currentDimensions;
    return {
      x: width / 2,
      y: height * 0.25 // 25% from top
    };
  }

  /**
   * Get subtitle position for splash screen
   */
  getSubtitlePosition(): Position {
    const { width, height } = this.currentDimensions;
    return {
      x: width / 2,
      y: height * 0.35 // 35% from top
    };
  }

  /**
   * Get button position based on button type
   */
  getButtonPosition(buttonType: ButtonType): Position {
    const { width, height } = this.currentDimensions;
    const centerX = width / 2;
    const buttonSpacing = 70; // Spacing between buttons
    const startY = height * 0.6; // Start buttons at 60% from top

    switch (buttonType) {
      case ButtonType.PRIMARY:
        return { x: centerX, y: startY };
      case ButtonType.SECONDARY:
        return { x: centerX, y: startY + buttonSpacing };
      case ButtonType.TERTIARY:
        return { x: centerX, y: startY + (buttonSpacing * 2) };
      case ButtonType.QUATERNARY:
        return { x: centerX, y: startY + (buttonSpacing * 3) };
      default:
        return { x: centerX, y: startY };
    }
  }

  /**
   * Get high score position
   */
  getHighScorePosition(): Position {
    const { width, height } = this.currentDimensions;
    return {
      x: width / 2,
      y: height * 0.45 // Between subtitle and buttons
    };
  }

  /**
   * Get settings icon position (top left)
   */
  getSettingsIconPosition(): Position {
    return {
      x: 50, // 50px from left edge
      y: 50  // 50px from top edge
    };
  }

  /**
   * Get shop icon position (bottom right)
   */
  getShopIconPosition(): Position {
    const { width, height } = this.currentDimensions;
    return {
      x: width - 50,  // 50px from right edge
      y: height - 50  // 50px from bottom edge
    };
  }

  /**
   * Get button bounds for interaction
   */
  getButtonBounds(buttonType: ButtonType): Phaser.Geom.Rectangle {
    const position = this.getButtonPosition(buttonType);
    const buttonWidth = Math.min(300, this.currentDimensions.width * 0.8);
    const buttonHeight = 60;

    return new Phaser.Geom.Rectangle(
      position.x - buttonWidth / 2,
      position.y - buttonHeight / 2,
      buttonWidth,
      buttonHeight
    );
  }

  /**
   * Get complete layout configuration for splash screen
   */
  getLayoutConfig(): SplashLayoutConfig {
    return {
      title: this.getTitlePosition(),
      subtitle: this.getSubtitlePosition(),
      highScore: this.getHighScorePosition(),
      primaryButton: this.getButtonPosition(ButtonType.PRIMARY),
      secondaryButton: this.getButtonPosition(ButtonType.SECONDARY),
      tertiaryButton: this.getButtonPosition(ButtonType.TERTIARY),
      settingsIcon: this.getSettingsIconPosition(),
      shopIcon: this.getShopIconPosition()
    };
  }



  /**
   * Remove a legacy resize callback
   */
  removeLegacyResizeCallback(callback: (width: number, height: number) => void): void {
    const index = this.legacyResizeCallbacks.indexOf(callback);
    if (index > -1) {
      this.legacyResizeCallbacks.splice(index, 1);
      console.log('ResponsiveLayoutManager: Legacy resize callback removed');
    }
  }

  /**
   * Cleanup method to remove event listeners with comprehensive error handling patterns
   * Uses SafeCleanupHelpers for consistent error handling across all utility classes
   */
  destroy(): void {
    console.log('ResponsiveLayoutManager: Starting destruction with comprehensive error handling');

    // Validate scene state before attempting cleanup
    const sceneValidation = validateSceneState(this.scene, 'ResponsiveLayoutManager');

    if (!sceneValidation.isValid) {
      console.warn('ResponsiveLayoutManager: Scene validation failed, proceeding with limited cleanup', {
        validationErrors: sceneValidation.validationErrors
      });
    }

    // Define cleanup operations for partial destruction state handling
    const cleanupOperations = [
      {
        name: 'removeScaleListener',
        operation: () => {
          // Use the comprehensive safe event listener removal helper
          const destructionContext = safeEventListenerRemoval(
            this.scene,
            'resize',
            this.handleResize,
            this,
            'ResponsiveLayoutManager'
          );

          if (destructionContext.errorOccurred) {
            throw new Error(destructionContext.errorMessage || 'Scale listener removal failed');
          }
        },
        required: true
      },
      {
        name: 'clearCallbacks',
        operation: () => {
          this.resizeCallbacks = [];
          this.legacyResizeCallbacks = [];
          console.log('ResponsiveLayoutManager: Callbacks cleared successfully');
        },
        required: true
      },
      {
        name: 'clearLayout',
        operation: () => {
          this.currentLayout = null;
          console.log('ResponsiveLayoutManager: Layout references cleared successfully');
        },
        required: true
      }
    ];

    // Execute cleanup with partial destruction state handling
    const cleanupStatus = handlePartialDestructionState(
      this.scene,
      cleanupOperations,
      'ResponsiveLayoutManager'
    );

    // Log final cleanup status
    if (cleanupStatus.completed) {
      console.log('ResponsiveLayoutManager: Destruction completed successfully', {
        scaleListenerRemoved: cleanupStatus.scaleListenerRemoved,
        callbacksCleared: cleanupStatus.callbacksCleared,
        layoutCleared: cleanupStatus.layoutCleared,
        errorCount: cleanupStatus.errors.length
      });
    } else {
      console.warn('ResponsiveLayoutManager: Destruction completed with errors', {
        errors: cleanupStatus.errors,
        scaleListenerRemoved: cleanupStatus.scaleListenerRemoved,
        callbacksCleared: cleanupStatus.callbacksCleared,
        layoutCleared: cleanupStatus.layoutCleared
      });
    }

    console.log('ResponsiveLayoutManager: Destroyed and cleaned up');
  }
}
