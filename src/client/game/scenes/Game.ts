import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import { SimpleUIScene } from './SimpleUIScene';
import { DebugService, ProductionDebugService } from '../../services/DebugService';
import { DifficultyManager } from '../../services/DifficultyManager';
import { ILeaderboardService, DevvitLeaderboardService, MockLeaderboardService } from '../../services/LeaderboardService';
import { IDebugService } from '../../../shared/types/debug';
import { ObjectPoolManager, ObjectSpawner, Dot, Bomb, SlowMoDot } from '../objects';
import { GameColor } from '../../../shared/types/game';
import { gameLimitsManager } from '../../../shared/config/GameLimits';
import { NeonBackgroundSystem } from '../utils/NeonBackgroundSystem';
import { NeonMotionEffects } from '../utils/NeonMotionEffects';
import { AccessibilityManager } from '../utils/AccessibilityManager';

// Game state finite state machine
enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

export class Game extends Scene {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private neonBackground: NeonBackgroundSystem | null = null;
  private motionEffects: NeonMotionEffects | null = null;
  private accessibilityManager: AccessibilityManager | null = null;
  private currentState: GameState = GameState.READY;
  private uiScene: SimpleUIScene | null = null;

  // Game state variables
  private score: number = 0;
  private elapsedTime: number = 0;
  private targetColor: GameColor = GameColor.RED;
  // slowMoCharges removed - simplified slow mo logic
  private gameStartTime: number = 0;
  private gameTimer: Phaser.Time.TimerEvent | null = null;
  private userRank: number | null = null;

  // Slow-motion state management
  private isSlowMoActive: boolean = false;
  private slowMoStartTime: number = 0;
  private slowMoVignette: Phaser.GameObjects.Rectangle | null = null;
  private slowMoTween: Phaser.Tweens.Tween | null = null;
  private originalSpeeds: Map<any, number> = new Map(); // Track original speeds of objects

  // Object management
  private objectPool: ObjectPoolManager | null = null;
  private objectSpawner: ObjectSpawner | null = null;

  // Debug and difficulty management
  private debugService: IDebugService;
  private difficultyManager: DifficultyManager;
  private leaderboardService: ILeaderboardService;
  private hitboxGraphics: Phaser.GameObjects.Graphics | null = null;

  // Track temporary objects for proper cleanup
  private temporaryObjects: Phaser.GameObjects.GameObject[] = [];
  private temporaryTweens: Phaser.Tweens.Tween[] = [];
  
  // Shutdown flag to prevent updates during destruction
  private isShuttingDown: boolean = false;

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

  private createGraphicsTextures(): void {
    // Skip texture generation - we'll use pure graphics objects instead
    console.log('Game scene: Skipping texture generation, using pure graphics objects');
  }

  init(): void {
    // Reset game state
    this.currentState = GameState.READY;
    this.score = 0;
    this.elapsedTime = 0;
    this.targetColor = GameColor.RED;
    // slowMoCharges initialization removed - simplified logic
    this.gameStartTime = 0;
    this.gameTimer = null;
    this.uiScene = null;

    // Reset slow-motion state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
    this.slowMoVignette = null;
    this.slowMoTween = null;

    // Reset temporary objects tracking
    this.temporaryObjects = [];
    this.temporaryTweens = [];
    
    // Reset shutdown flag
    this.isShuttingDown = false;
    
    // Initialize neon background system
    this.neonBackground = new NeonBackgroundSystem(this);
    
    // Initialize motion effects system
    this.motionEffects = new NeonMotionEffects(this);
  }

  create(): void {
    console.log('Game: Initializing game scene');

    try {
      // Add global error handler for destroy errors during scene transitions
      this.addGlobalErrorHandler();
      
      // Configure camera & background
      this.camera = this.cameras.main;
      this.camera.setBackgroundColor(0x2C3E50); // Dark Slate background from design spec
      console.log('Game: Camera configured');

      // Create graphics-based textures for particles (since we skipped Preloader)
      this.createGraphicsTextures();

      // Fade in from black for smooth transition (with safety check for tests)
      if (this.cameras?.main?.fadeIn) {
        this.cameras.main.fadeIn(250, 0, 0, 0);
      }

      // Create neon background system with starfield and nebula effects
      if (this.neonBackground) {
        this.neonBackground.createBackground();
      }
      
      // Keep legacy background for compatibility (hidden)
      this.background = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x080808, 0).setOrigin(0);

      // Ensure UIScene is properly started and get reference
      this.initializeUIScene();

      // Initialize object management systems
      this.objectPool = new ObjectPoolManager(this);
      this.objectSpawner = new ObjectSpawner(this, this.objectPool, this.difficultyManager);
      
      // Set up slow motion callback for newly spawned objects
      this.objectPool.setSlowMotionCallback((object) => this.applySlowMotionToNewObject(object));
      
      // Set up slow motion charge checker for ObjectSpawner
      // setSlowMoChargeChecker removed - simplified logic

      // Initialize accessibility manager
      this.accessibilityManager = new AccessibilityManager(this);
      console.log('Game: Accessibility manager initialized');

      console.log('Game: Core systems initialized');
    } catch (error) {
      console.error('Game: Error in create():', error);
      throw error;
    }

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
      if (this.objectSpawner) {
        this.objectSpawner.updateScreenBounds(width, height);
      }
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

    // Force initial UI update
    this.updateUI();

    // Start the game after a brief delay
    this.time.delayedCall(1000, () => {
      this.changeState(GameState.PLAYING);
    });

