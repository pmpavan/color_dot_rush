/**
 * Game Limits Configuration
 * Defines maximum and minimum values for object properties to ensure
 * consistent gameplay and performance across all devices
 */

export interface ObjectLimits {
  minSize: number;
  maxSize: number;
  minSpeed: number;
  maxSpeed: number;
  minCount?: number;
  maxCount?: number;
}

export interface GameLimitsConfig {
  dots: ObjectLimits;
  bombs: ObjectLimits;
  slowMo: ObjectLimits;
  performance: {
    targetFPS: number;
    maxObjectCount: number;
    performanceAdjustmentFactor: number;
  };
}

/**
 * Default game limits configuration
 */
export const DEFAULT_GAME_LIMITS: GameLimitsConfig = {
  dots: {
    minSize: 20,    // 20px minimum dot size (reduced to allow size reduction)
    maxSize: 120,   // 120px maximum dot size
    minSpeed: 50,   // 50px/s minimum speed
    maxSpeed: 300,  // 300px/s maximum speed
  },
  bombs: {
    minSize: 35,    // 35px minimum bomb size
    maxSize: 100,   // 100px maximum bomb size
    minSpeed: 40,   // 40px/s minimum speed
    maxSpeed: 250,  // 250px/s maximum speed
    minCount: 1,    // Start with 1 bomb on screen
    maxCount: 5,    // Maximum 5 bombs on screen
  },
  slowMo: {
    minSize: 50,    // 50px minimum slow-mo size
    maxSize: 80,    // 80px maximum slow-mo size
    minSpeed: 60,   // 60px/s minimum speed
    maxSpeed: 200,  // 200px/s maximum speed
  },
  performance: {
    targetFPS: 60,
    maxObjectCount: 200,
    performanceAdjustmentFactor: 0.1, // 10% adjustment when performance is poor
  },
};

/**
 * Game Limits Manager
 * Handles dynamic adjustment of limits based on performance and difficulty
 */
export class GameLimitsManager {
  private config: GameLimitsConfig;
  private currentFPS: number = 60;
  private objectCount: number = 0;

  constructor(config: GameLimitsConfig = DEFAULT_GAME_LIMITS) {
    this.config = { ...config };
  }

  /**
   * Get current limits for a specific object type
   */
  getLimits(objectType: 'dots' | 'bombs' | 'slowMo'): ObjectLimits {
    const baseLimits = this.config[objectType];
    
    // Apply performance adjustments if needed
    if (this.shouldAdjustForPerformance()) {
      return this.adjustLimitsForPerformance(baseLimits, objectType);
    }
    
    return baseLimits;
  }

  /**
   * Calculate object properties based on difficulty level
   */
  calculateObjectProperties(
    difficultyLevel: number, 
    objectType: 'dots' | 'bombs' | 'slowMo'
  ): { size: number; speed: number; count?: number } {
    const limits = this.getLimits(objectType);
    const normalizedDifficulty = Math.max(0, Math.min(1, difficultyLevel));

    let size: number;
    let speed: number;
    let count: number | undefined;

    switch (objectType) {
      case 'dots':
        // Dots: Start large, get smaller as difficulty increases
        size = limits.maxSize - (normalizedDifficulty * (limits.maxSize - limits.minSize));
        // Dots: Start slow, get faster as difficulty increases
        speed = limits.minSpeed + (normalizedDifficulty * (limits.maxSpeed - limits.minSpeed));
        break;

      case 'bombs':
        // Bombs: Get smaller and faster with difficulty
        size = limits.maxSize - (normalizedDifficulty * (limits.maxSize - limits.minSize));
        speed = limits.minSpeed + (normalizedDifficulty * (limits.maxSpeed - limits.minSpeed));
        
        // Bomb count: Start with minCount, slowly increase over time
        if (limits.minCount !== undefined && limits.maxCount !== undefined) {
          // Very slow progression: takes 3 minutes to reach max count
          const countDifficulty = Math.min(normalizedDifficulty * 0.5, 1.0); // Slower than other properties
          count = limits.minCount + (countDifficulty * (limits.maxCount - limits.minCount));
          count = Math.round(count);
        }
        break;

      case 'slowMo':
        // Slow-mo: Moderate scaling to maintain usability
        size = limits.maxSize - (normalizedDifficulty * 0.3 * (limits.maxSize - limits.minSize));
        speed = limits.minSpeed + (normalizedDifficulty * 0.5 * (limits.maxSpeed - limits.minSpeed));
        break;

      default:
        size = limits.minSize;
        speed = limits.minSpeed;
    }

    const result: { size: number; speed: number; count?: number } = {
      size: this.clamp(size, limits.minSize, limits.maxSize),
      speed: this.clamp(speed, limits.minSpeed, limits.maxSpeed),
    };

    if (count !== undefined && limits.minCount !== undefined && limits.maxCount !== undefined) {
      result.count = this.clamp(count, limits.minCount, limits.maxCount);
    }

    return result;
  }

