import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';

export class UIScene extends Scene {
  private scoreText: Phaser.GameObjects.Text | null = null;
  private timeText: Phaser.GameObjects.Text | null = null;
  private targetColorText: Phaser.GameObjects.Text | null = null;
  private targetColorBg: Phaser.GameObjects.Rectangle | null = null;
  private slowMoCharges: Phaser.GameObjects.Arc[] = [];
  
  private score: number = 0;
  private bestScore: number = 0;
  private targetColor: GameColor = GameColor.RED;

  constructor() {
    super({ key: 'UI', active: false });
  }

  init(): void {
    // Reset UI elements
    this.scoreText = null;
    this.timeText = null;
    this.targetColorText = null;
    this.slowMoCharges = [];
    
    // Reset game state
    this.score = 0;
    this.bestScore = this.getBestScore();
    this.targetColor = GameColor.RED;
  }

  create(): void {
    this.createHUD();
    this.setupLayout();
    
    // Listen for resize events
    this.scale.on('resize', () => this.setupLayout());
    
    // Listen for game events from GameScene
    this.events.on('updateScore', this.updateScore, this);
    this.events.on('updateTime', this.updateTime, this);
    this.events.on('updateTargetColor', this.updateTargetColor, this);
    this.events.on('updateSlowMoCharges', this.updateSlowMoCharges, this);
  }

  private createHUD(): void {
    const { width } = this.scale;

    // Header bar with transparent background
    this.add.rectangle(width / 2, 40, width, 80, 0x000000, 0.3);

    // Score display (left side)
    this.scoreText = this.add
      .text(20, 40, `Score: ${this.score} | Best: ${this.bestScore}`, {
        fontFamily: 'Poppins',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0, 0.5);

    // Time display (center)
    this.timeText = this.add
      .text(width / 2, 40, 'Time: 00:00', {
        fontFamily: 'Poppins',
        fontSize: '24px',
        color: '#FFFFFF',
      })
      .setOrigin(0.5, 0.5);

    // Slow-mo charges (right side) - Three clock icons
    for (let i = 0; i < 3; i++) {
      const charge = this.add
        .circle(width - 60 - (i * 40), 40, 15, 0xECF0F1) // Shimmering White
        .setStrokeStyle(2, 0x3498DB); // Blue outline
      
      // Add clock icon representation (simple lines)
      this.add.line(width - 60 - (i * 40), 40, 0, 0, 0, -8, 0x3498DB, 1).setLineWidth(2);
      this.add.line(width - 60 - (i * 40), 40, 0, 0, 6, 0, 0x3498DB, 1).setLineWidth(2);
      
      this.slowMoCharges.push(charge);
    }

    // Target color display (below header) - Prominent and eye-catching
    this.targetColorBg = this.add.rectangle(width / 2, 120, 300, 60, 0x000000, 0.8);
    this.targetColorBg.setStrokeStyle(3, 0xFFFFFF, 0.9);
    
    this.targetColorText = this.add
      .text(width / 2, 120, `TAP: ${this.getColorName(this.targetColor)}`, {
        fontFamily: 'Poppins',
        fontSize: '36px',
        fontStyle: 'bold',
        color: this.targetColor,
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5, 0.5);

    // Add subtle pulsing animation to make target color more noticeable
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

    // Update positions for responsive design
    if (this.scoreText) {
      this.scoreText.setPosition(20, 40);
    }

    if (this.timeText) {
      this.timeText.setPosition(width / 2, 40);
    }

    // Update slow-mo charges positions
    this.slowMoCharges.forEach((charge, index) => {
      charge.setPosition(width - 60 - (index * 40), 40);
    });

    if (this.targetColorText) {
      this.targetColorText.setPosition(width / 2, 120);
    }

    if (this.targetColorBg) {
      this.targetColorBg.setPosition(width / 2, 120);
    }
  }

  private updateScore(score: number): void {
    this.score = score;
    if (score > this.bestScore) {
      this.bestScore = score;
      this.saveBestScore(this.bestScore);
    }
    
    if (this.scoreText) {
      this.scoreText.setText(`Score: ${this.score} | Best: ${this.bestScore}`);
    }
  }

  private updateTime(elapsedTime: number): void {
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (this.timeText) {
      this.timeText.setText(`Time: ${timeString}`);
    }
  }

  private updateTargetColor(color: GameColor): void {
    this.targetColor = color;
    if (this.targetColorText) {
      this.targetColorText.setText(`TAP: ${this.getColorName(color)}`);
      this.targetColorText.setColor(color);
    }
    
    // Update background border color to match target color
    if (this.targetColorBg) {
      this.targetColorBg.setStrokeStyle(3, parseInt(color.replace('#', '0x')), 0.9);
    }
  }

  private updateSlowMoCharges(charges: number): void {
    // Update visual representation of charges
    this.slowMoCharges.forEach((charge, index) => {
      if (index < charges) {
        charge.fillColor = 0xECF0F1; // Active - Shimmering White
        charge.setAlpha(1.0);
      } else {
        charge.fillColor = 0x95A5A6; // Inactive - Mid Grey
        charge.setAlpha(0.5);
      }
    });
  }

  private getColorName(color: GameColor): string {
    const colorNameMap: { [key: string]: string } = {
      [GameColor.RED]: 'RED',
      [GameColor.GREEN]: 'GREEN',
      [GameColor.BLUE]: 'BLUE',
      [GameColor.YELLOW]: 'YELLOW',
      [GameColor.PURPLE]: 'PURPLE',
    };
    return colorNameMap[color] || 'RED';
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
