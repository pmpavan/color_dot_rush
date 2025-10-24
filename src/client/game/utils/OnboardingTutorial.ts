import { Scene } from 'phaser';
import { OnboardingService, OnboardingStep } from '../../services/OnboardingService';
import { DOMTextRenderer } from './DOMTextRenderer';

/**
 * Onboarding Tutorial Component
 * Displays interactive tutorial steps for first-time users
 */
export class OnboardingTutorial {
  private scene: Scene;
  private domTextRenderer: DOMTextRenderer | null = null;
  private currentStepIndex: number = 0;
  private steps: OnboardingStep[] = [];
  private isActive: boolean = false;
  private stepTimer: Phaser.Time.TimerEvent | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private highlightBox: Phaser.GameObjects.Rectangle | null = null;
  private tutorialContainer: HTMLElement | null = null;
  private demoDots: Phaser.GameObjects.Graphics[] = [];
  private demoDotTweens: Phaser.Tweens.Tween[] = [];

  constructor(scene: Scene, domTextRenderer: DOMTextRenderer) {
    this.scene = scene;
    this.domTextRenderer = domTextRenderer;
    this.steps = OnboardingService.getOnboardingSteps();
  }

  /**
   * Start the onboarding tutorial
   */
  public startTutorial(): void {
    if (this.isActive) {
      console.warn('OnboardingTutorial: Tutorial already active');
      return;
    }

    console.log('OnboardingTutorial: Starting tutorial with', this.steps.length, 'steps');
    this.isActive = true;
    this.currentStepIndex = 0;
    this.createTutorialOverlay();
    this.showCurrentStep();
  }

  /**
   * Skip the tutorial
   */
  public skipTutorial(): void {
    console.log('OnboardingTutorial: Tutorial skipped by user');
    this.endTutorial();
    OnboardingService.markOnboardingCompleted();
  }

  /**
   * End the tutorial
   */
  public endTutorial(): void {
    if (!this.isActive) return;

    console.log('OnboardingTutorial: Ending tutorial');
    this.isActive = false;
    this.cleanup();
    OnboardingService.markOnboardingCompleted();
  }

  /**
   * Create tutorial overlay and container
   */
  private createTutorialOverlay(): void {
    // Create dark overlay
    this.overlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0.7
    );
    this.overlay.setDepth(1000);

    // Create highlight box for elements
    this.highlightBox = this.scene.add.rectangle(0, 0, 100, 100, 0x00ff00, 0.3);
    this.highlightBox.setDepth(1001);
    this.highlightBox.setVisible(false);

