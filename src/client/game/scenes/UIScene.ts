import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { UIElementFactory, LayoutConfig } from '../utils/UIElementFactory';
import { ResponsiveLayoutManager, UIElementMap } from '../utils/ResponsiveLayoutManager';
import { UpdateHandler } from '../utils/UpdateHandler';
import { UIErrorRecovery } from '../utils/UIErrorRecovery';
import { uiLogger, LogLevel } from '../utils/UIErrorLogger';

export class UIScene extends Scene {
  // New factory-based UI system
  private uiElementFactory: UIElementFactory | null = null;
  private layoutManager: ResponsiveLayoutManager | null = null;
  private uiElements: UIElementMap = {};
  private updateHandler: UpdateHandler | null = null;
  private errorRecovery: UIErrorRecovery | null = null;

  // Legacy UI elements (for fallback compatibility)
  private scoreContainer: Phaser.GameObjects.Container | null = null;
  private timeContainer: Phaser.GameObjects.Container | null = null;
  private targetColorText: Phaser.GameObjects.Text | null = null;
  private targetColorBg: Phaser.GameObjects.Rectangle | null = null;
  private headerBg: Phaser.GameObjects.Rectangle | null = null;
  private slowMoCharges: Phaser.GameObjects.Arc[] = [];
  private slowMoClockIcons: Phaser.GameObjects.Line[] = [];

  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;

  constructor() {
    super('UI');
  }

  private getColorName(color: GameColor): string {
    switch (color) {
      case GameColor.RED: return 'RED';
      case GameColor.GREEN: return 'GREEN';
      case GameColor.BLUE: return 'BLUE';
      case GameColor.YELLOW: return 'YELLOW';
      case GameColor.PURPLE: return 'PURPLE';
      default: return 'RED';
    }
  }



  shutdown(): void {
    try {
      console.log('UIScene: Starting shutdown and cleanup...');

      // Remove all event listeners to prevent memory leaks
      this.cleanupEventListeners();

      // Kill all tweens and animations to prevent issues during shutdown
      this.cleanupAnimations();

      // Clean up UpdateHandler
      if (this.updateHandler) {
        this.updateHandler.destroy();
        this.updateHandler = null;
      }

      // Clean up new factory-based system
      if (this.layoutManager) {
        this.layoutManager.destroy();
        this.layoutManager = null;
      }
      
      this.uiElementFactory = null;
      this.uiElements = {};

      // Clean up legacy UI elements properly
      this.cleanupLegacyUIElements();

      // Clear all references to prevent memory leaks
      this.clearAllReferences();

      console.log('UIScene: Shutdown completed successfully');
    } catch (error) {
      console.warn('Error during UIScene shutdown:', error);
    }
  }

  /**
   * Clean up all event listeners to prevent memory leaks
   */
  private cleanupEventListeners(): void {
    console.log('UIScene: Cleaning up event listeners...');

    try {
      // Remove game event listeners
      this.events.off('updateScore');
      this.events.off('updateTime');
      this.events.off('updateTargetColor');
      this.events.off('updateSlowMoCharges');

      // Remove scene event listeners
      this.events.off('shutdown');
      this.events.off('destroy');
      this.events.off('wake');
      this.events.off('sleep');

      // Remove scale event listeners
      if (this.scale) {
        this.scale.off('resize');
      }

      console.log('UIScene: Event listeners cleaned up');
    } catch (error) {
      console.warn('UIScene: Error cleaning up event listeners:', error);
    }
  }

  /**
   * Clean up all animations and tweens
   */
  private cleanupAnimations(): void {
    console.log('UIScene: Cleaning up animations and tweens...');

    try {
      if (this.tweens) {
        // Kill all active tweens
        this.tweens.killAll();
        
        // Kill tweens for specific objects if they exist
        if (this.scoreContainer) {
          this.tweens.killTweensOf(this.scoreContainer);
        }
        if (this.timeContainer) {
          this.tweens.killTweensOf(this.timeContainer);
        }
        if (this.targetColorBg) {
          this.tweens.killTweensOf(this.targetColorBg);
        }
        if (this.targetColorText) {
          this.tweens.killTweensOf(this.targetColorText);
        }
        
        // Kill tweens for slow-mo charges
        this.slowMoCharges.forEach(charge => {
          if (charge) {
            this.tweens.killTweensOf(charge);
          }
        });
      }

      console.log('UIScene: Animations and tweens cleaned up');
    } catch (error) {
      console.warn('UIScene: Error cleaning up animations:', error);
    }
  }

  /**
   * Clean up legacy UI elements with proper disposal
   */
  private cleanupLegacyUIElements(): void {
    console.log('UIScene: Cleaning up legacy UI elements...');

    try {
      // Clean up containers (Phaser will handle child cleanup)
      if (this.scoreContainer) {
        this.scoreContainer.removeAll(true);
      }
      if (this.timeContainer) {
        this.timeContainer.removeAll(true);
      }

      // Clean up arrays of UI elements
      this.slowMoCharges.forEach(charge => {
        if (charge && charge.active) {
          try {
            // Don't manually destroy - let Phaser handle it
            charge.setVisible(false);
          } catch (error) {
            console.warn('UIScene: Error hiding slow-mo charge:', error);
          }
        }
      });

      this.slowMoClockIcons.forEach(icon => {
        if (icon && icon.active) {
          try {
            // Don't manually destroy - let Phaser handle it
            icon.setVisible(false);
          } catch (error) {
            console.warn('UIScene: Error hiding clock icon:', error);
          }
        }
      });

      console.log('UIScene: Legacy UI elements cleaned up');
    } catch (error) {
      console.warn('UIScene: Error cleaning up legacy UI elements:', error);
    }
  }

  /**
   * Clear all object references to prevent memory leaks
   */
  private clearAllReferences(): void {
    console.log('UIScene: Clearing all references...');

    // Clear legacy container references
    this.scoreContainer = null;
    this.timeContainer = null;
    this.targetColorText = null;
    this.targetColorBg = null;
    this.headerBg = null;
    
    // Clear arrays
    this.slowMoCharges = [];
    this.slowMoClockIcons = [];

    // Clear factory system references
    this.uiElementFactory = null;
    this.layoutManager = null;
    this.updateHandler = null;
    this.uiElements = {};

    console.log('UIScene: All references cleared');
  }

