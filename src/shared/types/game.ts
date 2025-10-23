// Color Dot Rush Game Types

export enum GameColor {
  RED = '#FF0000', // Warning Red - intense red with subtle flicker
  GREEN = '#00FF00', // Volt Green - lime green with glow
  BLUE = '#00BFFF', // Electric Blue - sky blue with glow
  YELLOW = '#FFA500', // Plasma Orange - bright orange with glow
  PURPLE = '#FF69B4', // Cyber Pink - hot pink with glow
}

export enum UIColor {
  BACKGROUND = '#080808', // Deep Space Black
  TEXT_PRIMARY = '#FFFFFF', // Bright white with subtle blue/pink neon glow
  TEXT_SECONDARY = '#E0E0E0', // Very light gray with neon glow
  BUTTON_PRIMARY = '#00BFFF', // Electric Blue - primary button glow
  BUTTON_SECONDARY = '#FF69B4', // Cyber Pink - secondary button glow
  BUTTON_TERTIARY = '#00FF00', // Volt Green - tertiary button glow
  BUTTON_QUATERNARY = '#FFA500', // Plasma Orange - quaternary button glow
  BOMB = '#FF0000', // Warning Red with subtle flicker
  SLOW_MO = '#00BFFF', // Electric Blue for slow-mo power-up
  LASER_GRID = '#32CD32', // Laser Grid Green with constant glow
  GLOW_BLUE = '#00BFFF', // Electric Blue glow
  GLOW_PINK = '#FF69B4', // Cyber Pink glow
  GLOW_GREEN = '#00FF00', // Volt Green glow
  GLOW_ORANGE = '#FFA500', // Plasma Orange glow
  GLOW_RED = '#FF0000', // Warning Red glow
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

// Legacy interface - moved to debug.ts

// Default configuration values from PRD
// Typography system from Neon Pulse theme
export interface TypographyScale {
  gameTitle: '72pt Orbitron Black'; // H1 - Game title with neon glow
  modalTitle: '48pt Orbitron Bold'; // H2 - Modal titles with neon glow
  headerUI: '24pt Orbitron Regular'; // Header UI - Score, time, charges with neon glow
  bodyButton: '20pt Orbitron Medium'; // Body/Button text with neon glow
}

// Default configuration values from PRD
export const DEFAULT_GAME_CONFIG: GameConfig = {
  baseSpeed: 100, // px/sec
  growthRate: 1.04,
  baseSize: 100, // px diameter (increased by 150% from 40)
  shrinkRate: 0.98,
  slowMoCharges: 3, // Initial charges
  slowMoDuration: 3000, // 3 seconds in ms
};
