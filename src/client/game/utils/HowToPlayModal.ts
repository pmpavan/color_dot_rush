/**
 * HowToPlayModal - Modal overlay component for displaying game instructions
 * Integrates with DOMTextRenderer and ResponsiveLayoutManager for consistent presentation
 */

import { IResponsiveLayoutManager } from './ResponsiveLayoutManager';

/**
 * Modal state enumeration for managing display lifecycle
 */
export enum ModalState {
  HIDDEN = 'hidden',
  SHOWING = 'showing',
  VISIBLE = 'visible',
  HIDING = 'hiding'
}

/**
 * Modal configuration interface for styling and layout
 */
export interface ModalConfig {
  maxWidth: number;
  padding: number;
  borderRadius: number;
  backgroundColor: string;
  textColor: string;
  closeButtonSize: number;
  overlayColor: string;
  zIndex: number;
}

/**
 * Content section interface for modal structure
 */
export interface ContentSection {
  id: string;
  title: string;
  content: string;
  icon?: string;
  className?: string;
}

/**
 * Modal layout interface for responsive calculations
 */
export interface ModalLayout {
  containerWidth: number;
  containerHeight: number;
  contentMaxWidth: number;
  fontSize: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
  spacing: {
    sections: number;
    paragraphs: number;
    margins: number;
  };
  closeButton: {
    size: number;
    position: { top: number; right: number };
  };
}

/**
 * Interface for HowToPlayModal implementation
 */
export interface IHowToPlayModal {
  show(): void;
  hide(): void;
  isVisible(): boolean;
  destroy(): void;
  updateLayout(): void;
  getConfig(): ModalConfig;
  getLayout(): ModalLayout;
  getContent(): ContentSection[];
  getState(): ModalState;
}

/**
 * Game instruction content data
 */
const MODAL_CONTENT: ContentSection[] = [
  {
    id: 'objective',
    title: '🎯 Objective',
    content: 'Tap dots that match the Target Color shown at the top. Survive as long as possible!',
    className: 'objective-section'
  },
  {
    id: 'controls',
    title: '👆 Controls',
    content: 'Simply tap or click on the correct colored dots. Avoid tapping wrong colors or bombs!',
    className: 'controls-section'
  },
  {
    id: 'scoring',
    title: '🏆 Scoring',
    content: 'Earn +1 point for each correct tap. The game ends if you tap a wrong color or hit a bomb.',
    className: 'scoring-section'
  },
  {
    id: 'powerups',
    title: '⚡ Power-ups',
    content: 'Collect Slow-Mo charges to slow down time when things get intense. Use them wisely!',
    className: 'powerups-section'
  },
  {
    id: 'tips',
    title: '💡 Tips',
    content: 'Stay focused on the Target Color. The game gets faster over time, so use your Slow-Mo charges strategically!',
    className: 'tips-section'
  }
];

/**
 * Default modal configuration
 */
const DEFAULT_MODAL_CONFIG: ModalConfig = {
  maxWidth: 500,
  padding: 24,
  borderRadius: 12,
  backgroundColor: '#1a1a1a',
  textColor: '#ffffff',
  closeButtonSize: 32,
  overlayColor: 'rgba(0, 0, 0, 0.8)',
  zIndex: 2000
};

/**
 * HowToPlayModal class - Core modal infrastructure for game instructions
 */
export class HowToPlayModal implements IHowToPlayModal {
  private layoutManager: IResponsiveLayoutManager;
  private modalState: ModalState;
  private modalContainer: HTMLElement | null = null;
  private modalConfig: ModalConfig;
  private modalLayout: ModalLayout;
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private resizeHandler: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private timeoutId: number | null = null;
  private isCreating: boolean = false;
  private previousFocusedElement: HTMLElement | null = null;

  constructor(
    layoutManager: IResponsiveLayoutManager
  ) {
    this.layoutManager = layoutManager;
    this.modalState = ModalState.HIDDEN;
    this.modalConfig = { ...DEFAULT_MODAL_CONFIG };
    this.modalLayout = this.calculateModalLayout();

    // Setup resize handler for responsive updates
    this.setupResizeHandler();

    console.log('HowToPlayModal: Initialized with dependencies');
  }

