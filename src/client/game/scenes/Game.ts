import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { UIScene } from './UIScene';
import { DebugService, ProductionDebugService } from '../../services/DebugService';
import { DifficultyManager } from '../../services/DifficultyManager';
import { IDebugService } from '../../../shared/types/debug';

// Game state finite state machine
enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

export class Game extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Image;
  private currentState: GameState = GameState.READY;
  private uiScene: UIScene | null = null;
  
  // Game state variables
  private score: number = 0;
  private elapsedTime: number = 0;
  private targetColor: string = 'RED';
  private slowMoCharges: number = 3;
  private gameStartTime: number = 0;
  private gameTimer: Phaser.Time.TimerEvent | null = null;

  // Debug and difficulty management
  private debugService: IDebugService;
  private difficultyManager: DifficultyManager;
  private hitboxGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('Game');
    
    // Initialize services based on environment
    if (process.env.NODE_ENV === 'production') {
      this.debugService = new ProductionDebugService();
    } else {
      this.debugService = DebugService.getInstance();
    }
    
    this.difficultyManager = new DifficultyManager();
  }

  init(): void {
    // Reset game state
    this.currentState = GameState.READY;
    this.score = 0;
    this.elapsedTime = 0;
    this.targetColor = 'RED';
    this.slowMoCharges = 3;
    this.gameStartTime = 0;
    this.gameTimer = null;
    this.uiScene = null;
  }

  create(): void {
    // Configure camera & background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background from design spec

    // Background image
    this.background = this.add.image(0, 0, 'background').setOrigin(0).setAlpha(0.3);

    // Get reference to UIScene
    this.uiScene = this.scene.get('UI') as UIScene;

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    // Initialize debug system
    this.setupDebugSystem();

    // Initialize game state
    this.changeState(GameState.READY);

    // Setup input handling
    this.setupInputHandling();

    // Start the game after a brief delay
    this.time.delayedCall(1000, () => {
      this.changeState(GameState.PLAYING);
    });
  }

  private setupInputHandling(): void {
    // Centralized scene-level input handler for reliability
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.currentState === GameState.PLAYING) {
        this.handleTap(pointer.x, pointer.y);
      }
    });
  }

  private handleTap(x: number, y: number): void {
    // TODO: Implement tap collision detection with game objects
    // For now, just increment score as placeholder
    this.score++;
    this.updateUI();
    
    console.log(`Tap at (${x}, ${y}) - Score: ${this.score}`);
  }

  private updateLayout(width: number, height: number): void {
    // Resize camera viewport to avoid black bars
    this.cameras.resize(width, height);

    // Stretch background to fill entire screen
    if (this.background) {
      this.background.setDisplaySize(width, height);
    }
  }

  private changeState(newState: GameState): void {
    this.exitState(this.currentState);
    this.currentState = newState;
    this.enterState(newState);
  }

  private exitState(state: GameState): void {
    switch (state) {
      case GameState.READY:
        break;
      case GameState.PLAYING:
        // Stop game timer
        if (this.gameTimer) {
          this.gameTimer.destroy();
          this.gameTimer = null;
        }
        break;
      case GameState.GAME_OVER:
        break;
    }
  }

  private enterState(state: GameState): void {
    switch (state) {
      case GameState.READY:
        // Initialize game objects
        this.initializeGame();
        break;
      case GameState.PLAYING:
        // Start spawning, enable input, start timer
        this.startGame();
        break;
      case GameState.GAME_OVER:
        // Stop spawning, show game over
        this.endGame();
        break;
    }
  }

  private initializeGame(): void {
    // Reset game state
    this.score = 0;
    this.elapsedTime = 0;
    this.targetColor = this.getRandomColor();
    this.slowMoCharges = 3;
    
    // Update UI
    this.updateUI();
  }

  private startGame(): void {
    this.gameStartTime = this.time.now;
    
    // Start game timer to update elapsed time
    this.gameTimer = this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true,
    });

    // TODO: Start object spawning
    console.log('Game started!');
  }

  private endGame(): void {
    // TODO: Submit score to leaderboard
    console.log(`Game Over! Final Score: ${this.score}, Time: ${this.elapsedTime}ms`);
    
    // Transition to GameOver scene after a brief delay
    this.time.delayedCall(1000, () => {
      this.scene.stop('UI'); // Stop UIScene
      this.scene.start('GameOver');
    });
  }

  private updateGameTime(): void {
    this.elapsedTime = this.time.now - this.gameStartTime;
    this.updateUI();
  }

  private updateUI(): void {
    if (this.uiScene) {
      this.uiScene.setScore(this.score);
      this.uiScene.setTime(this.elapsedTime);
      this.uiScene.setTargetColor(this.targetColor);
      this.uiScene.setSlowMoCharges(this.slowMoCharges);
    }
  }

  private getRandomColor(): string {
    const colors = ['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Public method for testing game over
  public triggerGameOver(): void {
    this.changeState(GameState.GAME_OVER);
  }

  private setupDebugSystem(): void {
    if (!this.debugService.isEnabled()) return;

    // Setup debug service callbacks
    if (this.debugService instanceof DebugService) {
      // Register callback for difficulty parameter changes
      this.debugService.onDifficultyChange((params) => {
        this.difficultyManager.updateParams(params);
        console.log('Difficulty parameters updated:', params);
      });

      // Register callback for hitbox visualization toggle
      this.debugService.onHitboxToggle((enabled) => {
        this.toggleHitboxVisualization(enabled);
      });

      // Initialize debug panel (but keep it hidden initially)
      console.log('Debug system initialized. Press "D" to toggle debug panel.');
    }

    // Create graphics object for hitbox visualization
    this.hitboxGraphics = this.add.graphics();
    this.hitboxGraphics.setDepth(1000); // Render on top
    this.hitboxGraphics.setVisible(false);

    // Enable physics debug if in development
    if (this.physics.world) {
      this.physics.world.debugGraphic = this.add.graphics();
      this.physics.world.debugGraphic.setVisible(false);
    }
  }

  private toggleHitboxVisualization(enabled: boolean): void {
    if (this.hitboxGraphics) {
      this.hitboxGraphics.setVisible(enabled);
    }

    if (this.physics.world && this.physics.world.debugGraphic) {
      this.physics.world.debugGraphic.setVisible(enabled);
    }

    console.log(`Hitbox visualization ${enabled ? 'enabled' : 'disabled'}`);
  }

  private drawHitboxes(): void {
    if (!this.hitboxGraphics || !this.debugService.isHitboxVisualizationEnabled()) {
      return;
    }

    // Clear previous hitboxes
    this.hitboxGraphics.clear();

    // Set hitbox style
    this.hitboxGraphics.lineStyle(2, 0x00ff00, 0.8); // Green outline
    this.hitboxGraphics.fillStyle(0x00ff00, 0.1); // Semi-transparent green fill

    // TODO: Draw hitboxes for all game objects (dots, bombs, power-ups)
    // This will be implemented when game objects are created
    
    // Example hitbox for demonstration (remove when real objects are implemented)
    if (this.currentState === GameState.PLAYING) {
      // Draw example hitbox at center of screen
      const centerX = this.scale.width / 2;
      const centerY = this.scale.height / 2;
      const size = this.difficultyManager.calculateSize(this.elapsedTime / 1000);
      
      this.hitboxGraphics.strokeCircle(centerX, centerY, size / 2);
      this.hitboxGraphics.fillCircle(centerX, centerY, size / 2);
    }
  }

  private updateDifficultyDisplay(): void {
    if (!this.debugService.isEnabled()) return;

    const elapsedSeconds = this.elapsedTime / 1000;
    const metrics = this.difficultyManager.getDifficultyMetrics(elapsedSeconds);
    
    // Log difficulty metrics for debugging
    if (elapsedSeconds > 0 && Math.floor(elapsedSeconds) % 5 === 0) {
      console.log('Difficulty Metrics:', {
        time: Math.floor(elapsedSeconds),
        speed: Math.round(metrics.speed),
        size: Math.round(metrics.size),
        dotCount: metrics.dotCount,
      });
    }
  }

  // Override update method to include debug updates
  update(time: number, delta: number): void {
    super.update(time, delta);

    if (this.currentState === GameState.PLAYING) {
      // Update difficulty display for debugging
      this.updateDifficultyDisplay();
      
      // Update hitbox visualization
      this.drawHitboxes();
    }
  }

  // Clean up debug resources
  destroy(): void {
    if (this.debugService instanceof DebugService) {
      this.debugService.destroy();
    }
    
    super.destroy();
  }
}
