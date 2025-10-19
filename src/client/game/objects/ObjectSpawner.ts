// ObjectSpawner class for dynamic dot and bomb generation from screen edges

import Phaser from 'phaser';
import { ObjectPoolManager } from './ObjectPool';
import { DifficultyManager } from '../../services/DifficultyManager';
import { GameColor } from '../../../shared/types/game';
import { gameLimitsManager } from '../../../shared/config/GameLimits';

/**
 * Spawn configuration for different object types
 */
interface SpawnConfig {
  minSpawnRate: number; // Minimum time between spawns (ms)
  maxSpawnRate: number; // Maximum time between spawns (ms)
  bombChance: number; // Probability of spawning a bomb (0-1)
  slowMoChance: number; // Probability of spawning a slow-mo dot (0-1)
  correctColorRatio: number; // Ratio of correct color dots to distractors (0-1)
  baseSpawnRate: number; // Base spawn rate for performance scaling
  effectsEnabled: boolean; // Enable/disable visual effects for performance
  particleQuality: 'high' | 'medium' | 'low'; // Particle quality for performance
}

/**
 * Spawn edge configuration
 */
interface SpawnEdge {
  x: number;
  y: number;
  direction: Phaser.Math.Vector2;
}

/**
 * ObjectSpawner handles dynamic generation of dots, bombs, and power-ups
 * from screen edges with configurable movement patterns and balanced ratios
 */
export class ObjectSpawner {
  private scene: Phaser.Scene;
  private objectPool: ObjectPoolManager;
  private difficultyManager: DifficultyManager;
  
  // Spawn configuration
  private config: SpawnConfig;
  
  // Spawn timing
  private lastSpawnTime: number = 0;
  private nextSpawnDelay: number = 0;
  
  // Screen boundaries
  private screenBounds: Phaser.Geom.Rectangle;
  
  // Target color management
  private targetColor: GameColor = GameColor.RED;
  
  // Available colors for spawning
  private readonly AVAILABLE_COLORS = [
    GameColor.RED,
    GameColor.GREEN,
    GameColor.BLUE,
    GameColor.YELLOW,
    GameColor.PURPLE
  ];
  
  // Spawn margin (objects spawn just outside visible area)
  private readonly SPAWN_MARGIN = 20;

  constructor(scene: Phaser.Scene, objectPool: ObjectPoolManager, difficultyManager: DifficultyManager) {
    this.scene = scene;
    this.objectPool = objectPool;
    this.difficultyManager = difficultyManager;
    
    // Default spawn configuration - faster for better gameplay
    this.config = {
      minSpawnRate: 300, // 0.3 seconds minimum (faster)
      maxSpawnRate: 800, // 0.8 seconds maximum (faster)
      bombChance: 0.12, // 12% chance for bombs (reduced from 30% for better balance)
      slowMoChance: 0.05, // 5% chance for slow-mo dots
      correctColorRatio: 0.4, // 40% of dots should be correct color
      baseSpawnRate: 500, // Base spawn rate for performance scaling (faster)
      effectsEnabled: true, // Enable visual effects by default
      particleQuality: 'high' // High particle quality by default
    };
    
    this.initializeSpawnSystem();
  }

  /**
   * Initialize the spawn system with screen boundaries
   */
  private initializeSpawnSystem(): void {
    // Get screen boundaries
    const camera = this.scene.cameras.main;
    this.screenBounds = new Phaser.Geom.Rectangle(0, 0, camera.width, camera.height);
    
    this.scheduleNextSpawn();
  }

  /**
   * Update the spawner - called every frame
   */
  public update(_delta: number, elapsedTime: number): void {
    const currentTime = this.scene.time.now;
    
    // Check if it's time to spawn a new object
    if (currentTime >= this.lastSpawnTime + this.nextSpawnDelay) {
      this.spawnObject(elapsedTime);
      this.scheduleNextSpawn();
    }
  }

