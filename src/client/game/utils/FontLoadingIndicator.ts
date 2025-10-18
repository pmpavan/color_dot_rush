/**
 * FontLoadingIndicator - Visual feedback for font loading process
 * 
 * Requirements addressed:
 * - 5.4: Provide visual loading indicators during font loading process
 * - 1.5: Display loading indicators during font loading process
 */

import { Scene, GameObjects } from 'phaser';
import { FontPreloader } from './FontPreloader';

export interface LoadingIndicatorConfig {
  x: number;
  y: number;
  radius: number;
  color: number;
  backgroundColor: number;
  showText: boolean;
}

export class FontLoadingIndicator {
  private scene: Scene;
  private config: LoadingIndicatorConfig;
  private container: GameObjects.Container | null = null;
  private progressBar: GameObjects.Graphics | null = null;
  private backgroundCircle: GameObjects.Graphics | null = null;
  private loadingText: GameObjects.Text | null = null;
  private fontPreloader: FontPreloader;
  private updateTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Scene, fontPreloader: FontPreloader, config: Partial<LoadingIndicatorConfig> = {}) {
    this.scene = scene;
    this.fontPreloader = fontPreloader;
    
    this.config = {
      x: scene.scale.width / 2,
      y: scene.scale.height * 0.85,
      radius: 20,
      color: 0x3498DB, // Bright Blue
      backgroundColor: 0x34495E, // Dark Grey
      showText: true,
      ...config
    };
  }

  /**
   * Create and show the loading indicator
   */
  public create(): void {
    if (this.container) {
      this.destroy(); // Clean up existing indicator
    }

    this.container = this.scene.add.container(this.config.x, this.config.y);

    // Create background circle
    this.backgroundCircle = this.scene.add.graphics();
    this.backgroundCircle.fillStyle(this.config.backgroundColor, 0.8);
    this.backgroundCircle.fillCircle(0, 0, this.config.radius);
    this.backgroundCircle.lineStyle(2, 0xFFFFFF, 0.3);
    this.backgroundCircle.strokeCircle(0, 0, this.config.radius);
    this.container.add(this.backgroundCircle);

    // Create progress indicator
    this.progressBar = this.scene.add.graphics();
    this.container.add(this.progressBar);

    // Create loading text if enabled
    if (this.config.showText) {
      this.loadingText = this.scene.add.text(0, this.config.radius + 15, 'Loading fonts...', {
        fontSize: '14px',
        color: '#ECF0F1',
        fontFamily: 'system-ui, -apple-system, sans-serif', // Use system fonts for loading text
        align: 'center'
      });
      this.loadingText.setOrigin(0.5);
      this.container.add(this.loadingText);
    }

    // Start update timer
    this.startUpdateTimer();

    // Initial update
    this.updateProgress();

    console.log('FontLoadingIndicator: Created loading indicator');
  }

  /**
   * Start the update timer to refresh progress
   */
  private startUpdateTimer(): void {
    this.updateTimer = this.scene.time.addEvent({
      delay: 50, // Update every 50ms for smooth animation
      callback: this.updateProgress,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Update the progress indicator based on font loading status
   */
  private updateProgress(): void {
    if (!this.container || !this.progressBar) {
      return;
    }

    const indicators = this.fontPreloader.getLoadingIndicators();
    
    // Clear previous progress drawing
    this.progressBar.clear();

    if (indicators.isLoading) {
      // Draw progress arc
      const progress = indicators.progress / 100;
      const startAngle = -Math.PI / 2; // Start at top
      const endAngle = startAngle + (progress * Math.PI * 2);

      this.progressBar.lineStyle(3, this.config.color, 1);
      this.progressBar.beginPath();
      this.progressBar.arc(0, 0, this.config.radius - 2, startAngle, endAngle);
      this.progressBar.strokePath();

      // Add a subtle pulsing effect
      const pulseScale = 1 + Math.sin(this.scene.time.now * 0.005) * 0.05;
      this.container.setScale(pulseScale);

      // Update text
      if (this.loadingText) {
        this.loadingText.setText(indicators.message);
      }

    } else {
      // Loading complete - show completion state
      if (indicators.progress === 100) {
        // Draw complete circle
        this.progressBar.lineStyle(3, this.fontPreloader.isUsingFallback() ? 0xF39C12 : 0x27AE60, 1);
        this.progressBar.strokeCircle(0, 0, this.config.radius - 2);

        // Update text
        if (this.loadingText) {
          const message = this.fontPreloader.isUsingFallback() ? 
            'Using system fonts' : 
            'Fonts ready!';
          this.loadingText.setText(message);
          
          // Change text color based on status
          const textColor = this.fontPreloader.isUsingFallback() ? '#F39C12' : '#27AE60';
          this.loadingText.setColor(textColor);
        }

        // Stop pulsing
        this.container.setScale(1);

        // Auto-hide after a short delay
        this.scene.time.delayedCall(1000, () => {
          this.fadeOut();
        });
      }
    }
  }

  /**
   * Fade out the loading indicator
   */
  public fadeOut(duration: number = 300): void {
    if (!this.container) {
      return;
    }

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: duration,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  /**
   * Show error state
   */
  public showError(message: string = 'Font loading failed'): void {
    if (!this.container || !this.progressBar) {
      return;
    }

    // Clear progress and show error indicator
    this.progressBar.clear();
    this.progressBar.fillStyle(0xE74C3C, 1);
    this.progressBar.fillCircle(0, 0, this.config.radius - 4);

    // Draw X mark
    this.progressBar.lineStyle(2, 0xFFFFFF, 1);
    const markSize = 8;
    this.progressBar.lineBetween(-markSize, -markSize, markSize, markSize);
    this.progressBar.lineBetween(-markSize, markSize, markSize, -markSize);

    // Update text
    if (this.loadingText) {
      this.loadingText.setText(message);
      this.loadingText.setColor('#E74C3C');
    }

    // Pulse animation for error
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 2,
      ease: 'Power2.easeInOut'
    });

    // Auto-hide after delay
    this.scene.time.delayedCall(3000, () => {
      this.fadeOut();
    });
  }

  /**
   * Update position (useful for responsive layouts)
   */
  public updatePosition(x: number, y: number): void {
    this.config.x = x;
    this.config.y = y;
    
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  /**
   * Check if indicator is visible
   */
  public isVisible(): boolean {
    return this.container !== null && this.container.visible;
  }

  /**
   * Destroy the loading indicator and clean up resources
   */
  public destroy(): void {
    if (this.updateTimer) {
      this.updateTimer.destroy();
      this.updateTimer = null;
    }

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.progressBar = null;
    this.backgroundCircle = null;
    this.loadingText = null;

    console.log('FontLoadingIndicator: Destroyed loading indicator');
  }
}
