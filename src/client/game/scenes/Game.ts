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
    // Game object events are now handled through centralized collision detection
    // This method is kept for potential future event handling needs
    console.log('Game object event system initialized (centralized collision detection)');
  }

  private handleTap(x: number, y: number): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Create ripple effect for all taps
    this.createRippleEffect(x, y);
    
    // Centralized collision detection for all game objects
    const tappedObject = this.checkCollisionAtPoint(x, y);
    
    if (tappedObject) {
      // Handle the tapped object based on its type
      if (tappedObject instanceof Dot) {
        this.handleDotTap(tappedObject);
      } else if (tappedObject instanceof Bomb) {
        this.handleBombTap(tappedObject);
      } else if (tappedObject instanceof SlowMoDot) {
        this.handleSlowMoActivation(tappedObject);
      }
    }
    
    console.log(`Tap at (${x}, ${y}) - Object: ${tappedObject ? tappedObject.constructor.name : 'none'}`);
  }

  /**
   * Centralized collision detection for tap input
   * Checks all active game objects for collision with tap point
   */
  private checkCollisionAtPoint(x: number, y: number): Dot | Bomb | SlowMoDot | null {
    // Check dots first (highest priority for gameplay)
    const activeDots = this.objectPool.getActiveDots();
    for (const dot of activeDots) {
      if (this.isPointInBounds(x, y, dot.getBounds())) {
        return dot;
      }
    }

    // Check slow-mo dots (power-ups have priority over bombs)
    const activeSlowMoDots = this.objectPool.getActiveSlowMoDots();
    for (const slowMoDot of activeSlowMoDots) {
      if (this.isPointInBounds(x, y, slowMoDot.getBounds())) {
        return slowMoDot;
      }
    }

    // Check bombs last (most dangerous, so check after other objects)
    const activeBombs = this.objectPool.getActiveBombs();
    for (const bomb of activeBombs) {
      if (this.isPointInBounds(x, y, bomb.getBounds())) {
        return bomb;
      }
    }

    return null;
  }

  /**
   * Check if a point is within the bounds of a rectangle
   */
  private isPointInBounds(x: number, y: number, bounds: Phaser.Geom.Rectangle): boolean {
    return Phaser.Geom.Rectangle.Contains(bounds, x, y);
  }

  private handleDotTap(dot: Dot): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Check if dot matches target color
    if (dot.isCorrectColor(this.targetColor)) {
      // Correct tap - award point (+1 for correct taps)
      this.score++;
      
      // Create celebratory pop effect with particle burst
      this.createCorrectTapEffect(dot);
      
      // Deactivate the dot after successful tap
      dot.deactivate();
      
      // Change target color occasionally for variety (30% chance)
      if (Math.random() < 0.3) {
        this.targetColor = this.getRandomColor();
        this.objectSpawner.setTargetColor(this.targetColor);
      }
      
      console.log(`Correct tap! Score: ${this.score}, Target: ${this.targetColor}`);
    } else {
      // Wrong color - immediate game over (no delay, immediate termination)
      console.log(`Wrong color tapped! Expected: ${this.targetColor}, Got: ${dot.getColor()}`);
      this.createWrongTapEffect(dot);
      
      // Immediate state change to game over - no delays or animations
      this.changeState(GameState.GAME_OVER);
      return;
    }

    this.updateUI();
  }

  /**
   * Create visual feedback for correct dot taps
   * Includes particle burst and satisfying "pop" animation
   */
  private createCorrectTapEffect(dot: Dot): void {
    const x = dot.x;
    const y = dot.y;
    const color = dot.getColor();
    
    // Create particle burst with 5-7 particles of dot's color
    const particles = this.add.particles(x, y, 'dot-red', {
      tint: parseInt(color.replace('#', '0x')),
      speed: { min: 80, max: 200 },
      scale: { start: 0.4, end: 0 },
      lifespan: 300,
      quantity: { min: 5, max: 7 },
      blendMode: 'NORMAL'
    });

    // Dot shrinks to nothing with satisfying animation
    this.tweens.add({
      targets: dot,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        particles.destroy();
      }
    });
  }

  /**
   * Create visual feedback for wrong dot taps
   */
  private createWrongTapEffect(dot: Dot): void {
    // Create red warning ripple effect
    const ripple = this.add.circle(dot.x, dot.y, 10, 0xFF0000, 0.8);
    
    this.tweens.add({
      targets: ripple,
      radius: dot.size * 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        ripple.destroy();
      }
    });

    // Flash the dot red briefly
    const originalTint = dot.tintTopLeft;
    dot.setTint(0xFF0000);
    
    this.time.delayedCall(200, () => {
      dot.setTint(originalTint);
    });
  }

  private handleBombTap(bomb: Bomb): void {
    if (this.currentState !== GameState.PLAYING) return;

    console.log('Bomb tapped! Game Over!');
    
    // Create explosion effect with screen shake and particles
    this.createBombExplosionEffect(bomb);
    
    // Immediate game termination - no delays, instant state change
    this.changeState(GameState.GAME_OVER);
  }

  /**
   * Create explosion effect for bomb taps
   * Includes screen shake, particle explosion, and visual feedback
   * Specifications: red/orange/yellow particles, 2-3px screen shake for 150ms
   */
  private createBombExplosionEffect(bomb: Bomb): void {
    const x = bomb.x;
    const y = bomb.y;
    
    // Screen shake effect (2-3px, 150ms) - exact specification
    this.cameras.main.shake(150, 0.025); // 150ms duration, 0.025 intensity (~2-3px)
    
    // Create explosion particle effect with red/orange/yellow colors
    const explosionColors = [0xFF0000, 0xFF4500, 0xFF8C00, 0xFFD700]; // Red, OrangeRed, DarkOrange, Gold
    
    // Main explosion burst
    const explosion = this.add.particles(x, y, 'dot-red', {
      tint: explosionColors,
      speed: { min: 200, max: 500 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 500, max: 1000 },
      quantity: { min: 20, max: 30 },
      blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, bomb.size / 2), quantity: 25 }
    });

    // Secondary explosion ring for more dramatic effect
    const secondaryExplosion = this.add.particles(x, y, 'dot-red', {
      tint: [0xFF0000, 0xFF4500], // Red and orange only for secondary
      speed: { min: 100, max: 250 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 300, max: 600 },
      quantity: { min: 10, max: 15 },
      blendMode: 'ADD',
      delay: 50 // Slight delay for layered effect
    });

    // Flash effect for dramatic impact
    const flash = this.add.rectangle(x, y, bomb.size * 3, bomb.size * 3, 0xFFFFFF, 0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Hide bomb immediately
    bomb.setVisible(false);
    
    // Clean up explosion effects after animation
    this.time.delayedCall(1000, () => {
      explosion.destroy();
      secondaryExplosion.destroy();
      bomb.deactivate();
    });
  }

  private handleSlowMoActivation(slowMoDot: SlowMoDot): void {
    if (this.currentState !== GameState.PLAYING || this.slowMoCharges <= 0) return;

    console.log(`Slow-mo activated! Charges remaining: ${this.slowMoCharges - 1}`);
    
    // Consume a slow-mo charge
    this.slowMoCharges--;
    
    // Create radial blue glow and visual feedback
    this.createSlowMoActivationEffect(slowMoDot);
    
    // Activate slow-motion effect
    this.activateSlowMotion();
    
    // Deactivate the slow-mo dot
    slowMoDot.deactivate();
    
    this.updateUI();
  }

  /**
   * Create visual effects for slow-mo activation
   */
  private createSlowMoActivationEffect(slowMoDot: SlowMoDot): void {
    const x = slowMoDot.x;
    const y = slowMoDot.y;
    
    // Create radial blue glow emanating from tap point
    const glow = this.add.circle(x, y, 20, 0x3498DB, 0.6);
    
    this.tweens.add({
      targets: glow,
      radius: 300,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        glow.destroy();
      }
    });

    // Shrink the slow-mo dot with satisfying animation
    this.tweens.add({
      targets: slowMoDot,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 400,
      ease: 'Back.easeIn'
    });
  }

  private createRippleEffect(x: number, y: number): void {
    // Create expanding white ripple effect for any tap (instantaneous feedback)
    const ripple = this.add.circle(x, y, 8, 0xFFFFFF, 0.9);
    ripple.setStrokeStyle(3, 0xFFFFFF, 0.6);
    
    this.tweens.add({
      targets: ripple,
      radius: 120,
      alpha: 0,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        ripple.destroy();
      }
    });

    // Add a secondary, smaller ripple for extra "juice"
    const innerRipple = this.add.circle(x, y, 4, 0xFFFFFF, 0.6);
    
    this.tweens.add({
      targets: innerRipple,
      radius: 60,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      delay: 50,
      onComplete: () => {
        innerRipple.destroy();
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
    // Validate state transition
    if (this.currentState === newState) {
      console.warn(`Already in state: ${newState}`);
      return;
    }

    // Log state transition for debugging
    console.log(`State transition: ${this.currentState} -> ${newState}`);

    // Perform state transition
    this.exitState(this.currentState);
    const previousState = this.currentState;
    this.currentState = newState;
    this.enterState(newState);

    // Validate successful transition
    if (this.currentState !== newState) {
      console.error(`State transition failed! Expected: ${newState}, Actual: ${this.currentState}`);
      // Attempt to recover to previous state
      this.currentState = previousState;
    }
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
    // Stop object spawning immediately
    this.objectSpawner.pause();
    
    // Reset time scale in case slow-mo was active
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;
    
    // Clear any remaining visual effects
    this.tweens.killAll();
    
    // Calculate final session time in seconds
    const sessionTimeSeconds = Math.floor(this.elapsedTime / 1000);
    
    // Store best score in local storage
    const currentBestScore = parseInt(localStorage.getItem('colorRushBestScore') || '0');
    if (this.score > currentBestScore) {
      localStorage.setItem('colorRushBestScore', this.score.toString());
      console.log(`New best score: ${this.score}!`);
    }
    
    // TODO: Submit score to leaderboard service
    console.log(`Game Over! Final Score: ${this.score}, Time: ${sessionTimeSeconds}s, Best: ${Math.max(this.score, currentBestScore)}`);
    
    // Prepare data for GameOver scene
    const gameOverData = {
      finalScore: this.score,
      sessionTime: sessionTimeSeconds,
      bestScore: Math.max(this.score, currentBestScore),
      targetColor: this.targetColor
    };
    
    // Transition to GameOver scene after a brief delay for dramatic effect
    this.time.delayedCall(1500, () => {
      this.scene.stop('UI'); // Stop UIScene
      this.scene.start('GameOver', gameOverData);
    });
  }

  private updateGameTime(): void {
    this.elapsedTime = this.time.now - this.gameStartTime;
    this.updateUI();
    
    // Update debug service with current elapsed time for real-time calculations
    if (this.debugService.isEnabled()) {
      this.debugService.updateElapsedTime(this.elapsedTime);
    }
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

  // Public methods for testing and debugging
  public triggerGameOver(): void {
    this.changeState(GameState.GAME_OVER);
  }

  public getCurrentState(): GameState {
    return this.currentState;
  }

  public getScore(): number {
    return this.score;
  }

  public getElapsedTime(): number {
    return this.elapsedTime;
  }

  public getSlowMoCharges(): number {
    return this.slowMoCharges;
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
