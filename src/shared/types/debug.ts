// Debug System Types for Color Rush

export interface DifficultyParams {
  baseSpeed: number;
  growthRate: number;
  baseSize: number;
  shrinkRate: number;
}

export interface DebugConfig {
  showHitboxes: boolean;
  showFPS: boolean;
  showObjectCount: boolean;
  enabled: boolean;
}

export interface IDebugService {
  isEnabled(): boolean;
  showDebugPanel(): void;
  hideDebugPanel(): void;
  toggleDebugPanel(): void;
  updateDifficultyParams(params: Partial<DifficultyParams>): void;
  getDifficultyParams(): DifficultyParams;
  visualizeHitboxes(enabled: boolean): void;
  isHitboxVisualizationEnabled(): boolean;
  getDebugConfig(): DebugConfig;
  updateDebugConfig(config: Partial<DebugConfig>): void;
  updateElapsedTime(elapsedTime: number): void;
}

// Default difficulty parameters optimized for 3.5+ minute gameplay
export const DEFAULT_DIFFICULTY_PARAMS: DifficultyParams = {
  baseSpeed: 100, // px/sec
  growthRate: 1.023, // Reduced for 3.5+ minute target (was 1.04)
  baseSize: 100, // px diameter (increased by 150% from 40)
  shrinkRate: 0.9895, // Fine-tuned for 3.5+ minute target (was 0.98)
};

// Default debug configuration
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  showHitboxes: false,
  showFPS: false,
  showObjectCount: false,
  enabled: true, // Will be overridden by actual debug service based on environment
};
