/**
 * DOM-based text rendering system that overlays HTML elements on top of Phaser canvas
 * This avoids Phaser's text rendering issues and provides better font control
 */

import { NeonButtonSystem, NeonButtonConfig } from './NeonButtonSystem';
import { NeonTextEffects, NeonTextConfig, NeonTextEffectType } from './NeonTextEffects';
import { NeonIconSystem, NeonIconConfig } from './NeonIconSystem';

export interface DOMTextStyle {
  fontFamily?: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  textShadow?: string;
  background?: string;
  padding?: string;
  borderRadius?: string;
  boxShadow?: string;
  textTransform?: string;
  letterSpacing?: string;
  backdropFilter?: string;
  border?: string;
  borderColor?: string;
  width?: string | number;
  height?: string | number;
  transition?: string;
  cursor?: string;
  pointerEvents?: string;
  display?: string;
  alignItems?: string;
  justifyContent?: string;
  opacity?: number;
  lineHeight?: string;
  fontSmooth?: string;
  webkitFontSmoothing?: string;
}

export interface GradientTextConfig {
  colors: string[];
  animationDuration?: number;
}

export interface DOMTextElement {
  id: string;
  element: HTMLElement;
  cleanup: () => void;
}

/**
 * DOM Text Renderer for overlay text elements
 */
export class DOMTextRenderer {
  private container: HTMLElement;
  private elements: Map<string, DOMTextElement> = new Map();
  private gameContainer: HTMLElement;

  constructor(gameContainerId: string = 'game-container') {
    this.gameContainer = document.getElementById(gameContainerId) || document.body;
    this.createContainer();
  }

  /**
   * Create the overlay container for DOM text elements
   */
  private createContainer(): void {
    // Remove existing container if it exists
    const existing = document.getElementById('dom-text-overlay');
    if (existing) {
      existing.remove();
    }

    this.container = document.createElement('div');
    this.container.id = 'dom-text-overlay';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow-y: auto;
      overflow-x: hidden;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    `;

    this.gameContainer.appendChild(this.container);
    console.log('DOMTextRenderer: Container created');
  }

  /**
   * Create a DOM text element
   */
  createText(
    id: string,
    text: string,
    x: number,
    y: number,
    style: DOMTextStyle,
    gradient?: GradientTextConfig
  ): DOMTextElement {
    // Remove existing element with same ID
    this.removeText(id);

    const element = document.createElement('div');
    element.id = `dom-text-${id}`;
    element.textContent = text;

    // Apply base styles
    this.applyStyles(element, style);

    // Position the element
    this.positionElement(element, x, y);

    // Apply gradient if specified
    if (gradient) {
      this.applyGradient(element, gradient);
    }

    // Add to container
    this.container.appendChild(element);

    // Force visibility and positioning
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
    element.style.position = 'absolute';
    element.style.zIndex = '5001';

    const domTextElement: DOMTextElement = {
      id,
      element,
      cleanup: () => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };

    this.elements.set(id, domTextElement);
    console.log(`DOMTextRenderer: Created text element "${id}"`);
    
    // Debug: Log element details
    console.log(`DOMTextRenderer: Element "${id}" details:`, {
      id: element.id,
      text: element.textContent,
      position: { x, y },
      styles: {
        left: element.style.left,
        top: element.style.top,
        transform: element.style.transform,
        color: element.style.color,
        fontSize: element.style.fontSize,
        fontFamily: element.style.fontFamily,
        display: element.style.display,
        visibility: element.style.visibility,
        opacity: element.style.opacity,
        zIndex: element.style.zIndex,
        position: element.style.position
      },
      container: {
        width: this.container.style.width,
        height: this.container.style.height,
        position: this.container.style.position,
        zIndex: this.container.style.zIndex,
        overflowY: this.container.style.overflowY
      },
      elementInDOM: document.contains(element),
      elementVisible: element.offsetWidth > 0 && element.offsetHeight > 0
    });

    return domTextElement;
  }

  /**
   * Create a button with DOM text
   */
  createButton(
    id: string,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: DOMTextStyle,
    onClick?: () => void
  ): DOMTextElement {
    // Remove existing element with same ID
    this.removeText(id);

    const element = document.createElement('button');
    element.id = `dom-button-${id}`;
    element.textContent = text;

    // Apply base styles
    this.applyStyles(element, style);

    // Apply button-specific styles
    element.style.cssText += `
      width: ${width}px;
      height: ${height}px;
      border: none;
      cursor: pointer;
      pointer-events: auto;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Position the element (x,y is center point)
    this.positionElement(element, x, y);

    // Add hover effects
    element.addEventListener('mouseenter', () => {
      element.style.transform += ' scale(1.05)';
      element.style.filter = 'brightness(1.1)';
    });

    element.addEventListener('mouseleave', () => {
      element.style.transform = element.style.transform.replace(' scale(1.05)', '');
      element.style.filter = 'brightness(1)';
    });

    element.addEventListener('mousedown', () => {
      element.style.transform += ' scale(0.95)';
    });

    element.addEventListener('mouseup', () => {
      element.style.transform = element.style.transform.replace(' scale(0.95)', '');
    });

    // Add click handler
    if (onClick) {
      element.addEventListener('click', onClick);
    }

    // Add to container
    this.container.appendChild(element);

    const domTextElement: DOMTextElement = {
      id,
      element,
      cleanup: () => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };

    this.elements.set(id, domTextElement);
    console.log(`DOMTextRenderer: Created button element "${id}"`);

    return domTextElement;
  }

