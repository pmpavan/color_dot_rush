import { Scene, GameObjects } from 'phaser';

export class SplashScreen extends Scene {
  background: GameObjects.Rectangle | null = null;
  logo: GameObjects.Container | null = null;
  title: GameObjects.Container | null = null;
  startButton: GameObjects.Container | null = null;
  howToPlayButton: GameObjects.Container | null = null;

  constructor() {
    super('SplashScreen');
    // Ensure scene key is properly set for testing
    if (this.scene) {
      this.scene.key = 'SplashScreen';
    }
  }

  /**
   * Reset cached GameObject references every time the scene starts.
   * The same Scene instance is reused by Phaser, so we must ensure
   * stale (destroyed) objects are cleared out when the scene restarts.
   */
  init(): void {
    this.background = null;
    this.logo = null;
    this.title = null;
    this.startButton = null;
    this.howToPlayButton = null;
  }

  create() {
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }
    
    this.refreshLayout();

    // Re-calculate positions whenever the game canvas is resized (e.g. orientation change).
    this.scale.on('resize', () => this.refreshLayout());

    // Create interactive buttons instead of generic tap
    this.createButtons();
  }

  private createButtons(): void {
    const { width, height } = this.scale;
    
    // Start Game button (Primary - Bright Blue) - Graphics only
    if (!this.startButton) {
      const buttonBg = this.add.rectangle(
        Math.round(width / 2), 
        Math.round(height * 0.7), 
        200, 60, 
        0x3498DB
      );
      buttonBg.setStrokeStyle(2, 0xFFFFFF, 0.8);
      
      // Add play triangle icon
      const playIcon = this.add.triangle(
        Math.round(width / 2), 
        Math.round(height * 0.7), 
        0, 0, 
        0, 20, 
        15, 10, 
        0xFFFFFF
      );
      
      // Create container for button
      const buttonContainer = this.add.container(0, 0);
      buttonContainer.add(buttonBg);
      buttonContainer.add(playIcon);
      buttonContainer
        .setInteractive(new Phaser.Geom.Rectangle(
          Math.round(width / 2) - 100, 
          Math.round(height * 0.7) - 30, 
          200, 60
        ), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          buttonContainer.setScale(1.1);
        })
        .on('pointerout', () => {
          buttonContainer.setScale(1.0);
        })
        .on('pointerdown', () => {
          console.log('SplashScreen: Play button clicked!');
          buttonContainer.setScale(0.95);
          
          // Immediate transition without fade to debug
          console.log('SplashScreen: Available scenes:', this.scene.manager.scenes.map(s => s.scene.key));
          console.log('SplashScreen: Starting Game scene...');
          this.scene.start('Game');
          console.log('SplashScreen: Launching UI scene...');
          this.scene.launch('UI');
          console.log('SplashScreen: Scene transitions completed');
        })
        .on('pointerup', () => {
          buttonContainer.setScale(1.1);
        });
    }

    // How to Play button (Secondary - Mid Grey) - Graphics only
    if (!this.howToPlayButton) {
      const helpButtonBg = this.add.rectangle(
        Math.round(width / 2), 
        Math.round(height * 0.8), 
        180, 50, 
        0x95A5A6
      );
      helpButtonBg.setStrokeStyle(2, 0xFFFFFF, 0.6);
      
      // Add question mark icon
      const questionMark = this.add.circle(
        Math.round(width / 2), 
        Math.round(height * 0.8), 
        12, 
        0xFFFFFF
      );
      
      const helpContainer = this.add.container(0, 0);
      helpContainer.add(helpButtonBg);
      helpContainer.add(questionMark);
      helpContainer
        .setInteractive(new Phaser.Geom.Rectangle(
          Math.round(width / 2) - 90, 
          Math.round(height * 0.8) - 25, 
          180, 50
        ), Phaser.Geom.Rectangle.Contains)
        .on('pointerover', () => {
          helpContainer.setScale(1.1);
        })
        .on('pointerout', () => {
          helpContainer.setScale(1.0);
        })
        .on('pointerdown', () => {
          helpContainer.setScale(0.95);
          console.log('How to Play clicked - TODO: Implement instructions');
        })
        .on('pointerup', () => {
          helpContainer.setScale(1.1);
        });
    }
  }

  /**
   * Positions and (lightly) scales all UI elements based on the current game size.
   * Call this from create() and from any resize events.
   */
  private refreshLayout(): void {
    const { width, height } = this.scale;

    // Resize camera to new viewport to prevent black bars
    this.cameras.resize(width, height);

    // Background – solid color rectangle
    if (!this.background) {
      this.background = this.add.rectangle(0, 0, width, height, 0x2C3E50).setOrigin(0);
    }
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    // Logo – graphics-based logo
    const scaleFactor = Math.min(width / 1024, height / 768);

    if (!this.logo) {
      const logoContainer = this.add.container(Math.round(width / 2), Math.round(height * 0.25));
      
      // Create a simple logo with circles
      const mainCircle = this.add.circle(0, 0, 40 * scaleFactor, 0x3498DB);
      mainCircle.setStrokeStyle(4, 0xFFFFFF, 1);
      
      const innerCircle = this.add.circle(0, 0, 20 * scaleFactor, 0xFFFFFF);
      
      logoContainer.add(mainCircle);
      logoContainer.add(innerCircle);
      this.logo = logoContainer;
    }

    // Title using colored circles to represent "COLOR RUSH" (graphics-only)
    if (!this.title) {
      const titleContainer = this.add.container(Math.round(width / 2), Math.round(height * 0.4));
      
      // Create colorful dots to spell out the game concept
      const colors = [0xE74C3C, 0x2ECC71, 0x3498DB, 0xF1C40F, 0x9B59B6];
      const dotRadius = 25 * scaleFactor;
      const spacing = 60 * scaleFactor;
      
      // Create a row of colored dots
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * spacing; // Center the dots
        const dot = this.add.circle(x, 0, dotRadius, colors[i]);
        dot.setStrokeStyle(3, 0xFFFFFF, 0.8);
        titleContainer.add(dot);
        
        // Add pulsing animation
        this.tweens.add({
          targets: dot,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 1000 + (i * 200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
      
      // Add central logo circle
      const centerLogo = this.add.circle(0, -dotRadius * 2, dotRadius * 1.5, 0xFFFFFF);
      centerLogo.setStrokeStyle(4, 0x3498DB, 1);
      titleContainer.add(centerLogo);
      
      // Add play symbol in center
      const playSymbol = this.add.triangle(0, -dotRadius * 2, 0, 0, 0, 20, 15, 10, 0x3498DB);
      titleContainer.add(playSymbol);
      
      this.title = titleContainer;
    }

    // Update button positions if they exist
    if (this.startButton) {
      this.startButton.setPosition(Math.round(width / 2), Math.round(height * 0.7));
    }
    
    if (this.howToPlayButton) {
      this.howToPlayButton.setPosition(Math.round(width / 2), Math.round(height * 0.8));
    }
  }
}
