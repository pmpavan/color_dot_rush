/**
 * Neon Background System for Color Dot Rush
 * Creates atmospheric backgrounds with starfield and nebula effects
 */

import { Scene } from 'phaser';

export interface StarFieldConfig {
  starCount: number;
  starColors: number[];
  starSizes: number[];
  speed: number;
  depth: number;
}

export interface NebulaConfig {
  color: number;
  alpha: number;
  size: number;
  speed: number;
  depth: number;
}

export interface GridConfig {
  color: number;
  alpha: number;
  lineWidth: number;
  spacing: number;
  speed: number;
  depth: number;
}

export class NeonBackgroundSystem {
  private scene: Scene;
  private starField: Phaser.GameObjects.Group | null = null;
  private nebula: Phaser.GameObjects.Graphics | null = null;
  private grid: Phaser.GameObjects.Graphics | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  
  // Configuration
  private starFieldConfig: StarFieldConfig = {
    starCount: 150,
    starColors: [0xFFFFFF, 0x00BFFF, 0xFF69B4, 0x00FF00, 0xFFA500],
    starSizes: [1, 2, 3],
    speed: 0.5,
    depth: 0
  };
  
  private nebulaConfig: NebulaConfig = {
    color: 0x080808,
    alpha: 0.1,
    size: 200,
    speed: 0.2,
    depth: 1
  };
  
  private gridConfig: GridConfig = {
    color: 0x00BFFF,
    alpha: 0.05,
    lineWidth: 1,
    spacing: 50,
    speed: 0.1,
    depth: 2
  };

  constructor(scene: Scene) {
    this.scene = scene;
  }

  /**
   * Create the complete background system
   */
  public createBackground(): void {
    const { width, height } = this.scene.scale;
    
    // Create base background
    this.background = this.scene.add.rectangle(0, 0, width, height, 0x080808).setOrigin(0);
    this.background.setDepth(-100);
    
    // Create starfield
    this.createStarField();
    
    // Create nebula effect
    this.createNebula();
    
    // Create grid pattern
    this.createGrid();
    
    console.log('NeonBackgroundSystem: Background system created');
  }

  /**
   * Create animated starfield
   */
  private createStarField(): void {
    this.starField = this.scene.add.group();
    const { width, height } = this.scene.scale;
    
    for (let i = 0; i < this.starFieldConfig.starCount; i++) {
      const star = this.createStar(width, height);
      this.starField.add(star);
    }
    
    // Animate starfield
    this.animateStarField();
  }

  /**
   * Create individual star
   */
  private createStar(maxWidth: number, maxHeight: number): Phaser.GameObjects.Circle {
    const x = Math.random() * maxWidth;
    const y = Math.random() * maxHeight;
    const size = this.starFieldConfig.starSizes[Math.floor(Math.random() * this.starFieldConfig.starSizes.length)];
    const color = this.starFieldConfig.starColors[Math.floor(Math.random() * this.starFieldConfig.starColors.length)];
    
    const star = this.scene.add.circle(x, y, size, color, 0.8);
    star.setDepth(this.starFieldConfig.depth);
    
    // Add subtle glow effect
    star.setStrokeStyle(1, color, 0.3);
    
    return star;
  }

  /**
   * Animate starfield movement
   */
  private animateStarField(): void {
    if (!this.starField || !this.starField.getChildren) return;
    
    this.scene.tweens.add({
      targets: this.starField.getChildren(),
      y: '-=100',
      duration: 10000 / this.starFieldConfig.speed,
      ease: 'Linear',
      repeat: -1,
      onRepeat: (tween) => {
        // Reset stars that have moved off screen
        if (!this.starField || !this.starField.getChildren) return;
        const stars = this.starField.getChildren() as Phaser.GameObjects.Circle[];
        stars.forEach(star => {
          if (star.y < -10) {
            star.y = this.scene.scale.height + 10;
            star.x = Math.random() * this.scene.scale.width;
          }
        });
      }
    });
  }

  /**
   * Create nebula effect
   */
  private createNebula(): void {
    this.nebula = this.scene.add.graphics();
    this.nebula.setDepth(this.nebulaConfig.depth);
    
    this.drawNebula();
    this.animateNebula();
  }