  /**
   * Create a neon-styled button with glass morphism and glow effects
   */
  createNeonButton(
    id: string,
    text: string,
    x: number,
    y: number,
    config: NeonButtonConfig,
    onClick?: () => void
  ): DOMTextElement {
    // Remove existing element with same ID
    this.removeText(id);

    const element = document.createElement('button');
    element.id = `dom-button-${id}`;
    element.textContent = text;

    // Get neon button style from NeonButtonSystem
    const style = NeonButtonSystem.createNeonButtonStyle(config);

    // Apply base styles
    this.applyStyles(element, style);

    // Position the element
    this.positionElement(element, x, y);

    // Add to container
    this.container.appendChild(element);

    // Inject CSS for hover/active states
    NeonButtonSystem.injectButtonCSS(id, config.variant);

    // Add click handler
    if (onClick) {
      element.addEventListener('click', onClick);
    }

    const domTextElement: DOMTextElement = {
      id,
      element,
      cleanup: () => {
        // Remove CSS
        NeonButtonSystem.removeButtonCSS(id);
        
        // Remove event listeners
        element.removeEventListener('click', onClick!);
        
        // Remove from DOM
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };

    this.elements.set(id, domTextElement);
    console.log(`DOMTextRenderer: Created neon button element "${id}" with variant ${config.variant}`);

    return domTextElement;
  }

  /**
   * Create a neon-styled text element with glow effects
   */
  createNeonText(
    id: string,
    text: string,
    x: number,
    y: number,
    config: NeonTextConfig
  ): DOMTextElement {
    // Remove existing element with same ID
    this.removeText(id);

    const element = document.createElement('div');
    element.id = `dom-text-${id}`;
    element.textContent = text;

    // Get neon text style from NeonTextEffects
    const style = NeonTextEffects.createNeonTextStyle(config);

    // Apply base styles
    this.applyStyles(element, style);

    // Position the element
    this.positionElement(element, x, y);

    // Add to container
    this.container.appendChild(element);

    // Add animation class if needed
    if (config.animation) {
      switch (config.effectType) {
        case NeonTextEffectType.PULSE:
          element.classList.add('neon-pulse');
          break;
        case NeonTextEffectType.SHIMMER:
          element.classList.add('neon-shimmer');
          break;
        case NeonTextEffectType.FADE:
          element.classList.add('neon-fade');
          break;
      }
    }

    // Inject CSS for animations
    NeonTextEffects.injectTextEffectCSS(config);

    const domTextElement: DOMTextElement = {
      id,
      element,
      cleanup: () => {
        // Remove from DOM
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };

    this.elements.set(id, domTextElement);
    console.log(`DOMTextRenderer: Created neon text element "${id}" with effect ${config.effectType}`);

    return domTextElement;
  }

  /**
   * Create a neon-styled icon element with glow effects
   */
  createNeonIcon(
    id: string,
    x: number,
    y: number,
    config: NeonIconConfig,
    onClick?: () => void
  ): DOMTextElement {
    // Remove existing element with same ID
    this.removeText(id);

    const element = document.createElement('div');
    element.id = `neon-icon-${id}`;
    element.textContent = NeonIconSystem.getIconSymbol(config.iconType);

    // Get neon icon style from NeonIconSystem
    const style = NeonIconSystem.createNeonIconStyle(config);

    // Apply base styles
    this.applyStyles(element, style);

    // Position the element
    this.positionElement(element, x, y);

    // Add to container
    this.container.appendChild(element);

    // Inject CSS for hover effects
    NeonIconSystem.injectIconCSS(id, config);

    // Add click handler if interactive
    if (config.interactive && onClick) {
      element.addEventListener('click', onClick);
    }

    const domTextElement: DOMTextElement = {
      id,
      element,
      cleanup: () => {
        // Remove CSS
        NeonIconSystem.removeIconCSS(id);
        
        // Remove event listeners
        if (config.interactive && onClick) {
          element.removeEventListener('click', onClick);
        }
        
        // Remove from DOM
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }
    };

    this.elements.set(id, domTextElement);
    console.log(`DOMTextRenderer: Created neon icon element "${id}" with type ${config.iconType}`);

    return domTextElement;
  }

  /**
   * Apply styles to an element
   */
  private applyStyles(element: HTMLElement, style: DOMTextStyle): void {
    // Use default font family if none provided
    const fontFamily = style.fontFamily || 'Orbitron, Arial, sans-serif';
    
    element.style.cssText += `
      font-family: ${fontFamily};
      font-size: ${style.fontSize};
      font-weight: ${style.fontWeight};
      color: ${style.color};
      text-align: ${style.textAlign};
      position: absolute;
      white-space: nowrap;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      margin: 0;
      padding: 0;
      line-height: 1.2;
    `;

    if (style.textShadow) {
      element.style.textShadow = style.textShadow;
    }

    if (style.background) {
      element.style.background = style.background;
    }

    if (style.padding) {
      element.style.padding = style.padding;
    }

    if (style.borderRadius) {
      element.style.borderRadius = style.borderRadius;
    }

    if (style.boxShadow) {
      element.style.boxShadow = style.boxShadow;
    }

    if (style.textTransform) {
      element.style.textTransform = style.textTransform;
    }

    if (style.letterSpacing) {
      element.style.letterSpacing = style.letterSpacing;
    }

    if (style.backdropFilter) {
      element.style.backdropFilter = style.backdropFilter;
      (element.style as any).webkitBackdropFilter = style.backdropFilter; // Safari support
    }

    if (style.border) {
      element.style.border = style.border;
    }

    if (style.borderColor) {
      element.style.borderColor = style.borderColor;
    }

    if (style.width !== undefined) {
      element.style.width = typeof style.width === 'number' ? `${style.width}px` : style.width;
    }

    if (style.height !== undefined) {
      element.style.height = typeof style.height === 'number' ? `${style.height}px` : style.height;
    }

    if (style.transition) {
      element.style.transition = style.transition;
    }

    if (style.cursor) {
      element.style.cursor = style.cursor;
    }

    if (style.pointerEvents) {
      element.style.pointerEvents = style.pointerEvents;
    }

    if (style.display) {
      element.style.display = style.display;
    }

    if (style.alignItems) {
      element.style.alignItems = style.alignItems;
    }

    if (style.justifyContent) {
      element.style.justifyContent = style.justifyContent;
    }

    if (style.opacity !== undefined) {
      element.style.opacity = style.opacity.toString();
    }

    if (style.lineHeight) {
      element.style.lineHeight = style.lineHeight;
    }

    if (style.fontSmooth) {
      (element.style as any).fontSmooth = style.fontSmooth;
    }

    if (style.webkitFontSmoothing) {
      (element.style as any).webkitFontSmoothing = style.webkitFontSmoothing;
    }
  }

  /**
   * Position an element (x,y represents the center point)
   */
  private positionElement(element: HTMLElement, x: number, y: number): void {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transform = 'translate(-50%, -50%)';
    element.style.position = 'absolute';
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.opacity = '1';
  }

  /**
   * Apply gradient animation to text
   */
  private applyGradient(element: HTMLElement, gradient: GradientTextConfig): void {
    if (gradient.colors.length === 0) return;

    const duration = gradient.animationDuration || 4000;
    
    // Create CSS gradient animation
    const gradientStops = gradient.colors.map((color, index) => {
      const percentage = (index / (gradient.colors.length - 1)) * 100;
      return `${color} ${percentage}%`;
    }).join(', ');

    element.style.background = `linear-gradient(45deg, ${gradientStops})`;
    element.style.backgroundSize = '200% 200%';
    element.style.webkitBackgroundClip = 'text';
    element.style.backgroundClip = 'text';
    element.style.webkitTextFillColor = 'transparent';
    element.style.color = 'transparent';

    // Add animation
    const animationName = `gradient-${Date.now()}`;
    const keyframes = `
      @keyframes ${animationName} {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;

    // Inject keyframes
    const style = document.createElement('style');
    style.textContent = keyframes;
    document.head.appendChild(style);

    element.style.animation = `${animationName} ${duration}ms ease-in-out infinite`;
  }

  /**
   * Update text content
   */
  updateText(id: string, text: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.element.textContent = text;
    }
  }

  /**
   * Update element position
   */
  updatePosition(id: string, x: number, y: number): void {
    const element = this.elements.get(id);
    if (element) {
      this.positionElement(element.element, x, y);
    }
  }

  /**
   * Show/hide element
   */
  setVisible(id: string, visible: boolean): void {
    const element = this.elements.get(id);
    if (element) {
      element.element.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Remove a text element
   */
  removeText(id: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.cleanup();
      this.elements.delete(id);
      console.log(`DOMTextRenderer: Removed text element "${id}"`);
    }
  }

  /**
   * Clear all text elements
   */
  clear(): void {
    this.elements.forEach((element) => {
      element.cleanup();
    });
    this.elements.clear();
    console.log('DOMTextRenderer: Cleared all text elements');
  }

  /**
   * Update container size (call when game resizes)
   */
  updateSize(width: number, height: number): void {
    if (this.container) {
      this.container.style.width = `${width}px`;
      this.container.style.height = `${height}px`;
    }
  }

  /**
   * Destroy the renderer and clean up all elements
   */
  destroy(): void {
    this.clear();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    console.log('DOMTextRenderer: Destroyed');
  }

  /**
   * Get element by ID
   */
  getElement(id: string): DOMTextElement | undefined {
    return this.elements.get(id);
  }

  /**
   * Check if element exists
   */
  hasElement(id: string): boolean {
    return this.elements.has(id);
  }

  /**
   * Force refresh all elements to ensure they're visible
   */
  forceRefresh(): void {
    this.elements.forEach((element) => {
      const el = element.element;
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.position = 'absolute';
      el.style.zIndex = '5001';
    });
    console.log('DOMTextRenderer: Force refreshed all elements');
  }

  /**
   * Get container element for debugging
   */
  getContainer(): HTMLElement {
    return this.container;
  }
}
