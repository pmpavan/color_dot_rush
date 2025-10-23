/**
 * Accessibility Manager for Neon Pulse Theme
 * Provides comprehensive accessibility features including high-contrast mode,
 * shape overlays, reduced motion, and enhanced tap areas
 */

import { Scene } from 'phaser';
import { UIColor } from '../../../shared/types/game';
import { DOMTextRenderer } from './DOMTextRenderer';

export interface AccessibilitySettings {
  highContrastMode: boolean;
  shapeOverlays: boolean;
  reducedMotion: boolean;
  largeTapAreas: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
}

export interface ShapeOverlayConfig {
  type: 'circle' | 'triangle' | 'square' | 'diamond';
  color: number;
  glowColor: number;
  size: number;
  glowRadius: number;
  alpha: number;
}

export class AccessibilityManager {
  private scene: Scene;
  private settings: AccessibilitySettings;
  private shapeOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private accessibilityToggleButton: Phaser.GameObjects.Container | null = null;
  private settingsPanel: Phaser.GameObjects.Container | null = null;
  private isSettingsOpen: boolean = false;
  private domTextRenderer: DOMTextRenderer | null = null;

  // Default accessibility settings
  private static readonly DEFAULT_SETTINGS: AccessibilitySettings = {
    highContrastMode: false,
    shapeOverlays: false,
    reducedMotion: false,
    largeTapAreas: true,
    fontSize: 'normal'
  };

  // Shape mapping for color-blind accessibility
  private static readonly COLOR_SHAPE_MAP = {
    [UIColor.RED]: { type: 'triangle' as const, glowColor: 0xFF0000 },
    [UIColor.BLUE]: { type: 'circle' as const, glowColor: 0x00BFFF },
    [UIColor.GREEN]: { type: 'square' as const, glowColor: 0x00FF00 },
    [UIColor.YELLOW]: { type: 'diamond' as const, glowColor: 0xFFFF00 },
    [UIColor.PURPLE]: { type: 'circle' as const, glowColor: 0x800080 },
    [UIColor.ORANGE]: { type: 'triangle' as const, glowColor: 0xFFA500 }
  };

  constructor(scene: Scene) {
    this.scene = scene;
    this.settings = { ...AccessibilityManager.DEFAULT_SETTINGS };
    this.loadSettings();
    
    // Initialize DOMTextRenderer
    this.domTextRenderer = new DOMTextRenderer('game-container');
    
    this.setupAccessibilityFeatures();
  }

