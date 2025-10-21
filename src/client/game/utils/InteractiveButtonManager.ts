/**
 * InteractiveButtonManager for Color Dot Rush Splash Screen
 * Manages unified button creation with Phaser GameObjects, interactive areas, and state management
 */

import * as Phaser from 'phaser';
import { ButtonType } from './ResponsiveLayoutManager';

export enum ButtonState {
  NORMAL = 'normal',
  HOVER = 'hover',
  PRESSED = 'pressed',
  DISABLED = 'disabled'
}

export interface ButtonConfig {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  textColor: number;
  fontSize: number;
  fontWeight: string;
  onClick: () => void;
  buttonType: ButtonType;
}

export interface InteractiveButton {
  id: string;
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  state: ButtonState;
  config: ButtonConfig;
  bounds: Phaser.Geom.Rectangle;
}

export interface IButtonManager {
  createButton(config: ButtonConfig): InteractiveButton;
  updateButtonLayout(button: InteractiveButton, bounds: Phaser.Geom.Rectangle): void;
  enableInteractions(): void;
  disableInteractions(): void;
  hideButtons(): void;
  showButtons(): void;
  setLoadingState(isLoading: boolean): void;
  prepareForTransition(): void;
  handleTransitionComplete(): void;
  getButton(id: string): InteractiveButton | undefined;
  getAllButtons(): InteractiveButton[];
  destroyButton(id: string): void;
  destroy(): void;
}

export class InteractiveButtonManager implements IButtonManager {
  private scene: Phaser.Scene;
  private buttons: Map<string, InteractiveButton> = new Map();
  private isInLoadingState: boolean = false;
  private interactionsEnabled: boolean = true;
  private fontFamily: string;
  private loadingIndicator: Phaser.GameObjects.Container | null = null;

  // Animation constants
  private readonly HOVER_SCALE = 1.05;
  private readonly PRESS_SCALE = 0.95;
  private readonly ANIMATION_DURATION = 150;
  private readonly PRESS_DURATION = 100;

  constructor(scene: Phaser.Scene, fontFamily: string) {
    this.scene = scene;
    this.fontFamily = fontFamily;
  }

  /**
   * Create a new interactive button with unified Phaser GameObjects
   */
  public createButton(config: ButtonConfig): InteractiveButton {
    // Create background rectangle
    const background = this.scene.add.rectangle(
      config.x, 
      config.y, 
      config.width, 
      config.height, 
      config.backgroundColor, 
      1
    );

    // Add border styling based on button type
    if (config.buttonType === ButtonType.PRIMARY) {
      background.setStrokeStyle(3, 0xFFFFFF, 0.9);
    } else {
      background.setStrokeStyle(2, 0xFFFFFF, 0.7);
    }

    // Create text element
    const text = this.scene.add.text(config.x, config.y, config.text, {
      fontFamily: this.fontFamily,
      fontSize: `${config.fontSize}px`,
      fontStyle: config.fontWeight,
      color: `#${config.textColor.toString(16).padStart(6, '0')}`,
      align: 'center'
    });
    text.setOrigin(0.5, 0.5);

    // Create container to group background and text
    const container = this.scene.add.container(0, 0);
    container.add([background, text]);

    // Calculate interactive bounds (slightly larger than visual for better touch targets)
    const bounds = new Phaser.Geom.Rectangle(
      config.x - config.width / 2,
      config.y - config.height / 2,
      config.width,
      config.height
    );

    // Create button object
    const button: InteractiveButton = {
      id: config.id,
      container,
      background,
      text,
      state: ButtonState.NORMAL,
      config: { ...config },
      bounds
    };

    // Set up interactive area and event handlers
    this.setupButtonInteractions(button);

    // Store button
    this.buttons.set(config.id, button);

    return button;
  }

