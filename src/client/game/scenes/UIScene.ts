import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';

export class UIScene extends Scene {
  private scoreContainer: Phaser.GameObjects.Container | null = null;
  private timeContainer: Phaser.GameObjects.Container | null = null;
  private targetColorCircle: Phaser.GameObjects.Arc | null = null;
  private targetColorBg: Phaser.GameObjects.Rectangle | null = null;
  private slowMoCharges: Phaser.GameObjects.Arc[] = [];
  private slowMoClockIcons: Phaser.GameObjects.Line[] = [];

  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;

  constructor() {
    super('UI');
  }

  init(): void {
    // Reset UI elements
    this.scoreContainer = null;
    this.timeContainer = null;
    this.targetColorCircle = null;
    this.slowMoCharges = [];
    this.slowMoClockIcons = [];

    // Reset game state
    this.score = 0;
    this.bestScore = this.getBestScore();
    this.targetColor = GameColor.RED;
  }

  create(): void {
    console.log('UIScene: create() method called');
    console.log('UIScene: Scene dimensions:', this.scale.width, 'x', this.scale.height);
    console.log('UIScene: Scene active:', this.scene.isActive());
    console.log('UIScene: Scene visible:', this.scene.isVisible());

    try {
      this.createHUD();
      console.log('UIScene: HUD created successfully');

      this.setupLayout();
      console.log('UIScene: Layout setup complete');

      // Listen for resize events
      this.scale.on('resize', () => this.setupLayout());

      // Listen for game events from GameScene
      this.events.on('updateScore', this.updateScore, this);
      this.events.on('updateTime', this.updateTime, this);
      this.events.on('updateTargetColor', this.updateTargetColor, this);
      this.events.on('updateSlowMoCharges', this.updateSlowMoCharges, this);

      console.log('UIScene: All setup complete - scene should be visible');
    } catch (error) {
      console.error('UIScene: Error in create():', error);
      throw error;
    }
  }