  /**
   * Load accessibility settings from localStorage
   */
  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem('color-rush-accessibility');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.warn('AccessibilityManager: Failed to load settings, using defaults:', error);
    }
  }

  /**
   * Save accessibility settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('color-rush-accessibility', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('AccessibilityManager: Failed to save settings:', error);
    }
  }

  /**
   * Setup initial accessibility features
   */
  private setupAccessibilityFeatures(): void {
    // Apply reduced motion if enabled
    if (this.settings.reducedMotion) {
      this.applyReducedMotion();
    }

    // Create accessibility toggle button - DISABLED
    // this.createAccessibilityToggle();

    // Apply high contrast mode if enabled
    if (this.settings.highContrastMode) {
      this.applyHighContrastMode();
    }
  }

  /**
   * Create accessibility toggle button using DOMTextRenderer
   */
  private createAccessibilityToggle(): void {
    if (!this.domTextRenderer) {
      console.warn('AccessibilityManager: DOMTextRenderer not available');
      return;
    }

    const { width, height } = this.scene.scale;
    const x = width - 60;
    const y = 60;
    
    // Create accessibility toggle button using DOMTextRenderer
    this.domTextRenderer.createButton(
      'accessibility-toggle',
      '♿',
      x,
      y,
      50,
      50,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontWeight: 'normal',
        color: '#00BFFF',
        textAlign: 'center',
        background: 'rgba(30, 30, 30, 0.8)',
        borderRadius: '50%',
        border: '2px solid #00BFFF',
        boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
        cursor: 'pointer',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
      },
      () => this.toggleSettingsPanel()
    );
  }

  /**
   * Toggle accessibility settings panel
   */
  private toggleSettingsPanel(): void {
    if (this.isSettingsOpen) {
      this.hideSettingsPanel();
    } else {
      this.showSettingsPanel();
    }
  }

  /**
   * Show accessibility settings panel using DOMTextRenderer
   */
  private showSettingsPanel(): void {
    if (!this.domTextRenderer) {
      console.warn('AccessibilityManager: DOMTextRenderer not available');
      return;
    }

    const { width, height } = this.scene.scale;
    const x = width - 200;
    const y = 100;
    
    // Create settings panel background
    this.domTextRenderer.createText(
      'accessibility-panel-bg',
      '',
      x,
      y,
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        color: '#FFFFFF',
        textAlign: 'center',
        background: 'rgba(30, 30, 30, 0.95)',
        borderRadius: '8px',
        border: '2px solid #00BFFF',
        boxShadow: '0 0 20px rgba(0, 191, 255, 0.3)',
        width: 180,
        height: 300,
        display: 'block',
        pointerEvents: 'auto'
      }
    );
    
    // Create title
    this.domTextRenderer.createText(
      'accessibility-title',
      'Accessibility',
      x,
      y - 130,
      {
        fontFamily: 'Orbitron, Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#00BFFF',
        textAlign: 'center',
        display: 'block'
      }
    );
    
    // Create settings toggles
    this.createSettingTogglesDOM(x, y);
    
    this.isSettingsOpen = true;
  }

  /**
   * Hide accessibility settings panel
   */
  private hideSettingsPanel(): void {
    if (this.domTextRenderer) {
      this.domTextRenderer.removeText('accessibility-panel-bg');
      this.domTextRenderer.removeText('accessibility-title');
      this.domTextRenderer.removeText('accessibility-toggle-high-contrast');
      this.domTextRenderer.removeText('accessibility-toggle-shape-overlays');
      this.domTextRenderer.removeText('accessibility-toggle-reduced-motion');
      this.domTextRenderer.removeText('accessibility-toggle-large-tap-areas');
    }
    this.isSettingsOpen = false;
  }

  /**
   * Create setting toggle buttons using DOMTextRenderer
   */
  private createSettingTogglesDOM(panelX: number, panelY: number): void {
    if (!this.domTextRenderer) return;

    const settings = [
      { key: 'highContrastMode', label: 'High Contrast', y: -80 },
      { key: 'shapeOverlays', label: 'Shape Overlays', y: -40 },
      { key: 'reducedMotion', label: 'Reduced Motion', y: 0 },
      { key: 'largeTapAreas', label: 'Large Tap Areas', y: 40 }
    ];

    settings.forEach((setting) => {
      const x = panelX;
      const y = panelY + setting.y;
      
      // Create toggle button
      this.domTextRenderer.createButton(
        `accessibility-toggle-${setting.key}`,
        `${this.settings[setting.key as keyof AccessibilitySettings] ? '✓' : '○'} ${setting.label}`,
        x,
        y,
        160,
        30,
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          fontWeight: 'normal',
          color: '#FFFFFF',
          textAlign: 'left',
          background: 'rgba(51, 51, 51, 0.8)',
          borderRadius: '4px',
          border: '1px solid #00BFFF',
          cursor: 'pointer',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '4px 8px',
          transition: 'all 0.2s ease'
        },
        () => {
          this.settings[setting.key as keyof AccessibilitySettings] = !this.settings[setting.key as keyof AccessibilitySettings] as any;
          this.saveSettings();
          this.applyAccessibilitySettings();
          this.createSettingTogglesDOM(panelX, panelY); // Refresh toggles
        }
      );
    });
  }

  /**
   * Create setting toggle buttons (legacy Phaser method - kept for compatibility)
   */
  private createSettingToggles(): Phaser.GameObjects.Container[] {
    const toggles: Phaser.GameObjects.Container[] = [];
    const settings = [
      { key: 'highContrastMode', label: 'High Contrast', y: -80 },
      { key: 'shapeOverlays', label: 'Shape Overlays', y: -40 },
      { key: 'reducedMotion', label: 'Reduced Motion', y: 0 },
      { key: 'largeTapAreas', label: 'Large Tap Areas', y: 40 }
    ];

    settings.forEach((setting, index) => {
      const toggle = this.createToggleButton(setting.key, setting.label, setting.y);
      toggles.push(toggle);
    });

    return toggles;
  }

  /**
   * Create individual toggle button
   */
  private createToggleButton(key: keyof AccessibilitySettings, label: string, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, y);
    
    // Toggle background
    const bg = this.scene.add.rectangle(-60, 0, 20, 20, 0x333333, 0.8);
    bg.setStrokeStyle(1, 0x00BFFF, 0.6);
    
    // Toggle indicator
    const indicator = this.scene.add.circle(-60, 0, 6, 0x00BFFF, 0.8);
    indicator.setVisible(this.settings[key] as boolean);
    
    // Label
    const labelText = this.scene.add.text(-30, 0, label, {
      fontSize: '12px',
      color: '#FFFFFF',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0, 0.5);
    
    container.add([bg, indicator, labelText]);
    container.setSize(120, 25);
    container.setInteractive();
    
    // Toggle functionality
    container.on('pointerdown', () => {
      this.settings[key] = !this.settings[key] as any;
      indicator.setVisible(this.settings[key] as boolean);
      this.saveSettings();
      this.applyAccessibilitySettings();
    });
    
    return container;
  }

  /**
   * Apply accessibility settings
   */
  private applyAccessibilitySettings(): void {
    if (this.settings.highContrastMode) {
      this.applyHighContrastMode();
    } else {
      this.removeHighContrastMode();
    }
    
    if (this.settings.reducedMotion) {
      this.applyReducedMotion();
    } else {
      this.removeReducedMotion();
    }
    
    if (this.settings.largeTapAreas) {
      this.applyLargeTapAreas();
    }
  }

  /**
   * Apply high contrast mode
   */
  private applyHighContrastMode(): void {
    // Inject high contrast CSS
    const styleId = 'accessibility-high-contrast';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      #game-container {
        filter: contrast(150%) brightness(120%);
      }
      
      .high-contrast-text {
        color: #FFFFFF !important;
        text-shadow: 2px 2px 4px #000000 !important;
        background: rgba(0, 0, 0, 0.8) !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
      }
    `;
  }

  /**
   * Remove high contrast mode
   */
  private removeHighContrastMode(): void {
    const styleElement = document.getElementById('accessibility-high-contrast');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Apply reduced motion
   */
  private applyReducedMotion(): void {
    const styleId = 'accessibility-reduced-motion';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
  }

  /**
   * Remove reduced motion
   */
  private removeReducedMotion(): void {
    const styleElement = document.getElementById('accessibility-reduced-motion');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Apply large tap areas
   */
  private applyLargeTapAreas(): void {
    // This is handled by individual UI components
    // Minimum tap area should be 44x44px for accessibility
  }

  /**
   * Create shape overlay for game objects
   */
  createShapeOverlay(objectId: string, x: number, y: number, color: number): void {
    if (!this.settings.shapeOverlays) return;
    
    const shapeConfig = AccessibilityManager.COLOR_SHAPE_MAP[color];
    if (!shapeConfig) return;
    
    // Remove existing overlay
    this.removeShapeOverlay(objectId);
    
    const graphics = this.scene.add.graphics();
    graphics.setDepth(1000); // Ensure overlays are on top
    
    // Create shape based on color
    switch (shapeConfig.type) {
      case 'circle':
        this.createCircleOverlay(graphics, x, y, shapeConfig);
        break;
      case 'triangle':
        this.createTriangleOverlay(graphics, x, y, shapeConfig);
        break;
      case 'square':
        this.createSquareOverlay(graphics, x, y, shapeConfig);
        break;
      case 'diamond':
        this.createDiamondOverlay(graphics, x, y, shapeConfig);
        break;
    }
    
    this.shapeOverlays.set(objectId, graphics);
  }

  /**
   * Create circle overlay
   */
  private createCircleOverlay(graphics: Phaser.GameObjects.Graphics, x: number, y: number, config: any): void {
    const size = 20;
    const glowRadius = 25;
    
    // Outer glow
    graphics.fillStyle(config.glowColor, 0.3);
    graphics.fillCircle(x, y, glowRadius);
    
    // Inner shape
    graphics.fillStyle(config.glowColor, 0.8);
    graphics.fillCircle(x, y, size);
    
    // Border
    graphics.lineStyle(2, config.glowColor, 1);
    graphics.strokeCircle(x, y, size);
  }

  /**
   * Create triangle overlay
   */
  private createTriangleOverlay(graphics: Phaser.GameObjects.Graphics, x: number, y: number, config: any): void {
    const size = 15;
    const glowRadius = 20;
    
    // Outer glow
    graphics.fillStyle(config.glowColor, 0.3);
    graphics.fillCircle(x, y, glowRadius);
    
    // Triangle points
    const points = [
      { x: x, y: y - size },
      { x: x - size, y: y + size },
      { x: x + size, y: y + size }
    ];
    
    // Inner shape
    graphics.fillStyle(config.glowColor, 0.8);
    graphics.fillTriangle(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);
    
    // Border
    graphics.lineStyle(2, config.glowColor, 1);
    graphics.strokeTriangle(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);
  }

  /**
   * Create square overlay
   */
  private createSquareOverlay(graphics: Phaser.GameObjects.Graphics, x: number, y: number, config: any): void {
    const size = 15;
    const glowRadius = 20;
    
    // Outer glow
    graphics.fillStyle(config.glowColor, 0.3);
    graphics.fillCircle(x, y, glowRadius);
    
    // Inner shape
    graphics.fillStyle(config.glowColor, 0.8);
    graphics.fillRect(x - size, y - size, size * 2, size * 2);
    
    // Border
    graphics.lineStyle(2, config.glowColor, 1);
    graphics.strokeRect(x - size, y - size, size * 2, size * 2);
  }

  /**
   * Create diamond overlay
   */
  private createDiamondOverlay(graphics: Phaser.GameObjects.Graphics, x: number, y: number, config: any): void {
    const size = 15;
    const glowRadius = 20;
    
    // Outer glow
    graphics.fillStyle(config.glowColor, 0.3);
    graphics.fillCircle(x, y, glowRadius);
    
    // Diamond points
    const points = [
      { x: x, y: y - size },
      { x: x + size, y: y },
      { x: x, y: y + size },
      { x: x - size, y: y }
    ];
    
    // Inner shape
    graphics.fillStyle(config.glowColor, 0.8);
    graphics.fillPoints(points, true);
    
    // Border
    graphics.lineStyle(2, config.glowColor, 1);
    graphics.strokePoints(points, true);
  }

  /**
   * Remove shape overlay
   */
  removeShapeOverlay(objectId: string): void {
    const overlay = this.shapeOverlays.get(objectId);
    if (overlay) {
      overlay.destroy();
      this.shapeOverlays.delete(objectId);
    }
  }

  /**
   * Update shape overlay position
   */
  updateShapeOverlay(objectId: string, x: number, y: number): void {
    const overlay = this.shapeOverlays.get(objectId);
    if (overlay) {
      overlay.setPosition(x, y);
    }
  }

  /**
   * Get current accessibility settings
   */
  getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  /**
   * Update accessibility settings
   */
  updateSettings(newSettings: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.applyAccessibilitySettings();
  }

  /**
   * Check if high contrast mode is enabled
   */
  isHighContrastMode(): boolean {
    return this.settings.highContrastMode;
  }

  /**
   * Check if shape overlays are enabled
   */
  areShapeOverlaysEnabled(): boolean {
    return this.settings.shapeOverlays;
  }

  /**
   * Check if reduced motion is enabled
   */
  isReducedMotionEnabled(): boolean {
    return this.settings.reducedMotion;
  }

  /**
   * Check if large tap areas are enabled
   */
  areLargeTapAreasEnabled(): boolean {
    return this.settings.largeTapAreas;
  }

  /**
   * Get minimum tap area size
   */
  getMinTapAreaSize(): number {
    return this.settings.largeTapAreas ? 44 : 32;
  }

  /**
   * Clean up accessibility manager
   */
  destroy(): void {
    // Remove all shape overlays
    this.shapeOverlays.forEach(overlay => overlay.destroy());
    this.shapeOverlays.clear();
    
    // Remove UI elements
    if (this.accessibilityToggleButton) {
      this.accessibilityToggleButton.destroy();
    }
    
    if (this.settingsPanel) {
      this.settingsPanel.destroy();
    }
    
    // Clean up DOMTextRenderer elements
    if (this.domTextRenderer) {
      // Accessibility toggle is disabled, so no cleanup needed
      // this.domTextRenderer.removeText('accessibility-toggle');
      this.domTextRenderer.removeText('accessibility-panel-bg');
      this.domTextRenderer.removeText('accessibility-title');
      this.domTextRenderer.removeText('accessibility-toggle-high-contrast');
      this.domTextRenderer.removeText('accessibility-toggle-shape-overlays');
      this.domTextRenderer.removeText('accessibility-toggle-reduced-motion');
      this.domTextRenderer.removeText('accessibility-toggle-large-tap-areas');
    }
    
    // Remove CSS styles
    this.removeHighContrastMode();
    this.removeReducedMotion();
  }
}
