// Neon Text Effects System for Color Dot Rush - Neon Pulse Theme
// Implements neon glow effects, text shadows, and performance-optimized text rendering

import { UIColor } from '../../../shared/types/game';

/**
 * Text effect types for different use cases
 */
export enum NeonTextEffectType {
  GLOW_BLUE = 'glow_blue',       // Electric Blue glow
  GLOW_PINK = 'glow_pink',       // Cyber Pink glow
  GLOW_GREEN = 'glow_green',     // Volt Green glow
  GLOW_ORANGE = 'glow_orange',   // Plasma Orange glow
  GLOW_RED = 'glow_red',         // Warning Red glow
  GLOW_WHITE = 'glow_white',     // Bright white glow
  PULSE = 'pulse',               // Pulsing glow effect
  FADE = 'fade',                 // Fade in/out effect
  SHIMMER = 'shimmer',           // Shimmer effect
  NONE = 'none'                  // No effect
}

/**
 * Text size presets for consistent sizing
 */
export enum NeonTextSize {
  TINY = 'tiny',       // 12px
  SMALL = 'small',     // 14px
  MEDIUM = 'medium',   // 16px
  LARGE = 'large',     // 18px
  XLARGE = 'xlarge',   // 20px
  HUGE = 'huge',       // 24px
  TITLE = 'title',     // 32px
  HERO = 'hero'        // 48px+
}

/**
 * Configuration for neon text effects
 */
export interface NeonTextConfig {
  effectType: NeonTextEffectType;
  size: NeonTextSize;
  intensity?: number;        // 0.1 to 1.0, default 0.8
  animation?: boolean;       // Enable animation, default true
  performance?: 'high' | 'medium' | 'low'; // Performance level, default 'high'
}

/**
 * Neon Text Effects System - Creates consistent neon-styled text with glow effects
 */
export class NeonTextEffects {
  
  /**
   * Get the glow color for a text effect type
   */
  private static getGlowColor(effectType: NeonTextEffectType): string {
    switch (effectType) {
      case NeonTextEffectType.GLOW_BLUE:
        return UIColor.GLOW_BLUE; // #00BFFF
      case NeonTextEffectType.GLOW_PINK:
        return UIColor.GLOW_PINK; // #FF69B4
      case NeonTextEffectType.GLOW_GREEN:
        return UIColor.GLOW_GREEN; // #00FF00
      case NeonTextEffectType.GLOW_ORANGE:
        return UIColor.GLOW_ORANGE; // #FFA500
      case NeonTextEffectType.GLOW_RED:
        return UIColor.GLOW_RED; // #FF0000
      case NeonTextEffectType.GLOW_WHITE:
        return '#FFFFFF';
      default:
        return UIColor.GLOW_BLUE;
    }
  }

  /**
   * Get the text color for a text effect type
   */
  private static getTextColor(effectType: NeonTextEffectType): string {
    // Most neon text uses white for maximum contrast
    return UIColor.TEXT_PRIMARY; // #FFFFFF
  }

  /**
   * Get size configuration for a text size
   */
  private static getSizeConfig(size: NeonTextSize): { fontSize: string; lineHeight: string } {
    switch (size) {
      case NeonTextSize.TINY:
        return { fontSize: '12px', lineHeight: '1.2' };
      case NeonTextSize.SMALL:
        return { fontSize: '14px', lineHeight: '1.3' };
      case NeonTextSize.MEDIUM:
        return { fontSize: '16px', lineHeight: '1.4' };
      case NeonTextSize.LARGE:
        return { fontSize: '18px', lineHeight: '1.4' };
      case NeonTextSize.XLARGE:
        return { fontSize: '20px', lineHeight: '1.3' };
      case NeonTextSize.HUGE:
        return { fontSize: '24px', lineHeight: '1.2' };
      case NeonTextSize.TITLE:
        return { fontSize: '32px', lineHeight: '1.1' };
      case NeonTextSize.HERO:
        return { fontSize: '48px', lineHeight: '1.0' };
      default:
        return this.getSizeConfig(NeonTextSize.MEDIUM);
    }
  }

  /**
   * Create a neon text shadow effect
   */
  public static createTextShadow(config: NeonTextConfig): string {
    if (config.effectType === NeonTextEffectType.NONE) {
      return 'none';
    }

    const glowColor = this.getGlowColor(config.effectType);
    const intensity = config.intensity || 0.8;
    const performance = config.performance || 'high';

    // Adjust shadow complexity based on performance level
    let shadowEffects: string[] = [];

    if (performance === 'high') {
      // High quality: Multiple shadow layers for rich glow
      shadowEffects = [
        `0 0 5px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
        `0 0 10px ${glowColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')}`,
        `0 0 15px ${glowColor}${Math.round(intensity * 150).toString(16).padStart(2, '0')}`,
        `0 0 20px ${glowColor}${Math.round(intensity * 100).toString(16).padStart(2, '0')}`
      ];
    } else if (performance === 'medium') {
      // Medium quality: Two shadow layers
      shadowEffects = [
        `0 0 8px ${glowColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')}`,
        `0 0 16px ${glowColor}${Math.round(intensity * 100).toString(16).padStart(2, '0')}`
      ];
    } else {
      // Low quality: Single shadow layer
      shadowEffects = [
        `0 0 10px ${glowColor}${Math.round(intensity * 150).toString(16).padStart(2, '0')}`
      ];
    }

    return shadowEffects.join(', ');
  }

  /**
   * Create a neon text style configuration for DOM elements
   */
  public static createNeonTextStyle(config: NeonTextConfig): {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    textAlign: 'center';
    textShadow: string;
    textTransform: string;
    letterSpacing: string;
    lineHeight: string;
    fontSmooth: string;
    webkitFontSmoothing: string;
  } {
    const glowColor = this.getGlowColor(config.effectType);
    const textColor = this.getTextColor(config.effectType);
    const sizeConfig = this.getSizeConfig(config.size);
    const textShadow = this.createTextShadow(config);

    return {
      fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
      fontSize: sizeConfig.fontSize,
      fontWeight: '500',
      color: textColor,
      textAlign: 'center',
      textShadow: textShadow,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      lineHeight: sizeConfig.lineHeight,
      fontSmooth: 'antialiased',
      webkitFontSmoothing: 'antialiased'
    };
  }

  /**
   * Create a neon text style configuration for Phaser text objects
   */
  public static createPhaserNeonTextStyle(config: NeonTextConfig): {
    fontFamily: string;
    fontSize: string;
    fontStyle: string;
    color: string;
    align: string;
    stroke: string;
    strokeThickness: number;
    shadow: {
      offsetX: number;
      offsetY: number;
      color: string;
      blur: number;
      fill: boolean;
    };
  } {
    const glowColor = this.getGlowColor(config.effectType);
    const textColor = this.getTextColor(config.effectType);
    const sizeConfig = this.getSizeConfig(config.size);
    const intensity = config.intensity || 0.8;

    return {
      fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
      fontSize: sizeConfig.fontSize,
      fontStyle: 'bold',
      color: textColor,
      align: 'center',
      stroke: glowColor,
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: glowColor,
        blur: Math.round(10 * intensity),
        fill: true
      }
    };
  }