  private createHUD(): void {
    const { width } = this.scale;
    console.log('UIScene: createHUD called, width:', width);

    // Add a bright test rectangle to see if UIScene is visible (graphics only)
    this.add.rectangle(width / 2, 50, 300, 40, 0x00FF00, 1);

    // Add visual indicator instead of text (graphics only)
    const indicator = this.add.circle(width / 2, 50, 15, 0x0000FF, 1);
    indicator.setStrokeStyle(3, 0xFFFFFF, 1);

    // Header bar with transparent background
    this.add.rectangle(width / 2, 30, width, 60, 0x000000, 0.3).setOrigin(0.5, 0.5);

    // Calculate responsive positions and sizes
    const margin = Math.max(10, width * 0.02); // 2% margin, minimum 10px
    const scoreWidth = Math.min(100, width * 0.25); // Max 25% of screen width, max 100px
    const chargeSpacing = Math.min(30, width * 0.08); // Responsive spacing

    // Score display (left side) - Responsive sizing (graphics only)
    this.scoreContainer = this.add.container(margin + scoreWidth / 2, 30);
    const scoreBg = this.add.rectangle(0, 0, scoreWidth, 30, 0x3498DB, 0.8);
    scoreBg.setStrokeStyle(2, 0xFFFFFF, 0.6);

    // Add score indicator dots instead of text (graphics only)
    const scoreIndicator = this.add.circle(0, 0, 8, 0xFFFFFF, 1);
    scoreIndicator.setStrokeStyle(2, 0x3498DB, 1);

    this.scoreContainer.add([scoreBg, scoreIndicator]);

    // Time display (center)
    this.timeContainer = this.add.container(width / 2, 30);
    const timeBg = this.add.circle(0, 0, 18, 0x2ECC71, 0.8);
    timeBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    const timeHand = this.add.line(0, 0, 0, 0, 0, -12, 0xFFFFFF, 1).setLineWidth(2);
    this.timeContainer.add([timeBg, timeHand]);

    // Slow-mo charges (right side) - Responsive positioning
    const chargeStartX = width - margin - 15; // Start from right edge with margin
    for (let i = 0; i < 3; i++) {
      const chargeX = chargeStartX - (i * chargeSpacing);

      const charge = this.add
        .circle(chargeX, 30, 12, 0xECF0F1) // Slightly smaller for better fit
        .setStrokeStyle(2, 0x3498DB);

      // Add clock icon representation (simple lines) - smaller for responsive design
      const hourHand = this.add.line(chargeX, 30, 0, 0, 0, -6, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.add.line(chargeX, 30, 0, 0, 4, 0, 0x3498DB, 1).setLineWidth(2);

      this.slowMoCharges.push(charge);
      this.slowMoClockIcons.push(hourHand, minuteHand);
    }

    // Target color display (below header) - Responsive width
    const targetWidth = Math.min(280, width * 0.7); // Max 70% of screen width
    this.targetColorBg = this.add.rectangle(width / 2, 80, targetWidth, 50, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

    // Large target color circle
    this.targetColorCircle = this.add.circle(width / 2, 80, 22, parseInt(this.targetColor.replace('#', '0x')));
    this.targetColorCircle.setStrokeStyle(4, 0xFFFFFF, 1);

    // Add subtle pulsing animation
    this.tweens.add({
      targets: [this.targetColorBg, this.targetColorCircle],
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private setupLayout(): void {
    const { width } = this.scale;

    // Calculate responsive positions and sizes (same as createHUD)
    const margin = Math.max(10, width * 0.02);
    const scoreWidth = Math.min(100, width * 0.25);
    const chargeSpacing = Math.min(30, width * 0.08);

    // Update score container position
    if (this.scoreContainer) {
      this.scoreContainer.setPosition(margin + scoreWidth / 2, 30);

      // Update score background width if it exists
      if (this.scoreContainer.list[0]) {
        const scoreBg = this.scoreContainer.list[0] as Phaser.GameObjects.Rectangle;
        scoreBg.setSize(scoreWidth, 30);
      }
    }

    // Update time container position (center)
    if (this.timeContainer) {
      this.timeContainer.setPosition(width / 2, 30);
    }

    // Update slow-mo charges positions with responsive spacing
    const chargeStartX = width - margin - 15;
    this.slowMoCharges.forEach((charge, index) => {
      const chargeX = chargeStartX - (index * chargeSpacing);
      charge.setPosition(chargeX, 30);
    });

    // Update clock icon positions
    this.slowMoClockIcons.forEach((icon, index) => {
      const chargeIndex = Math.floor(index / 2);
      const chargeX = chargeStartX - (chargeIndex * chargeSpacing);
      icon.setPosition(chargeX, 30);
    });

    // Update target color display
    if (this.targetColorBg) {
      const targetWidth = Math.min(280, width * 0.7);
      this.targetColorBg.setPosition(width / 2, 80);
      this.targetColorBg.setSize(targetWidth, 50);
    }

    if (this.targetColorCircle) {
      this.targetColorCircle.setPosition(width / 2, 80);
    }
  }

  private updateScore(score: number): void {
    this.score = score;
    if (score > this.bestScore) {
      this.bestScore = score;
      this.saveBestScore(this.bestScore);
    }

    // Update score indicator (graphics only - change color based on score)
    if (this.scoreContainer && this.scoreContainer.list[1]) {
      const scoreIndicator = this.scoreContainer.list[1] as Phaser.GameObjects.Arc;
      // Change color based on score level
      const color = score > 10 ? 0xFFD700 : score > 5 ? 0x2ECC71 : 0xFFFFFF;
      scoreIndicator.setFillStyle(color);
    }

    // Visual feedback for score change - flash the score container
    if (this.scoreContainer) {
      this.tweens.add({
        targets: this.scoreContainer,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  private updateTime(elapsedTime: number): void {
    const seconds = Math.floor(elapsedTime / 1000);

    // Rotate the time hand based on elapsed time
    if (this.timeContainer && this.timeContainer.list[1]) {
      const timeHand = this.timeContainer.list[1] as Phaser.GameObjects.Line;
      const rotation = (seconds * 6) * (Math.PI / 180); // 6 degrees per second
      timeHand.setRotation(rotation);
    }
  }

  private updateTargetColor(color: GameColor): void {
    this.targetColor = color;

    // Update target color circle
    if (this.targetColorCircle) {
      this.targetColorCircle.setFillStyle(parseInt(color.replace('#', '0x')));

      // Flash effect when color changes
      this.tweens.add({
        targets: this.targetColorCircle,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
    }

    // Update background border color to match target color
    if (this.targetColorBg) {
      this.targetColorBg.setStrokeStyle(3, parseInt(color.replace('#', '0x')), 0.9);
    }
  }

  private updateSlowMoCharges(charges: number): void {
    // Update visual representation of charges with enhanced feedback
    this.slowMoCharges.forEach((charge, index) => {
      if (index < charges) {
        // Active charge - bright and pulsing
        charge.fillColor = 0xECF0F1; // Active - Shimmering White
        charge.setAlpha(1.0);
        charge.setStrokeStyle(2, 0x3498DB, 1.0); // Bright blue outline

        // Add subtle pulsing animation to active charges
        this.tweens.add({
          targets: charge,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1
        });
      } else {
        // Inactive charge - dimmed and static
        charge.fillColor = 0x95A5A6; // Inactive - Mid Grey
        charge.setAlpha(0.4);
        charge.setStrokeStyle(2, 0x7F8C8D, 0.6); // Dim grey outline

        // Stop any pulsing animation
        this.tweens.killTweensOf(charge);
        charge.setScale(1.0);
      }
    });

    // If a charge was just used, create a brief flash effect
    if (charges < 3) {
      const usedChargeIndex = charges; // The charge that was just used
      if (usedChargeIndex < this.slowMoCharges.length) {
        const usedCharge = this.slowMoCharges[usedChargeIndex];

        if (usedCharge) {
          // Brief blue flash effect
          this.tweens.add({
            targets: usedCharge,
            alpha: 0.1,
            duration: 150,
            ease: 'Power2.easeOut',
            yoyo: true,
            onComplete: () => {
              usedCharge.setAlpha(0.4); // Set to inactive alpha
            }
          });
        }
      }
    }
  }



  private getBestScore(): number {
    return parseInt(localStorage.getItem('colorRushBestScore') || '0');
  }

  private saveBestScore(score: number): void {
    localStorage.setItem('colorRushBestScore', score.toString());
  }

  // Public methods for GameScene to call
  public setScore(score: number): void {
    this.events.emit('updateScore', score);
  }

  public setTime(elapsedTime: number): void {
    this.events.emit('updateTime', elapsedTime);
  }

  public setTargetColor(color: GameColor): void {
    this.events.emit('updateTargetColor', color);
  }

  public setSlowMoCharges(charges: number): void {
    this.events.emit('updateSlowMoCharges', charges);
  }
}