  /**
   * Schedule the next spawn based on difficulty and configuration
   */
  private scheduleNextSpawn(): void {
    // Calculate spawn rate based on difficulty (faster spawning over time)
    const baseDelay = Phaser.Math.Between(this.config.minSpawnRate, this.config.maxSpawnRate);
    
    // Reduce delay slightly over time to increase intensity
    const timeReduction = Math.min(this.scene.time.now / 1000 * 10, 500); // Max 500ms reduction
    this.nextSpawnDelay = Math.max(baseDelay - timeReduction, 200); // Minimum 200ms between spawns
    
    this.lastSpawnTime = this.scene.time.now;
  }

  /**
   * Spawn a new object based on current difficulty and probabilities
   */
  private spawnObject(elapsedTime: number): void {
    // Get current difficulty metrics
    const difficulty = this.difficultyManager.getDifficultyMetrics(elapsedTime / 1000);
    
    // Calculate responsive size based on screen dimensions
    const responsiveSize = this.difficultyManager.calculateResponsiveSize(
      elapsedTime / 1000,
      this.screenBounds.width,
      this.screenBounds.height
    );
    
    // Get a random spawn edge with fresh coordinates
    const edge = this.getRandomSpawnEdge();
    
    // Determine what type of object to spawn
    const spawnRoll = Math.random();
    
    // Check bomb count limits before spawning bombs
    const currentBombCount = this.objectPool.getActiveBombCount();
    const maxBombCount = gameLimitsManager.calculateBombCount(elapsedTime / 1000); // Convert ms to seconds
    
    // Debug logging
    if (Math.random() < 0.05) { // 5% chance to log for debugging (increased for troubleshooting)
      console.log(`Spawner: roll=${spawnRoll.toFixed(3)}, bombChance=${this.config.bombChance}, slowMoChance=${this.config.slowMoChance}, currentBombs=${currentBombCount}, maxBombs=${maxBombCount}, elapsedTime=${elapsedTime}ms`);
    }
    
    if (spawnRoll < this.config.bombChance && currentBombCount < maxBombCount) {
      // Spawn a bomb (only if under the limit)
      this.spawnBomb(difficulty.speed, responsiveSize, edge.x, edge.y, edge.direction);
    } else if (spawnRoll < this.config.bombChance + this.config.slowMoChance) {
      // Spawn a slow-mo dot
      this.spawnSlowMoDot(difficulty.speed, responsiveSize, edge.x, edge.y, edge.direction);
    } else {
      // Spawn a regular dot
      this.spawnDot(difficulty.speed, responsiveSize, edge.x, edge.y, edge.direction);
    }
  }

  /**
   * Get a random spawn edge with fresh coordinates
   */
  private getRandomSpawnEdge(): SpawnEdge {
    const bounds = this.screenBounds;
    const margin = this.SPAWN_MARGIN;
    
    // Choose random edge type
    const edgeType = Phaser.Math.Between(0, 7);
    
    switch (edgeType) {
      case 0: // Top edge
        return {
          x: Phaser.Math.Between(0, bounds.width),
          y: -margin,
          direction: new Phaser.Math.Vector2(0, 1)
        };
      case 1: // Bottom edge
        return {
          x: Phaser.Math.Between(0, bounds.width),
          y: bounds.height + margin,
          direction: new Phaser.Math.Vector2(0, -1)
        };
      case 2: // Left edge
        return {
          x: -margin,
          y: Phaser.Math.Between(0, bounds.height),
          direction: new Phaser.Math.Vector2(1, 0)
        };
      case 3: // Right edge
        return {
          x: bounds.width + margin,
          y: Phaser.Math.Between(0, bounds.height),
          direction: new Phaser.Math.Vector2(-1, 0)
        };
      case 4: // Top-left diagonal
        return {
          x: -margin,
          y: -margin,
          direction: new Phaser.Math.Vector2(0.7, 0.7).normalize()
        };
      case 5: // Top-right diagonal
        return {
          x: bounds.width + margin,
          y: -margin,
          direction: new Phaser.Math.Vector2(-0.7, 0.7).normalize()
        };
      case 6: // Bottom-left diagonal
        return {
          x: -margin,
          y: bounds.height + margin,
          direction: new Phaser.Math.Vector2(0.7, -0.7).normalize()
        };
      case 7: // Bottom-right diagonal
      default:
        return {
          x: bounds.width + margin,
          y: bounds.height + margin,
          direction: new Phaser.Math.Vector2(-0.7, -0.7).normalize()
        };
    }
  }

