import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';

export class UIScene extends Scene {
  private scoreContainer: Phaser.GameObjects.Container | null = null;
  private timeContainer: Phaser.GameObjects.Container | null = null;
  private targetColorText: Phaser.GameObjects.Text | null = null;
  private targetColorBg: Phaser.GameObjects.Rectangle | null = null;
  private headerBg: Phaser.GameObjects.Rectangle | null = null;
  private slowMoCharges: Phaser.GameObjects.Arc[] = [];
  private slowMoClockIcons: Phaser.GameObjects.Line[] = [];

  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;

  constructor() {
    super('UI');
  }

  private getColorName(color: GameColor): string {
    switch (color) {
      case GameColor.RED: return 'RED';
      case GameColor.GREEN: return 'GREEN';
      case GameColor.BLUE: return 'BLUE';
      case GameColor.YELLOW: return 'YELLOW';
      case GameColor.PURPLE: return 'PURPLE';
      default: return 'RED';
    }
  }



  shutdown(): void {
    try {
      // Kill all tweens to prevent issues during shutdown
      if (this.tweens) {
        this.tweens.killAll();
      }

      // Clear container references but don't manually destroy - let Phaser handle it
      this.scoreContainer = null;
      this.timeContainer = null;
      this.targetColorText = null;
      this.targetColorBg = null;
      this.headerBg = null;
      this.slowMoCharges = [];
      this.slowMoClockIcons = [];

      console.log('UIScene: Shutdown completed');
    } catch (error) {
      console.warn('Error during UIScene shutdown:', error);
    }
  }

  init(): void {
    // Reset UI elements
    this.scoreContainer = null;
    this.timeContainer = null;
    this.targetColorText = null;
    this.targetColorBg = null;
    this.headerBg = null;
    this.slowMoCharges = [];
    this.slowMoClockIcons = [];

    // Reset game state
    this.score = 0;
    this.bestScore = this.getBestScore();
    this.targetColor = GameColor.RED;
  }

  create(): void {
    console.log('UIScene: Initializing UI');

    try {
      // Try to create UI with fonts, fallback to graphics if needed
      this.createUIWithFallback();

      // Listen for resize events
      this.scale.on('resize', () => this.setupLayout());

      // Listen for game events from GameScene
      this.events.on('updateScore', this.updateScore, this);
      this.events.on('updateTime', this.updateTime, this);
      this.events.on('updateTargetColor', this.updateTargetColor, this);
      this.events.on('updateSlowMoCharges', this.updateSlowMoCharges, this);

      console.log('UIScene: Ready');
    } catch (error) {
      console.error('UIScene: Error in create():', error);
      throw error;
    }
  }

  private createUIWithFallback(): void {
    try {
      console.log('UIScene: Attempting to create text-based UI...');
      this.createHUD();
      this.setupLayout();
      console.log('UIScene: Text-based UI created successfully');
    } catch (error) {
      console.warn('UIScene: Text UI creation failed, using graphics fallback:', error);
      try {
        // Clear any partially created elements
        this.children.removeAll(true);
        
        // Create graphics-only UI
        console.log('UIScene: Creating graphics-only UI...');
        this.createGraphicsOnlyHUD();
        this.setupLayout();
        console.log('UIScene: Graphics-only UI created successfully');
      } catch (fallbackError) {
        console.error('UIScene: Even graphics fallback failed:', fallbackError);
        // Create minimal UI as last resort
        this.createMinimalUI();
      }
    }
  }

  private createMinimalUI(): void {
    console.log('UIScene: Creating minimal UI as last resort...');
    const { width } = this.scale;
    
    // Just create the header background and basic elements
    this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.3).setOrigin(0, 0);
    
    // Simple score indicator
    this.scoreContainer = this.add.container(20, 30);
    const scoreCircle = this.add.circle(0, 0, 10, 0x3498DB);
    this.scoreContainer.add(scoreCircle);
    
