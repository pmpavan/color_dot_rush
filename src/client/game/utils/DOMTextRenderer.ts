/**
 * DOM-based text rendering system that overlays HTML elements on top of Phaser canvas
 * This avoids Phaser's text rendering issues and provides better font control
 */

export interface DOMTextStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  textShadow?: string;
  background?: string;
  padding?: string;
  borderRadius?: string;
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
      overflow: hidden;
      margin: 0;
      padding: 0;
      box-sizing: border-box;
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
   * Apply styles to an element
   */
  private applyStyles(element: HTMLElement, style: DOMTextStyle): void {
    element.style.cssText += `
      font-family: ${style.fontFamily};
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
  }

  /**
   * Position an element (x,y represents the center point)
   */
  private positionElement(element: HTMLElement, x: number, y: number): void {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.transform = 'translate(-50%, -50%)';
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
}
