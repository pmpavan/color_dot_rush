import { DifficultyParams, DEFAULT_DIFFICULTY_PARAMS } from '../../shared/types/debug';
import { gameLimitsManager, GameLimitsManager } from '../../shared/config/GameLimits';

export class DifficultyManager {
  private params: DifficultyParams;
  private limitsManager: GameLimitsManager;

  constructor(initialParams?: Partial<DifficultyParams>) {
    this.params = { ...DEFAULT_DIFFICULTY_PARAMS, ...initialParams };
    this.limitsManager = gameLimitsManager;
  }

  /**
   * Calculate speed using the formula: speed = baseSpeed * growthRate^t
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Current speed in pixels per second
   */
  public calculateSpeed(elapsedTimeSeconds: number): number {
    return this.params.baseSpeed * Math.pow(this.params.growthRate, elapsedTimeSeconds);
  }

  /**
   * Calculate size using the formula: size = baseSize * shrinkRate^t
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Current size in pixels
   */
  public calculateSize(elapsedTimeSeconds: number): number {
    return this.params.baseSize * Math.pow(this.params.shrinkRate, elapsedTimeSeconds);
  }

  /**
   * Calculate responsive size based on screen dimensions
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @param screenWidth - Screen width in pixels
   * @param screenHeight - Screen height in pixels
   * @returns Current size in pixels, adjusted for screen size
   */
  public calculateResponsiveSize(elapsedTimeSeconds: number, screenWidth: number, screenHeight: number): number {
    const baseSize = this.calculateSize(elapsedTimeSeconds);
    
    // Calculate responsive scale factor based on screen size
    // Use the smaller dimension to ensure dots fit on all screen orientations
    const minDimension = Math.min(screenWidth, screenHeight);
    
    // Base scale factor: assume 800px as reference screen size
    // On smaller screens, dots should be proportionally smaller
    // On larger screens, dots should be proportionally larger
    const referenceSize = 800;
    const scaleFactor = minDimension / referenceSize;
    
    // Apply scale factor with reasonable bounds (0.5x to 2x)
    const clampedScaleFactor = Math.max(0.5, Math.min(2.0, scaleFactor));
    
    return Math.round(baseSize * clampedScaleFactor);
  }

  /**
   * Calculate dot count increase: +1 dot every 15 seconds
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Number of dots that should be on screen
   */
  public calculateDotCount(elapsedTimeSeconds: number): number {
    return Math.floor(elapsedTimeSeconds / 15) + 1;
  }

  /**
   * Update difficulty parameters (used by debug panel)
   * @param newParams - Partial parameters to update
   */
  public updateParams(newParams: Partial<DifficultyParams>): void {
    this.params = { ...this.params, ...newParams };
  }

  /**
   * Get current difficulty parameters
   * @returns Current difficulty parameters
   */
  public getParams(): DifficultyParams {
    return { ...this.params };
  }

  /**
   * Reset parameters to defaults
   */
  public resetToDefaults(): void {
    this.params = { ...DEFAULT_DIFFICULTY_PARAMS };
  }

  /**
   * Get difficulty metrics for a given time
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Object with all calculated difficulty values
   */
  public getDifficultyMetrics(elapsedTimeSeconds: number) {
    return {
      speed: this.calculateSpeed(elapsedTimeSeconds),
      size: this.calculateSize(elapsedTimeSeconds),
      dotCount: this.calculateDotCount(elapsedTimeSeconds),
      elapsedTime: elapsedTimeSeconds,
      params: this.getParams(),
    };
  }

  /**
   * Validate if the current difficulty curve allows for target session length
   * @param targetSessionSeconds - Target session length in seconds (default 210 for 3.5 minutes)
   * @returns Whether the difficulty curve is reasonable for the target
   */
  public validateDifficultyCurve(targetSessionSeconds: number = 210): boolean {
    const speedAtTarget = this.calculateSpeed(targetSessionSeconds);
    const sizeAtTarget = this.calculateSize(targetSessionSeconds);
    
    // Define reasonable limits for playability based on PRD parameters
    // At 210 seconds (3.5 minutes) with increased baseSize (100px): speed ~3400, size ~16.3
    const MAX_PLAYABLE_SPEED = 5000; // px/sec - allows for PRD parameters
    const MIN_PLAYABLE_SIZE = 12; // px - increased to account for larger base size
    
    return speedAtTarget <= MAX_PLAYABLE_SPEED && sizeAtTarget >= MIN_PLAYABLE_SIZE;
  }

  /**
   * Calculate object properties with limits applied
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @param objectType - Type of object (dots, bombs, slowMo)
   * @param screenWidth - Screen width for responsive sizing
   * @param screenHeight - Screen height for responsive sizing
   * @returns Object with size and speed within limits
   */
  public calculateObjectPropertiesWithLimits(
    elapsedTimeSeconds: number,
    objectType: 'dots' | 'bombs' | 'slowMo',
    screenWidth: number,
    screenHeight: number
  ): { size: number; speed: number } {
    // Calculate base difficulty level (0.0 to 1.0)
    const difficultyLevel = this.calculateDifficultyLevel(elapsedTimeSeconds);
    
    // Get properties from limits manager
    const properties = this.limitsManager.calculateObjectProperties(difficultyLevel, objectType);
    
    // Apply responsive sizing for dots
    if (objectType === 'dots') {
      properties.size = this.applyResponsiveSizing(properties.size, screenWidth, screenHeight);
    }
    
    // Validate and clamp to final limits
    return this.limitsManager.validateObjectProperties(properties.size, properties.speed, objectType);
  }

  /**
   * Calculate difficulty level as a normalized value (0.0 to 1.0)
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Difficulty level between 0.0 and 1.0
   */
  private calculateDifficultyLevel(elapsedTimeSeconds: number): number {
    // Base difficulty increases with time
    const timeDifficulty = Math.min(elapsedTimeSeconds / 120, 1.0); // Max difficulty at 2 minutes
    
    // Additional difficulty based on growth rate
    const growthDifficulty = Math.min((this.params.growthRate - 1) * 2, 0.5); // Max 0.5 from growth rate
    
    return Math.min(timeDifficulty + growthDifficulty, 1.0);
  }

  /**
   * Apply responsive sizing to object size
   * @param baseSize - Base size from limits
   * @param screenWidth - Screen width
   * @param screenHeight - Screen height
   * @returns Responsive size
   */
  private applyResponsiveSizing(baseSize: number, screenWidth: number, screenHeight: number): number {
    const minDimension = Math.min(screenWidth, screenHeight);
    const referenceSize = 800;
    const scaleFactor = minDimension / referenceSize;
    const clampedScaleFactor = Math.max(0.5, Math.min(2.0, scaleFactor));
    
    return Math.round(baseSize * clampedScaleFactor);
  }

  /**
   * Update performance metrics for limits manager
   * @param fps - Current FPS
   * @param objectCount - Current object count
   */
  public updatePerformanceMetrics(fps: number, objectCount: number): void {
    this.limitsManager.updatePerformanceMetrics(fps, objectCount);
  }

  /**
   * Get current limits for an object type
   * @param objectType - Type of object
   * @returns Current limits
   */
  public getLimits(objectType: 'dots' | 'bombs' | 'slowMo') {
    return this.limitsManager.getLimits(objectType);
  }

  /**
   * Calculate bomb count based on game duration
   * @param elapsedTimeSeconds - Elapsed time in seconds
   * @returns Number of bombs that should be on screen
   */
  public calculateBombCount(elapsedTimeSeconds: number): number {
    return this.limitsManager.calculateBombCount(elapsedTimeSeconds);
  }
}