    // Simple time indicator  
    this.timeContainer = this.add.container(width / 2, 30);
    const timeCircle = this.add.circle(0, 0, 10, 0x2ECC71);
    this.timeContainer.add(timeCircle);
    
    // Simple target color
    this.targetColorBg = this.add.rectangle(width / 2, 100, 200, 50, 0x000000, 0.8);
    this.targetColorText = this.add.circle(width / 2, 100, 20, 0xE74C3C) as any;
    
    console.log('UIScene: Minimal UI created');
  }

  private createHUD(): void {
    console.log('UIScene: Starting createHUD...');
    const { width } = this.scale;

    try {
      // Header bar with transparent background - full width
      console.log('UIScene: Creating header background...');
      this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.3).setOrigin(0, 0);

      // Calculate responsive positions and sizes
      const margin = Math.max(20, width * 0.03); // 3% margin, minimum 20px
      const headerY = 30; // Center of header bar

      // Score display (left side) - Text as per Frontend Spec
      console.log('UIScene: Creating score text...');
      this.scoreContainer = this.add.container(margin, headerY);
      const scoreText = this.add.text(0, 0, `Score: ${this.score} | Best: ${this.bestScore}`, {
        fontFamily: 'Arial, sans-serif', // Use Arial first to avoid font loading issues
        fontSize: '24px',
        fontStyle: 'normal',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5);
      this.scoreContainer.add(scoreText);
      console.log('UIScene: Score text created successfully');

      // Time display (center) - Text as per Frontend Spec
      console.log('UIScene: Creating time text...');
      this.timeContainer = this.add.container(width / 2, headerY);
      const timeText = this.add.text(0, 0, 'Time: 0:00', {
        fontFamily: 'Arial, sans-serif', // Use Arial first to avoid font loading issues
        fontSize: '24px',
        fontStyle: 'normal',
        color: '#FFFFFF'
      }).setOrigin(0.5, 0.5);
      this.timeContainer.add(timeText);
      console.log('UIScene: Time text created successfully');

      // Slow-mo charges (right side) - Clock icons as per Frontend Spec
      console.log('UIScene: Creating slow-mo charges...');
    const chargeSpacing = 35; // Fixed spacing for clock icons
    const chargeStartX = width - margin - 60; // Start from right edge with margin
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargeStartX - (i * chargeSpacing);

      // Clock icon background circle
      const charge = this.add
        .circle(chargeX, headerY, 15, 0xECF0F1)
        .setStrokeStyle(2, 0x3498DB);

      // Clock hands - simple clock icon
      const hourHand = this.add.line(chargeX, headerY, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.add.line(chargeX, headerY, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);

      this.slowMoCharges.push(charge);
      this.slowMoClockIcons.push(hourHand, minuteHand);
    }

    // Target color display (below header) - Graphics-only approach
    const targetY = 100; // Below header
    const targetWidth = Math.min(300, width * 0.8); // Max 80% of screen width
    
    this.targetColorBg = this.add.rectangle(width / 2, targetY, targetWidth, 60, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

      // Target color text with color name
      const colorName = this.getColorName(this.targetColor);
      const targetText = this.add.text(width / 2, targetY, `TAP: ${colorName}`, {
        fontFamily: 'Arial, sans-serif', // Use Arial first to avoid font loading issues
        fontSize: '32px',
        fontStyle: 'bold',
        color: this.targetColor
      }).setOrigin(0.5, 0.5);

      this.targetColorText = targetText;
      console.log('UIScene: Target color text created successfully');

      // Add subtle pulsing animation
      this.tweens.add({
        targets: [this.targetColorBg, this.targetColorText],
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      console.log('UIScene: createHUD completed successfully');
    } catch (error) {
      console.error('UIScene: Error in createHUD:', error);
      throw error;
    }
  }

  private createGraphicsOnlyHUD(): void {
    const { width } = this.scale;

    // Header bar with transparent background - full width
    this.headerBg = this.add.rectangle(0, 0, width, 60, 0x000000, 0.3).setOrigin(0, 0);

    // Calculate responsive positions and sizes
    const margin = Math.max(20, width * 0.03); // 3% margin, minimum 20px
    const headerY = 30; // Center of header bar

    // Score display (left side) - Graphics-only fallback
    this.scoreContainer = this.add.container(margin, headerY);
    
    // Create score indicator with dots representing score level
    const scoreBg = this.add.rectangle(0, 0, 80, 30, 0x3498DB, 0.8);
    scoreBg.setStrokeStyle(2, 0xFFFFFF, 0.6);
    
    // Score indicator dots (will update based on score)
    const scoreIndicator = this.add.circle(0, 0, 8, 0xFFFFFF, 1);
    scoreIndicator.setStrokeStyle(2, 0x3498DB, 1);
    
    this.scoreContainer.add(scoreBg);
    this.scoreContainer.add(scoreIndicator);

    // Time display (center) - Graphics-only clock
    this.timeContainer = this.add.container(width / 2, headerY);
    
    // Clock face
    const timeBg = this.add.circle(0, 0, 18, 0x2ECC71, 0.8);
    timeBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
    
    // Clock hand (will rotate based on time)
    const timeHand = this.add.line(0, 0, 0, 0, 0, -12, 0xFFFFFF, 1).setLineWidth(2);
    
    this.timeContainer.add(timeBg);
    this.timeContainer.add(timeHand);

    // Slow-mo charges (right side) - Clock icons as per Frontend Spec
    const chargeSpacing = 35; // Fixed spacing for clock icons
    const chargeStartX = width - margin - 60; // Start from right edge with margin
    
    for (let i = 0; i < 3; i++) {
      const chargeX = chargeStartX - (i * chargeSpacing);

      // Clock icon background circle
      const charge = this.add
        .circle(chargeX, headerY, 15, 0xECF0F1)
        .setStrokeStyle(2, 0x3498DB);

      // Clock hands - simple clock icon
      const hourHand = this.add.line(chargeX, headerY, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      const minuteHand = this.add.line(chargeX, headerY, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);

      this.slowMoCharges.push(charge);
      this.slowMoClockIcons.push(hourHand, minuteHand);
    }

    // Target color display (below header) - Graphics-only approach
    const targetY = 100; // Below header
    const targetWidth = Math.min(300, width * 0.8); // Max 80% of screen width
    
    this.targetColorBg = this.add.rectangle(width / 2, targetY, targetWidth, 60, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);

    // Large target color circle (visual indicator of what to tap)
    const targetCircle = this.add.circle(width / 2, targetY, 25, parseInt(this.targetColor.replace('#', '0x')));
    targetCircle.setStrokeStyle(4, 0xFFFFFF, 1);

    // Store as text property for compatibility with existing update methods
    this.targetColorText = targetCircle as any;

    // Add subtle pulsing animation
    this.tweens.add({
      targets: [this.targetColorBg, this.targetColorText],
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

    // Update header background to full width
    if (this.headerBg) {
      this.headerBg.setSize(width, 60);
    }

    // Calculate responsive positions and sizes
    const margin = Math.max(20, width * 0.03);
    const headerY = 30;
    const chargeSpacing = 35;

    // Update score container position
    if (this.scoreContainer) {
      this.scoreContainer.setPosition(margin, headerY);
    }

    // Update time container position (center)
    if (this.timeContainer) {
      this.timeContainer.setPosition(width / 2, headerY);
    }

    // Update slow-mo charges positions
    const chargeStartX = width - margin - 60;
    this.slowMoCharges.forEach((charge, index) => {
      const chargeX = chargeStartX - (index * chargeSpacing);
      charge.setPosition(chargeX, headerY);
    });

    // Update clock icon positions
    this.slowMoClockIcons.forEach((icon, index) => {
      const chargeIndex = Math.floor(index / 2);
      const chargeX = chargeStartX - (chargeIndex * chargeSpacing);
      icon.setPosition(chargeX, headerY);
    });

    // Update target color display
    if (this.targetColorBg) {
      const targetWidth = Math.min(300, width * 0.8);
      this.targetColorBg.setPosition(width / 2, 100);
      this.targetColorBg.setSize(targetWidth, 60);
    }

    if (this.targetColorText) {
      this.targetColorText.setPosition(width / 2, 100);
    }
  }

  private updateScore(score: number): void {
    this.score = score;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore(this.bestScore);
    }

    // Update score display (works for both text and graphics modes)
    if (this.scoreContainer && this.scoreContainer.list[0]) {
      const firstElement = this.scoreContainer.list[0];
      
      if (firstElement instanceof Phaser.GameObjects.Text) {
        // Text mode
        const scoreText = firstElement as Phaser.GameObjects.Text;
        scoreText.setText(`Score: ${this.score} | Best: ${this.bestScore}`);
        
        // Change color based on score level for visual feedback
        const color = this.score > 10 ? '#FFD700' : this.score > 5 ? '#2ECC71' : '#FFFFFF';
        scoreText.setColor(color);
      } else if (this.scoreContainer.list[1]) {
        // Graphics mode - update the indicator circle
        const scoreIndicator = this.scoreContainer.list[1] as Phaser.GameObjects.Arc;
        const color = this.score > 10 ? 0xFFD700 : this.score > 5 ? 0x2ECC71 : 0xFFFFFF;
        scoreIndicator.setFillStyle(color);
      }
    }

    // Visual feedback for score change - flash the score container
    if (this.scoreContainer) {
      this.tweens.add({
        targets: this.scoreContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        yoyo: true,
        ease: 'Power2'
      });
    }
  }

  private updateTime(elapsedTime: number): void {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    
    // Update time display (works for both text and graphics modes)
    if (this.timeContainer && this.timeContainer.list[0]) {
      const firstElement = this.timeContainer.list[0];
      
      if (firstElement instanceof Phaser.GameObjects.Text) {
        // Text mode
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const timeText = firstElement as Phaser.GameObjects.Text;
        timeText.setText(`Time: ${timeString}`);
      } else if (this.timeContainer.list[1]) {
        // Graphics mode - rotate the clock hand
        const timeHand = this.timeContainer.list[1] as Phaser.GameObjects.Line;
        const rotation = (totalSeconds * 6) * (Math.PI / 180); // 6 degrees per second
        timeHand.setRotation(rotation);
      }
    }
  }

  private updateTargetColor(color: GameColor): void {
    this.targetColor = color;

    // Update target color display (works for both text and graphics modes)
    if (this.targetColorText) {
      if (this.targetColorText instanceof Phaser.GameObjects.Text) {
        // Text mode
        const colorName = this.getColorName(color);
        this.targetColorText.setText(`TAP: ${colorName}`);
        this.targetColorText.setColor(color);
      } else {
        // Graphics mode - update circle color
        const targetCircle = this.targetColorText as any;
        if (targetCircle.setFillStyle) {
          targetCircle.setFillStyle(parseInt(color.replace('#', '0x')));
        }
      }

      // Flash effect when color changes
      this.tweens.add({
        targets: this.targetColorText,
        scaleX: 1.2,
        scaleY: 1.2,
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

  /**
   * Show or hide the entire UI scene
   */
  public setVisible(visible: boolean): void {
    // Set visibility for all UI containers
    if (this.headerBg) {
      this.headerBg.setVisible(visible);
    }
    if (this.scoreContainer) {
      this.scoreContainer.setVisible(visible);
    }
    if (this.timeContainer) {
      this.timeContainer.setVisible(visible);
    }
    if (this.targetColorBg) {
      this.targetColorBg.setVisible(visible);
    }
    if (this.targetColorText) {
      this.targetColorText.setVisible(visible);
    }
    
    // Set visibility for slow-mo charges
    this.slowMoCharges.forEach(charge => {
      if (charge) {
        charge.setVisible(visible);
      }
    });
    
    // Set visibility for slow-mo clock icons
    this.slowMoClockIcons.forEach(icon => {
      if (icon) {
        icon.setVisible(visible);
      }
    });
  }
}