  init(): void {
    uiLogger.logSceneEvent('UIScene', 'init', true, { phase: 'start' });

    try {
      // Clean up any existing resources first
      this.cleanupExistingResources();

      // Initialize new factory-based system with error recovery
      this.uiElementFactory = new UIElementFactory(this);
      this.layoutManager = new ResponsiveLayoutManager(this);
      this.errorRecovery = new UIErrorRecovery(this, {
        maxRetries: 3,
        retryDelay: 100,
        enableAutoFallback: true,
        enableRetryLogic: true
      });
      this.uiElements = {};
      this.updateHandler = null; // Will be initialized after UI elements are created

      // Reset legacy UI elements
      this.scoreContainer = null;
      this.timeContainer = null;
      this.targetColorText = null;
      this.targetColorBg = null;
      this.headerBg = null;
      this.slowMoCharges = [];
      this.slowMoClockIcons = [];

      // Reset game state
      this.score = 0;
      this.bestScore = this.getBestScore();
      this.targetColor = GameColor.RED;

      uiLogger.logSceneEvent('UIScene', 'init', true, { 
        phase: 'completed',
        bestScore: this.bestScore,
        targetColor: this.targetColor
      });
    } catch (error) {
      uiLogger.logSceneEvent('UIScene', 'init', false, undefined, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Clean up any existing resources during initialization
   * Ensures clean state for new UI creation
   */
  private cleanupExistingResources(): void {
    console.log('UIScene: Cleaning up existing resources...');

    try {
      // Clean up existing tweens
      if (this.tweens) {
        this.tweens.killAll();
      }

      // Clean up existing UpdateHandler
      if (this.updateHandler) {
        this.updateHandler.destroy();
        this.updateHandler = null;
      }

      // Clean up existing LayoutManager
      if (this.layoutManager) {
        this.layoutManager.destroy();
        this.layoutManager = null;
      }

      // Clear existing UI elements
      this.uiElements = {};
      this.uiElementFactory = null;

      console.log('UIScene: Existing resources cleaned up');
    } catch (error) {
      console.warn('UIScene: Error cleaning up existing resources:', error);
    }
  }

  /**
   * Setup event listeners with proper memory management
   */
  private setupEventListeners(): void {
    console.log('UIScene: Setting up event listeners...');

    try {
      // Listen for game events from GameScene
      this.events.on('updateScore', this.updateScore, this);
      this.events.on('updateTime', this.updateTime, this);
      this.events.on('updateTargetColor', this.updateTargetColor, this);
      this.events.on('updateSlowMoCharges', this.updateSlowMoCharges, this);

      // Listen for scene lifecycle events
      this.events.once('shutdown', () => {
        console.log('UIScene: Shutdown event received, cleaning up...');
        this.cleanupEventListeners();
      });

      this.events.once('destroy', () => {
        console.log('UIScene: Destroy event received, cleaning up...');
        this.cleanupEventListeners();
      });

      // Listen for scale changes for responsive layout
      if (this.scale) {
        this.scale.on('resize', this.handleResize, this);
      }

      console.log('UIScene: Event listeners setup completed');
    } catch (error) {
      console.warn('UIScene: Error setting up event listeners:', error);
    }
  }

  /**
   * Handle resize events for responsive layout
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    console.log('UIScene: Resize event received:', gameSize.width, 'x', gameSize.height);

    try {
      if (this.layoutManager && this.uiElements) {
        const layout = this.layoutManager.calculateLayout(gameSize.width, gameSize.height);
        this.layoutManager.updateElementPositions(this.uiElements, layout);
        console.log('UIScene: Layout updated for new size');
      }
    } catch (error) {
      console.warn('UIScene: Error handling resize:', error);
    }
  }

  create(): void {
    console.log('UIScene: Initializing UI');
    console.log('UIScene: Scene key:', this.scene.key);
    console.log('UIScene: Scene active:', this.scene.isActive());
    console.log('UIScene: Scene visible:', this.scene.isVisible());
    console.log('UIScene: Scale dimensions:', this.scale.width, 'x', this.scale.height);

    // Configure camera for UI scene
    const camera = this.cameras.main;
    camera.setBackgroundColor('rgba(0,0,0,0)'); // Transparent background
    console.log('UIScene: Camera configured - bounds:', camera.x, camera.y, camera.width, camera.height);

    // Create UI asynchronously with font fallback handling
    this.createUIAsync();
  }

  /**
   * Create UI asynchronously with comprehensive font and fallback handling
   */
  private async createUIAsync(): Promise<void> {
    uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIAsync', 'Starting asynchronous UI creation');
    
    try {
      // Create UI using new factory-based system with responsive layout and font fallback
      await this.createResponsiveUIWithRecovery();

      // Setup layout manager resize handling
      if (this.layoutManager) {
        this.layoutManager.onResize((layout: LayoutConfig) => {
          uiLogger.log(LogLevel.DEBUG, 'UIScene', 'createUIAsync', 'Layout changed, updating UI elements');
          this.layoutManager!.updateElementPositions(this.uiElements, layout);
        });
      }

      // Setup event listeners with proper cleanup tracking
      this.setupEventListeners();

      uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIAsync', 'UI creation completed successfully');

      // Log the state of created UI elements
      this.logUIElementsState();
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'createUIAsync', 'Error in async UI creation, attempting recovery', undefined, error instanceof Error ? error : undefined);
      
      // Attempt recovery with error recovery system
      await this.attemptUIRecovery();
    }
  }

  private async createResponsiveUILegacy(): Promise<void> {
    console.log('UIScene: Creating responsive UI with factory system and font fallback handling');
    
    if (!this.uiElementFactory || !this.layoutManager) {
      throw new Error('UIElementFactory or LayoutManager not initialized');
    }

    // Calculate initial layout
    const layout = this.layoutManager.calculateLayout(this.scale.width, this.scale.height);
    console.log('UIScene: Initial layout calculated:', layout);

    try {
      // Import and use FallbackRenderer for enhanced font handling
      const { FallbackRenderer } = await import('../utils/FallbackRenderer');
      const fallbackRenderer = new FallbackRenderer(this);
      
      // Ensure font availability before UI creation
      console.log('UIScene: Checking font availability before UI creation...');
      await fallbackRenderer.ensureFontAvailabilityBeforeUICreation();
      
      // Update UIElementFactory with appropriate font family
      const fontFamily = fallbackRenderer.getFontFamily();
      this.uiElementFactory.updateFontFamily(fontFamily);
      console.log('UIScene: Font family updated to:', fontFamily);

      // Create UI elements with font-aware fallback
      console.log('UIScene: Creating UI elements with font-aware fallback...');
      
      // Create header background with full-width coverage
      console.log('UIScene: Creating header background...');
      this.uiElements.header = this.uiElementFactory.createHeaderBackground(
        layout.header.width, 
        layout.header.height
      );

      // Create score display
      console.log('UIScene: Creating score display...');
      this.uiElements.score = this.uiElementFactory.createScoreDisplay(
        layout.score.x, 
        layout.score.y
      );

      // Create timer display
      console.log('UIScene: Creating timer display...');
      this.uiElements.timer = this.uiElementFactory.createTimeDisplay(
        layout.timer.x, 
        layout.timer.y
      );

      // Create slow-mo charges
      console.log('UIScene: Creating slow-mo charges...');
      this.uiElements.slowMoCharges = this.uiElementFactory.createSlowMoCharges(
        layout.slowMoCharges.startX,
        layout.slowMoCharges.y,
        3
      );

      // Create target color display
      console.log('UIScene: Creating target color display...');
      this.uiElements.targetColor = this.uiElementFactory.createTargetColorDisplay(
        layout.targetColor.x,
        layout.targetColor.y,
        layout.targetColor.width
      );

      // Apply initial layout
      this.layoutManager.updateElementPositions(this.uiElements, layout);

      // Initialize UpdateHandler with the created UI elements
      this.updateHandler = new UpdateHandler(this, this.uiElements);
      console.log('UIScene: UpdateHandler initialized');

      // Validate that all elements are within bounds
      const boundsValid = this.layoutManager.validateElementBounds(this.uiElements);
      if (!boundsValid) {
        console.warn('UIScene: Some UI elements are out of bounds, forcing layout update');
        this.layoutManager.forceLayoutUpdate(this.uiElements);
      }

      console.log('UIScene: Responsive UI created successfully with font fallback handling');
    } catch (error) {
      console.error('UIScene: Error creating responsive UI with font fallback:', error);
      
      // If font-aware creation fails, fall back to FallbackRenderer
      console.log('UIScene: Attempting UI creation with FallbackRenderer as last resort');
      await this.createUIWithFallbackRenderer(layout);
    }
  }

  /**
   * Create responsive UI with error recovery mechanisms
   */
  private async createResponsiveUIWithRecovery(): Promise<void> {
    uiLogger.log(LogLevel.INFO, 'UIScene', 'createResponsiveUIWithRecovery', 'Creating responsive UI with error recovery');
    
    if (!this.uiElementFactory || !this.layoutManager || !this.errorRecovery) {
      throw new Error('Required systems not initialized');
    }

    // Calculate initial layout
    const layout = this.layoutManager.calculateLayout(this.scale.width, this.scale.height);
    uiLogger.logLayoutCalculation(this.scale.width, this.scale.height, layout, true);

    try {
      // Attempt to create UI with error recovery for each component
      await this.createUIComponentsWithRecovery(layout);

      // Initialize UpdateHandler with the created UI elements
      this.updateHandler = new UpdateHandler(this, this.uiElements);
      uiLogger.log(LogLevel.INFO, 'UIScene', 'createResponsiveUIWithRecovery', 'UpdateHandler initialized successfully');

      // Validate that all elements are within bounds
      const boundsValid = this.layoutManager.validateElementBounds(this.uiElements);
      if (!boundsValid) {
        uiLogger.log(LogLevel.WARN, 'UIScene', 'createResponsiveUIWithRecovery', 'Some UI elements are out of bounds, forcing layout update');
        this.layoutManager.forceLayoutUpdate(this.uiElements);
      }

      // Ensure game remains playable
      const isPlayable = await this.errorRecovery.ensureGamePlayability(layout);
      if (!isPlayable) {
        throw new Error('Failed to ensure game playability');
      }

      uiLogger.log(LogLevel.INFO, 'UIScene', 'createResponsiveUIWithRecovery', 'Responsive UI with error recovery created successfully');
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'createResponsiveUIWithRecovery', 'Error creating responsive UI with recovery', undefined, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Create UI components with individual error recovery
   */
  private async createUIComponentsWithRecovery(layout: LayoutConfig): Promise<void> {
    uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIComponentsWithRecovery', 'Creating UI components with individual error recovery');

    if (!this.uiElementFactory || !this.errorRecovery) {
      throw new Error('Required systems not initialized');
    }

    // Create header background with recovery
    const headerResult = await this.errorRecovery.recoverUIElement(
      'header',
      () => this.uiElementFactory!.createHeaderBackground(layout.header.width, layout.header.height)
    );
    if (headerResult) {
      this.uiElements.header = headerResult;
    }

    // Create score display with recovery
    const scoreResult = await this.errorRecovery.recoverUIElement(
      'scoreDisplay',
      () => this.uiElementFactory!.createScoreDisplay(layout.score.x, layout.score.y)
    );
    if (scoreResult) {
      this.uiElements.score = scoreResult;
    }

    // Create timer display with recovery
    const timerResult = await this.errorRecovery.recoverUIElement(
      'timeDisplay',
      () => this.uiElementFactory!.createTimeDisplay(layout.timer.x, layout.timer.y)
    );
    if (timerResult) {
      this.uiElements.timer = timerResult;
    }

    // Create slow-mo charges with recovery (handle array creation directly)
    try {
      this.uiElements.slowMoCharges = this.uiElementFactory.createSlowMoCharges(
        layout.slowMoCharges.startX,
        layout.slowMoCharges.y,
        3
      );
    } catch (error) {
      uiLogger.log(LogLevel.WARN, 'UIScene', 'createUIComponentsWithRecovery', 'Failed to create slow-mo charges, attempting recovery', undefined, error instanceof Error ? error : undefined);
      
      // Create emergency charges as fallback
      const emergencyCharges: any[] = [];
      for (let i = 0; i < 3; i++) {
        const chargeX = layout.slowMoCharges.startX - (i * 35);
        try {
          const emergencyCharge = await this.errorRecovery.recoverUIElement(
            `slowMoCharge${i}`,
            () => {
              const container = this.add.container(chargeX, layout.slowMoCharges.y);
              const charge = this.add.circle(0, 0, 10, 0x3498DB);
              container.add(charge);
              return {
                container,
                graphicsElements: [charge],
                type: 'minimal' as any,
                updateMethod: (isActive: boolean) => {
                  charge.setAlpha(isActive ? 1.0 : 0.4);
                }
              };
            }
          );
          if (emergencyCharge) {
            emergencyCharges.push(emergencyCharge);
          }
        } catch (chargeError) {
          uiLogger.log(LogLevel.ERROR, 'UIScene', 'createUIComponentsWithRecovery', `Failed to create emergency charge ${i}`, undefined, chargeError instanceof Error ? chargeError : undefined);
        }
      }
      this.uiElements.slowMoCharges = emergencyCharges;
    }

    // Create target color display with recovery
    const targetColorResult = await this.errorRecovery.recoverUIElement(
      'targetColor',
      () => this.uiElementFactory!.createTargetColorDisplay(
        layout.targetColor.x,
        layout.targetColor.y,
        layout.targetColor.width
      )
    );
    if (targetColorResult) {
      this.uiElements.targetColor = targetColorResult;
    }

    // Apply initial layout
    if (this.layoutManager) {
      this.layoutManager.updateElementPositions(this.uiElements, layout);
    }

    uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIComponentsWithRecovery', 'UI components creation with recovery completed', {
      elementsCreated: Object.keys(this.uiElements).length,
      header: !!this.uiElements.header,
      score: !!this.uiElements.score,
      timer: !!this.uiElements.timer,
      slowMoCharges: !!this.uiElements.slowMoCharges,
      targetColor: !!this.uiElements.targetColor
    });
  }

  /**
   * Attempt UI recovery when primary creation fails
   */
  private async attemptUIRecovery(): Promise<void> {
    uiLogger.log(LogLevel.WARN, 'UIScene', 'attemptUIRecovery', 'Attempting UI recovery after primary creation failure');

    if (!this.errorRecovery || !this.layoutManager) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'attemptUIRecovery', 'Error recovery system not available, falling back to legacy system');
      this.createUIWithFallback();
      return;
    }

    try {
      // Calculate layout for recovery
      const layout = this.layoutManager.calculateLayout(this.scale.width, this.scale.height);

      // Attempt complete UI system recovery
      const recoveredUI = await this.errorRecovery.recoverUISystem(layout);

      if (recoveredUI) {
        this.uiElements = recoveredUI;
        
        // Initialize UpdateHandler with recovered UI
        this.updateHandler = new UpdateHandler(this, this.uiElements);
        
        uiLogger.log(LogLevel.INFO, 'UIScene', 'attemptUIRecovery', 'UI recovery successful');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Log recovered UI state
        this.logUIElementsState();
      } else {
        throw new Error('UI recovery failed');
      }

    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'attemptUIRecovery', 'UI recovery failed, falling back to legacy system', undefined, error instanceof Error ? error : undefined);
      
      // Final fallback to legacy system
      this.createUIWithFallback();
    }
  }

  /**
   * Create UI using FallbackRenderer as last resort
   */
  private async createUIWithFallbackRenderer(layout: LayoutConfig): Promise<void> {
    try {
      uiLogger.log(LogLevel.WARN, 'UIScene', 'createUIWithFallbackRenderer', 'Creating UI with FallbackRenderer as last resort');
      
      const { FallbackRenderer } = await import('../utils/FallbackRenderer');
      const fallbackRenderer = new FallbackRenderer(this);
      
      // Create UI with comprehensive fallback handling
      this.uiElements = await fallbackRenderer.createUIWithFontFallback(layout);
      
      // Initialize UpdateHandler with fallback UI elements
      this.updateHandler = new UpdateHandler(this, this.uiElements);
      uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIWithFallbackRenderer', 'UpdateHandler initialized with fallback UI');
      
      uiLogger.log(LogLevel.INFO, 'UIScene', 'createUIWithFallbackRenderer', 'UI successfully created with FallbackRenderer');
    } catch (fallbackError) {
      uiLogger.log(LogLevel.CRITICAL, 'UIScene', 'createUIWithFallbackRenderer', 'Even FallbackRenderer failed - complete UI creation failure', undefined, fallbackError instanceof Error ? fallbackError : undefined);
      throw new Error('Complete UI creation failure - all fallback methods exhausted');
    }
  }

  private createUIWithFallback(): void {
    try {
      console.log('UIScene: Attempting to create text-based UI...');
      console.log('UIScene: Font API available:', !!document.fonts);
      this.createHUD();
      this.setupLayout();
      console.log('UIScene: Text-based UI created successfully');
      this.logUIElementsState();
    } catch (error) {
      console.warn('UIScene: Text UI creation failed, using graphics fallback:', error);
      try {
        // Clear any partially created elements
        console.log('UIScene: Clearing partially created elements...');
        this.children.removeAll(true);

        // Create graphics-only UI
        console.log('UIScene: Creating graphics-only UI...');
        this.createGraphicsOnlyHUD();
        this.setupLayout();
        console.log('UIScene: Graphics-only UI created successfully');
        this.logUIElementsState();
      } catch (fallbackError) {
        console.error('UIScene: Even graphics fallback failed:', fallbackError);
        // Create minimal UI as last resort
        console.log('UIScene: Creating minimal UI as last resort...');
        this.createMinimalUI();
        this.logUIElementsState();
      }
    }
  }

  private createMinimalUI(): void {
    console.log('UIScene: Creating minimal UI as last resort...');
    const { width, height } = this.scale;

    // Create a very obvious test element first
    const testRect = this.add.rectangle(width / 2, height / 2, 200, 100, 0xFF0000, 1);
    testRect.setDepth(10000);
    console.log('UIScene: Emergency test rectangle created at center');

    // Just create the header background and basic elements
    this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.8).setOrigin(0, 0);
    this.headerBg.setDepth(1000);

    // Simple score indicator - make it very visible
    this.scoreContainer = this.add.container(20, 30);
    const scoreCircle = this.add.circle(0, 0, 20, 0x3498DB);
    scoreCircle.setDepth(1001);
    this.scoreContainer.add(scoreCircle);
    this.scoreContainer.setDepth(1001);

    // Simple time indicator - make it very visible
    this.timeContainer = this.add.container(width / 2, 30);
    const timeCircle = this.add.circle(0, 0, 20, 0x2ECC71);
    timeCircle.setDepth(1001);
    this.timeContainer.add(timeCircle);
    this.timeContainer.setDepth(1001);

    // Simple target color - make it very visible
    this.targetColorBg = this.add.rectangle(width / 2, 100, 200, 50, 0x000000, 0.8);
    this.targetColorBg.setDepth(1002);
    this.targetColorText = this.add.circle(width / 2, 100, 30, 0xE74C3C) as any;
    (this.targetColorText as any).setDepth(1003);

    console.log('UIScene: Minimal UI created with high visibility');
  }

  private createHUD(): void {
    console.log('UIScene: Starting createHUD...');
    const { width, height } = this.scale;
    console.log('UIScene: Screen dimensions:', width, 'x', height);

    try {
      // Header bar with transparent background - full width
      console.log('UIScene: Creating header background...');
      this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.5).setOrigin(0, 0);
      this.headerBg.setDepth(100); // Ensure it's visible
      console.log('UIScene: Header background created:', this.headerBg.x, this.headerBg.y, this.headerBg.width, this.headerBg.height);

      // Calculate responsive positions and sizes
      const margin = Math.max(20, width * 0.03); // 3% margin, minimum 20px
      const headerY = 30; // Center of header bar
      console.log('UIScene: Layout calculations - margin:', margin, 'headerY:', headerY);

      // Score display (left side) - Text as per Frontend Spec
      console.log('UIScene: Creating score text...');
      this.scoreContainer = this.add.container(margin, headerY);
      this.scoreContainer.setDepth(101); // Ensure it's above background
      console.log('UIScene: Score container created at:', this.scoreContainer.x, this.scoreContainer.y);

      const scoreText = this.add.text(0, 0, `Score: ${this.score} | Best: ${this.bestScore}`, {
        fontFamily: 'Arial, sans-serif', // Use Arial for reliability
        fontSize: '24px',
        fontStyle: 'normal',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5);
      scoreText.setDepth(102);
      console.log('UIScene: Score text created:', scoreText.text);

      this.scoreContainer.add(scoreText);
      console.log('UIScene: Score text added to container, container children:', this.scoreContainer.list.length);

      // Time display (center) - Text as per Frontend Spec
      console.log('UIScene: Creating time text...');
      this.timeContainer = this.add.container(width / 2, headerY);
      this.timeContainer.setDepth(101); // Ensure it's above background
      console.log('UIScene: Time container created at:', this.timeContainer.x, this.timeContainer.y);

      const timeText = this.add.text(0, 0, 'Time: 0:00', {
        fontFamily: 'Arial, sans-serif', // Use Arial for reliability
        fontSize: '24px',
        fontStyle: 'normal',
        color: '#FFFFFF'
      }).setOrigin(0.5, 0.5);
      timeText.setDepth(102);
      console.log('UIScene: Time text created:', timeText.text);

      this.timeContainer.add(timeText);
      console.log('UIScene: Time text added to container, container children:', this.timeContainer.list.length);

      // Slow-mo charges (right side) - Clock icons as per Frontend Spec
      console.log('UIScene: Creating slow-mo charges...');
      const chargeSpacing = 35; // Fixed spacing for clock icons
      const chargeStartX = width - margin - 60; // Start from right edge with margin
      console.log('UIScene: Charge layout - startX:', chargeStartX, 'spacing:', chargeSpacing);

      for (let i = 0; i < 3; i++) {
        const chargeX = chargeStartX - (i * chargeSpacing);
        console.log('UIScene: Creating charge', i, 'at x:', chargeX);

        // Clock icon background circle
        const charge = this.add
          .circle(chargeX, headerY, 15, 0xECF0F1)
          .setStrokeStyle(2, 0x3498DB);
        charge.setDepth(101);
        console.log('UIScene: Charge circle created at:', charge.x, charge.y);

        // Clock hands - simple clock icon
        const hourHand = this.add.line(chargeX, headerY, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
        const minuteHand = this.add.line(chargeX, headerY, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);
        hourHand.setDepth(102);
        minuteHand.setDepth(102);
        console.log('UIScene: Clock hands created for charge', i);

        this.slowMoCharges.push(charge);
        this.slowMoClockIcons.push(hourHand, minuteHand);
      }
      console.log('UIScene: All slow-mo charges created, total charges:', this.slowMoCharges.length);



      // Target color display (below header) - Graphics-only approach
      console.log('UIScene: Creating target color display...');
      const targetY = 100; // Below header
      const targetWidth = Math.min(300, width * 0.8); // Max 80% of screen width
      console.log('UIScene: Target color layout - y:', targetY, 'width:', targetWidth);

      this.targetColorBg = this.add.rectangle(width / 2, targetY, targetWidth, 60, 0x000000, 0.8);
      this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);
      this.targetColorBg.setDepth(103);
      console.log('UIScene: Target color background created at:', this.targetColorBg.x, this.targetColorBg.y);

      // Target color text with color name
      const colorName = this.getColorName(this.targetColor);
      console.log('UIScene: Creating target color text with color:', this.targetColor, 'name:', colorName);
      const targetText = this.add.text(width / 2, targetY, `TAP: ${colorName}`, {
        fontFamily: 'Arial, sans-serif', // Use Arial for reliability
        fontSize: '32px',
        fontStyle: 'bold',
        color: this.targetColor
      }).setOrigin(0.5, 0.5);
      targetText.setDepth(104);
      console.log('UIScene: Target color text created:', targetText.text);

      this.targetColorText = targetText;

      // Add subtle pulsing animation
      this.tweens.add({
        targets: [this.targetColorBg, this.targetColorText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });

      console.log('UIScene: createHUD completed successfully');
    } catch (error) {
      console.error('UIScene: Error in createHUD:', error);
      throw error;
    }
  }

  private createGraphicsOnlyHUD(): void {
    const { width } = this.scale;

    // Header bar with transparent background - full width
    this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.5).setOrigin(0, 0);
    this.headerBg.setDepth(100);

    // Calculate responsive positions and sizes
    const margin = Math.max(20, width * 0.03); // 3% margin, minimum 20px
    const headerY = 30; // Center of header bar

    // Score display (left side) - Graphics-only fallback
    this.scoreContainer = this.add.container(margin, headerY);
    this.scoreContainer.setDepth(101);

    // Create score indicator with dots representing score level
    const scoreBg = this.add.rectangle(0, 0, 80, 30, 0x3498DB, 0.8);
    scoreBg.setStrokeStyle(2, 0xFFFFFF, 0.6);
    scoreBg.setDepth(102);

    // Score indicator dots (will update based on score)
    const scoreIndicator = this.add.circle(0, 0, 8, 0xFFFFFF, 1);
    scoreIndicator.setStrokeStyle(2, 0x3498DB, 1);
    scoreIndicator.setDepth(103);

    this.scoreContainer.add(scoreBg);
    this.scoreContainer.add(scoreIndicator);

    // Time display (center) - Graphics-only clock
    this.timeContainer = this.add.container(width / 2, headerY);

    // Clock face
    const timeBg = this.add.circle(0, 0, 18, 0x2ECC71, 0.8);
    timeBg.setStrokeStyle(2, 0xFFFFFF, 0.8);

    // Clock hand (will rotate based on time)
    const timeHand = this.add.line(0, 0, 0, 0, 0, -12, 0xFFFFFF, 1).setLineWidth(2);

    this.timeContainer.add(timeBg);
    this.timeContainer.add(timeHand);

    // Slow-mo charges (right side) - Clock icons as per Frontend Spec
    const chargeSpacing = 35; // Fixed spacing for clock icons
    const chargeStartX = width - margin - 60; // Start from right edge with margin

    for (let i = 0; i < 3; i++) {
      const chargeX = chargeStartX - (i * chargeSpacing);

      // Clock icon background circle
      const charge = this.add
        .circle(chargeX, headerY, 15, 0xECF0F1)
        .setStrokeStyle(2, 0x3498DB);

      // Clock hands - simple clock icon
      const hourHand = this.add.line(chargeX, headerY, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.add.line(chargeX, headerY, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);

      this.slowMoCharges.push(charge);
      this.slowMoClockIcons.push(hourHand, minuteHand);
    }

    // Target color display (below header) - Graphics-only approach
    const targetY = 100; // Below header
    const targetWidth = Math.min(300, width * 0.8); // Max 80% of screen width

    this.targetColorBg = this.add.rectangle(width / 2, targetY, targetWidth, 60, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

    // Large target color circle (visual indicator of what to tap)
    const targetCircle = this.add.circle(width / 2, targetY, 25, parseInt(this.targetColor.replace('#', '0x')));
    targetCircle.setStrokeStyle(4, 0xFFFFFF, 1);

    // Store as text property for compatibility with existing update methods
    this.targetColorText = targetCircle as any;

    // Add subtle pulsing animation
    this.tweens.add({
      targets: [this.targetColorBg, this.targetColorText],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private setupLayout(): void {
    const { width } = this.scale;

    // Update header background to full width
    if (this.headerBg) {
      this.headerBg.setSize(width, 60);
    }

    // Calculate responsive positions and sizes
    const margin = Math.max(20, width * 0.03);
    const headerY = 30;
    const chargeSpacing = 35;

    // Update score container position
    if (this.scoreContainer) {
      this.scoreContainer.setPosition(margin, headerY);
    }

    // Update time container position (center)
    if (this.timeContainer) {
      this.timeContainer.setPosition(width / 2, headerY);
    }

    // Update slow-mo charges positions
    const chargeStartX = width - margin - 60;
    this.slowMoCharges.forEach((charge, index) => {
      const chargeX = chargeStartX - (index * chargeSpacing);
      charge.setPosition(chargeX, headerY);
    });

    // Update clock icon positions
    this.slowMoClockIcons.forEach((icon, index) => {
      const chargeIndex = Math.floor(index / 2);
      const chargeX = chargeStartX - (chargeIndex * chargeSpacing);
      icon.setPosition(chargeX, headerY);
    });

    // Update target color display
    if (this.targetColorBg) {
      const targetWidth = Math.min(300, width * 0.8);
      this.targetColorBg.setPosition(width / 2, 100);
      this.targetColorBg.setSize(targetWidth, 60);
    }

    if (this.targetColorText) {
      this.targetColorText.setPosition(width / 2, 100);
    }
  }

  private updateScore(score: number): void {
    uiLogger.logUIUpdate('score', 'updateScore', { score, previousScore: this.score, bestScore: this.bestScore }, true);
    
    this.score = score;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
      uiLogger.log(LogLevel.INFO, 'UIScene', 'updateScore', 'New best score saved', { newBestScore: this.bestScore });
    }

    // Use UpdateHandler for proper UI state management with error recovery
    if (this.updateHandler) {
      try {
        this.updateHandler.updateScore(this.score, this.bestScore);
        uiLogger.logUIUpdate('score', 'updateScore', { score: this.score, bestScore: this.bestScore }, true);
        return;
      } catch (error) {
        uiLogger.logUIUpdate('score', 'updateScore', { score: this.score, bestScore: this.bestScore }, false, error instanceof Error ? error : undefined);
        uiLogger.log(LogLevel.WARN, 'UIScene', 'updateScore', 'UpdateHandler score update failed, attempting recovery', undefined, error instanceof Error ? error : undefined);
        
        // Attempt to recover score display
        this.recoverScoreDisplay();
      }
    }

    // Legacy fallback system
    if (this.scoreContainer && this.scoreContainer.list[0]) {
      const firstElement = this.scoreContainer.list[0];

      if (firstElement instanceof Phaser.GameObjects.Text) {
        // Text mode
        const scoreText = firstElement as Phaser.GameObjects.Text;
        scoreText.setText(`Score: ${this.score} | Best: ${this.bestScore}`);

        // Change color based on score level for visual feedback
        const color = this.score > 10 ? '#FFD700' : this.score > 5 ? '#2ECC71' : '#FFFFFF';
        scoreText.setColor(color);
      } else if (this.scoreContainer.list[1]) {
        // Graphics mode - update the indicator circle
        const scoreIndicator = this.scoreContainer.list[1] as Phaser.GameObjects.Arc;
        const color = this.score > 10 ? 0xFFD700 : this.score > 5 ? 0x2ECC71 : 0xFFFFFF;
        scoreIndicator.setFillStyle(color);
      }
    }

    // Visual feedback for score change - flash the score container
    if (this.scoreContainer) {
      this.tweens.add({
        targets: this.scoreContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  private updateTime(elapsedTime: number): void {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    uiLogger.logUIUpdate('timer', 'updateTime', { elapsedTime, totalSeconds }, true);

    // Use UpdateHandler for proper UI state management with error recovery
    if (this.updateHandler) {
      try {
        this.updateHandler.updateTime(elapsedTime);
        uiLogger.logUIUpdate('timer', 'updateTime', { elapsedTime }, true);
        return;
      } catch (error) {
        uiLogger.logUIUpdate('timer', 'updateTime', { elapsedTime }, false, error instanceof Error ? error : undefined);
        uiLogger.log(LogLevel.WARN, 'UIScene', 'updateTime', 'UpdateHandler time update failed, attempting recovery', undefined, error instanceof Error ? error : undefined);
        
        // Attempt to recover timer display
        this.recoverTimerDisplay();
      }
    }

    // Legacy fallback system
    if (this.timeContainer && this.timeContainer.list[0]) {
      const firstElement = this.timeContainer.list[0];

      if (firstElement instanceof Phaser.GameObjects.Text) {
        // Text mode
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const timeText = firstElement as Phaser.GameObjects.Text;
        timeText.setText(`Time: ${timeString}`);
      } else if (this.timeContainer.list[1]) {
        // Graphics mode - rotate the clock hand
        const timeHand = this.timeContainer.list[1] as Phaser.GameObjects.Line;
        const rotation = (totalSeconds * 6) * (Math.PI / 180); // 6 degrees per second
        timeHand.setRotation(rotation);
      }
    }
  }

  private updateTargetColor(color: GameColor): void {
    console.log('UIScene: updateTargetColor called with:', color);
    this.targetColor = color;

    // Use UpdateHandler for proper UI state management
    if (this.updateHandler) {
      try {
        this.updateHandler.updateTargetColor(color);
        return;
      } catch (error) {
        console.warn('UIScene: UpdateHandler target color update failed, using fallback:', error);
      }
    }

    // Legacy fallback system
    if (this.targetColorText) {
      if (this.targetColorText instanceof Phaser.GameObjects.Text) {
        // Text mode
        const colorName = this.getColorName(color);
        this.targetColorText.setText(`TAP: ${colorName}`);
        this.targetColorText.setColor(color);
      } else {
        // Graphics mode - update circle color
        const targetCircle = this.targetColorText as any;
        if (targetCircle.setFillStyle) {
          targetCircle.setFillStyle(parseInt(color.replace('#', '0x')));
        }
      }

      // Flash effect when color changes
      this.tweens.add({
        targets: this.targetColorText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
    }

    // Update background border color to match target color
    if (this.targetColorBg) {
      this.targetColorBg.setStrokeStyle(3, parseInt(color.replace('#', '0x')), 0.9);
    }
  }

  private updateSlowMoCharges(charges: number): void {
    console.log('UIScene: updateSlowMoCharges called with:', charges);

    // Use UpdateHandler for proper UI state management
    if (this.updateHandler) {
      try {
        this.updateHandler.updateSlowMoCharges(charges);
        return;
      } catch (error) {
        console.warn('UIScene: UpdateHandler slow-mo charges update failed, using fallback:', error);
      }
    }

    // Legacy fallback system
    console.log('UIScene: Using legacy slow-mo charges update, total charges available:', this.slowMoCharges.length);
    this.slowMoCharges.forEach((charge, index) => {
      if (index < charges) {
        // Active charge - bright and pulsing
        charge.fillColor = 0xECF0F1; // Active - Shimmering White
        charge.setAlpha(1.0);
        charge.setStrokeStyle(2, 0x3498DB, 1.0); // Bright blue outline

        // Add subtle pulsing animation to active charges
        this.tweens.add({
          targets: charge,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      } else {
        // Inactive charge - dimmed and static
        charge.fillColor = 0x95A5A6; // Inactive - Mid Grey
        charge.setAlpha(0.4);
        charge.setStrokeStyle(2, 0x7F8C8D, 0.6); // Dim grey outline

        // Stop any pulsing animation
        this.tweens.killTweensOf(charge);
        charge.setScale(1.0);
      }
    });

    // If a charge was just used, create a brief flash effect
    if (charges < 3) {
      const usedChargeIndex = charges; // The charge that was just used
      if (usedChargeIndex < this.slowMoCharges.length) {
        const usedCharge = this.slowMoCharges[usedChargeIndex];

        if (usedCharge) {
          // Brief blue flash effect
          this.tweens.add({
            targets: usedCharge,
            alpha: 0.1,
            duration: 150,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
              usedCharge.setAlpha(0.4); // Set to inactive alpha
            }
          });
        }
      }
    }
  }



  private getBestScore(): number {
    return parseInt(localStorage.getItem('colorRushBestScore') || '0');
  }

  private saveBestScore(score: number): void {
    localStorage.setItem('colorRushBestScore', score.toString());
  }

  // Public methods for GameScene to call
  public setScore(score: number): void {
    console.log('UIScene: setScore called with:', score);
    this.events.emit('updateScore', score);
  }

  public setTime(elapsedTime: number): void {
    console.log('UIScene: setTime called with:', elapsedTime);
    this.events.emit('updateTime', elapsedTime);
  }

  public setTargetColor(color: GameColor): void {
    console.log('UIScene: setTargetColor called with:', color);
    this.events.emit('updateTargetColor', color);
  }

  public setSlowMoCharges(charges: number): void {
    console.log('UIScene: setSlowMoCharges called with:', charges);
    this.events.emit('updateSlowMoCharges', charges);
  }

  /**
   * Log the current state of all UI elements for debugging
   */
  private logUIElementsState(): void {
    console.log('UIScene: UI Elements State:');
    console.log('  - headerBg:', this.headerBg ? 'created' : 'null', this.headerBg?.visible ? 'visible' : 'hidden');
    console.log('  - scoreContainer:', this.scoreContainer ? 'created' : 'null', this.scoreContainer?.visible ? 'visible' : 'hidden');
    console.log('  - timeContainer:', this.timeContainer ? 'created' : 'null', this.timeContainer?.visible ? 'visible' : 'hidden');
    console.log('  - targetColorBg:', this.targetColorBg ? 'created' : 'null', this.targetColorBg?.visible ? 'visible' : 'hidden');
    console.log('  - targetColorText:', this.targetColorText ? 'created' : 'null', this.targetColorText?.visible ? 'visible' : 'hidden');
    console.log('  - slowMoCharges count:', this.slowMoCharges.length);
    console.log('  - slowMoClockIcons count:', this.slowMoClockIcons.length);
    console.log('  - Scene children count:', this.children.length);

    if (this.scoreContainer) {
      console.log('  - scoreContainer position:', this.scoreContainer.x, this.scoreContainer.y);
      console.log('  - scoreContainer children:', this.scoreContainer.list.length);
    }
    if (this.timeContainer) {
      console.log('  - timeContainer position:', this.timeContainer.x, this.timeContainer.y);
      console.log('  - timeContainer children:', this.timeContainer.list.length);
    }
    if (this.targetColorBg) {
      console.log('  - targetColorBg position:', this.targetColorBg.x, this.targetColorBg.y);
      console.log('  - targetColorBg size:', this.targetColorBg.width, this.targetColorBg.height);
    }

    // Check if elements are within screen bounds
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;
    console.log('  - Screen bounds:', screenWidth, 'x', screenHeight);

    if (this.scoreContainer) {
      const inBounds = this.scoreContainer.x >= 0 && this.scoreContainer.x <= screenWidth &&
        this.scoreContainer.y >= 0 && this.scoreContainer.y <= screenHeight;
      console.log('  - scoreContainer in bounds:', inBounds);
    }

    if (this.timeContainer) {
      const inBounds = this.timeContainer.x >= 0 && this.timeContainer.x <= screenWidth &&
        this.timeContainer.y >= 0 && this.timeContainer.y <= screenHeight;
      console.log('  - timeContainer in bounds:', inBounds);
    }
  }

  /**
   * Force all UI elements to be visible and on top
   */
  public forceShowUI(): void {
    console.log('UIScene: forceShowUI called - making all elements visible and on top');

    // Set high depth for all UI elements to ensure they're on top
    const uiDepth = 1000;

    if (this.headerBg) {
      this.headerBg.setVisible(true).setDepth(uiDepth);
      console.log('UIScene: Header background forced visible');
    }
    if (this.scoreContainer) {
      this.scoreContainer.setVisible(true).setDepth(uiDepth + 1);
      console.log('UIScene: Score container forced visible');
    }
    if (this.timeContainer) {
      this.timeContainer.setVisible(true).setDepth(uiDepth + 1);
      console.log('UIScene: Time container forced visible');
    }
    if (this.targetColorBg) {
      this.targetColorBg.setVisible(true).setDepth(uiDepth + 2);
      console.log('UIScene: Target color background forced visible');
    }
    if (this.targetColorText) {
      this.targetColorText.setVisible(true).setDepth(uiDepth + 3);
      console.log('UIScene: Target color text forced visible');
    }

    // Set visibility and depth for slow-mo charges
    this.slowMoCharges.forEach((charge) => {
      if (charge) {
        charge.setVisible(true).setDepth(uiDepth + 1);
      }
    });

    // Set visibility and depth for slow-mo clock icons
    this.slowMoClockIcons.forEach((icon) => {
      if (icon) {
        icon.setVisible(true).setDepth(uiDepth + 2);
      }
    });

    console.log('UIScene: All UI elements forced visible with high depth');
    this.logUIElementsState();
  }

  /**
   * Show or hide the entire UI scene
   */
  public setVisible(visible: boolean): void {
    uiLogger.log(LogLevel.DEBUG, 'UIScene', 'setVisible', 'Setting UI visibility', { visible });

    // Set visibility for all UI containers
    if (this.headerBg) {
      this.headerBg.setVisible(visible);
    }
    if (this.scoreContainer) {
      this.scoreContainer.setVisible(visible);
    }
    if (this.timeContainer) {
      this.timeContainer.setVisible(visible);
    }
    if (this.targetColorBg) {
      this.targetColorBg.setVisible(visible);
    }
    if (this.targetColorText) {
      this.targetColorText.setVisible(visible);
    }

    // Set visibility for slow-mo charges
    this.slowMoCharges.forEach(charge => {
      if (charge) {
        charge.setVisible(visible);
      }
    });

    // Set visibility for slow-mo clock icons
    this.slowMoClockIcons.forEach(icon => {
      if (icon) {
        icon.setVisible(visible);
      }
    });

    uiLogger.log(LogLevel.DEBUG, 'UIScene', 'setVisible', 'UI visibility update completed', { visible });
  }

  /**
   * Recover score display when update fails
   */
  private async recoverScoreDisplay(): Promise<void> {
    if (!this.errorRecovery || !this.layoutManager) return;

    try {
      uiLogger.log(LogLevel.INFO, 'UIScene', 'recoverScoreDisplay', 'Attempting to recover score display');
      
      const layout = this.layoutManager.calculateLayout(this.scale.width, this.scale.height);
      
      const recoveredScore = await this.errorRecovery.recoverUIElement(
        'scoreDisplay',
        () => this.uiElementFactory!.createScoreDisplay(layout.score.x, layout.score.y)
      );

      if (recoveredScore) {
        this.uiElements.score = recoveredScore;
        
        // Reinitialize UpdateHandler
        this.updateHandler = new UpdateHandler(this, this.uiElements);
        
        // Retry the score update
        this.updateHandler.updateScore(this.score, this.bestScore);
        
        uiLogger.log(LogLevel.INFO, 'UIScene', 'recoverScoreDisplay', 'Score display recovery successful');
      }
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'recoverScoreDisplay', 'Score display recovery failed', undefined, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Recover timer display when update fails
   */
  private async recoverTimerDisplay(): Promise<void> {
    if (!this.errorRecovery || !this.layoutManager) return;

    try {
      uiLogger.log(LogLevel.INFO, 'UIScene', 'recoverTimerDisplay', 'Attempting to recover timer display');
      
      const layout = this.layoutManager.calculateLayout(this.scale.width, this.scale.height);
      
      const recoveredTimer = await this.errorRecovery.recoverUIElement(
        'timeDisplay',
        () => this.uiElementFactory!.createTimeDisplay(layout.timer.x, layout.timer.y)
      );

      if (recoveredTimer) {
        this.uiElements.timer = recoveredTimer;
        
        // Reinitialize UpdateHandler
        this.updateHandler = new UpdateHandler(this, this.uiElements);
        
        uiLogger.log(LogLevel.INFO, 'UIScene', 'recoverTimerDisplay', 'Timer display recovery successful');
      }
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'recoverTimerDisplay', 'Timer display recovery failed', undefined, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get error recovery statistics for debugging
   */
  public getRecoveryStats(): any {
    if (!this.errorRecovery) {
      return { error: 'Error recovery system not initialized' };
    }

    return {
      recoveryStats: this.errorRecovery.getRecoveryStats(),
      recentAttempts: this.errorRecovery.getRecentRecoveryAttempts(5),
      fontStatus: uiLogger.getFontStatus(),
      uiCreationHistory: uiLogger.getUICreationHistory()
    };
  }

  /**
   * Force UI recovery for debugging purposes
   */
  public async forceUIRecovery(): Promise<boolean> {
    uiLogger.log(LogLevel.INFO, 'UIScene', 'forceUIRecovery', 'Forcing UI recovery for debugging');
    
    try {
      await this.attemptUIRecovery();
      return true;
    } catch (error) {
      uiLogger.log(LogLevel.ERROR, 'UIScene', 'forceUIRecovery', 'Forced UI recovery failed', undefined, error instanceof Error ? error : undefined);
      return false;
    }
  }
}
