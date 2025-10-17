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
}

// Default difficulty parameters from PRD
export const DEFAULT_DIFFICULTY_PARAMS: DifficultyParams = {
  baseSpeed: 100, // px/sec
  growthRate: 1.04,
  baseSize: 80, // px diameter
  shrinkRate: 0.98,
};

// Default debug configuration
export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  showHitboxes: false,
  showFPS: false,
  showObjectCount: false,
  enabled: process.env.NODE_ENV !== 'production',
};