  /**
   * Spawn a regular dot with balanced color distribution
   */
  private spawnDot(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    // Get limits for dots
    const limits = gameLimitsManager.getLimits('dots');
    
    // Determine dot color based on correct color ratio
    let color: GameColor;
    
    if (Math.random() < this.config.correctColorRatio) {
      // Spawn correct color dot
      color = this.targetColor;
    } else {
      // Spawn distractor color (any color except target)
      const distractorColors = this.AVAILABLE_COLORS.filter(c => c !== this.targetColor);
      color = Phaser.Utils.Array.GetRandom(distractorColors);
    }
    
    // Add some movement variation
    const variationAngle = Phaser.Math.Between(-15, 15) * Math.PI / 180; // ±15 degrees
    const variedDirection = direction.clone().rotate(variationAngle);
    
    // Add speed variation (±20%) and make faster, but respect limits
    const variedSpeed = Math.min(
      speed * Phaser.Math.FloatBetween(1.5, 2.0),
      limits.maxSpeed
    );
    
    // Ensure size is within limits
    const clampedSize = Math.max(limits.minSize, Math.min(limits.maxSize, size));
    
    // Spawn the dot
    const dot = this.objectPool.spawnDot(color, variedSpeed, clampedSize, x, y, variedDirection);
    
    if (!dot) {
      console.warn('Failed to spawn dot - pool may be full');
    }
  }

  /**
   * Spawn a bomb
   */
  private spawnBomb(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    // Get limits for bombs
    const limits = gameLimitsManager.getLimits('bombs');
    
    // Add some movement variation
    const variationAngle = Phaser.Math.Between(-10, 10) * Math.PI / 180; // ±10 degrees
    const variedDirection = direction.clone().rotate(variationAngle);
    
    // Bombs move slightly slower than dots for balance, but respect limits
    const bombSpeed = Math.min(speed * 0.9, limits.maxSpeed);
    
    // Ensure size is within limits
    const clampedSize = Math.max(limits.minSize, Math.min(limits.maxSize, size));
    
    // Spawn the bomb
    const bomb = this.objectPool.spawnBomb(bombSpeed, clampedSize, x, y, variedDirection);
    
    if (!bomb) {
      console.warn('Failed to spawn bomb - pool may be full');
    }
  }

  /**
   * Spawn a slow-mo power-up dot
   */
  private spawnSlowMoDot(speed: number, size: number, x: number, y: number, direction: Phaser.Math.Vector2): void {
    // Get limits for slow-mo dots
    const limits = gameLimitsManager.getLimits('slowMo');
    
    // Add some movement variation
    const variationAngle = Phaser.Math.Between(-10, 10) * Math.PI / 180; // ±10 degrees
    const variedDirection = direction.clone().rotate(variationAngle);
    
    // Slow-mo dots move at normal speed, but respect limits
    const slowMoSpeed = Math.min(speed, limits.maxSpeed);
    
    // Ensure size is within limits
    const clampedSize = Math.max(limits.minSize, Math.min(limits.maxSize, size));
    
    // Spawn the slow-mo dot
    const slowMoDot = this.objectPool.spawnSlowMoDot(slowMoSpeed, clampedSize, x, y, variedDirection);
    
    if (!slowMoDot) {
      console.warn('Failed to spawn slow-mo dot - pool may be full');
    }
  }

  /**
   * Set the target color for balanced spawning
   */
  public setTargetColor(color: GameColor): void {
    this.targetColor = color;
  }