  /**
   * Validate and clamp object properties to safe bounds
   */
  validateObjectProperties(
    size: number, 
    speed: number, 
    objectType: 'dots' | 'bombs' | 'slowMo'
  ): { size: number; speed: number } {
    const limits = this.getLimits(objectType);
    
    return {
      size: this.clamp(size, limits.minSize, limits.maxSize),
      speed: this.clamp(speed, limits.minSpeed, limits.maxSpeed),
    };
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(fps: number, objectCount: number): void {
    this.currentFPS = fps;
    this.objectCount = objectCount;
  }

  /**
   * Check if limits should be adjusted for performance
   */
  private shouldAdjustForPerformance(): boolean {
    return (
      this.currentFPS < this.config.performance.targetFPS * 0.8 ||
      this.objectCount > this.config.performance.maxObjectCount
    );
  }

  /**
   * Adjust limits for poor performance
   */
  private adjustLimitsForPerformance(
    baseLimits: ObjectLimits, 
    _objectType: 'dots' | 'bombs' | 'slowMo'
  ): ObjectLimits {
    const factor = this.config.performance.performanceAdjustmentFactor;
    
    // Reduce max values to improve performance
    const adjustedMaxSize = baseLimits.maxSize * (1 - factor);
    const adjustedMaxSpeed = baseLimits.maxSpeed * (1 - factor * 0.5); // Less aggressive speed reduction
    
    return {
      minSize: baseLimits.minSize,
      maxSize: Math.max(adjustedMaxSize, baseLimits.minSize + 10), // Ensure some range
      minSpeed: baseLimits.minSpeed,
      maxSpeed: Math.max(adjustedMaxSpeed, baseLimits.minSpeed + 10),
    };
  }

  /**
   * Clamp value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get current configuration
   */
  getConfig(): GameLimitsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GameLimitsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_GAME_LIMITS };
  }

  /**
   * Calculate bomb count based on game duration
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Number of bombs that should be on screen
   */
  public calculateBombCount(elapsedTimeSeconds: number): number {
    const limits = this.getLimits('bombs');
    
    if (limits.minCount === undefined || limits.maxCount === undefined) {
      console.warn('GameLimits: Bomb count limits not defined, using fallback');
      return 1; // Default fallback
    }

    // Very slow progression: takes 3 minutes (180 seconds) to reach max count
    const maxTimeForMaxCount = 180; // 3 minutes
    const progress = Math.min(elapsedTimeSeconds / maxTimeForMaxCount, 1.0);
    
    // Use a smooth curve for more gradual increase
    const smoothProgress = progress * progress; // Quadratic curve for slower early growth
    
    const count = limits.minCount + (smoothProgress * (limits.maxCount - limits.minCount));
    const roundedCount = Math.round(count);
    
    // Debug logging for bomb count calculation
    if (Math.random() < 0.02) { // 2% chance to log
      console.log(`BombCount: elapsedTime=${elapsedTimeSeconds.toFixed(1)}s, progress=${progress.toFixed(3)}, smoothProgress=${smoothProgress.toFixed(3)}, count=${count.toFixed(2)}, rounded=${roundedCount}, minCount=${limits.minCount}, maxCount=${limits.maxCount}`);
    }
    
    return roundedCount;
  }
}

// Export singleton instance
export const gameLimitsManager = new GameLimitsManager();