  /**
   * Create CSS animation for pulsing text effect
   */
  public static createPulseAnimation(config: NeonTextConfig): string {
    if (!config.animation || config.effectType === NeonTextEffectType.NONE) {
      return '';
    }

    const glowColor = this.getGlowColor(config.effectType);
    const intensity = config.intensity || 0.8;

    return `
      @keyframes neonPulse {
        0%, 100% {
          text-shadow: 0 0 5px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, 
                       0 0 10px ${glowColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')}, 
                       0 0 15px ${glowColor}${Math.round(intensity * 150).toString(16).padStart(2, '0')};
        }
        50% {
          text-shadow: 0 0 10px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, 
                       0 0 20px ${glowColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')}, 
                       0 0 30px ${glowColor}${Math.round(intensity * 150).toString(16).padStart(2, '0')};
        }
      }
      
      .neon-pulse {
        animation: neonPulse 2s ease-in-out infinite;
      }
    `;
  }

  /**
   * Create CSS animation for shimmer text effect
   */
  public static createShimmerAnimation(config: NeonTextConfig): string {
    if (!config.animation || config.effectType === NeonTextEffectType.NONE) {
      return '';
    }

    const glowColor = this.getGlowColor(config.effectType);

    return `
      @keyframes neonShimmer {
        0% {
          background-position: -200% center;
        }
        100% {
          background-position: 200% center;
        }
      }
      
      .neon-shimmer {
        background: linear-gradient(90deg, 
          transparent 0%, 
          ${glowColor}40 25%, 
          ${glowColor}80 50%, 
          ${glowColor}40 75%, 
          transparent 100%);
        background-size: 200% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        animation: neonShimmer 3s ease-in-out infinite;
      }
    `;
  }

  /**
   * Create CSS animation for fade text effect
   */
  public static createFadeAnimation(config: NeonTextConfig): string {
    if (!config.animation || config.effectType === NeonTextEffectType.NONE) {
      return '';
    }

    return `
      @keyframes neonFade {
        0%, 100% {
          opacity: 0.7;
        }
        50% {
          opacity: 1;
        }
      }
      
      .neon-fade {
        animation: neonFade 2.5s ease-in-out infinite;
      }
    `;
  }

  /**
   * Inject text effect CSS into the document
   */
  public static injectTextEffectCSS(config: NeonTextConfig): void {
    let css = '';

    switch (config.effectType) {
      case NeonTextEffectType.PULSE:
        css = this.createPulseAnimation(config);
        break;
      case NeonTextEffectType.SHIMMER:
        css = this.createShimmerAnimation(config);
        break;
      case NeonTextEffectType.FADE:
        css = this.createFadeAnimation(config);
        break;
    }

    if (css) {
      // Create or update style element
      let styleElement = document.getElementById('neon-text-effects-styles') as HTMLStyleElement;
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'neon-text-effects-styles';
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = css;
    }
  }

  /**
   * Remove text effect CSS from the document
   */
  public static removeTextEffectCSS(): void {
    const styleElement = document.getElementById('neon-text-effects-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }

  /**
   * Get performance-optimized text shadow for low-end devices
   */
  public static getOptimizedTextShadow(config: NeonTextConfig, devicePerformance: 'high' | 'medium' | 'low'): string {
    const optimizedConfig = { ...config, performance: devicePerformance };
    return this.createTextShadow(optimizedConfig);
  }

  /**
   * Check if device supports advanced text effects
   */
  public static supportsAdvancedEffects(): boolean {
    // Check for CSS backdrop-filter support
    const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') || 
                                  CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
    
    // Check for CSS text-shadow support
    const supportsTextShadow = CSS.supports('text-shadow', '0 0 10px red');
    
    return supportsBackdropFilter && supportsTextShadow;
  }

  /**
   * Get fallback text style for unsupported effects
   */
  public static getFallbackTextStyle(config: NeonTextConfig): {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    textAlign: 'center';
    textTransform: string;
    letterSpacing: string;
  } {
    const textColor = this.getTextColor(config.effectType);
    const sizeConfig = this.getSizeConfig(config.size);

    return {
      fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
      fontSize: sizeConfig.fontSize,
      fontWeight: 'bold', // Use bold for better visibility without glow
      color: textColor,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };
  }
}