  /**
   * Draw nebula pattern
   */
  private drawNebula(): void {
    if (!this.nebula) return;
    
    const { width, height } = this.scene.scale;
    this.nebula.clear();
    
    // Create subtle nebula-like cloud patterns
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = this.nebulaConfig.size + Math.random() * 100;
      
      this.nebula.fillStyle(this.nebulaConfig.color, this.nebulaConfig.alpha);
      this.nebula.fillCircle(x, y, size);
      
      // Add some variation
      this.nebula.fillStyle(this.nebulaConfig.color, this.nebulaConfig.alpha * 0.5);
      this.nebula.fillCircle(x + 50, y + 30, size * 0.7);
    }
  }

  /**
   * Animate nebula
   */
  private animateNebula(): void {
    if (!this.nebula) return;
    
    this.scene.tweens.add({
      targets: this.nebula,
      alpha: this.nebulaConfig.alpha * 1.5,
      duration: 3000 / this.nebulaConfig.speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Create grid pattern
   */
  private createGrid(): void {
    this.grid = this.scene.add.graphics();
    this.grid.setDepth(this.gridConfig.depth);
    
    this.drawGrid();
    this.animateGrid();
  }

  /**
   * Draw grid pattern
   */
  private drawGrid(): void {
    if (!this.grid) return;
    
    const { width, height } = this.scene.scale;
    this.grid.clear();
    
    this.grid.lineStyle(this.gridConfig.lineWidth, this.gridConfig.color, this.gridConfig.alpha);
    
    // Draw vertical lines
    for (let x = 0; x <= width; x += this.gridConfig.spacing) {
      this.grid.lineBetween(x, 0, x, height);
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= height; y += this.gridConfig.spacing) {
      this.grid.lineBetween(0, y, width, y);
    }
  }

  /**
   * Animate grid
   */
  private animateGrid(): void {
    if (!this.grid) return;
    
    this.scene.tweens.add({
      targets: this.grid,
      alpha: this.gridConfig.alpha * 2,
      duration: 2000 / this.gridConfig.speed,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  /**
   * Update background for new dimensions
   */
  public updateDimensions(width: number, height: number): void {
    console.log('NeonBackgroundSystem: Updating dimensions to', width, 'x', height);
    
    // Update base background
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }
    
    // Update starfield configuration based on screen size
    const isMobile = width < 768;
    const starCount = isMobile ? 100 : 150; // Fewer stars on mobile for performance
    const gridSpacing = isMobile ? 40 : 50; // Tighter grid on mobile
    
    // Update configurations
    this.starFieldConfig.starCount = starCount;
    this.gridConfig.spacing = gridSpacing;
    
    // Redraw nebula with new dimensions
    this.drawNebula();
    
    // Redraw grid with new spacing
    this.drawGrid();
    
    // Update starfield - reset stars that are off screen and adjust count
    if (this.starField && this.starField.getChildren) {
      const stars = this.starField.getChildren() as Phaser.GameObjects.Circle[];
      const currentCount = stars.length;
      
      // Add or remove stars based on new count
      if (currentCount < starCount) {
        // Add more stars
        for (let i = currentCount; i < starCount; i++) {
          const star = this.createStar(width, height);
          this.starField.add(star);
        }
      } else if (currentCount > starCount) {
        // Remove excess stars
        for (let i = currentCount - 1; i >= starCount; i--) {
          stars[i].destroy();
        }
      }
      
      // Reposition all stars within new bounds
      stars.forEach(star => {
        if (star.x > width || star.y > height) {
          star.x = Math.random() * width;
          star.y = Math.random() * height;
        }
      });
    }
    
    console.log('NeonBackgroundSystem: Background updated for', width, 'x', height, 'screen');
  }

  /**
   * Set background visibility
   */
  public setVisible(visible: boolean): void {
    if (this.background) this.background.setVisible(visible);
    if (this.starField) this.starField.setVisible(visible);
    if (this.nebula) this.nebula.setVisible(visible);
    if (this.grid) this.grid.setVisible(visible);
  }

  /**
   * Destroy background system
   */
  public destroy(): void {
    if (this.background) {
      this.background.destroy();
      this.background = null;
    }
    
    if (this.starField) {
      this.starField.destroy();
      this.starField = null;
    }
    
    if (this.nebula) {
      this.nebula.destroy();
      this.nebula = null;
    }
    
    if (this.grid) {
      this.grid.destroy();
      this.grid = null;
    }
    
    console.log('NeonBackgroundSystem: Background system destroyed');
  }

  /**
   * Update configuration
   */
  public updateConfig(config: {
    starField?: Partial<StarFieldConfig>;
    nebula?: Partial<NebulaConfig>;
    grid?: Partial<GridConfig>;
  }): void {
    if (config.starField) {
      this.starFieldConfig = { ...this.starFieldConfig, ...config.starField };
    }
    
    if (config.nebula) {
      this.nebulaConfig = { ...this.nebulaConfig, ...config.nebula };
    }
    
    if (config.grid) {
      this.gridConfig = { ...this.gridConfig, ...config.grid };
    }
    
    // Recreate background with new config
    this.destroy();
    this.createBackground();
  }
}