    console.log('Game: Ready to play');
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
      console.log(`[TAP] Tapped object: ${tappedObject.constructor.name}`);
      // Handle the tapped object based on its type
      if (tappedObject instanceof Dot) {
        this.handleDotTap(tappedObject);
      } else if (tappedObject instanceof Bomb) {
        this.handleBombTap(tappedObject);
      } else if (tappedObject instanceof SlowMoDot) {
        console.log('[SLOW-MO] Slow-mo dot tapped! Calling handleSlowMoActivation...');
        this.handleSlowMoActivation(tappedObject);
      }
    } else {
      // Handle taps on empty space - provide feedback but no penalty
      this.handleEmptySpaceTap(x, y);
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
    if (!this.objectPool) return null;

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
      const bounds = slowMoDot.getBounds();
      if (this.isPointInBounds(x, y, bounds)) {
        console.log(`[COLLISION] SlowMoDot hit at (${x}, ${y}), bounds: (${bounds.x}, ${bounds.y}, ${bounds.width}, ${bounds.height})`);
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

      // Add success motion effects
      if (this.motionEffects) {
        this.motionEffects.createInteractionFeedback(dot, 'success');
        this.motionEffects.createScreenShake(3, 150);
      }

      // Deactivate the dot after successful tap
      dot.deactivate();

      // Change target color occasionally for variety (30% chance)
      if (Math.random() < 0.3) {
        this.targetColor = this.getRandomColor();
        if (this.objectSpawner) {
          this.objectSpawner.setTargetColor(this.targetColor);
        }
      }

      console.log(`Correct tap! Score: ${this.score}, Target: ${this.targetColor}`);
    } else {
      // Wrong color - immediate game over (no delay, immediate termination)
      console.log(`Wrong color tapped! Expected: ${this.targetColor}, Got: ${dot.getColor()}`);
      this.createWrongTapEffect(dot);

      // Add error motion effects
      if (this.motionEffects) {
        this.motionEffects.createInteractionFeedback(dot, 'error');
        this.motionEffects.createScreenShake(5, 200);
      }

      // Deactivate the wrong dot immediately to prevent further interaction
      dot.deactivate();

      // Clean up any existing visual effects before state change
      this.cleanupVisualEffects();

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

    // Create celebratory burst effect with simple graphics
    const burstColor = parseInt(color.replace('#', '0x'));
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const distance = 50 + Math.random() * 30;
      const burstDot = this.add.circle(
        x + Math.cos(angle) * 20,
        y + Math.sin(angle) * 20,
        8,
        burstColor
      );

      this.tweens.add({
        targets: burstDot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2.easeOut',
        onComplete: () => burstDot.destroy()
      });
    }

    // Dot shrinks to nothing with satisfying "pop" animation (300ms)
    this.tweens.add({
      targets: dot,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        // Particles are individual objects that destroy themselves
      }
    });

    // Add extra "juice" with a secondary burst effect
    this.time.delayedCall(50, () => {
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const smallDot = this.add.circle(x, y, 4, burstColor);

        this.tweens.add({
          targets: smallDot,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          alpha: 0,
          duration: 200,
          ease: 'Power2.easeOut',
          onComplete: () => smallDot.destroy()
        });
      }
    });
  }

  /**
   * Create visual feedback for wrong dot taps
   */
  private createWrongTapEffect(dot: Dot): void {
    // Create red warning ripple effect
    const ripple = this.add.circle(dot.x, dot.y, 10, 0xFF0000, 0.8);
    this.temporaryObjects.push(ripple);
    
    // Set a short TTL (time to live) as a failsafe
    this.time.delayedCall(500, () => {
      if (ripple && ripple.scene) {
        ripple.destroy();
        const index = this.temporaryObjects.indexOf(ripple);
        if (index > -1) {
          this.temporaryObjects.splice(index, 1);
        }
      }
    });

    const rippleTween = this.tweens.add({
      targets: ripple,
      radius: dot.size * 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        if (ripple && ripple.scene) {
          ripple.destroy();
        }
        const index = this.temporaryObjects.indexOf(ripple);
        if (index > -1) {
          this.temporaryObjects.splice(index, 1);
        }
        const tweenIndex = this.temporaryTweens.indexOf(rippleTween);
        if (tweenIndex > -1) {
          this.temporaryTweens.splice(tweenIndex, 1);
        }
      }
    });
    this.temporaryTweens.push(rippleTween);

    // Create red flash overlay on the dot
    const flashOverlay = this.add.circle(dot.x, dot.y, dot.size / 2, 0xFF0000, 0.8);
    flashOverlay.setDepth(dot.depth + 1);
    this.temporaryObjects.push(flashOverlay);
    
    // Set a short TTL (time to live) as a failsafe
    this.time.delayedCall(300, () => {
      if (flashOverlay && flashOverlay.scene) {
        flashOverlay.destroy();
        const index = this.temporaryObjects.indexOf(flashOverlay);
        if (index > -1) {
          this.temporaryObjects.splice(index, 1);
        }
      }
    });

    const flashTween = this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 200,
      ease: 'Power2.easeOut',
      onComplete: () => {
        if (flashOverlay && flashOverlay.scene) {
          flashOverlay.destroy();
        }
        const index = this.temporaryObjects.indexOf(flashOverlay);
        if (index > -1) {
          this.temporaryObjects.splice(index, 1);
        }
        const tweenIndex = this.temporaryTweens.indexOf(flashTween);
        if (tweenIndex > -1) {
          this.temporaryTweens.splice(tweenIndex, 1);
        }
      }
    });
    this.temporaryTweens.push(flashTween);
  }

  private handleBombTap(bomb: Bomb): void {
    if (this.currentState !== GameState.PLAYING) return;

    console.log('Bomb tapped! Game Over!');

    // Create explosion effect with screen shake and particles
    this.createBombExplosionEffect(bomb);

    // Add intense error motion effects for bomb explosion
    if (this.motionEffects) {
      this.motionEffects.createInteractionFeedback(bomb, 'error');
      this.motionEffects.createScreenShake(8, 300);
    }

    // Immediate game termination - no delays, instant state change
    this.changeState(GameState.GAME_OVER);
  }

  /**
   * Create enhanced bomb explosion effect
   */
  private createBombExplosionEffect(bomb: Bomb): void {
    // Trigger the bomb's own explosion animation
    bomb.explode();

    // Add screen shake effect
    this.cameras.main.shake(300, 0.05); // 300ms duration, 0.05 intensity

    // Create additional explosion particles
    const explosionColors = [0xFF0000, 0xFF4500, 0xFF8C00, 0xFFD700, 0xFFFFFF];
    
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 120;
      const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
      const size = 8 + Math.random() * 12;
      
      const explosionDot = this.add.circle(bomb.x, bomb.y, size, color);
      explosionDot.setDepth(2000); // High depth to be visible
      
      this.tweens.add({
        targets: explosionDot,
        x: bomb.x + Math.cos(angle) * distance,
        y: bomb.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 400,
        ease: 'Power2.easeOut',
        onComplete: () => explosionDot.destroy()
      });
    }

    // Create flash effect
    const flashOverlay = this.add.rectangle(
      this.cameras.main.centerX, 
      this.cameras.main.centerY, 
      this.cameras.main.width, 
      this.cameras.main.height, 
      0xFF0000, 
      0.3
    );
    flashOverlay.setDepth(3000);
    
    this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => flashOverlay.destroy()
    });
  }


  private handleSlowMoActivation(slowMoDot: SlowMoDot): void {
    console.log(`[SLOW-MO] handleSlowMoActivation called - State: ${this.currentState}, Active: ${this.isSlowMoActive}`);
    
    if (this.currentState !== GameState.PLAYING || this.isSlowMoActive) {
      console.log('[SLOW-MO] Slow-mo activation blocked - conditions not met');
      return;
    }

    console.log(`[SLOW-MO] Slow-mo activated! (simplified - no charge limits)`);

    // Create radial blue glow and visual feedback
    this.createSlowMoActivationEffect(slowMoDot);

    // Add power-up motion effects
    if (this.motionEffects) {
      this.motionEffects.createInteractionFeedback(slowMoDot, 'success');
      this.motionEffects.createScreenShake(4, 200);
    }

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

    // Create particle burst with blue theme using simple graphics
    const blueColors = [0x3498DB, 0x5DADE2, 0x85C1E9];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const distance = 80 + Math.random() * 50;
      const color = blueColors[Math.floor(Math.random() * blueColors.length)];

      const blueDot = this.add.circle(
        x + Math.cos(angle) * 15,
        y + Math.sin(angle) * 15,
        6,
        color
      );

      this.tweens.add({
        targets: blueDot,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 600,
        ease: 'Power2.easeOut',
        onComplete: () => blueDot.destroy()
      });
    }

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

  // createTemporaryObject method removed - not used

  // cleanupTemporaryObject method removed - not used

  /**
   * Clean up all temporary objects
   */
  private cleanupAllTemporaryObjects(): void {
    // Kill tracked tweens first to prevent them from accessing destroyed objects
    for (const tween of this.temporaryTweens) {
      try {
        if (tween) {
          tween.remove();
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    this.temporaryTweens = [];
    
    // Then destroy tracked objects
    for (const obj of this.temporaryObjects) {
      if (obj && typeof obj.destroy === 'function') {
        try {
          if (obj.scene) {
            obj.destroy();
          }
        } catch (error) {
          // Ignore errors during cleanup
          console.warn('Error cleaning up temporary object:', error);
        }
      }
    }
    this.temporaryObjects = [];
  }

  /**
   * Clean up visual effects that might be lingering on screen
   */
  private cleanupVisualEffects(): void {
    try {
      // First, clean up tracked temporary objects and their tweens
      this.cleanupAllTemporaryObjects();
      
      // Kill all tweens to prevent visual effects from continuing
      this.tweens.killAll();
      
      let cleanedCount = 0;
      
      // Find and destroy any red circles that might be lingering (visual effects)
      // Make a copy of the list to avoid modification during iteration
      const childrenCopy = [...this.children.list];
      childrenCopy.forEach(child => {
        if (child && typeof child === 'object' && 'fillColor' in child) {
          const circle = child as any;
          // Check if it's a red visual effect (0xFF0000 color)
          // Visual effects are temporary circles, not game objects
          if (circle.fillColor === 0xFF0000 && circle.type === 'Arc') {
            console.log(`[CLEANUP] Destroying red visual effect at (${circle.x?.toFixed(1)}, ${circle.y?.toFixed(1)}), alpha=${circle.alpha}`);
            circle.destroy();
            cleanedCount++;
          }
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`[CLEANUP] Cleaned up ${cleanedCount} lingering visual effects`);
      }
    } catch (error) {
      console.warn('Error cleaning up visual effects:', error);
    }
  }

  /**
   * Handle taps on empty space (no game objects)
   * Provides visual feedback but no penalty - taps are consumed
   */
  private handleEmptySpaceTap(x: number, y: number): void {
    if (this.currentState !== GameState.PLAYING) return;

    // Create subtle feedback for empty space taps - different from object taps
    this.createEmptySpaceEffect(x, y);

    console.log(`Empty space tap at (${x}, ${y}) - consumed with feedback`);
  }

  /**
   * Create subtle visual feedback for empty space taps
   * Different from object tap effects to provide clear feedback
   */
  private createEmptySpaceEffect(x: number, y: number): void {
    // Create a subtle grey ripple to indicate the tap was registered
    const emptyRipple = this.add.circle(x, y, 6, 0x95A5A6, 0.6); // Mid Grey from design system
    emptyRipple.setStrokeStyle(2, 0x95A5A6, 0.4);

    this.tweens.add({
      targets: emptyRipple,
      radius: 80,
      alpha: 0,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        emptyRipple.destroy();
      }
    });

    // Add a subtle pulse to indicate the tap was acknowledged
    const pulse = this.add.circle(x, y, 3, 0xBDC3C7, 0.8); // Light Grey

    this.tweens.add({
      targets: pulse,
      radius: 25,
      alpha: 0,
      duration: 200,
      ease: 'Power3.easeOut',
      onComplete: () => {
        pulse.destroy();
      }
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

    // Add motion effects for enhanced feedback
    if (this.motionEffects) {
      this.motionEffects.createInteractionFeedback(ripple, 'tap');
      this.motionEffects.createScreenShake(2, 100);
    }
  }

  private activateSlowMotion(): void {
    if (this.isSlowMoActive) {
      console.log('[SLOW-MO] Slow-motion already active, skipping activation');
      return;
    }

    this.isSlowMoActive = true;
    this.slowMoStartTime = this.time.now;

    console.log('[SLOW-MO] Slow-motion activated - reducing speeds by 2x for 3 seconds');

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

    // Reduce speeds of all active dots and bombs by 2x (half speed)
    console.log('About to call reduceObjectSpeeds()...');
    this.reduceObjectSpeeds();

    // Smooth transition to slow-motion vignette
    this.slowMoTween = this.tweens.add({
      targets: { vignetteAlpha: 0.0 },
      vignetteAlpha: 0.35, // Subtle blue vignette
      duration: 400, // Smooth 400ms transition for better feel
      ease: 'Power2.easeInOut', // Smooth ease-in-out curve as specified
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const vignetteAlpha = 0.35 * progress; // 0.0 -> 0.35

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

    // Schedule restoration of normal speeds after 3 seconds
    console.log(`[SLOW-MO] Scheduling slow-motion deactivation in ${SlowMoDot.DURATION}ms`);
    this.time.delayedCall(SlowMoDot.DURATION, () => {
      console.log('[SLOW-MO] Delayed call triggered - calling deactivateSlowMotion()');
      this.deactivateSlowMotion();
    });
  }

  /**
   * Reduce speeds of all active dots and bombs by 2x (half speed)
   */
  private reduceObjectSpeeds(): void {
    console.log('[SLOW-MO] reduceObjectSpeeds() method called!');
    
    // Clear previous speed tracking
    this.originalSpeeds.clear();

    console.log('[SLOW-MO] Starting speed reduction for all active objects...');

    // Reduce speeds of all active dots
    if (this.objectPool) {
      const activeDots = this.objectPool.getActiveDots();
      console.log(`[SLOW-MO] Found ${activeDots.length} active dots`);
      
      activeDots.forEach((dot: any, index: number) => {
        if (dot.active && dot.speed !== undefined) {
          const originalSpeed = dot.speed;
          // Store original speed
          this.originalSpeeds.set(dot, originalSpeed);
          // Reduce speed by 2x (half speed)
          dot.speed = dot.speed / 2;
          console.log(`[SLOW-MO] Dot ${index}: ${originalSpeed} -> ${dot.speed}`);
        }
      });

      // Reduce speeds of all active bombs
      const activeBombs = this.objectPool.getActiveBombs();
      console.log(`[SLOW-MO] Found ${activeBombs.length} active bombs`);
      
      activeBombs.forEach((bomb: any, index: number) => {
        if (bomb.active && bomb.speed !== undefined) {
          const originalSpeed = bomb.speed;
          // Store original speed
          this.originalSpeeds.set(bomb, originalSpeed);
          // Reduce speed by 2x (half speed)
          bomb.speed = bomb.speed / 2;
          console.log(`[SLOW-MO] Bomb ${index}: ${originalSpeed} -> ${bomb.speed}`);
        }
      });
    } else {
      console.error('[SLOW-MO] ObjectPool is null! Cannot reduce speeds.');
    }

    console.log(`[SLOW-MO] Reduced speeds of ${this.originalSpeeds.size} objects by 2x`);
  }

  /**
   * Restore original speeds of all objects
   */
  private restoreObjectSpeeds(): void {
    console.log('[SLOW-MO] restoreObjectSpeeds() method called!');
    console.log(`[SLOW-MO] Restoring speeds for ${this.originalSpeeds.size} objects`);
    
    this.originalSpeeds.forEach((originalSpeed, object) => {
      if (object && object.speed !== undefined) {
        console.log(`[SLOW-MO] Restoring object speed: ${object.speed} -> ${originalSpeed}`);
        object.speed = originalSpeed;
      }
    });

    console.log(`[SLOW-MO] Restored original speeds of ${this.originalSpeeds.size} objects`);
    this.originalSpeeds.clear();
  }

  /**
   * Apply slow-motion speed reduction to a newly spawned object
   */
  private applySlowMotionToNewObject(object: any): void {
    if (this.isSlowMoActive && object && object.speed !== undefined) {
      // Store original speed
      this.originalSpeeds.set(object, object.speed);
      // Reduce speed by 2x (half speed)
      object.speed = object.speed / 2;
    }
  }

  /**
   * Deactivate slow-motion with smooth transition back to normal speed
   */
  private deactivateSlowMotion(): void {
    if (!this.isSlowMoActive) return;

    console.log('[SLOW-MO] Slow-motion deactivating - restoring original speeds');

    // Restore original speeds of all objects
    this.restoreObjectSpeeds();

    // Stop any ongoing slow-mo tweens
    if (this.slowMoTween) {
      this.slowMoTween.remove();
      this.slowMoTween = null;
    }

    // Stop vignette pulsing
    if (this.slowMoVignette) {
      this.tweens.killTweensOf(this.slowMoVignette);
    }

    // Smooth transition to fade out vignette
    this.tweens.add({
      targets: { vignetteAlpha: this.slowMoVignette?.alpha || 0.35 },
      vignetteAlpha: 0.0, // Fade out vignette
      duration: 500, // Slightly longer transition out for smooth feel
      ease: 'Power2.easeInOut', // Smooth ease-in-out curve as specified
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const vignetteAlpha = (this.slowMoVignette?.alpha || 0.35) * (1 - progress);

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

        console.log('[SLOW-MO] Slow-motion fully deactivated - all speeds restored');
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
    
    // Update neon background system
    if (this.neonBackground) {
      this.neonBackground.updateDimensions(width, height);
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
    // slowMoCharges reset removed - simplified logic

    // Reset slow-motion state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
    if (this.slowMoVignette) {
      this.slowMoVignette.setVisible(false);
      this.slowMoVignette = null;
    }
    if (this.slowMoTween) {
      this.slowMoTween.remove();
      this.slowMoTween = null;
    }

    // Reset object systems
    if (this.objectSpawner) {
      this.objectSpawner.reset();
      this.objectSpawner.setTargetColor(this.targetColor);
    }

    // Update UI
    this.updateUI();
  }

  private startGame(): void {
    this.gameStartTime = this.time.now;

    // Ensure UIScene is properly initialized and communicating
    this.ensureUISceneReady();

    // Start game timer to update elapsed time
    this.gameTimer = this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true,
    });

    // Start object spawning
    if (this.objectSpawner) {
      this.objectSpawner.resume();
      // Force spawn a few objects immediately for immediate gameplay
      this.objectSpawner.forceSpawn(1, 1000);
    }

    console.log('Game started!');
  }

  private endGame(): void {
    console.log('endGame() method called');

    // Set game state to GAME_OVER immediately
    this.changeState(GameState.GAME_OVER);

    // Stop object spawning immediately
    try {
      if (this.objectSpawner) {
        this.objectSpawner.pause();
      }
    } catch (error) {
      console.warn('Error pausing objectSpawner:', error);
    }

    // Force deactivate slow-motion if active
    if (this.isSlowMoActive) {
      try {
        this.forceDeactivateSlowMotion();
      } catch (error) {
        console.warn('Error force deactivating slow motion:', error);
      }
    }

    // Stop all game animations and effects
    try {
      this.tweens.killAll();
    } catch (error) {
      console.warn('Error killing tweens:', error);
    }

    // Pause all game objects and animations
    try {
      if (this.objectPool) {
        this.objectPool.pauseAllObjects();
      }
    } catch (error) {
      console.warn('Error pausing object pool:', error);
    }

    // Stop game timer
    try {
      if (this.gameTimer) {
        this.gameTimer.destroy();
        this.gameTimer = null;
      }
    } catch (error) {
      console.warn('Error stopping game timer:', error);
    }

    // Hide all game objects to prevent them from showing behind modal
    try {
      this.hideAllGameObjects();
    } catch (error) {
      console.warn('Error hiding game objects:', error);
    }

    // Hide UI elements (best score and tap text) when game over overlay is shown
    try {
      if (this.uiScene) {
        this.uiScene.setVisible(false);
        console.log('Game: UI elements hidden for game over overlay');
      }
    } catch (error) {
      console.warn('Error hiding UI elements:', error);
    }

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
      targetColor: this.targetColor,
      userRank: this.userRank
    };

    // Transition to GameOver scene
    this.time.delayedCall(1000, () => {
      try {
        console.log('Transitioning to GameOver scene with data:', gameOverData);

        // Keep UIScene running but hide it, start GameOver on top
        if (this.uiScene) {
          console.log('Hiding UIScene');
          this.uiScene.setVisible(false); // Hide UI instead of pausing/stopping
        } else {
          console.warn('UIScene not found when trying to hide it');
        }

        console.log('Starting GameOver scene...');

        // Start the GameOver scene
        this.scene.start('GameOver', gameOverData);
        console.log('GameOver scene started');
      } catch (error) {
        console.error('Error during scene transition to GameOver:', error);
      }
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
          this.userRank = result.rank;
          console.log(`Current leaderboard rank: ${result.rank}`);
          
          // Update Game Over overlay if it exists and user is in top 5
          // NOTE: Game over UI is now handled by GameOver scene, not here
          // if (result.rank <= 5) {
          //   this.updateGameOverWithRank(result.rank);
          // }
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
  private showScoreSubmissionError(_message: string): void {
    // Create a visual error indicator using graphics only
    const errorIndicator = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height - 100,
      200, 40,
      0xF39C12, 0.8
    );
    errorIndicator.setStrokeStyle(2, 0xFFFFFF, 0.8);
    errorIndicator.setDepth(1000).setAlpha(0);

    // Add warning triangle
    const warningTriangle = this.add.triangle(
      this.scale.width / 2 - 70,
      this.scale.height - 100,
      0, 0, 10, 15, -10, 15,
      0xFF0000
    );
    warningTriangle.setDepth(1001).setAlpha(0);

    // Fade in, hold, then fade out
    this.tweens.add({
      targets: [errorIndicator, warningTriangle],
      alpha: 1,
      duration: 300,
      ease: 'Power2.easeOut',
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: [errorIndicator, warningTriangle],
            alpha: 0,
            duration: 500,
            ease: 'Power2.easeIn',
            onComplete: () => {
              errorIndicator.destroy();
              warningTriangle.destroy();
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
    // Don't update UI if game is over
    if (this.currentState === GameState.GAME_OVER) {
      console.log('Game: updateUI called but game is over - skipping UI update');
      return;
    }
    
    console.log('Game: updateUI called - uiScene exists:', !!this.uiScene);
    if (this.uiScene) {
      console.log('Game: Updating UI with - score:', this.score, 'time:', this.elapsedTime, 'target:', this.targetColor);
      this.uiScene.setScore(this.score);
      this.uiScene.setTime(this.elapsedTime);
      this.uiScene.setTargetColor(this.targetColor);
      // setSlowMoCharges removed - simplified logic
      console.log('Game: UI update calls completed');
    } else {
      console.warn('Game: Cannot update UI - uiScene is null');
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
    // getSlowMoCharges removed - simplified logic
    return 0; // Always return 0 since charges are no longer used
  }

  public isSlowMotionActive(): boolean {
    return this.isSlowMoActive;
  }

  /**
   * Update Game Over overlay with rank information for top 5 players
   * NOTE: This is now handled by the GameOver scene, keeping for reference
   */
  // private updateGameOverWithRank(rank: number): void {
  //   const gameContainer = document.getElementById('game-container');
  //   if (!gameContainer) return;

  //   // Hide the GAME OVER title when congratulations are shown
  //   const gameOverTitle = document.getElementById('gameover-title');
  //   if (gameOverTitle) {
  //     gameOverTitle.style.display = 'none';
  //   }

  //   // Remove existing congratulations if any
  //   const existingCongrats = document.getElementById('gameover-congratulations');
  //   const existingRank = document.getElementById('gameover-rank');
  //   if (existingCongrats) existingCongrats.remove();
  //   if (existingRank) existingRank.remove();

  //   // Create congratulations message
  //   const congratulationsElement = document.createElement('div');
  //   congratulationsElement.innerHTML = `🎉 CONGRATULATIONS! 🎉`;
  //   congratulationsElement.style.position = 'absolute';
  //   congratulationsElement.style.left = '50%';
  //   congratulationsElement.style.top = '25%';
  //   congratulationsElement.style.transform = 'translate(-50%, -50%)';
  //   congratulationsElement.style.fontSize = '22px';
  //   congratulationsElement.style.color = '#F1C40F';
  //   congratulationsElement.style.fontFamily = 'Orbitron, Arial, sans-serif';
  //   congratulationsElement.style.fontWeight = 'bold';
  //   congratulationsElement.style.textAlign = 'center';
  //   congratulationsElement.style.pointerEvents = 'none';
  //   congratulationsElement.style.zIndex = '3003';
  //   congratulationsElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  //   congratulationsElement.id = 'gameover-congratulations';

  //   // Create rank display
  //   const rankElement = document.createElement('div');
  //   const rankText = rank === 1 ? '🥇 1ST PLACE!' : 
  //                    rank === 2 ? '🥈 2ND PLACE!' : 
  //                    rank === 3 ? '🥉 3RD PLACE!' : 
  //                    `🏆 RANK: ${rank}`;
  //   rankElement.innerHTML = rankText;
  //   rankElement.style.position = 'absolute';
  //   rankElement.style.left = '50%';
  //   rankElement.style.top = '32%';
  //   rankElement.style.transform = 'translate(-50%, -50%)';
  //   rankElement.style.fontSize = '18px';
  //   rankElement.style.color = '#E74C3C';
  //   rankElement.style.fontFamily = 'Orbitron, Arial, sans-serif';
  //   rankElement.style.fontWeight = 'bold';
  //   rankElement.style.textAlign = 'center';
  //   rankElement.style.pointerEvents = 'none';
  //   rankElement.style.zIndex = '3003';
  //   rankElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
  //   rankElement.id = 'gameover-rank';

  //   // Add elements to container
  //   gameContainer.appendChild(congratulationsElement);
  //   gameContainer.appendChild(rankElement);

  //   // Add celebration animation
  //   this.createRankCelebrationAnimation();
  // }

  /**
   * Create celebration animation for top 5 rank achievement
   * NOTE: This is now handled by the GameOver scene
   */
  // private createRankCelebrationAnimation(): void {
  //   // Create sparkle effects around the congratulations
  //   for (let i = 0; i < 8; i++) {
  //     const sparkle = this.add.circle(
  //       this.scale.width / 2 + (Math.random() - 0.5) * 200,
  //       this.scale.height / 2 + (Math.random() - 0.5) * 100,
  //       4 + Math.random() * 3,
  //       0xF1C40F,
  //       1
  //     ).setDepth(3004);
  //     
  //     const angle = Math.random() * Math.PI * 2;
  //     const distance = 100 + Math.random() * 50;
  //     
  //     this.tweens.add({
  //       targets: sparkle,
  //       x: this.scale.width / 2 + Math.cos(angle) * distance,
  //       y: this.scale.height / 2 + Math.sin(angle) * distance,
  //       alpha: 0,
  //       scale: 0,
  //       duration: 2000,
  //       ease: 'Power2.easeOut',
  //       onComplete: () => sparkle.destroy()
  //     });
  //   }
  // }

  /**
   * Hide all game objects to prevent them from showing behind the Game Over modal
   */
  private hideAllGameObjects(): void {
    try {
      // Hide all children of the scene
      this.children.list.forEach(child => {
        if (child && 'setVisible' in child && typeof child.setVisible === 'function') {
          (child as any).setVisible(false);
        }
      });

      // Hide background specifically
      if (this.background) {
        this.background.setVisible(false);
      }

      // Hide slow motion vignette if it exists
      if (this.slowMoVignette) {
        this.slowMoVignette.setVisible(false);
      }

      console.log('All game objects hidden for Game Over modal');
    } catch (error) {
      console.warn('Error hiding game objects:', error);
    }
  }

  /**
   * Add global error handler to catch destroy errors during scene transitions
   */
  private addGlobalErrorHandler(): void {
    // Store the original error handler
    const originalErrorHandler = window.onerror;
    
    // Override the global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      // Check if this is the destroy error we're trying to catch
      if (typeof message === 'string' && message.includes("Cannot read properties of undefined (reading 'destroy')")) {
        console.warn('Caught destroy error during scene transition, ignoring:', message);
        // Return true to prevent the error from being logged
        return true;
      }
      
      // For other errors, use the original handler
      if (originalErrorHandler) {
        return originalErrorHandler(message, source, lineno, colno, error);
      }
      
      return false;
    };
  }

  /**
   * Force cleanup before scene restart to prevent destroy errors
   * NOTE: Currently unused, keeping for reference
   */
  // private forceCleanupBeforeRestart(): void {
  //   console.log('Game: Force cleanup before restart');
  //   
  //   try {
  //     // Set shutdown flag to prevent updates during cleanup
  //     this.isShuttingDown = true;
  //     
  //     // Stop all tweens first
  //     if (this.tweens) {
  //       this.tweens.killAll();
  //     }
  //     
  //     // Stop object spawner
  //     if (this.objectSpawner) {
  //       this.objectSpawner.pause();
  //     }
  //     
  //     // Clear and destroy object pool
  //     if (this.objectPool) {
  //       this.objectPool.clearAll();
  //       this.objectPool.destroy();
  //       this.objectPool = null;
  //     }
  //     
  //     // Force deactivate slow motion
  //     if (this.isSlowMoActive) {
  //       this.forceDeactivateSlowMotion();
  //     }
  //     
  //     // Stop game timer
  //     if (this.gameTimer) {
  //       this.gameTimer.destroy();
  //       this.gameTimer = null;
  //     }
  //     
  //     // Clean up temporary objects
  //     this.cleanupAllTemporaryObjects();
  //     
  //     console.log('Game: Force cleanup completed');
  //   } catch (error) {
  //     console.warn('Game: Error during force cleanup:', error);
  //   }
  // }


  /**
   * Force deactivate slow-motion immediately (used during game over)
   */
  private forceDeactivateSlowMotion(): void {
    if (!this.isSlowMoActive) return;

    console.log('Force deactivating slow-motion');

    // Stop any ongoing slow-mo tweens
    if (this.slowMoTween) {
      this.slowMoTween.remove();
      this.slowMoTween = null;
    }

    // Clean up vignette immediately
    if (this.slowMoVignette) {
      try {
        this.tweens.killTweensOf(this.slowMoVignette);
        // Don't manually destroy - let Phaser handle it
        this.slowMoVignette.setVisible(false);
      } catch (error) {
        console.warn('Error hiding slowMoVignette in forceDeactivate:', error);
      }
      this.slowMoVignette = null;
    }

    // Reset time scale immediately
    this.physics.world.timeScale = 1;
    this.tweens.timeScale = 1;

    // Reset slow-mo state
    this.isSlowMoActive = false;
    this.slowMoStartTime = 0;
  }

  /**
   * Initialize UIScene with proper startup and communication handling
   * Ensures UIScene is running and properly communicates with GameScene
   */
  private initializeUIScene(): void {
    console.log('Game: Initializing UIScene communication...');
    
    // Check if UIScene exists and is active
    this.uiScene = this.scene.get('SimpleUI') as SimpleUIScene;
    
    if (!this.uiScene) {
      console.log('Game: UIScene not found, launching it...');
      // Launch UIScene if it doesn't exist
      this.scene.launch('SimpleUI');
      
      // Wait for UIScene to be ready with retry logic
      this.waitForUISceneReady();
    } else if (this.uiScene.scene && !this.uiScene.scene.isActive()) {
      console.log('Game: UIScene exists but not active, starting it...');
      // Start UIScene if it exists but isn't active
      this.scene.launch('SimpleUI');
      
      // Wait for UIScene to be ready with retry logic
      this.waitForUISceneReady();
    } else {
      console.log('Game: UIScene already active, setting up communication...');
      this.setupUISceneCommunication();
    }
  }

  /**
   * Wait for UIScene to be ready with retry logic
   * Handles cases where UIScene takes time to initialize
   */
  private waitForUISceneReady(retryCount: number = 0): void {
    const maxRetries = 3;
    const baseDelay = 100;
    const delay = baseDelay * (retryCount + 1); // Increasing delay: 100ms, 200ms, 300ms
    
    this.time.delayedCall(delay, () => {
      this.uiScene = this.scene.get('SimpleUI') as SimpleUIScene;
      
      if (this.uiScene && this.uiScene.events) {
        console.log(`Game: UIScene ready after ${retryCount + 1} attempt(s)`);
        this.setupUISceneCommunication();
      } else if (retryCount < maxRetries) {
        console.warn(`Game: UIScene not ready, retry ${retryCount + 1}/${maxRetries}`);
        this.waitForUISceneReady(retryCount + 1);
      } else {
        console.error('Game: Failed to initialize UIScene after maximum retries');
        // Create a fallback UI or handle gracefully
        this.handleUISceneInitializationFailure();
      }
    });
  }

  /**
   * Handle UIScene initialization failure gracefully
   * Provides fallback behavior when UIScene cannot be initialized
   */
  private handleUISceneInitializationFailure(): void {
    console.warn('Game: UIScene initialization failed, game will continue without UI updates');
    // The game can still function, but UI updates won't work
    // This prevents the game from completely breaking
  }

  /**
   * Setup proper communication channels between GameScene and UIScene
   * Ensures event listeners are properly configured and UI is visible
   */
  private setupUISceneCommunication(): void {
    if (!this.uiScene) {
      console.error('Game: Cannot setup UI communication - UIScene is null');
      return;
    }

    console.log('Game: Setting up UIScene communication...');
    if (this.uiScene.scene) {
      console.log('Game: UIScene key:', this.uiScene.scene.key);
      console.log('Game: UIScene active:', this.uiScene.scene.isActive());
      console.log('Game: UIScene visible:', this.uiScene.scene.isVisible());
      
      // Explicitly show the SimpleUI scene if it's hidden
      if (this.uiScene.scene.isActive() && !this.uiScene.scene.isVisible()) {
        console.log('Game: UIScene is active but hidden, showing it now');
        this.scene.setVisible(true, 'SimpleUI');
      }
    } else {
      console.warn('Game: UIScene.scene is not available');
    }

    // Ensure UIScene is visible and properly initialized
    if (this.uiScene.forceShowUI) {
      this.uiScene.forceShowUI();
    }

    // Explicitly show UI elements (best score and tap text) when game restarts
    if (this.uiScene.setVisible) {
      this.uiScene.setVisible(true);
      console.log('Game: UI elements shown after restart');
    }

    // Setup event listeners for scene communication
    if (this.uiScene && this.uiScene.events) {
      this.setupSceneEventListeners();
    } else {
      console.warn('Game: UIScene became invalid before setting up event listeners');
    }

    // Force an initial UI update to sync state
    if (this.uiScene) {
      this.updateUI();
    } else {
      console.warn('Game: UIScene became invalid before updating UI');
    }

    console.log('Game: UIScene communication setup completed');
  }

  /**
   * Setup event listeners for proper scene lifecycle management
   * Handles scene transitions, cleanup, and state synchronization
   */
  private setupSceneEventListeners(): void {
    console.log('Game: Setting up scene event listeners...');

    // Listen for UIScene shutdown to handle cleanup
    if (this.uiScene && this.uiScene.events) {
      this.uiScene.events.once('shutdown', () => {
        console.log('Game: UIScene shutdown detected, clearing reference');
        this.uiScene = null;
      });

      // Listen for UIScene destroy to handle cleanup
      this.uiScene.events.once('destroy', () => {
        console.log('Game: UIScene destroy detected, clearing reference');
        this.uiScene = null;
      });
    } else {
      console.warn('Game: UIScene or UIScene.events not available for event listener setup');
    }

    // Listen for our own scene events
    this.events.once('shutdown', () => {
      console.log('Game: GameScene shutdown, cleaning up UI communication');
      this.cleanupUISceneCommunication();
    });

    this.events.once('destroy', () => {
      console.log('Game: GameScene destroy, cleaning up UI communication');
      this.cleanupUISceneCommunication();
    });

    // Listen for scene manager events
    this.events.on('wake', () => {
      console.log('Game: Scene wake event, re-establishing UI communication');
      this.initializeUIScene();
    });

    console.log('Game: Scene event listeners setup completed');
  }

  /**
   * Clean up UIScene communication and event listeners
   * Prevents memory leaks and ensures proper cleanup
   */
  private cleanupUISceneCommunication(): void {
    console.log('Game: Cleaning up UIScene communication...');

    // Remove event listeners to prevent memory leaks
    if (this.uiScene && this.uiScene.events) {
      this.uiScene.events.off('shutdown');
      this.uiScene.events.off('destroy');
    }

    // Clear UIScene reference
    this.uiScene = null;

    // Remove scene manager event listeners
    this.events.off('wake');

    console.log('Game: UIScene communication cleanup completed');
  }

  /**
   * Ensure UIScene is ready and properly communicating at game start
   * Handles cases where UIScene might not be fully initialized
   */
  private ensureUISceneReady(): void {
    if (!this.uiScene) {
      console.log('Game: UIScene not available at game start, re-initializing...');
      this.initializeUIScene();
      
      // Wait for initialization to complete before continuing
      this.time.delayedCall(150, () => {
        this.finalizeGameStart();
      });
    } else if (this.uiScene.scene && !this.uiScene.scene.isActive()) {
      console.log('Game: UIScene not active at game start, restarting communication...');
      this.setupUISceneCommunication();
      this.finalizeGameStart();
    } else {
      console.log('Game: UIScene ready at game start');
      if (this.uiScene.forceShowUI) {
        this.uiScene.forceShowUI();
      }
      this.updateUI();
      this.finalizeGameStart();
    }
  }

  /**
   * Finalize game start after UIScene is confirmed ready
   */
  private finalizeGameStart(): void {
    console.log('Game: Finalizing game start...');

    // Ensure UI is updated with current state
    this.updateUI();

    // Start game timer to update elapsed time
    this.gameTimer = this.time.addEvent({
      delay: 100, // Update every 100ms
      callback: this.updateGameTime,
      callbackScope: this,
      loop: true,
    });

    // Start object spawning
    if (this.objectSpawner) {
      this.objectSpawner.resume();
      // Force spawn a few objects immediately for immediate gameplay
      this.objectSpawner.forceSpawn(1, 1000);
    }

    console.log('Game started with UIScene properly initialized!');
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
    if (this.currentState === GameState.PLAYING && this.hitboxGraphics && this.objectPool) {
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

    // Don't update if shutting down
    if (this.isShuttingDown) {
      return;
    }

    if (this.currentState === GameState.PLAYING) {
      // Update object spawner
      if (this.objectSpawner) {
        this.objectSpawner.update(delta, this.elapsedTime);
      }

      // Update object pool
      if (this.objectPool) {
        this.objectPool.update(delta);
      }

      // Update performance metrics for limits manager
      this.updatePerformanceMetrics();

      // Update difficulty display for debugging
      this.updateDifficultyDisplay();

      // Update hitbox visualization
      this.drawHitboxes();
    }
  }

  /**
   * Update performance metrics for the limits manager
   */
  private updatePerformanceMetrics(): void {
    if (!this.objectPool || !this.objectPool.getActiveObjectCount) {
      return;
    }

    try {
      // Calculate current FPS
      const currentFPS = Math.round(1000 / this.game.loop.delta);
      
      // Count active objects
      const objectCount = this.objectPool.getActiveObjectCount();
      const bombCount = this.objectPool.getActiveBombCount();
      const maxBombCount = this.difficultyManager.calculateBombCount(this.elapsedTime);
      
      // Update limits manager with performance data
      gameLimitsManager.updatePerformanceMetrics(currentFPS, objectCount);
      
      // Also update difficulty manager if it has performance monitoring
      if (this.difficultyManager && typeof this.difficultyManager.updatePerformanceMetrics === 'function') {
        this.difficultyManager.updatePerformanceMetrics(currentFPS, objectCount);
      }

      // Update debug display with bomb count info
      if (this.debugService && this.debugService.isEnabled()) {
        // Note: updateDebugInfo method doesn't exist in IDebugService interface
        // This debug info is logged to console instead
        console.log('Debug Info:', {
          bombCount: bombCount,
          maxBombCount: maxBombCount,
          bombCountProgress: `${bombCount}/${maxBombCount}`,
        });
      }

    } catch (error) {
      console.warn('Game: Error updating performance metrics:', error);
    }
  }

  // Clean up debug resources when scene shuts down
  shutdown(): void {
    try {
      console.log('Game: Starting scene shutdown...');
      
      // Set shutdown flag to prevent updates during cleanup
      this.isShuttingDown = true;

      // Clean up UIScene communication first
      this.cleanupUISceneCommunication();

      // Kill all tweens first to prevent cleanup issues
      if (this.tweens) {
        this.tweens.killAll();
        this.tweens.timeScale = 1;
      }

      // Clean up temporary objects we created
      this.cleanupAllTemporaryObjects();

      // Clean up debug service (non-Phaser object)
      if (this.debugService && this.debugService instanceof DebugService) {
        try {
          this.debugService.destroy();
        } catch (error) {
          console.warn('Error destroying debugService:', error);
        }
      }

      // Stop object spawner first to prevent new objects from being created
      if (this.objectSpawner) {
        try {
          this.objectSpawner.pause();
        } catch (error) {
          console.warn('Error pausing objectSpawner:', error);
        }
      }

      // Clean up object pools (non-Phaser object)
      if (this.objectPool) {
        try {
          // Clear all objects first to prevent issues during destruction
          this.objectPool.clearAll();
          this.objectPool.destroy();
        } catch (error) {
          console.warn('Error destroying objectPool:', error);
        }
      }

      // Stop tweens but don't destroy Phaser objects - let Phaser handle cleanup
      if (this.slowMoTween) {
        this.slowMoTween.remove();
      }

      // Clean up timers (Phaser objects that need manual cleanup)
      if (this.gameTimer && !this.gameTimer.hasDispatched) {
        try {
          this.gameTimer.destroy();
        } catch (error) {
          console.warn('Error destroying gameTimer:', error);
        }
      }

      // Reset time scale to normal
      if (this.physics && this.physics.world) {
        this.physics.world.timeScale = 1;
      }

      // Reset references to null but don't manually destroy Phaser objects
      this.slowMoVignette = null;
      this.slowMoTween = null;
      this.hitboxGraphics = null;
      this.objectPool = null;
      this.gameTimer = null;
      this.background = null;
      
      // Clean up neon background system
      if (this.neonBackground) {
        this.neonBackground.destroy();
        this.neonBackground = null;
      }

      // Clean up motion effects system
      if (this.motionEffects) {
        this.motionEffects.destroy();
        this.motionEffects = null;
      }

      // Clean up accessibility manager
      if (this.accessibilityManager) {
        this.accessibilityManager.destroy();
        this.accessibilityManager = null;
      }

      console.log('Game: Scene shutdown completed');
    } catch (error) {
      console.warn('Error during scene shutdown:', error);
    }
  }
}