  /**
   * Set up interactive area and event handlers for a button
   */
  private setupButtonInteractions(button: InteractiveButton): void {
    const { container, config, bounds } = button;

    // Set interactive area using the bounds
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        bounds.x,
        bounds.y,
        bounds.width,
        bounds.height
      ),
      Phaser.Geom.Rectangle.Contains
    );

    // Pointer over (hover start)
    container.on('pointerover', () => {
      if (!this.interactionsEnabled || this.isInLoadingState || button.state === ButtonState.DISABLED) {
        return;
      }
      this.changeButtonState(button, ButtonState.HOVER);
    });

    // Pointer out (hover end)
    container.on('pointerout', () => {
      if (!this.interactionsEnabled || this.isInLoadingState || button.state === ButtonState.DISABLED) {
        return;
      }
      this.changeButtonState(button, ButtonState.NORMAL);
    });

    // Pointer down (press start)
    container.on('pointerdown', () => {
      if (!this.interactionsEnabled || this.isInLoadingState || button.state === ButtonState.DISABLED) {
        return;
      }
      this.changeButtonState(button, ButtonState.PRESSED);
      
      // Disable button to prevent multiple clicks
      container.disableInteractive();
      
      // Execute click handler after animation
      this.scene.time.delayedCall(this.PRESS_DURATION, () => {
        try {
          config.onClick();
        } catch (error) {
          console.error(`Error executing button click handler for ${button.id}:`, error);
          // Re-enable button on error
          if (this.interactionsEnabled && !this.isInLoadingState) {
            container.setInteractive();
          }
        }
      });
    });

    // Pointer up (press end)
    container.on('pointerup', () => {
      if (!this.interactionsEnabled || this.isInLoadingState || button.state === ButtonState.DISABLED) {
        return;
      }
      // Return to hover state if still over button
      this.changeButtonState(button, ButtonState.HOVER);
    });
  }

  /**
   * Change button state with appropriate animations
   */
  private changeButtonState(button: InteractiveButton, newState: ButtonState): void {
    if (button.state === newState) {
      return;
    }

    button.state = newState;

    // Stop any existing animations
    this.scene.tweens.killTweensOf([button.container, button.background, button.text]);

    switch (newState) {
      case ButtonState.NORMAL:
        this.animateToNormalState(button);
        break;
      case ButtonState.HOVER:
        this.animateToHoverState(button);
        break;
      case ButtonState.PRESSED:
        this.animateToPressedState(button);
        break;
      case ButtonState.DISABLED:
        this.animateToDisabledState(button);
        break;
    }
  }

  /**
   * Animate button to normal state with synchronized restoration
   */
  private animateToNormalState(button: InteractiveButton): void {
    // Synchronized container scaling back to normal
    this.scene.tweens.add({
      targets: button.container,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: this.ANIMATION_DURATION,
      ease: 'Power2.easeOut'
    });

    // Synchronized background color restoration
    const originalColor = button.config.backgroundColor;
    const currentColor = button.background.fillColor;
    
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.ANIMATION_DURATION,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const interpolatedColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(currentColor),
          Phaser.Display.Color.IntegerToColor(originalColor),
          1,
          progress
        );
        button.background.setFillStyle(Phaser.Display.Color.GetColor(interpolatedColor.r, interpolatedColor.g, interpolatedColor.b));
      }
    });

    // Remove text glow effect
    button.text.setStyle({
      ...button.text.style,
      shadow: undefined
    });
  }

  /**
   * Animate button to hover state with synchronized background and text animations
   */
  private animateToHoverState(button: InteractiveButton): void {
    // Synchronized container scaling
    this.scene.tweens.add({
      targets: button.container,
      scaleX: this.HOVER_SCALE,
      scaleY: this.HOVER_SCALE,
      duration: this.ANIMATION_DURATION,
      ease: 'Power2.easeOut'
    });

    // Synchronized background color brightening
    const originalColor = button.config.backgroundColor;
    const brighterColor = this.brightenColor(originalColor, 0.2);
    
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.ANIMATION_DURATION,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(originalColor),
          Phaser.Display.Color.IntegerToColor(brighterColor),
          1,
          progress
        );
        button.background.setFillStyle(Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b));
      }
    });

    // Synchronized text glow effect
    button.text.setStyle({
      ...button.text.style,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#FFFFFF',
        blur: 8,
        stroke: false,
        fill: true
      }
    });
  }

  /**
   * Animate button to pressed state with synchronized press feedback
   */
  private animateToPressedState(button: InteractiveButton): void {
    // Synchronized container scaling for press effect
    this.scene.tweens.add({
      targets: button.container,
      scaleX: this.PRESS_SCALE,
      scaleY: this.PRESS_SCALE,
      duration: this.PRESS_DURATION,
      ease: 'Power2.easeOut'
    });

    // Synchronized background darkening for press feedback
    const originalColor = button.config.backgroundColor;
    const darkerColor = this.darkenColor(originalColor, 0.3);
    
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: this.PRESS_DURATION,
      ease: 'Power2.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const currentColor = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(originalColor),
          Phaser.Display.Color.IntegerToColor(darkerColor),
          1,
          progress
        );
        button.background.setFillStyle(Phaser.Display.Color.GetColor(currentColor.r, currentColor.g, currentColor.b));
      }
    });

    // Synchronized text scaling for tactile feedback
    this.scene.tweens.add({
      targets: button.text,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: this.PRESS_DURATION,
      ease: 'Power2.easeOut',
      yoyo: true
    });
  }

  /**
   * Animate button to disabled state
   */
  private animateToDisabledState(button: InteractiveButton): void {
    // Fade out and disable interactions
    this.scene.tweens.add({
      targets: button.container,
      alpha: 0.5,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: this.ANIMATION_DURATION,
      ease: 'Power2.easeOut'
    });
    button.container.disableInteractive();
  }

  /**
   * Update button layout with new bounds
   */
  public updateButtonLayout(button: InteractiveButton, bounds: Phaser.Geom.Rectangle): void {
    // Update button bounds
    button.bounds = bounds;

    // Update positions
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    button.background.setPosition(centerX, centerY);
    button.text.setPosition(centerX, centerY);

    // Update interactive area
    button.container.input.hitArea.setTo(bounds.x, bounds.y, bounds.width, bounds.height);

    // Update config for consistency
    button.config.x = centerX;
    button.config.y = centerY;
    button.config.width = bounds.width;
    button.config.height = bounds.height;
  }

  /**
   * Enable interactions for all buttons
   */
  public enableInteractions(): void {
    this.interactionsEnabled = true;
    
    this.buttons.forEach(button => {
      if (button.state !== ButtonState.DISABLED && !this.isInLoadingState) {
        button.container.setInteractive();
        button.container.setAlpha(1.0);
      }
    });
  }

  /**
   * Disable interactions for all buttons
   */
  public disableInteractions(): void {
    this.interactionsEnabled = false;
    
    this.buttons.forEach(button => {
      button.container.disableInteractive();
      this.changeButtonState(button, ButtonState.NORMAL);
    });
  }

  /**
   * Hide all buttons
   */
  public hideButtons(): void {
    this.buttons.forEach(button => {
      this.scene.tweens.add({
        targets: button.container,
        alpha: 0,
        duration: 300,
        ease: 'Power2.easeIn',
        onComplete: () => {
          button.container.setVisible(false);
        }
      });
    });
  }

  /**
   * Show all buttons
   */
  public showButtons(): void {
    this.buttons.forEach(button => {
      button.container.setVisible(true);
      button.container.setAlpha(0);
      
      this.scene.tweens.add({
        targets: button.container,
        alpha: 1,
        duration: 300,
        ease: 'Power2.easeOut'
      });
    });
  }

  /**
   * Set loading state for all buttons with visual feedback
   */
  public setLoadingState(isLoading: boolean): void {
    this.isInLoadingState = isLoading;
    
    if (isLoading) {
      this.showLoadingIndicator();
      this.hideButtons();
      this.disableInteractions();
    } else {
      this.hideLoadingIndicator();
      this.showButtons();
      this.enableInteractions();
    }
  }

  /**
   * Show loading indicator with visual feedback
   */
  private showLoadingIndicator(): void {
    if (this.loadingIndicator) {
      return; // Already showing
    }

    // Get screen center for loading indicator
    const { width, height } = this.scene.scale;
    const centerX = width / 2;
    const centerY = height * 0.75; // Below buttons area

    // Create loading container
    this.loadingIndicator = this.scene.add.container(centerX, centerY);

    // Create sophisticated loading spinner
    const spinnerRadius = 30;
    const spinnerThickness = 4;
    const segments = 8;
    const loadingDots: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * spinnerRadius;
      const y = Math.sin(angle) * spinnerRadius;

      const dot = this.scene.add.circle(x, y, spinnerThickness, 0x3498DB);
      
      // Create fading effect - dots further along are more transparent
      const alpha = 1 - (i / segments) * 0.8;
      dot.setAlpha(alpha);

      loadingDots.push(dot);
      this.loadingIndicator.add(dot);
    }

    // Add center pulsing dot
    const centerDot = this.scene.add.circle(0, 0, 6, 0x3498DB, 0.8);
    this.loadingIndicator.add(centerDot);

    // Rotate the spinner
    this.scene.tweens.add({
      targets: this.loadingIndicator,
      rotation: Math.PI * 2,
      duration: 1200,
      repeat: -1,
      ease: 'Linear'
    });

    // Pulse the center dot
    this.scene.tweens.add({
      targets: centerDot,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Fade in the loading indicator
    this.loadingIndicator.setAlpha(0);
    this.scene.tweens.add({
      targets: this.loadingIndicator,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut'
    });
  }

  /**
   * Hide loading indicator
   */
  private hideLoadingIndicator(): void {
    if (!this.loadingIndicator) {
      return;
    }

    // Fade out and destroy
    this.scene.tweens.add({
      targets: this.loadingIndicator,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeIn',
      onComplete: () => {
        if (this.loadingIndicator) {
          // Stop all tweens targeting the loading indicator
          this.scene.tweens.killTweensOf(this.loadingIndicator);
          this.loadingIndicator.destroy();
          this.loadingIndicator = null;
        }
      }
    });
  }

  /**
   * Prepare buttons for scene transition by disabling interactions and showing transition state
   */
  public prepareForTransition(): void {
    this.disableInteractions();
    
    // Add subtle fade effect to indicate transition is starting
    this.buttons.forEach((button) => {
      this.scene.tweens.add({
        targets: button.container,
        alpha: 0.7,
        duration: 200,
        ease: 'Power2.easeOut'
      });
    });
  }

  /**
   * Handle transition completion by restoring button states
   */
  public handleTransitionComplete(): void {
    // Restore button alpha and enable interactions if not in loading state
    if (!this.isInLoadingState) {
      this.buttons.forEach(button => {
        this.scene.tweens.add({
          targets: button.container,
          alpha: 1.0,
          duration: 200,
          ease: 'Power2.easeOut'
        });
      });
      this.enableInteractions();
    }
  }

  /**
   * Get button by ID
   */
  public getButton(id: string): InteractiveButton | undefined {
    return this.buttons.get(id);
  }

  /**
   * Get all buttons
   */
  public getAllButtons(): InteractiveButton[] {
    return Array.from(this.buttons.values());
  }

  /**
   * Destroy a specific button
   */
  public destroyButton(id: string): void {
    const button = this.buttons.get(id);
    if (button) {
      // Stop any running animations
      this.scene.tweens.killTweensOf([button.container, button.background, button.text]);
      
      // Destroy game objects
      button.container.destroy();
      
      // Remove from map
      this.buttons.delete(id);
    }
  }

  /**
   * Brighten a color by a given factor
   */
  private brightenColor(color: number, factor: number): number {
    // Extract RGB components from integer color
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Brighten by increasing RGB values
    const newR = Math.min(255, r + (255 - r) * factor);
    const newG = Math.min(255, g + (255 - g) * factor);
    const newB = Math.min(255, b + (255 - b) * factor);
    
    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Darken a color by a given factor
   */
  private darkenColor(color: number, factor: number): number {
    // Extract RGB components from integer color
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    // Darken by reducing RGB values
    const newR = Math.max(0, r * (1 - factor));
    const newG = Math.max(0, g * (1 - factor));
    const newB = Math.max(0, b * (1 - factor));
    
    return (newR << 16) | (newG << 8) | newB;
  }

  /**
   * Clean up all buttons and resources
   */
  public destroy(): void {
    // Hide and destroy loading indicator
    if (this.loadingIndicator) {
      this.scene.tweens.killTweensOf(this.loadingIndicator);
      this.loadingIndicator.destroy();
      this.loadingIndicator = null;
    }

    // Destroy all buttons
    this.buttons.forEach((_, id) => {
      this.destroyButton(id);
    });
    
    // Clear the map
    this.buttons.clear();
    
    // Reset state
    this.isInLoadingState = false;
    this.interactionsEnabled = true;
  }
}
