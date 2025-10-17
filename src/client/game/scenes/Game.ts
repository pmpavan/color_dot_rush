import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { UIScene } from './UIScene';
import { DebugService, ProductionDebugService } from '../../services/DebugService';
import { DifficultyManager } from '../../services/DifficultyManager';
import { IDebugService } from '../../../shared/types/debug';
import { ObjectPoolManager, ObjectSpawner, Dot, Bomb, SlowMoDot } from '../objects';
import { GameColor } from '../../../shared/types/game';

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
  private targetColor: GameColor = GameColor.RED;
  private slowMoCharges: number = 3;
  private gameStartTime: number = 0;
  private gameTimer: Phaser.Time.TimerEvent | null = null;

  // Object management
  private objectPool: ObjectPoolManager;
  private objectSpawner: ObjectSpawner;

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
    this.targetColor = GameColor.RED;
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

    // Initialize object management systems
    this.objectPool = new ObjectPoolManager(this);
    this.objectSpawner = new ObjectSpawner(this, this.objectPool, this.difficultyManager);

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
      this.objectSpawner.updateScreenBounds(width, height);
    });

    // Initialize debug system
    this.setupDebugSystem();

    // Setup game object event handlers
    this.setupGameObjectEvents();

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

  private setupGameObjectEvents(): void {
    // Listen for dot tap events
    this.events.on('dot-tapped', (dot: Dot) => {
      this.handleDotTap(dot);
    });

    // Listen for bomb tap events
    this.events.on('bomb-tapped', (bomb: Bomb) => {
      this.handleBombTap(bomb);
    });

    // Listen for slow-mo activation events
    this.events.on('slowmo-activated', (slowMoDot: SlowMoDot) => {
      this.handleSlowMoActivation(slowMoDot);
    });
  }

  private handleTap(x: number, y: number): void {
    // Create ripple effect for all taps
    this.createRippleEffect(x, y);
    
    // The actual object interaction is handled by the objects themselves
    // through their interactive areas and event emissions
    console.log(`Tap at (${x}, ${y})`);
  }

  private handleDotTap(dot: Dot): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Check if dot matches target color
    if (dot.isCorrectColor(this.targetColor)) {
      // Correct tap - award point and create celebration effect
      this.score++;
      dot.createPopEffect();
      
      // Change target color occasionally for variety
      if (Math.random() < 0.3) { // 30% chance to change color
        this.targetColor = this.getRandomColor();
        this.objectSpawner.setTargetColor(this.targetColor);
      }
    } else {
      // Wrong color - game over
      dot.createRippleEffect();
      this.changeState(GameState.GAME_OVER);
      return;
    }

    this.updateUI();
  }

  private handleBombTap(bomb: Bomb): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Bomb tap always triggers game over
    bomb.createRippleEffect();
    this.changeState(GameState.GAME_OVER);
  }

  private handleSlowMoActivation(slowMoDot: SlowMoDot): void {
    if (this.currentState !== GameState.PLAYING || this.slowMoCharges <= 0) return;

    // Consume a slow-mo charge
    this.slowMoCharges--;
    
    // Create visual feedback
    slowMoDot.createRippleEffect();
    
    // Activate slow-motion effect
    this.activateSlowMotion();
    
    this.updateUI();
  }

  private createRippleEffect(x: number, y: number): void {
    // Create expanding white ripple effect for any tap
    const ripple = this.add.circle(x, y, 10, 0xFFFFFF, 0.8);
    
    this.tweens.add({
      targets: ripple,
      radius: 100,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        ripple.destroy();
      }
    });
  }

  private activateSlowMotion(): void {
    // Implement slow-motion effect with smooth time scaling
    this.physics.world.timeScale = 0.3; // Slow down physics
    this.tweens.timeScale = 0.3; // Slow down tweens
    
    // Create blue vignette effect
    const vignette = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x3498DB,
      0.2
    );
    vignette.setDepth(999);
    
    // Restore normal time after duration
    this.time.delayedCall(SlowMoDot.getDuration(), () => {
      this.physics.world.timeScale = 1;
      this.tweens.timeScale = 1;
      vignette.destroy();
    });
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
    
    // Reset object systems
    this.objectSpawner.reset();
    this.objectSpawner.setTargetColor(this.targetColor);
    
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

    // Start object spawning
    this.objectSpawner.resume();
    
    console.log('Game started!');
  }

  private endGame(): void {
    // Stop object spawning
    this.objectSpawner.pause();
    
    // Reset time scale in case slow-mo was active
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;
    
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

  private getRandomColor(): GameColor {
    const colors = [GameColor.RED, GameColor.GREEN, GameColor.BLUE, GameColor.YELLOW, GameColor.PURPLE];
    return colors[Math.floor(Math.random() * colors.length)] as GameColor;
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

    // Draw hitboxes for all active game objects
    if (this.currentState === GameState.PLAYING && this.hitboxGraphics) {
      // Draw hitboxes for active dots
      const activeDots = this.objectPool.getActiveDots();
      activeDots.forEach(dot => {
        const bounds = dot.getBounds();
        this.hitboxGraphics!.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.hitboxGraphics!.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      });

      // Draw hitboxes for active bombs
      const activeBombs = this.objectPool.getActiveBombs();
      activeBombs.forEach(bomb => {
        const bounds = bomb.getBounds();
        this.hitboxGraphics!.lineStyle(2, 0xff0000, 0.8); // Red for bombs
        this.hitboxGraphics!.fillStyle(0xff0000, 0.1);
        this.hitboxGraphics!.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.hitboxGraphics!.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.hitboxGraphics!.lineStyle(2, 0x00ff00, 0.8); // Reset to green
        this.hitboxGraphics!.fillStyle(0x00ff00, 0.1);
      });

      // Draw hitboxes for active slow-mo dots
      const activeSlowMoDots = this.objectPool.getActiveSlowMoDots();
      activeSlowMoDots.forEach(slowMoDot => {
        const bounds = slowMoDot.getBounds();
        this.hitboxGraphics!.lineStyle(2, 0x0000ff, 0.8); // Blue for slow-mo
        this.hitboxGraphics!.fillStyle(0x0000ff, 0.1);
        this.hitboxGraphics!.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.hitboxGraphics!.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.hitboxGraphics!.lineStyle(2, 0x00ff00, 0.8); // Reset to green
        this.hitboxGraphics!.fillStyle(0x00ff00, 0.1);
      });
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
  override update(time: number, delta: number): void {
    super.update(time, delta);

    if (this.currentState === GameState.PLAYING) {
      // Update object spawner
      this.objectSpawner.update(delta, this.elapsedTime);
      
      // Update object pool
      this.objectPool.update(delta);
      
      // Update difficulty display for debugging
      this.updateDifficultyDisplay();
      
      // Update hitbox visualization
      this.drawHitboxes();
    }
  }

  // Clean up debug resources when scene shuts down
  shutdown(): void {
    if (this.debugService instanceof DebugService) {
      this.debugService.destroy();
    }
  }
}
