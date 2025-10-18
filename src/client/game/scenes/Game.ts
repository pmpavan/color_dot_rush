import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { UIScene } from './UIScene';
import { DebugService, ProductionDebugService } from '../../services/DebugService';
import { DifficultyManager } from '../../services/DifficultyManager';
import { ILeaderboardService, DevvitLeaderboardService, MockLeaderboardService } from '../../services/LeaderboardService';
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
  
  // Slow-motion state management
  private isSlowMoActive: boolean = false;
  private slowMoStartTime: number = 0;
  private slowMoVignette: Phaser.GameObjects.Rectangle | null = null;
  private slowMoTween: Phaser.Tweens.Tween | null = null;

  // Object management
  private objectPool: ObjectPoolManager;
  private objectSpawner: ObjectSpawner;

  // Debug and difficulty management
  private debugService: IDebugService;
  private difficultyManager: DifficultyManager;
  private leaderboardService: ILeaderboardService;
  private hitboxGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super('Game');
    
    // Initialize services based on environment
    if (process.env.NODE_ENV === 'production') {
      this.debugService = new ProductionDebugService();
      this.leaderboardService = new DevvitLeaderboardService();
    } else {
      this.debugService = DebugService.getInstance();
      // Use mock service for development to avoid API calls during testing
      this.leaderboardService = new MockLeaderboardService();
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
    
    // Reset slow-motion state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
    this.slowMoVignette = null;
    this.slowMoTween = null;
  }

  create(): void {
    // Configure camera & background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background from design spec
    
    // Fade in from black for smooth transition (with safety check for tests)
    if (this.cameras?.main?.fadeIn) {
      this.cameras.main.fadeIn(250, 0, 0, 0);
    }

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

    // Setup performance optimization event handlers
    this.setupPerformanceOptimization();

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

  private setupPerformanceOptimization(): void {
    // Listen for performance optimization events
    this.events.on('performance_optimization', (data: { event: string; data: any }) => {
      const { event, data: settings } = data;
      
      switch (event) {
        case 'settings_update':
          this.applyPerformanceSettings(settings);
          break;
        case 'emergency_optimization':
          this.applyEmergencyOptimizations(settings);
          break;
      }
    });
  }

  private applyPerformanceSettings(settings: any): void {
    // Apply performance settings to object spawner and pools
    if (this.objectSpawner) {
      this.objectSpawner.setMaxObjects(settings.maxObjects);
      this.objectSpawner.setEffectsEnabled(settings.effectsEnabled);
      this.objectSpawner.setParticleQuality(settings.particleQuality);
    }
    
    // Update object pool limits
    if (this.objectPool) {
      this.objectPool.updateMaxSizes({
        dots: Math.floor(settings.maxObjects * 0.7), // 70% dots
        bombs: Math.floor(settings.maxObjects * 0.2), // 20% bombs
        slowMo: Math.floor(settings.maxObjects * 0.1), // 10% slow-mo
      });
    }
    
    console.log('Applied performance settings:', settings);
  }

  private applyEmergencyOptimizations(settings: any): void {
    console.warn('Applying emergency performance optimizations');
    
    // Immediately reduce active objects
    if (this.objectPool) {
      this.objectPool.emergencyCleanup(settings.maxObjects);
    }
    
    // Disable all non-essential visual effects
    this.tweens.killAll();
    
    // Apply settings
    this.applyPerformanceSettings(settings);
  }

  private handleTap(x: number, y: number): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Record input processing start for performance monitoring
    const performanceMonitor = (this.game as any).performanceMonitor;
    
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
    
    // Record input processing completion for performance monitoring
    if (performanceMonitor && performanceMonitor.recordInputProcessed) {
      performanceMonitor.recordInputProcessed();
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
   * Specifications: 5-7 burst particles of dot's color, dot shrinks to nothing (300ms)
   */
  private createCorrectTapEffect(dot: Dot): void {
    const x = dot.x;
    const y = dot.y;
    const color = dot.getColor();
    
    // Get the correct dot asset for particles based on color
    const dotAssetKey = this.getDotAssetByColor(color) || 'dot-red';
    
    // Create celebratory particle burst with 5-7 particles of dot's color
    const particles = this.add.particles(x, y, dotAssetKey, {
      speed: { min: 120, max: 250 },
      scale: { start: 0.6, end: 0 },
      lifespan: 300,
      quantity: { min: 5, max: 7 },
      blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 10), quantity: 7 }
    });

    // Dot shrinks to nothing with satisfying "pop" animation (300ms)
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

    // Add extra "juice" with a secondary burst effect
    const secondaryBurst = this.add.particles(x, y, dotAssetKey, {
      speed: { min: 50, max: 100 },
      scale: { start: 0.3, end: 0 },
      lifespan: 200,
      quantity: { min: 3, max: 5 },
      blendMode: 'NORMAL',
      delay: 50
    });

    this.time.delayedCall(250, () => {
      secondaryBurst.destroy();
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
    
    // Main explosion burst using red and yellow dot assets for variety
    const explosion = this.add.particles(x, y, 'dot-red', {
      tint: explosionColors,
      speed: { min: 200, max: 500 },
      scale: { start: 1.2, end: 0 },
      lifespan: { min: 500, max: 1000 },
      quantity: { min: 20, max: 30 },
      blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, bomb.size / 2), quantity: 25 }
    });

    // Secondary explosion ring using yellow dots for more dramatic effect
    const secondaryExplosion = this.add.particles(x, y, 'dot-yellow', {
      tint: [0xFF0000, 0xFF4500], // Red and orange tint on yellow base
      speed: { min: 100, max: 250 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 300, max: 600 },
      quantity: { min: 10, max: 15 },
      blendMode: 'ADD',
      delay: 50 // Slight delay for layered effect
    });

    // Tertiary explosion with smaller particles for extra detail
    const tertiaryExplosion = this.add.particles(x, y, 'dot-red', {
      tint: [0xFFD700, 0xFF8C00], // Gold and dark orange
      speed: { min: 300, max: 600 },
      scale: { start: 0.4, end: 0 },
      lifespan: { min: 200, max: 400 },
      quantity: { min: 15, max: 20 },
      blendMode: 'ADD',
      delay: 25
    });

    // Flash effect for dramatic impact
    const flash = this.add.rectangle(x, y, bomb.size * 3, bomb.size * 3, 0xFFFFFF, 0.9);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      ease: 'Power2',
      onComplete: () => flash.destroy()
    });

    // Secondary flash with orange tint
    const orangeFlash = this.add.rectangle(x, y, bomb.size * 2, bomb.size * 2, 0xFF4500, 0.7);
    this.tweens.add({
      targets: orangeFlash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      ease: 'Power2',
      delay: 50,
      onComplete: () => orangeFlash.destroy()
    });

    // Hide bomb immediately
    bomb.setVisible(false);
    
    // Clean up explosion effects after animation
    this.time.delayedCall(1000, () => {
      explosion.destroy();
      secondaryExplosion.destroy();
      tertiaryExplosion.destroy();
      bomb.deactivate();
    });
  }

  private handleSlowMoActivation(slowMoDot: SlowMoDot): void {
    if (this.currentState !== GameState.PLAYING || this.slowMoCharges <= 0 || this.isSlowMoActive) return;

    console.log(`Slow-mo activated! Charges remaining: ${this.slowMoCharges - 1}`);
    
    // Consume a slow-mo charge
    this.slowMoCharges--;
    
    // Create radial blue glow and visual feedback
    this.createSlowMoActivationEffect(slowMoDot);
    
    // Activate slow-motion effect with smooth transitions
    this.activateSlowMotion();
    
    // Deactivate the slow-mo dot with special effect
    slowMoDot.activateSlowMo();
    
    this.updateUI();
  }

  /**
   * Create visual effects for slow-mo activation
   * Specifications: radial blue glow and smooth ease-in-out time scaling
   */
  private createSlowMoActivationEffect(slowMoDot: SlowMoDot): void {
    const x = slowMoDot.x;
    const y = slowMoDot.y;
    
    // Primary radial blue glow emanating from tap point
    const primaryGlow = this.add.circle(x, y, 25, 0x3498DB, 0.8);
    primaryGlow.setDepth(998);
    
    this.tweens.add({
      targets: primaryGlow,
      radius: 350,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => {
        primaryGlow.destroy();
      }
    });

    // Secondary glow with different timing for layered effect
    const secondaryGlow = this.add.circle(x, y, 15, 0x5DADE2, 0.9);
    secondaryGlow.setDepth(999);
    
    this.tweens.add({
      targets: secondaryGlow,
      radius: 200,
      alpha: 0,
      duration: 500,
      ease: 'Power3.easeOut',
      delay: 100,
      onComplete: () => {
        secondaryGlow.destroy();
      }
    });

    // Tertiary pulse effect for extra impact
    const pulseGlow = this.add.circle(x, y, 40, 0x85C1E9, 0.5);
    pulseGlow.setDepth(997);
    
    this.tweens.add({
      targets: pulseGlow,
      radius: 500,
      alpha: 0,
      duration: 1000,
      ease: 'Sine.easeOut',
      delay: 50,
      onComplete: () => {
        pulseGlow.destroy();
      }
    });

    // Create particle burst with blue theme
    const particles = this.add.particles(x, y, 'slowmo-dot', {
      tint: [0x3498DB, 0x5DADE2, 0x85C1E9],
      speed: { min: 100, max: 250 },
      scale: { start: 0.5, end: 0 },
      lifespan: 600,
      quantity: { min: 8, max: 12 },
      blendMode: 'ADD',
      emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 15), quantity: 10 }
    });

    this.time.delayedCall(600, () => {
      particles.destroy();
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

  /**
   * Create instantaneous expanding ripple effect for all taps
   * Specifications: white, 200ms duration
   */
  private createRippleEffect(x: number, y: number): void {
    // Primary ripple - main visual feedback (white, 200ms)
    const ripple = this.add.circle(x, y, 8, 0xFFFFFF, 0.9);
    ripple.setStrokeStyle(4, 0xFFFFFF, 0.8);
    
    this.tweens.add({
      targets: ripple,
      radius: 120,
      alpha: 0,
      duration: 200, // Exact 200ms specification
      ease: 'Power2.easeOut',
      onComplete: () => {
        ripple.destroy();
      }
    });

    // Secondary inner ripple for extra "juice" and tactile feedback
    const innerRipple = this.add.circle(x, y, 4, 0xFFFFFF, 0.7);
    innerRipple.setStrokeStyle(2, 0xFFFFFF, 0.5);
    
    this.tweens.add({
      targets: innerRipple,
      radius: 60,
      alpha: 0,
      duration: 150,
      ease: 'Power2.easeOut',
      delay: 25,
      onComplete: () => {
        innerRipple.destroy();
      }
    });

    // Tertiary micro-ripple for immediate feedback
    const microRipple = this.add.circle(x, y, 2, 0xFFFFFF, 0.5);
    
    this.tweens.add({
      targets: microRipple,
      radius: 30,
      alpha: 0,
      duration: 100,
      ease: 'Power3.easeOut',
      onComplete: () => {
        microRipple.destroy();
      }
    });
  }

  private activateSlowMotion(): void {
    if (this.isSlowMoActive) return;
    
    this.isSlowMoActive = true;
    this.slowMoStartTime = this.time.now;
    
    console.log('Slow-motion activated with smooth transitions');
    
    // Create blue vignette effect around screen edges
    this.slowMoVignette = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x3498DB,
      0.0
    );
    this.slowMoVignette.setDepth(999);
    
    // Smooth transition to slow-motion with ease-in-out curve (specification requirement)
    this.slowMoTween = this.tweens.add({
      targets: { timeScale: 1.0, vignetteAlpha: 0.0 },
      timeScale: 0.3, // Slow down to 30% speed
      vignetteAlpha: 0.35, // Subtle blue vignette
      duration: 400, // Smooth 400ms transition for better feel
      ease: 'Power2.easeInOut', // Smooth ease-in-out curve as specified
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const timeScale = 1.0 - (0.7 * progress); // 1.0 -> 0.3
        const vignetteAlpha = 0.35 * progress; // 0.0 -> 0.35
        
        // Apply time scaling to physics and tweens
        this.physics.world.timeScale = timeScale;
        this.tweens.timeScale = timeScale;
        
        // Update vignette alpha with smooth interpolation
        if (this.slowMoVignette) {
          this.slowMoVignette.setAlpha(vignetteAlpha);
        }
      },
      onComplete: () => {
        // Add subtle pulsing effect to vignette during slow-mo for enhanced feedback
        if (this.slowMoVignette) {
          this.tweens.add({
            targets: this.slowMoVignette,
            alpha: 0.45,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
          });
        }
      }
    });
    
    // Schedule restoration of normal time after duration
    this.time.delayedCall(SlowMoDot.getDuration(), () => {
      this.deactivateSlowMotion();
    });
  }
  
  /**
   * Deactivate slow-motion with smooth transition back to normal speed
   */
  private deactivateSlowMotion(): void {
    if (!this.isSlowMoActive) return;
    
    console.log('Slow-motion deactivating with smooth transition');
    
    // Stop any ongoing slow-mo tweens
    if (this.slowMoTween) {
      this.slowMoTween.destroy();
      this.slowMoTween = null;
    }
    
    // Stop vignette pulsing
    if (this.slowMoVignette) {
      this.tweens.killTweensOf(this.slowMoVignette);
    }
    
    // Smooth transition back to normal speed with ease-in-out curve
    this.tweens.add({
      targets: { timeScale: 0.3, vignetteAlpha: this.slowMoVignette?.alpha || 0.35 },
      timeScale: 1.0, // Return to normal speed
      vignetteAlpha: 0.0, // Fade out vignette
      duration: 500, // Slightly longer transition out for smooth feel
      ease: 'Power2.easeInOut', // Smooth ease-in-out curve as specified
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const timeScale = 0.3 + (0.7 * progress); // 0.3 -> 1.0
        const vignetteAlpha = (this.slowMoVignette?.alpha || 0.35) * (1 - progress);
        
        // Apply time scaling with smooth interpolation
        this.physics.world.timeScale = timeScale;
        this.tweens.timeScale = timeScale;
        
        // Update vignette alpha with smooth fade
        if (this.slowMoVignette) {
          this.slowMoVignette.setAlpha(vignetteAlpha);
        }
      },
      onComplete: () => {
        // Clean up vignette
        if (this.slowMoVignette) {
          this.slowMoVignette.destroy();
          this.slowMoVignette = null;
        }
        
        // Reset slow-mo state
        this.isSlowMoActive = false;
        this.slowMoStartTime = 0;
        
        console.log('Slow-motion deactivated - normal speed restored with smooth transition');
      }
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
    this.slowMoCharges = SlowMoDot.getInitialCharges(); // Use constant from SlowMoDot
    
    // Reset slow-motion state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
    if (this.slowMoVignette) {
      this.slowMoVignette.destroy();
      this.slowMoVignette = null;
    }
    if (this.slowMoTween) {
      this.slowMoTween.destroy();
      this.slowMoTween = null;
    }
    
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
    
    // Force deactivate slow-motion if active
    if (this.isSlowMoActive) {
      this.forceDeactivateSlowMotion();
    }
    
    // Clear any remaining visual effects
    this.tweens.killAll();
    
    // Calculate final session time in seconds and milliseconds
    const sessionTimeSeconds = Math.floor(this.elapsedTime / 1000);
    const sessionTimeMs = Math.floor(this.elapsedTime);
    
    // Store best score in local storage
    const currentBestScore = parseInt(localStorage.getItem('colorRushBestScore') || '0');
    if (this.score > currentBestScore) {
      localStorage.setItem('colorRushBestScore', this.score.toString());
      console.log(`New best score: ${this.score}!`);
    }
    
    // Automatic score submission to leaderboard with graceful error handling
    this.submitScoreToLeaderboard(this.score, sessionTimeMs);
    
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

  /**
   * Submit score to leaderboard with automatic retry and graceful error handling
   * Implements fallback messaging for API failures as per requirements
   */
  private async submitScoreToLeaderboard(score: number, sessionTime: number): Promise<void> {
    try {
      console.log(`Submitting score to leaderboard: ${score} points, ${sessionTime}ms session`);
      
      const result = await this.leaderboardService.submitScore(score, sessionTime);
      
      if (result.success) {
        console.log('Score submitted successfully:', result.message);
        if (result.rank) {
          console.log(`Current leaderboard rank: ${result.rank}`);
        }
      } else {
        console.warn('Score submission failed:', result.message);
        this.showScoreSubmissionError(result.message || 'Could not submit score');
      }
      
    } catch (error) {
      console.error('Error submitting score to leaderboard:', error);
      
      // Graceful degradation - show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      this.showScoreSubmissionError(errorMessage);
    }
  }

  /**
   * Show user-friendly error message for score submission failures
   * Provides fallback messaging as required by task specifications
   */
  private showScoreSubmissionError(message: string): void {
    // Create a temporary error notification that doesn't interrupt gameplay
    const errorText = this.add.text(
      this.scale.width / 2,
      this.scale.height - 100,
      `⚠️ ${message}`,
      {
        fontFamily: 'Poppins',
        fontSize: '18px',
        color: '#F39C12', // Orange warning color
        backgroundColor: '#2C3E50',
        padding: { x: 20, y: 10 },
        align: 'center',
      }
    ).setOrigin(0.5).setDepth(1000).setAlpha(0);

    // Fade in, hold, then fade out
    this.tweens.add({
      targets: errorText,
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: errorText,
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeIn',
            onComplete: () => {
              errorText.destroy();
            }
          });
        });
      }
    });
  }

  private updateGameTime(): void {
    // Calculate elapsed time accounting for slow-motion periods
    let realElapsedTime = this.time.now - this.gameStartTime;
    
    // If slow-mo is active, adjust the elapsed time calculation
    // This ensures scoring fairness - slow-mo doesn't artificially extend game time
    if (this.isSlowMoActive) {
      const slowMoElapsed = this.time.now - this.slowMoStartTime;
      const slowMoAdjustment = slowMoElapsed * (1 - 0.3); // Subtract the "extra" time from slow-mo
      realElapsedTime -= slowMoAdjustment;
    }
    
    this.elapsedTime = realElapsedTime;
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

  /**
   * Get the correct dot asset key based on color
   */
  private getDotAssetByColor(color: GameColor): string {
    const colorMap: Record<GameColor, string> = {
      [GameColor.RED]: 'dot-red',
      [GameColor.GREEN]: 'dot-green',
      [GameColor.BLUE]: 'dot-blue',
      [GameColor.YELLOW]: 'dot-yellow',
      [GameColor.PURPLE]: 'dot-purple',
    };
    return colorMap[color] || 'dot-red';
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
  
  public isSlowMotionActive(): boolean {
    return this.isSlowMoActive;
  }
  
  /**
   * Force deactivate slow-motion immediately (used during game over)
   */
  private forceDeactivateSlowMotion(): void {
    if (!this.isSlowMoActive) return;
    
    console.log('Force deactivating slow-motion');
    
    // Stop any ongoing slow-mo tweens
    if (this.slowMoTween) {
      this.slowMoTween.destroy();
      this.slowMoTween = null;
    }
    
    // Clean up vignette immediately
    if (this.slowMoVignette) {
      this.tweens.killTweensOf(this.slowMoVignette);
      this.slowMoVignette.destroy();
      this.slowMoVignette = null;
    }
    
    // Reset time scale immediately
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;
    
    // Reset slow-mo state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
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