    // Create tutorial container
    this.createTutorialContainer();
  }

  /**
   * Create tutorial container with DOM elements
   */
  private createTutorialContainer(): void {
    if (!this.domTextRenderer) return;

    const container = document.createElement('div');
    container.id = 'onboarding-tutorial';
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1002;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      pointer-events: none;
    `;

    // Tutorial content
    const content = document.createElement('div');
    content.id = 'tutorial-content';
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid #00ffff;
      border-radius: 15px;
      padding: 30px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
      pointer-events: auto;
      font-family: 'Orbitron', monospace;
    `;

    // Title
    const title = document.createElement('h2');
    title.id = 'tutorial-title';
    title.style.cssText = `
      color: #00ffff;
      font-size: 24px;
      font-weight: bold;
      margin: 0 0 15px 0;
      text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
    `;

    // Description
    const description = document.createElement('p');
    description.id = 'tutorial-description';
    description.style.cssText = `
      color: #ffffff;
      font-size: 16px;
      line-height: 1.5;
      margin: 0 0 20px 0;
    `;

    // Progress indicator
    const progress = document.createElement('div');
    progress.id = 'tutorial-progress';
    progress.style.cssText = `
      color: #00ffff;
      font-size: 14px;
      margin-bottom: 20px;
    `;

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;

    // Skip button
    const skipButton = document.createElement('button');
    skipButton.id = 'tutorial-skip';
    skipButton.textContent = 'Skip Tutorial';
    skipButton.style.cssText = `
      background: transparent;
      border: 2px solid #ff6b6b;
      color: #ff6b6b;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Orbitron', monospace;
      font-size: 14px;
      transition: all 0.3s ease;
    `;
    skipButton.addEventListener('mouseenter', () => {
      skipButton.style.background = '#ff6b6b';
      skipButton.style.color = '#000';
    });
    skipButton.addEventListener('mouseleave', () => {
      skipButton.style.background = 'transparent';
      skipButton.style.color = '#ff6b6b';
    });
    skipButton.addEventListener('click', () => this.skipTutorial());

    // Next button
    const nextButton = document.createElement('button');
    nextButton.id = 'tutorial-next';
    nextButton.textContent = 'Next';
    nextButton.style.cssText = `
      background: linear-gradient(135deg, #00ffff, #0080ff);
      border: none;
      color: #000;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Orbitron', monospace;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
    `;
    nextButton.addEventListener('mouseenter', () => {
      nextButton.style.transform = 'scale(1.05)';
      nextButton.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.8)';
    });
    nextButton.addEventListener('mouseleave', () => {
      nextButton.style.transform = 'scale(1)';
      nextButton.style.boxShadow = 'none';
    });
    nextButton.addEventListener('click', () => this.nextStep());

    // Assemble the tutorial
    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(progress);
    buttonsContainer.appendChild(skipButton);
    buttonsContainer.appendChild(nextButton);
    content.appendChild(buttonsContainer);
    container.appendChild(content);

    // Add to DOM
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.appendChild(container);
      this.tutorialContainer = container;
    }
  }

  /**
   * Show current step
   */
  private showCurrentStep(): void {
    if (this.currentStepIndex >= this.steps.length) {
      this.endTutorial();
      return;
    }

    const step = this.steps[this.currentStepIndex];
    console.log('OnboardingTutorial: Showing step', this.currentStepIndex + 1, 'of', this.steps.length, ':', step.title);

    // Update tutorial content
    this.updateTutorialContent(step);

    // Create demo dots if specified
    this.createDemoDots(step);

    // Highlight element if specified
    this.highlightElement(step.highlightElement);

    // Auto-advance after duration if specified
    if (step.duration) {
      this.stepTimer = this.scene.time.delayedCall(step.duration, () => {
        this.nextStep();
      });
    }
  }

  /**
   * Update tutorial content
   */
  private updateTutorialContent(step: OnboardingStep): void {
    if (!this.tutorialContainer) return;

    const title = this.tutorialContainer.querySelector('#tutorial-title') as HTMLElement;
    const description = this.tutorialContainer.querySelector('#tutorial-description') as HTMLElement;
    const progress = this.tutorialContainer.querySelector('#tutorial-progress') as HTMLElement;
    const nextButton = this.tutorialContainer.querySelector('#tutorial-next') as HTMLElement;

    if (title) title.textContent = step.title;
    if (description) description.textContent = step.description;
    if (progress) progress.textContent = `Step ${this.currentStepIndex + 1} of ${this.steps.length}`;
    
    // Update next button text for last step
    if (nextButton) {
      nextButton.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Start Game!' : 'Next';
    }
  }

  /**
   * Highlight a specific element
   */
  private highlightElement(elementId?: string): void {
    if (!elementId || !this.highlightBox) return;

    // Find the element in the DOM
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('OnboardingTutorial: Element not found:', elementId);
      return;
    }

    const rect = element.getBoundingClientRect();
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) return;

    const containerRect = gameContainer.getBoundingClientRect();
    
    // Position highlight box
    this.highlightBox.setPosition(
      rect.left - containerRect.left + rect.width / 2,
      rect.top - containerRect.top + rect.height / 2
    );
    this.highlightBox.setSize(rect.width + 20, rect.height + 20);
    this.highlightBox.setVisible(true);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: this.highlightBox,
      alpha: 0.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Move to next step
   */
  private nextStep(): void {
    if (this.stepTimer) {
      this.stepTimer.remove();
      this.stepTimer = null;
    }

    this.currentStepIndex++;
    this.showCurrentStep();
  }

  /**
   * Create demo dots for visual demonstration
   */
  private createDemoDots(step: OnboardingStep): void {
    if (!step.showVisualDemo || !step.demoDots) return;

    this.clearDemoDots();

    step.demoDots.forEach((dotData, index) => {
      const x = dotData.x * this.scene.cameras.main.width;
      const y = dotData.y * this.scene.cameras.main.height;
      
      const dot = this.scene.add.graphics();
      dot.setDepth(1002); // Above overlay but below tutorial container
      
      // Draw dot based on type
      this.drawDemoDot(dot, dotData, x, y);
      
      // Add pulsing animation
      const tween = this.scene.tweens.add({
        targets: dot,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: index * 200 // Stagger the animations
      });
      
      this.demoDots.push(dot);
      this.demoDotTweens.push(tween);
    });
  }

  /**
   * Draw a demo dot based on its type
   */
  private drawDemoDot(graphics: Phaser.GameObjects.Graphics, dotData: any, x: number, y: number): void {
    const radius = 25;
    
    switch (dotData.type) {
      case 'normal':
        // Regular colored dot
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(dotData.color).color);
        graphics.fillCircle(0, 0, radius);
        
        // Add neon glow effect
        graphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(dotData.color).color, 0.8);
        graphics.strokeCircle(0, 0, radius);
        break;
        
      case 'bomb':
        // Bomb with warning symbol
        graphics.fillStyle(0x000000);
        graphics.fillCircle(0, 0, radius);
        graphics.lineStyle(3, 0xff0000, 1);
        graphics.strokeCircle(0, 0, radius);
        
        // Draw warning symbol
        graphics.lineStyle(4, 0xff0000, 1);
        graphics.beginPath();
        graphics.moveTo(0, -radius * 0.6);
        graphics.lineTo(0, radius * 0.6);
        graphics.moveTo(-radius * 0.3, 0);
        graphics.lineTo(radius * 0.3, 0);
        graphics.strokePath();
        break;
        
      case 'slowmo':
        // Slow-motion dot with special effect
        graphics.fillStyle(Phaser.Display.Color.HexStringToColor(dotData.color).color);
        graphics.fillCircle(0, 0, radius);
        
        // Add pulsing ring
        graphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(dotData.color).color, 0.6);
        graphics.strokeCircle(0, 0, radius * 1.3);
        break;
    }
    
    graphics.setPosition(x, y);
  }

  /**
   * Clear all demo dots
   */
  private clearDemoDots(): void {
    // Stop all tweens
    this.demoDotTweens.forEach(tween => {
      if (tween) tween.remove();
    });
    this.demoDotTweens = [];
    
    // Destroy all dots
    this.demoDots.forEach(dot => {
      if (dot) dot.destroy();
    });
    this.demoDots = [];
  }

  /**
   * Cleanup tutorial elements
   */
  private cleanup(): void {
    // Remove timer
    if (this.stepTimer) {
      this.stepTimer.remove();
      this.stepTimer = null;
    }

    // Remove overlay
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    // Remove highlight box
    if (this.highlightBox) {
      this.highlightBox.destroy();
      this.highlightBox = null;
    }

    // Clear demo dots
    this.clearDemoDots();

    // Remove tutorial container
    if (this.tutorialContainer) {
      this.tutorialContainer.remove();
      this.tutorialContainer = null;
    }
  }

  /**
   * Check if tutorial is active
   */
  public getIsActive(): boolean {
    return this.isActive;
  }
}
