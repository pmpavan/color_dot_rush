import { Scene, GameObjects } from 'phaser';

/**
 * Text style configuration interface
 */
export interface TextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  align: string;
  wordWrap?: {
    width: number;
    useAdvancedWrap: boolean;
  };
}

/**
 * Gradient text configuration interface
 */
export interface GradientConfig {
  colors: string[];
  angle: number;
  animationDuration?: number;
}

/**
 * Interface for unified Phaser text rendering
 */
export interface ITextRenderer {
  createTitle(x: number, y: number, text: string, style: TextStyle, gradient?: GradientConfig): GameObjects.Text;
  createButtonText(x: number, y: number, text: string, style: TextStyle): GameObjects.Text;
  updateTextPosition(textObject: GameObjects.Text, x: number, y: number): void;
  createGradientText(x: number, y: number, text: string, style: TextStyle, gradient: GradientConfig): GameObjects.Text;
}

/**
 * Unified Phaser text rendering system that replaces DOM text elements
 * Provides consistent text creation with proper styling and gradient effects
 */
export class PhaserTextRenderer implements ITextRenderer {
  private scene: Scene;
  private fontFamily: string;

  constructor(scene: Scene, fontFamily: string) {
    this.scene = scene;
    this.fontFamily = fontFamily;
  }

  /**
   * Create a title text object with optional gradient effects
   */
  createTitle(x: number, y: number, text: string, style: TextStyle, gradient?: GradientConfig): GameObjects.Text {
    const phaserStyle = this.convertToPhaserStyle(style);
    const textObject = this.scene.add.text(x, y, text, phaserStyle);
    
    textObject.setOrigin(0.5, 0.5); // Center the text
    
    if (gradient) {
      this.applyGradientEffect(textObject, gradient);
    }
    
    return textObject;
  }

  /**
   * Create button text with consistent styling
   */
  createButtonText(x: number, y: number, text: string, style: TextStyle): GameObjects.Text {
    const phaserStyle = this.convertToPhaserStyle(style);
    const textObject = this.scene.add.text(x, y, text, phaserStyle);
    
    textObject.setOrigin(0.5, 0.5); // Center the text
    
    return textObject;
  }

  /**
   * Update text position with proper coordinate handling
   */
  updateTextPosition(textObject: GameObjects.Text, x: number, y: number): void {
    textObject.setPosition(x, y);
  }

  /**
   * Create text with gradient effects using Phaser's built-in capabilities
   */
  createGradientText(x: number, y: number, text: string, style: TextStyle, gradient: GradientConfig): GameObjects.Text {
    const textObject = this.createTitle(x, y, text, style);
    this.applyGradientEffect(textObject, gradient);
    return textObject;
  }

  /**
   * Convert TextStyle interface to Phaser's text style format
   */
  private convertToPhaserStyle(style: TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
    const phaserStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: style.fontFamily || this.fontFamily,
      fontSize: style.fontSize,
      color: style.color,
      align: style.align as 'left' | 'center' | 'right' | 'justify',
    };

    // Handle font weight by converting to CSS font string
    if (style.fontWeight) {
      phaserStyle.fontStyle = style.fontWeight;
    }

    // Handle word wrap if specified
    if (style.wordWrap) {
      phaserStyle.wordWrap = {
        width: style.wordWrap.width,
        useAdvancedWrap: style.wordWrap.useAdvancedWrap
      };
    }

    return phaserStyle;
  }

  /**
   * Apply gradient effects using Phaser's built-in tinting and animation
   * This creates a color-shifting effect similar to CSS gradients
   */
  private applyGradientEffect(textObject: GameObjects.Text, gradient: GradientConfig): void {
    if (gradient.colors.length === 0) return;

    // Convert hex colors to Phaser color integers
    const colors = gradient.colors.map(color => {
      // Remove # if present and convert to integer
      const hex = color.replace('#', '');
      return parseInt(hex, 16);
    });

    // Create color cycling animation
    const duration = gradient.animationDuration || 4000;
    const colorCount = colors.length;
    
    if (colorCount > 1) {
      // Create a timeline for smooth color transitions
      const timeline = this.scene.tweens.createTimeline();
      
      for (let i = 0; i < colorCount; i++) {
        const nextIndex = (i + 1) % colorCount;
        timeline.add({
          targets: textObject,
          tint: colors[nextIndex],
          duration: duration / colorCount,
          ease: 'Sine.easeInOut'
        });
      }
      
      timeline.loop = -1; // Infinite loop
      timeline.play();
    } else {
      // Single color - just apply tint
      textObject.setTint(colors[0]);
    }
  }

  /**
   * Create text with scaling utilities for responsive design
   */
  createScalableText(x: number, y: number, text: string, style: TextStyle, baseScale: number = 1): GameObjects.Text {
    const textObject = this.createButtonText(x, y, text, style);
    textObject.setScale(baseScale);
    return textObject;
  }

  /**
   * Apply hover animation to text object
   */
  animateTextHover(textObject: GameObjects.Text, scale: number = 1.05, duration: number = 150): void {
    this.scene.tweens.add({
      targets: textObject,
      scaleX: scale,
      scaleY: scale,
      duration: duration,
      ease: 'Power2.easeOut'
    });
  }

  /**
   * Apply press animation to text object
   */
  animateTextPress(textObject: GameObjects.Text, scale: number = 0.95, duration: number = 100): void {
    this.scene.tweens.add({
      targets: textObject,
      scaleX: scale,
      scaleY: scale,
      duration: duration,
      ease: 'Power2.easeOut'
    });
  }

  /**
   * Reset text to normal scale
   */
  resetTextScale(textObject: GameObjects.Text, duration: number = 150): void {
    this.scene.tweens.add({
      targets: textObject,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: duration,
      ease: 'Power2.easeOut'
    });
  }

  /**
   * Create text with shadow effect for better readability
   */
  createTextWithShadow(x: number, y: number, text: string, style: TextStyle, shadowOffset: { x: number, y: number } = { x: 2, y: 2 }): GameObjects.Text {
    const phaserStyle = this.convertToPhaserStyle(style);
    
    // Add shadow properties to style
    phaserStyle.shadow = {
      offsetX: shadowOffset.x,
      offsetY: shadowOffset.y,
      color: '#000000',
      blur: 3,
      stroke: false,
      fill: true
    };
    
    const textObject = this.scene.add.text(x, y, text, phaserStyle);
    textObject.setOrigin(0.5, 0.5);
    
    return textObject;
  }
}