  /**
   * Show the modal overlay with smooth animation
   */
  public show(): void {
    try {
      if (this.modalState === ModalState.VISIBLE || this.modalState === ModalState.SHOWING) {
        console.log('HowToPlayModal: Modal already visible or showing');
        return;
      }

      // Prevent multiple creation attempts
      if (this.isCreating) {
        console.log('HowToPlayModal: Modal creation already in progress');
        return;
      }

      console.log('HowToPlayModal: Showing modal');
      this.modalState = ModalState.SHOWING;

      // Store currently focused element for restoration
      this.previousFocusedElement = document.activeElement as HTMLElement;

      // Create modal if it doesn't exist
      if (!this.modalContainer) {
        this.isCreating = true;
        this.createModal();
        
        // Show loading state if modal creation takes time
        if (this.modalContainer) {
          this.showLoadingState();
        }
        
        this.isCreating = false;
      }

      // Update layout for current screen size
      this.updateLayout();

      // Show the modal with animation
      if (this.modalContainer) {
        // Prevent background scrolling and improve accessibility
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('aria-hidden', 'true');
        
        // Show modal
        this.modalContainer.style.display = 'flex';
        this.modalContainer.setAttribute('aria-hidden', 'false');
        
        // Start with hidden state for animation
        this.modalContainer.style.opacity = '0';
        const contentContainer = this.modalContainer.querySelector('.modal-content') as HTMLElement;
        if (contentContainer) {
          contentContainer.style.transform = 'scale(0.9) translateY(-20px)';
          contentContainer.style.transition = 'all 0.3s ease-out';
        }

        // Trigger animation on next frame (optimized)
        this.animationFrameId = requestAnimationFrame(() => {
          if (this.modalContainer && this.modalState === ModalState.SHOWING) {
            this.modalContainer.style.transition = 'opacity 0.3s ease-out';
            this.modalContainer.style.opacity = '1';
            
            if (contentContainer) {
              contentContainer.style.transform = 'scale(1) translateY(0)';
            }

            // Focus management for accessibility
            this.setInitialFocus();
          }
        });

        // Update state after animation (with cleanup)
        this.timeoutId = window.setTimeout(() => {
          if (this.modalState === ModalState.SHOWING) {
            this.modalState = ModalState.VISIBLE;
            console.log('HowToPlayModal: Modal is now visible');
          }
        }, 300);
      }

    } catch (error) {
      this.isCreating = false;
      console.error('HowToPlayModal: Error showing modal:', error);
      this.handleModalError(error as Error, 'show');
    }
  }

  /**
   * Hide the modal overlay with smooth animation
   */
  public hide(): void {
    try {
      if (this.modalState === ModalState.HIDDEN || this.modalState === ModalState.HIDING) {
        console.log('HowToPlayModal: Modal already hidden or hiding');
        return;
      }

      console.log('HowToPlayModal: Hiding modal');
      this.modalState = ModalState.HIDING;

      // Cancel any pending animations
      this.cancelPendingAnimations();

      // Animate modal out
      if (this.modalContainer) {
        const contentContainer = this.modalContainer.querySelector('.modal-content') as HTMLElement;
        
        // Start hide animation
        this.modalContainer.style.transition = 'opacity 0.2s ease-in';
        this.modalContainer.style.opacity = '0';
        
        if (contentContainer) {
          contentContainer.style.transition = 'all 0.2s ease-in';
          contentContainer.style.transform = 'scale(0.9) translateY(-20px)';
        }

        // Complete hide after animation (with cleanup)
        this.timeoutId = window.setTimeout(() => {
          if (this.modalContainer && this.modalState === ModalState.HIDING) {
            this.modalContainer.style.display = 'none';
            this.modalContainer.setAttribute('aria-hidden', 'true');
            
            // Restore background scrolling and accessibility
            document.body.style.overflow = '';
            document.body.removeAttribute('aria-hidden');
            
            // Restore focus to previously focused element
            this.restoreFocus();
            
            // Update state to hidden
            this.modalState = ModalState.HIDDEN;
            console.log('HowToPlayModal: Modal is now hidden');
          }
        }, 200);
      }

    } catch (error) {
      console.error('HowToPlayModal: Error hiding modal:', error);
      this.handleModalError(error as Error, 'hide');
    }
  }

