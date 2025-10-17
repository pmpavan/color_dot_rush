import { DifficultyParams, DEFAULT_DIFFICULTY_PARAMS } from '../../shared/types/debug';

export class DifficultyManager {
  private params: DifficultyParams;

  constructor(initialParams?: Partial<DifficultyParams>) {
    this.params = { ...DEFAULT_DIFFICULTY_PARAMS, ...initialParams };
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
   * @param targetSessionSeconds - Target session length in seconds (default 90)
   * @returns Whether the difficulty curve is reasonable for the target
   */
  public validateDifficultyCurve(targetSessionSeconds: number = 90): boolean {
    const speedAtTarget = this.calculateSpeed(targetSessionSeconds);
    const sizeAtTarget = this.calculateSize(targetSessionSeconds);
    
    // Define reasonable limits for playability based on PRD parameters
    // At 90 seconds with default params: speed ~3400, size ~13
    const MAX_PLAYABLE_SPEED = 5000; // px/sec - allows for PRD parameters
    const MIN_PLAYABLE_SIZE = 10; // px - allows for PRD parameters
    
    return speedAtTarget <= MAX_PLAYABLE_SPEED && sizeAtTarget >= MIN_PLAYABLE_SIZE;
  }
}