// Neon Button System for Color Dot Rush - Neon Pulse Theme
// Implements transparent/frosted glass backgrounds with glowing neon borders

import { DOMTextStyle } from './DOMTextRenderer';
import { UIColor } from '../../../shared/types/game';

/**
 * Button variant types for different use cases
 */
export enum NeonButtonVariant {
  PRIMARY = 'primary',     // Electric Blue - main actions
  SECONDARY = 'secondary', // Cyber Pink - secondary actions  
  TERTIARY = 'tertiary',   // Volt Green - tertiary actions
  QUATERNARY = 'quaternary', // Plasma Orange - quaternary actions
  DANGER = 'danger',       // Warning Red - destructive actions
  SUCCESS = 'success'      // Laser Grid Green - success actions
}

/**
 * Button size presets for consistent sizing
 */
export enum NeonButtonSize {
  SMALL = 'small',     // 32px height, compact padding
  MEDIUM = 'medium',   // 48px height, standard padding
  LARGE = 'large',     // 64px height, generous padding
  XLARGE = 'xlarge'    // 80px height, maximum padding
}

/**
 * Configuration for neon button styling
 */
export interface NeonButtonConfig {
  variant: NeonButtonVariant;
  size: NeonButtonSize;
  width?: number;        // Custom width override
  height?: number;       // Custom height override
  disabled?: boolean;    // Disabled state
  fullWidth?: boolean;   // Full width button
}

/**
 * Neon Button System - Creates consistent neon-styled buttons with glass morphism
 */
export class NeonButtonSystem {
  
  /**
   * Get the base glass morphism background style
   */
  private static getGlassBackground(): string {
    return 'rgba(30, 30, 30, 0.7)'; // Frosted glass background
  }

  /**
   * Get the glass border style with backdrop blur effect
   */
  private static getGlassBorder(): string {
    return '1px solid rgba(255, 255, 255, 0.1)'; // Subtle glass border
  }

  /**
   * Get the backdrop filter for glass morphism effect
   */
  private static getBackdropFilter(): string {
    return 'blur(10px) saturate(180%)'; // Glass morphism effect
  }

  /**
   * Get the neon glow color for a button variant
   */
  private static getNeonGlowColor(variant: NeonButtonVariant): string {
    switch (variant) {
      case NeonButtonVariant.PRIMARY:
        return UIColor.BUTTON_PRIMARY; // Electric Blue #00BFFF
      case NeonButtonVariant.SECONDARY:
        return UIColor.BUTTON_SECONDARY; // Cyber Pink #FF69B4
      case NeonButtonVariant.TERTIARY:
        return UIColor.BUTTON_TERTIARY; // Volt Green #00FF00
      case NeonButtonVariant.QUATERNARY:
        return UIColor.BUTTON_QUATERNARY; // Plasma Orange #FFA500
      case NeonButtonVariant.DANGER:
        return UIColor.BOMB; // Warning Red #FF0000
      case NeonButtonVariant.SUCCESS:
        return UIColor.LASER_GRID; // Laser Grid Green #32CD32
      default:
        return UIColor.BUTTON_PRIMARY;
    }
  }

  /**
   * Get the neon border color for a button variant
   */
  private static getNeonBorderColor(variant: NeonButtonVariant): string {
    return this.getNeonGlowColor(variant);
  }

  /**
   * Get the text color for a button variant
   */
  private static getTextColor(variant: NeonButtonVariant): string {
    // All buttons use white text for consistency
    return UIColor.TEXT_PRIMARY; // #FFFFFF
  }

  /**
   * Get size configuration for a button size
   */
  private static getSizeConfig(size: NeonButtonSize): { height: number; padding: string; fontSize: string } {
    switch (size) {
      case NeonButtonSize.SMALL:
        return {
          height: 32,
          padding: '6px 12px',
          fontSize: '14px'
        };
      case NeonButtonSize.MEDIUM:
        return {
          height: 48,
          padding: '12px 24px',
          fontSize: '16px'
        };
      case NeonButtonSize.LARGE:
        return {
          height: 64,
          padding: '16px 32px',
          fontSize: '18px'
        };
      case NeonButtonSize.XLARGE:
        return {
          height: 80,
          padding: '20px 40px',
          fontSize: '20px'
        };
      default:
        return this.getSizeConfig(NeonButtonSize.MEDIUM);
    }
  }