  /**
   * Check if modal is currently visible
   */
  public isVisible(): boolean {
    return this.modalState === ModalState.VISIBLE || this.modalState === ModalState.SHOWING;
  }

  /**
   * Destroy the modal and clean up resources
   */
  public destroy(): void {
    try {
      console.log('HowToPlayModal: Destroying modal');

      // Cancel any pending animations or timeouts
      this.cancelPendingAnimations();

      // Hide modal first (without animation for immediate cleanup)
      if (this.isVisible()) {
        this.modalState = ModalState.HIDDEN;
      }

      // Remove all event handlers
      this.removeKeyboardHandlers();
      this.removeResizeHandler();

      // Restore document state
      document.body.style.overflow = '';
      document.body.removeAttribute('aria-hidden');

      // Restore focus if needed
      this.restoreFocus();

      // Remove modal container from DOM
      if (this.modalContainer && this.modalContainer.parentNode) {
        this.modalContainer.parentNode.removeChild(this.modalContainer);
      }

      // Reset all state and references for garbage collection
      this.modalContainer = null;
      this.modalState = ModalState.HIDDEN;
      this.keydownHandler = null;
      this.resizeHandler = null;
      this.previousFocusedElement = null;
      this.isCreating = false;

      console.log('HowToPlayModal: Modal destroyed successfully');

    } catch (error) {
      console.error('HowToPlayModal: Error destroying modal:', error);
      this.handleModalError(error as Error, 'destroy');
    }
  }