  /**
   * Get the current target color
   */
  public getTargetColor(): GameColor {
    return this.targetColor;
  }

  /**
   * Update spawn configuration
   */
  public updateConfig(newConfig: Partial<SpawnConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current spawn configuration
   */
  public getConfig(): SpawnConfig {
    return { ...this.config };
  }

  /**
   * Force spawn a specific number of objects (useful for testing)
   * Respects bomb count limits to prevent spawning too many bombs initially
   */
  public forceSpawn(count: number, elapsedTime: number): void {
    const maxBombCount = gameLimitsManager.calculateBombCount(elapsedTime / 1000);
    const currentBombCount = this.objectPool.getActiveBombCount();
    
    for (let i = 0; i < count; i++) {
      // Check if we're at bomb limit before spawning
      if (currentBombCount >= maxBombCount) {
        // Force spawn only dots if at bomb limit
        const difficulty = this.difficultyManager.getDifficultyMetrics(elapsedTime / 1000);
        const responsiveSize = this.difficultyManager.calculateResponsiveSize(
          elapsedTime / 1000,
          this.screenBounds.width,
          this.screenBounds.height
        );
        const edge = this.getRandomSpawnEdge();
        this.spawnDot(difficulty.speed, responsiveSize, edge.x, edge.y, edge.direction);
      } else {
        // Normal spawn logic (which respects bomb limits)
        this.spawnObject(elapsedTime);
      }
    }
  }

  /**
   * Clear all spawned objects
   */
  public clearAll(): void {
    this.objectPool.clearAll();
  }

  /**
   * Reset spawner state
   */
  public reset(): void {
    this.lastSpawnTime = 0;
    this.nextSpawnDelay = 0;
    this.scheduleNextSpawn();
    this.clearAll();
  }

  /**
   * Update screen boundaries (call when screen size changes)
   */
  public updateScreenBounds(width: number, height: number): void {
    this.screenBounds.setSize(width, height);
  }

  /**
   * Get spawn statistics for debugging
   */
  public getSpawnStats(): {
    lastSpawnTime: number;
    nextSpawnDelay: number;
    config: SpawnConfig;
    targetColor: GameColor;
    poolStats: ReturnType<ObjectPoolManager['getPoolStats']>;
  } {
    return {
      lastSpawnTime: this.lastSpawnTime,
      nextSpawnDelay: this.nextSpawnDelay,
      config: this.getConfig(),
      targetColor: this.targetColor,
      poolStats: this.objectPool.getPoolStats()
    };
  }

  /**
   * Pause spawning
   */
  public pause(): void {
    this.lastSpawnTime = Number.MAX_SAFE_INTEGER;
  }

  /**
   * Resume spawning
   */
  public resume(): void {
    this.lastSpawnTime = this.scene.time.now;
    this.scheduleNextSpawn();
  }

  /**
   * Check if spawning is active
   */
  public isActive(): boolean {
    return this.lastSpawnTime !== Number.MAX_SAFE_INTEGER;
  }

  /**
   * Set maximum objects for performance optimization
   */
  public setMaxObjects(maxObjects: number): void {
    // Adjust spawn rates based on max objects
    const ratio = maxObjects / 50; // 50 is the default max
    this.config.baseSpawnRate = Math.max(500, this.config.baseSpawnRate * ratio);
    console.log(`Adjusted spawn rate for ${maxObjects} max objects: ${this.config.baseSpawnRate}ms`);
  }

  /**
   * Enable/disable visual effects for performance optimization
   */
  public setEffectsEnabled(enabled: boolean): void {
    this.config.effectsEnabled = enabled;
    console.log(`Visual effects ${enabled ? 'enabled' : 'disabled'} for performance`);
  }

  /**
   * Set particle quality for performance optimization
   */
  public setParticleQuality(quality: 'high' | 'medium' | 'low'): void {
    this.config.particleQuality = quality;
    console.log(`Particle quality set to ${quality} for performance`);
  }
}