  /**
   * Create a neon button style configuration
   */
  public static createNeonButtonStyle(config: NeonButtonConfig): DOMTextStyle {
    const glowColor = this.getNeonGlowColor(config.variant);
    const borderColor = this.getNeonBorderColor(config.variant);
    const textColor = this.getTextColor(config.variant);
    const sizeConfig = this.getSizeConfig(config.size);

    // Calculate dimensions
    const width = config.width || (config.fullWidth ? '100%' : 'auto');
    const height = config.height || sizeConfig.height;

    // Create the base style
    const style: DOMTextStyle = {
      fontFamily: 'Orbitron, Arial, sans-serif',
      fontSize: sizeConfig.fontSize,
      fontWeight: '500',
      color: textColor,
      textAlign: 'center',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      
      // Glass morphism background
      background: this.getGlassBackground(),
      backdropFilter: this.getBackdropFilter(),
      
      // Neon border and glow
      border: this.getGlassBorder(),
      borderColor: borderColor,
      borderRadius: '8px',
      boxShadow: `0 0 20px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      
      // Sizing and spacing
      width: width,
      height: height,
      padding: sizeConfig.padding,
      
      // Text effects
      textShadow: `0 0 10px ${glowColor}`,
      
      // Transitions for smooth animations
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      
      // Cursor and interaction
      cursor: config.disabled ? 'not-allowed' : 'pointer',
      pointerEvents: 'auto',
      
      // Layout
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      
      // Disabled state
      opacity: config.disabled ? 0.5 : 1,
    };

    return style;
  }

  /**
   * Get hover state styles for a button variant
   */
  public static getHoverStyles(variant: NeonButtonVariant): string {
    const glowColor = this.getNeonGlowColor(variant);
    
    return `
      background: rgba(30, 30, 30, 0.8);
      box-shadow: 0 0 30px ${glowColor}, 0 0 60px ${glowColor}40, inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
      border-color: ${glowColor};
    `;
  }

  /**
   * Get active/pressed state styles for a button variant
   */
  public static getActiveStyles(variant: NeonButtonVariant): string {
    const glowColor = this.getNeonGlowColor(variant);
    
    return `
      background: rgba(30, 30, 30, 0.9);
      box-shadow: 0 0 15px ${glowColor}, inset 0 2px 4px rgba(0, 0, 0, 0.3);
      transform: translateY(1px);
      border-color: ${glowColor};
    `;
  }

  /**
   * Get disabled state styles
   */
  public static getDisabledStyles(): string {
    return `
      background: rgba(30, 30, 30, 0.3);
      box-shadow: none;
      border-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.4);
      text-shadow: none;
      cursor: not-allowed;
    `;
  }

  /**
   * Create CSS for button hover and active states
   */
  public static createButtonCSS(buttonId: string, variant: NeonButtonVariant): string {
    const hoverStyles = this.getHoverStyles(variant);
    const activeStyles = this.getActiveStyles(variant);
    const disabledStyles = this.getDisabledStyles();

    return `
      #dom-button-${buttonId}:hover:not(:disabled) {
        ${hoverStyles}
      }
      
      #dom-button-${buttonId}:active:not(:disabled) {
        ${activeStyles}
      }
      
      #dom-button-${buttonId}:disabled {
        ${disabledStyles}
      }
      
      #dom-button-${buttonId}:focus {
        outline: 2px solid ${this.getNeonGlowColor(variant)};
        outline-offset: 2px;
      }
    `;
  }

  /**
   * Inject button CSS into the document
   */
  public static injectButtonCSS(buttonId: string, variant: NeonButtonVariant): void {
    const css = this.createButtonCSS(buttonId, variant);
    
    // Create or update style element
    let styleElement = document.getElementById(`neon-button-${buttonId}-styles`) as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = `neon-button-${buttonId}-styles`;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  }

  /**
   * Remove button CSS from the document
   */
  public static removeButtonCSS(buttonId: string): void {
    const styleElement = document.getElementById(`neon-button-${buttonId}-styles`);
    if (styleElement) {
      styleElement.remove();
    }
  }
}