  /**
   * Setup resize handler for responsive updates
   */
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      if (this.isVisible()) {
        this.updateLayout();
      }
    };

    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  /**
   * Remove resize handler
   */
  private removeResizeHandler(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  /**
   * Cancel any pending animations or timeouts
   */
  private cancelPendingAnimations(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Set initial focus for accessibility
   */
  private setInitialFocus(): void {
    if (!this.modalContainer) return;

    // Focus the close button as the first interactive element
    const closeButton = this.modalContainer.querySelector('.modal-close-button') as HTMLElement;
    if (closeButton) {
      closeButton.focus();
    }
  }

  /**
   * Restore focus to previously focused element
   */
  private restoreFocus(): void {
    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
      try {
        this.previousFocusedElement.focus();
      } catch (error) {
        console.warn('HowToPlayModal: Could not restore focus:', error);
      }
    }
    this.previousFocusedElement = null;
  }

  /**
   * Create the modal DOM structure using DOMTextRenderer
   */
  private createModal(): void {
    try {
      console.log('HowToPlayModal: Creating modal DOM structure');

      // Create modal overlay container with accessibility attributes
      this.modalContainer = document.createElement('div');
      this.modalContainer.id = 'how-to-play-modal';
      this.modalContainer.setAttribute('role', 'dialog');
      this.modalContainer.setAttribute('aria-modal', 'true');
      this.modalContainer.setAttribute('aria-labelledby', 'modal-title');
      this.modalContainer.setAttribute('aria-describedby', 'modal-content');
      this.modalContainer.setAttribute('aria-hidden', 'true');
      this.modalContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: ${this.modalConfig.overlayColor};
        z-index: ${this.modalConfig.zIndex};
        display: none;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Create modal content container
      const contentContainer = this.createContentContainer();
      this.modalContainer.appendChild(contentContainer);

      // Create close button
      const closeButton = this.createCloseButton();
      contentContainer.appendChild(closeButton);

      // Create modal header
      const header = this.createModalHeader();
      contentContainer.appendChild(header);

      // Create content sections
      const sectionsContainer = this.createContentSections();
      contentContainer.appendChild(sectionsContainer);

      // Add click outside to close functionality
      this.setupOutsideClickHandler();

      // Add keyboard event handling
      this.setupKeyboardHandlers();

      // Add to document body
      document.body.appendChild(this.modalContainer);

      console.log('HowToPlayModal: Modal DOM structure created successfully');

    } catch (error) {
      console.error('HowToPlayModal: Error creating modal:', error);
      this.handleModalError(error as Error, 'creation');
    }
  }

  /**
   * Create the main content container
   */
  private createContentContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'modal-content';
    container.id = 'modal-content';
    container.setAttribute('tabindex', '-1');
    container.style.cssText = `
      background: ${this.modalConfig.backgroundColor};
      border-radius: ${this.modalConfig.borderRadius}px;
      max-width: ${this.modalLayout.contentMaxWidth}px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      padding: ${this.modalLayout.spacing.margins}px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      color: ${this.modalConfig.textColor};
      box-sizing: border-box;
      outline: none;
    `;

    return container;
  }

  /**
   * Create the close button
   */
  private createCloseButton(): HTMLElement {
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button';
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close How to Play modal');
    closeButton.setAttribute('title', 'Close (Escape)');
    closeButton.setAttribute('type', 'button');
    closeButton.style.cssText = `
      position: absolute;
      top: ${this.modalLayout.closeButton.position.top}px;
      right: ${this.modalLayout.closeButton.position.right}px;
      width: ${this.modalLayout.closeButton.size}px;
      height: ${this.modalLayout.closeButton.size}px;
      min-width: 44px;
      min-height: 44px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: ${this.modalConfig.textColor};
      font-size: ${this.modalLayout.closeButton.size * 0.6}px;
      font-weight: bold;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 1;
      outline: 2px solid transparent;
      outline-offset: 2px;
    `;

    // Add hover and focus effects
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
      closeButton.style.transform = 'scale(1.1)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
      closeButton.style.transform = 'scale(1)';
    });

    closeButton.addEventListener('focus', () => {
      closeButton.style.outline = '2px solid #ffffff';
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    closeButton.addEventListener('blur', () => {
      closeButton.style.outline = '2px solid transparent';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    // Add click handler
    closeButton.addEventListener('click', () => {
      this.hide();
    });

    return closeButton;
  }

  /**
   * Create the modal header with title
   */
  private createModalHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.style.cssText = `
      text-align: center;
      margin-bottom: ${this.modalLayout.spacing.sections}px;
      padding-right: ${this.modalLayout.closeButton.size + 12}px;
    `;

    const title = document.createElement('h1');
    title.className = 'modal-title';
    title.id = 'modal-title';
    title.textContent = 'How to Play';
    title.style.cssText = `
      font-size: ${this.modalLayout.fontSize.title}px;
      font-weight: bold;
      color: ${this.modalConfig.textColor};
      margin: 0;
      padding: 0;
      line-height: 1.2;
      font-family: 'Poppins', sans-serif;
    `;

    const subtitle = document.createElement('p');
    subtitle.className = 'modal-subtitle';
    subtitle.textContent = 'Color Dot Rush';
    subtitle.style.cssText = `
      font-size: ${this.modalLayout.fontSize.body}px;
      color: rgba(255, 255, 255, 0.7);
      margin: 8px 0 0 0;
      padding: 0;
      font-weight: 400;
      font-family: 'Poppins', sans-serif;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);

    return header;
  }

  /**
   * Create all content sections
   */
  private createContentSections(): HTMLElement {
    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'modal-sections';
    sectionsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: ${this.modalLayout.spacing.sections}px;
    `;

    MODAL_CONTENT.forEach((section) => {
      const sectionElement = this.createContentSection(section);
      sectionsContainer.appendChild(sectionElement);
    });

    return sectionsContainer;
  }

  /**
   * Create a single content section
   */
  private createContentSection(section: ContentSection): HTMLElement {
    const sectionElement = document.createElement('div');
    sectionElement.className = `modal-section ${section.className || ''}`;
    sectionElement.style.cssText = `
      padding: ${this.modalLayout.spacing.paragraphs}px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    // Remove border from last section
    if (section.id === 'tips') {
      sectionElement.style.borderBottom = 'none';
    }

    const heading = document.createElement('h3');
    heading.className = 'section-heading';
    heading.textContent = section.title;
    heading.style.cssText = `
      font-size: ${this.modalLayout.fontSize.heading}px;
      font-weight: 600;
      color: ${this.modalConfig.textColor};
      margin: 0 0 ${this.modalLayout.spacing.paragraphs * 0.5}px 0;
      padding: 0;
      line-height: 1.3;
      font-family: 'Poppins', sans-serif;
    `;

    const content = document.createElement('p');
    content.className = 'section-content';
    content.textContent = section.content;
    content.style.cssText = `
      font-size: ${this.modalLayout.fontSize.body}px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
      padding: 0;
      line-height: 1.5;
      font-weight: 400;
      font-family: 'Poppins', sans-serif;
    `;

    sectionElement.appendChild(heading);
    sectionElement.appendChild(content);

    return sectionElement;
  }

  /**
   * Setup outside click handler to close modal
   */
  private setupOutsideClickHandler(): void {
    if (!this.modalContainer) return;

    this.modalContainer.addEventListener('click', (event) => {
      // Only close if clicking the overlay, not the content
      if (event.target === this.modalContainer) {
        this.hide();
      }
    });
  }

  /**
   * Setup keyboard event handlers
   */
  private setupKeyboardHandlers(): void {
    this.keydownHandler = (event: KeyboardEvent) => {
      if (!this.isVisible()) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          this.hide();
          break;
        case 'Tab':
          this.handleTabNavigation(event);
          break;
      }
    };

    // Add event listener when modal is shown
    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Handle tab navigation within modal for accessibility
   */
  private handleTabNavigation(event: KeyboardEvent): void {
    if (!this.modalContainer) return;

    const focusableElements = this.modalContainer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  /**
   * Remove keyboard event handlers
   */
  private removeKeyboardHandlers(): void {
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  /**
   * Show loading state while modal is being created
   */
  private showLoadingState(): void {
    if (!this.modalContainer) return;

    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'modal-loading';
    loadingOverlay.setAttribute('aria-label', 'Loading instructions');
    loadingOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: ${this.modalConfig.backgroundColor};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      border-radius: ${this.modalConfig.borderRadius}px;
    `;

    const loadingText = document.createElement('div');
    loadingText.textContent = 'Loading instructions...';
    loadingText.style.cssText = `
      color: ${this.modalConfig.textColor};
      font-size: ${this.modalLayout.fontSize.body}px;
      font-family: 'Poppins', sans-serif;
    `;

    loadingOverlay.appendChild(loadingText);
    this.modalContainer.appendChild(loadingOverlay);

    // Remove loading state after a short delay
    setTimeout(() => {
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }, 100);
  }

  /**
   * Handle modal-related errors with graceful degradation
   */
  private handleModalError(error: Error, context: string): void {
    console.error(`HowToPlayModal: ${context} error:`, error);

    // Cancel any pending operations
    this.cancelPendingAnimations();
    this.isCreating = false;

    // Attempt graceful recovery based on context
    switch (context) {
      case 'creation':
        this.modalState = ModalState.HIDDEN;
        this.showFallbackInstructions();
        break;
      case 'show':
        this.modalState = ModalState.HIDDEN;
        // Restore document state
        document.body.style.overflow = '';
        document.body.removeAttribute('aria-hidden');
        this.showFallbackInstructions();
        break;
      case 'hide':
        this.modalState = ModalState.HIDDEN;
        // Force hide without animation
        if (this.modalContainer) {
          this.modalContainer.style.display = 'none';
        }
        document.body.style.overflow = '';
        document.body.removeAttribute('aria-hidden');
        this.restoreFocus();
        break;
      case 'destroy':
        // Force cleanup
        this.modalContainer = null;
        this.modalState = ModalState.HIDDEN;
        this.keydownHandler = null;
        this.resizeHandler = null;
        this.previousFocusedElement = null;
        document.body.style.overflow = '';
        document.body.removeAttribute('aria-hidden');
        break;
      default:
        console.warn('HowToPlayModal: Unknown error context:', context);
    }
  }

  /**
   * Show fallback instructions using browser alert
   */
  private showFallbackInstructions(): void {
    const instructions = `
COLOR DOT RUSH - How to Play:

🎯 Tap dots that match the Target Color
❌ Avoid wrong colors and bombs  
⚡ Use Slow-Mo charges strategically
🏆 Survive as long as possible!

Good luck!
    `.trim();

    alert(instructions);
    console.log('HowToPlayModal: Showed fallback instructions');
  }

  /**
   * Calculate modal layout based on current screen dimensions
   */
  private calculateModalLayout(): ModalLayout {
    const dimensions = this.layoutManager.getCurrentDimensions();
    const isMobile = dimensions.width < 768;
    const isSmallScreen = dimensions.width < 480;

    // Calculate responsive font sizes
    const baseFontSize = isSmallScreen ? 14 : isMobile ? 16 : 18;
    const titleFontSize = isSmallScreen ? 20 : isMobile ? 24 : 28;
    const headingFontSize = isSmallScreen ? 16 : isMobile ? 18 : 20;

    // Calculate content width (80% of screen width, max 500px)
    const contentMaxWidth = Math.min(
      dimensions.width * 0.8,
      this.modalConfig.maxWidth
    );

    // Calculate spacing based on screen size
    const baseSpacing = isSmallScreen ? 12 : isMobile ? 16 : 20;

    return {
      containerWidth: dimensions.width,
      containerHeight: dimensions.height,
      contentMaxWidth,
      fontSize: {
        title: titleFontSize,
        heading: headingFontSize,
        body: baseFontSize,
        small: baseFontSize - 2
      },
      spacing: {
        sections: baseSpacing,
        paragraphs: baseSpacing * 0.75,
        margins: this.modalConfig.padding
      },
      closeButton: {
        size: this.modalConfig.closeButtonSize,
        position: {
          top: 12,
          right: 12
        }
      }
    };
  }

  /**
   * Update modal layout when screen dimensions change
   */
  public updateLayout(): void {
    this.modalLayout = this.calculateModalLayout();
    
    // If modal is visible, update its styling
    if (this.isVisible() && this.modalContainer) {
      this.updateModalStyling();
    }
  }

  /**
   * Update modal styling based on current layout
   */
  private updateModalStyling(): void {
    if (!this.modalContainer) return;

    const contentContainer = this.modalContainer.querySelector('.modal-content') as HTMLElement;
    if (contentContainer) {
      contentContainer.style.maxWidth = `${this.modalLayout.contentMaxWidth}px`;
      contentContainer.style.padding = `${this.modalLayout.spacing.margins}px`;
    }

    // Update font sizes for all text elements
    const titleElement = this.modalContainer.querySelector('.modal-title') as HTMLElement;
    if (titleElement) {
      titleElement.style.fontSize = `${this.modalLayout.fontSize.title}px`;
    }

    const headingElements = this.modalContainer.querySelectorAll('.section-heading');
    headingElements.forEach((element) => {
      (element as HTMLElement).style.fontSize = `${this.modalLayout.fontSize.heading}px`;
    });

    const bodyElements = this.modalContainer.querySelectorAll('.section-content');
    bodyElements.forEach((element) => {
      (element as HTMLElement).style.fontSize = `${this.modalLayout.fontSize.body}px`;
    });
  }

  /**
   * Get current modal configuration
   */
  public getConfig(): ModalConfig {
    return { ...this.modalConfig };
  }

  /**
   * Get current modal layout
   */
  public getLayout(): ModalLayout {
    return { ...this.modalLayout };
  }

  /**
   * Get modal content sections
   */
  public getContent(): ContentSection[] {
    return [...MODAL_CONTENT];
  }

  /**
   * Get current modal state (for debugging/testing)
   */
  public getState(): ModalState {
    return this.modalState;
  }
}
