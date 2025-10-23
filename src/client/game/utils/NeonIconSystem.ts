// Neon Icon System for Color Dot Rush - Neon Pulse Theme
// Creates consistent neon-styled icons with glow effects

import { UIColor } from '../../../shared/types/game';

/**
 * Icon types for different use cases
 */
export enum NeonIconType {
  SETTINGS = 'settings',
  SHOP = 'shop',
  PAUSE = 'pause',
  PLAY = 'play',
  BACK = 'back',
  CLOSE = 'close'
}

/**
 * Icon size presets
 */
export enum NeonIconSize {
  SMALL = 'small',   // 24px
  MEDIUM = 'medium', // 32px
  LARGE = 'large',   // 48px
  XLARGE = 'xlarge'  // 64px
}

/**
 * Configuration for neon icons
 */
export interface NeonIconConfig {
  iconType: NeonIconType;
  size: NeonIconSize;
  glowColor?: string;
  intensity?: number;
  interactive?: boolean;
}

/**
 * Neon Icon System - Creates consistent neon-styled icons
 */
export class NeonIconSystem {
  
  /**
   * Get the glow color for an icon type
   */
  private static getGlowColor(iconType: NeonIconType, customColor?: string): string {
    if (customColor) return customColor;
    
    switch (iconType) {
      case NeonIconType.SETTINGS:
        return UIColor.GLOW_WHITE; // White glow for settings
      case NeonIconType.SHOP:
        return UIColor.GLOW_ORANGE; // Plasma Orange glow for shop
      case NeonIconType.PAUSE:
        return UIColor.GLOW_RED; // Warning Red for pause
      case NeonIconType.PLAY:
        return UIColor.GLOW_GREEN; // Volt Green for play
      case NeonIconType.BACK:
        return UIColor.GLOW_BLUE; // Electric Blue for back
      case NeonIconType.CLOSE:
        return UIColor.GLOW_RED; // Warning Red for close
      default:
        return UIColor.GLOW_WHITE;
    }
  }

  /**
   * Get size configuration for an icon size
   */
  private static getSizeConfig(size: NeonIconSize): { width: number; height: number; fontSize: string } {
    switch (size) {
      case NeonIconSize.SMALL:
        return { width: 24, height: 24, fontSize: '16px' };
      case NeonIconSize.MEDIUM:
        return { width: 32, height: 32, fontSize: '20px' };
      case NeonIconSize.LARGE:
        return { width: 48, height: 48, fontSize: '28px' };
      case NeonIconSize.XLARGE:
        return { width: 64, height: 64, fontSize: '36px' };
      default:
        return this.getSizeConfig(NeonIconSize.MEDIUM);
    }
  }

  /**
   * Get the icon symbol/character for an icon type
   */
  public static getIconSymbol(iconType: NeonIconType): string {
    switch (iconType) {
      case NeonIconType.SETTINGS:
        return '⚙️'; // Gear symbol
      case NeonIconType.SHOP:
        return '🛒'; // Shopping cart
      case NeonIconType.PAUSE:
        return '⏸️'; // Pause symbol
      case NeonIconType.PLAY:
        return '▶️'; // Play symbol
      case NeonIconType.BACK:
        return '←'; // Left arrow
      case NeonIconType.CLOSE:
        return '✕'; // X symbol
      default:
        return '?';
    }
  }

  /**
   * Create a neon icon style configuration for DOM elements
   */
  public static createNeonIconStyle(config: NeonIconConfig): {
    fontFamily: string;
    fontWeight: string;
    width: string;
    height: string;
    fontSize: string;
    color: string;
    textAlign: 'center';
    display: string;
    alignItems: string;
    justifyContent: string;
    cursor: string;
    textShadow: string;
    transition: string;
    userSelect: string;
  } {
    const glowColor = this.getGlowColor(config.iconType, config.glowColor);
    const intensity = config.intensity || 0.8;
    const sizeConfig = this.getSizeConfig(config.size);

    return {
      fontFamily: 'Poppins, Arial, sans-serif',
      fontWeight: '600',
      width: `${sizeConfig.width}px`,
      height: `${sizeConfig.height}px`,
      fontSize: sizeConfig.fontSize,
      color: '#FFFFFF',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: config.interactive ? 'pointer' : 'default',
      textShadow: `0 0 10px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, 0 0 20px ${glowColor}${Math.round(intensity * 150).toString(16).padStart(2, '0')}`,
      transition: 'all 0.3s ease',
      userSelect: 'none'
    };
  }

  /**
   * Create CSS for icon hover effects
   */
  public static createIconHoverCSS(iconId: string, config: NeonIconConfig): string {
    const glowColor = this.getGlowColor(config.iconType, config.glowColor);
    const intensity = config.intensity || 0.8;

    return `
      #neon-icon-${iconId}:hover {
        transform: scale(1.1);
        text-shadow: 0 0 15px ${glowColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')}, 
                     0 0 30px ${glowColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')};
      }
      
      #neon-icon-${iconId}:active {
        transform: scale(0.95);
      }
    `;
  }

  /**
   * Inject icon CSS into the document
   */
  public static injectIconCSS(iconId: string, config: NeonIconConfig): void {
    const css = this.createIconHoverCSS(iconId, config);
    
    // Create or update style element
    let styleElement = document.getElementById(`neon-icon-${iconId}-styles`) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = `neon-icon-${iconId}-styles`;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  }

  /**
   * Remove icon CSS from the document
   */
  public static removeIconCSS(iconId: string): void {
    const styleElement = document.getElementById(`neon-icon-${iconId}-styles`);
    if (styleElement) {
      styleElement.remove();
    }
  }
}
