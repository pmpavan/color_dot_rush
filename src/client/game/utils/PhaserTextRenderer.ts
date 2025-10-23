import { Scene, GameObjects } from 'phaser';
import { NeonTextEffects, NeonTextConfig, NeonTextEffectType, NeonTextSize } from './NeonTextEffects';

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
  destroy(): void;
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
    
    // Log initialization and font readiness
    console.log('PhaserTextRenderer: Initialized with font family:', fontFamily);
    this.validateFontReadiness();
  }

  /**
   * Create a title text object with optional gradient effects
   */
  createTitle(x: number, y: number, text: string, style: TextStyle, gradient?: GradientConfig): GameObjects.Text {
    try {
      // Safety check: ensure scene is ready for text creation
      if (!this.scene || !this.scene.add) {
        throw new Error('Scene not ready for text creation');
      }

      const phaserStyle = this.convertToPhaserStyle(style);
      
      // Log font information for debugging
      console.log('PhaserTextRenderer: Creating title with style:', {
        fontFamily: phaserStyle.fontFamily,
        fontSize: phaserStyle.fontSize,
        text: text.substring(0, 20) + (text.length > 20 ? '...' : '')
      });
      
      const textObject = this.scene.add.text(x, y, text, phaserStyle);
      
      textObject.setOrigin(0.5, 0.5); // Center the text
      
      if (gradient) {
        this.applyGradientEffect(textObject, gradient);
      }
      
      return textObject;
      
    } catch (error) {
      console.error('PhaserTextRenderer: Error creating title text:', error);
      
      // Fallback: create text with minimal safe styling
      try {
        const fallbackStyle: Phaser.Types.GameObjects.Text.TextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: style.fontSize,
          color: style.color,
          align: 'center'
        };
        
        const textObject = this.scene.add.text(x, y, text, fallbackStyle);
        textObject.setOrigin(0.5, 0.5);
        
        return textObject;
        
      } catch (fallbackError) {
        console.error('PhaserTextRenderer: Even fallback text creation failed:', fallbackError);
        
        // Last resort: create a simple rectangle as placeholder
        const placeholder = this.scene.add.rectangle(x, y, 200, 50, 0x333333);
        placeholder.setOrigin(0.5, 0.5);
        
        // Return a mock text object that won't break the system
        return placeholder as any;
      }
    }
  }

  /**
   * Create button text with consistent styling
   */
  createButtonText(x: number, y: number, text: string, style: TextStyle): GameObjects.Text {
    try {
      // Safety check: ensure scene is ready for text creation
      if (!this.scene || !this.scene.add) {
        throw new Error('Scene not ready for text creation');
      }

      const phaserStyle = this.convertToPhaserStyle(style);
      
      console.log('PhaserTextRenderer: Creating button text with style:', {
        fontFamily: phaserStyle.fontFamily,
        fontSize: phaserStyle.fontSize,
        text: text
      });
      
      const textObject = this.scene.add.text(x, y, text, phaserStyle);
      
      textObject.setOrigin(0.5, 0.5); // Center the text
      
      return textObject;
      
    } catch (error) {
      console.error('PhaserTextRenderer: Error creating button text:', error);
      
      // Fallback: create text with minimal safe styling
      try {
        const fallbackStyle: Phaser.Types.GameObjects.Text.TextStyle = {
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: style.fontSize,
          color: style.color,
          align: 'center'
        };
        
        const textObject = this.scene.add.text(x, y, text, fallbackStyle);
        textObject.setOrigin(0.5, 0.5);
        
        return textObject;
        
      } catch (fallbackError) {
        console.error('PhaserTextRenderer: Even fallback button text creation failed:', fallbackError);
        
        // Last resort: create a simple rectangle as placeholder
        const placeholder = this.scene.add.rectangle(x, y, 100, 30, 0x666666);
        placeholder.setOrigin(0.5, 0.5);
        
        // Return a mock text object that won't break the system
        return placeholder as any;
      }
    }
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
    try {
      const textObject = this.createTitle(x, y, text, style);
      this.applyGradientEffect(textObject, gradient);
      return textObject;
      
    } catch (error) {
      console.error('PhaserTextRenderer: Error creating gradient text:', error);
      
      // Fallback: create simple text without gradient
      return this.createTitle(x, y, text, style);
    }
  }

  /**
   * Convert TextStyle interface to Phaser's text style format
   */
  private convertToPhaserStyle(style: TextStyle): Phaser.Types.GameObjects.Text.TextStyle {
    // Ensure we have a valid font family with fallbacks
    const safeFontFamily = this.getSafeFontFamily(style.fontFamily || this.fontFamily);
    
    const phaserStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: safeFontFamily,
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
   * Ensure font family string includes proper fallbacks
   */
  private getSafeFontFamily(fontFamily: string): string {
    // If font family already includes fallbacks, use as-is
    if (fontFamily.includes(',')) {
      return fontFamily;
    }
    
    // Add system font fallbacks to prevent font loading issues
    const systemFallbacks = [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'Arial',
      'sans-serif'
    ];
    
    return `${fontFamily}, ${systemFallbacks.join(', ')}`;
  }

  /**
   * Validate that fonts are ready for text creation
   */
  private validateFontReadiness(): boolean {
    try {
      // Check if document.fonts is available and ready
      if (typeof document !== 'undefined' && document.fonts) {
        const fontsReady = document.fonts.status === 'loaded';
        console.log('PhaserTextRenderer: Font readiness check:', {
          status: document.fonts.status,
          ready: fontsReady
        });
        return fontsReady;
      }
      
      // If Font Loading API not available, assume fonts are ready
      console.log('PhaserTextRenderer: Font Loading API not available, assuming fonts ready');
      return true;
      
    } catch (error) {
      console.warn('PhaserTextRenderer: Font readiness check failed:', error);
      return true; // Assume ready to avoid blocking
    }
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

  /**
   * Create a neon-styled text object with glow effects
   */
  createNeonText(x: number, y: number, text: string, config: NeonTextConfig): GameObjects.Text {
    console.log(`PhaserTextRenderer: Creating neon text "${text}" with effect ${config.effectType}`);
    
    // Get neon text style from NeonTextEffects
    const style = NeonTextEffects.createPhaserNeonTextStyle(config);
    
    // Create the text object
    const textObject = this.scene.add.text(x, y, text, style);
    
    // Add animation if enabled
    if (config.animation) {
      this.addNeonAnimation(textObject, config);
    }
    
    // Set depth to ensure proper layering
    textObject.setDepth(1000);
    
    console.log(`PhaserTextRenderer: Created neon text object at (${x}, ${y})`);
    return textObject;
  }

  /**
   * Add neon animation to a text object
   */
  private addNeonAnimation(textObject: GameObjects.Text, config: NeonTextConfig): void {
    switch (config.effectType) {
      case NeonTextEffectType.PULSE:
        this.addPulseAnimation(textObject, config);
        break;
      case NeonTextEffectType.FADE:
        this.addFadeAnimation(textObject, config);
        break;
      case NeonTextEffectType.SHIMMER:
        this.addShimmerAnimation(textObject, config);
        break;
    }
  }

  /**
   * Add pulsing glow animation
   */
  private addPulseAnimation(textObject: GameObjects.Text, config: NeonTextConfig): void {
    const intensity = config.intensity || 0.8;
    const baseBlur = 10 * intensity;
    const maxBlur = 20 * intensity;

    this.scene.tweens.add({
      targets: textObject,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const progress = tween.progress;
        const currentBlur = baseBlur + (maxBlur - baseBlur) * Math.sin(progress * Math.PI);
        textObject.setShadow(0, 0, currentBlur, textObject.style.shadow?.color || '#00BFFF');
      }
    });
  }

  /**
   * Add fade animation
   */
  private addFadeAnimation(textObject: GameObjects.Text, config: NeonTextConfig): void {
    this.scene.tweens.add({
      targets: textObject,
      alpha: 0.7,
      duration: 2500,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Add shimmer animation (simulated with alpha changes)
   */
  private addShimmerAnimation(textObject: GameObjects.Text, config: NeonTextConfig): void {
    this.scene.tweens.add({
      targets: textObject,
      alpha: 0.5,
      duration: 1500,
      ease: 'Power2.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: Math.random() * 1000 // Randomize start time for multiple shimmer texts
    });
  }

  /**
   * Clean up text renderer resources
   */
  destroy(): void {
    console.log('PhaserTextRenderer: Cleaning up resources');
    
    // Clear references to prevent memory leaks
    this.scene = null as any;
    this.fontFamily = '';
  }
}
