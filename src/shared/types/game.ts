// Color Rush Game Types

export enum GameColor {
  RED = '#E74C3C',
  GREEN = '#2ECC71',
  BLUE = '#3498DB',
  YELLOW = '#F1C40F',
  PURPLE = '#9B59B6',
}

export enum UIColor {
  BACKGROUND = '#2C3E50', // Dark Slate
  TEXT_PRIMARY = '#FFFFFF', // White
  TEXT_SECONDARY = '#ECF0F1', // Light Grey
  BUTTON_PRIMARY = '#3498DB', // Bright Blue
  BUTTON_SECONDARY = '#95A5A6', // Mid Grey
  BOMB = '#34495E', // Near Black
  SLOW_MO = '#F8F9FA', // Shimmering White (slightly different from TEXT_SECONDARY)
}

export interface GameConfig {
  baseSpeed: number;
  growthRate: number;
  baseSize: number;
  shrinkRate: number;
  slowMoCharges: number;
  slowMoDuration: number;
}

export interface GameState {
  // Core gameplay state
  score: number;
  bestScore: number;
  elapsedTime: number;
  targetColor: GameColor;

  // Power-up system (specific values from PRD)
  slowMoCharges: number; // Starts at 3
  slowMoActive: boolean;
  slowMoDuration: number; // 3000ms

  // Game flow control
  isGameOver: boolean;
  isPaused: boolean;
  gamePhase: 'READY' | 'PLAYING' | 'GAME_OVER';
}

// Legacy interface - use debug.ts for new debug-related types
export interface DifficultyParams {
  baseSpeed: number;
  speedMultiplier: number;
  baseDotSize: number;
  sizeReductionRate: number;
  baseSpawnRate: number;
  spawnRateIncrease: number;
  bombSpawnChance: number;
}

// Default configuration values from PRD
export const DEFAULT_GAME_CONFIG: GameConfig = {
  baseSpeed: 100, // px/sec
  growthRate: 1.04,
  baseSize: 80, // px diameter
  shrinkRate: 0.98,
  slowMoCharges: 3, // Initial charges
  slowMoDuration: 3000, // 3 seconds in ms
};
