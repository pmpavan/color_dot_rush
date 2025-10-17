# Color Rush Game Design Document

## Overview

Color Rush is a high-energy reflex game built for the Reddit Devvit Web platform, designed for the Reddit Community Games 2025 hackathon. The game challenges players to tap colored dots matching a target color while avoiding bombs and incorrect colors. The core architecture leverages Phaser.js v3 within Reddit's Devvit Web environment, featuring a structured scene-based architecture with object pooling for optimal performance.

The game emphasizes quick reflexes, strategic power-up usage, and progressive difficulty scaling using specific mathematical formulas to create an addictive gameplay loop with a target session length of 90+ seconds. Integration with Reddit's ecosystem enables competitive weekly leaderboards and community engagement through the Devvit platform's built-in Reddit API access.

## Architecture

### High-Level Architecture

```
Reddit Devvit Web Platform
├── Client (src/client/)
│   └── Phaser.js v3 Game Instance
│       ├── Scene Management System (Boot→Preloader→Splash→Game+UI→GameOver)
│       ├── Game Engine Core (Finite State Machine)
│       ├── Object Pooling System (Phaser Groups)
│       └── Input Handling (Centralized)
├── Server (src/server/)
│   ├── /api/ Endpoints (Express/Koa)
│   ├── Reddit API Integration
│   ├── Leaderboard Storage (Devvit Redis)
│   └── User Authentication (Devvit Middleware)
├── Shared (src/shared/)
│   ├── TypeScript Interfaces
│   ├── Game State Models
│   └── API Request/Response Types
└── Asset Management (CSP Compliant - All Local)
```

### Scene Architecture

The game follows a structured scene progression with concurrent UI management:

**Scene Flow:**
`BootScene → PreloaderScene → SplashScreenScene → (GameScene + UIScene) → GameOverScene`

**Scene Responsibilities:**

- **BootScene**: Minimal bootstrap loading for initial assets
- **PreloaderScene**: Load all game assets with progress indication
- **SplashScreenScene**: Main menu with "Start Game" and "How to Play" options, featuring color-shifting gradient title
- **GameScene**: Core game logic, physics, object spawning and management with Dark Slate background
- **UIScene**: Concurrent overlay managing HUD elements (score, timer, target color display)
- **GameOverScene**: Modal overlay with scale-up animation displaying final score and navigation options

**UI Component Specifications (Per Frontend Spec):**

**Splash Screen Layout:**

- Vertically and horizontally centered content
- Game title with subtle color-shifting gradient using dot palette
- Primary "Start Game" button (Bright Blue #3498DB)
- Secondary "How to Play" button (Mid Grey #95A5A6)
- Button interactions: hover (scale-up), pressed (scale-down)

**Main Game Screen Header:**

- Clean top-aligned bar with transparent background
- Left: Score: [value] | Best: [value]
- Center: Time: [mm:ss]
- Right: Three clock icons for Slow-Mo charges (grey out when used)
- **Target Color Display**: Prominent box below header stating "TAP: [COLOR]" with matching text color

**Game Over Modal:**

- Centered card overlaying frozen game state with dimmed background
- Scale-up and fade-in animation (~250ms)
- "GAME OVER" title, score display, "Play Again" (auto-focused), "View Leaderboard"

**Design Rationale**: Separating UIScene from GameScene prevents UI redraws during intensive game world updates, maintaining 55+ FPS performance on low-end devices. UI follows minimalist aesthetic with immediate feedback principles.

### Service Architecture

The game employs a client-server architecture with singleton services for cross-cutting concerns:

**Client Services (src/client/):**

```typescript
interface ILeaderboardService {
  submitScore(score: number): Promise<void>; // Calls /api/submit-score
  getTopScores(): Promise<LeaderboardEntry[]>; // Calls /api/get-leaderboard
  getCurrentUserRank(): Promise<number | null>;
}

interface IStorageService {
  getBestScore(): number; // Local storage
  setBestScore(score: number): void;
  getGameSettings(): GameConfig;
  setGameSettings(settings: GameConfig): void;
}

interface IDebugService {
  showDebugPanel(): void;
  updateDifficultyParams(params: DifficultyParams): void;
  visualizeHitboxes(enabled: boolean): void;
}
```

**Server API Endpoints (src/server/):**

```typescript
// All endpoints start with /api/
app.post('/api/submit-score', async (req, res) => {
  // Use Devvit Redis for leaderboard storage
  // Automatic Reddit user authentication via Devvit middleware
});

app.get('/api/get-leaderboard', async (req, res) => {
  // Return weekly rankings from Devvit Redis
  // Handle graceful degradation for API failures
});
```

**Design Rationale**: Client-server separation enables Reddit integration through Devvit's server-side capabilities while maintaining testability through mock implementations. All Reddit API access and data persistence occurs server-side for security and compliance.

## Components and Interfaces

### Core Game Objects

**GameObject Base Interface:**

```typescript
interface IGameObject {
  x: number;
  y: number;
  active: boolean;
  update(delta: number): void;
  destroy(): void;
}

interface ICollidable extends IGameObject {
  getBounds(): Phaser.Geom.Rectangle;
  onCollision(other: ICollidable): void;
}

interface IRenderable extends IGameObject {
  render(): void;
  setVisible(visible: boolean): void;
}
```

**Dot Implementation:**

```typescript
class Dot extends Phaser.GameObjects.Sprite implements ICollidable, IRenderable {
  color: GameColor;
  speed: number;
  size: number;

  // Hitbox slightly larger than visual sprite for usability
  getBounds(): Phaser.Geom.Rectangle;
  onTap(): void;
}
```

**Bomb Implementation:**

```typescript
class Bomb extends Phaser.GameObjects.Sprite implements ICollidable, IRenderable {
  explosionRadius: number;
  color: UIColor.BOMB; // Near Black (#34495E)
  fuseIcon: Phaser.GameObjects.Image; // White fuse icon

  onTap(): void; // Triggers game over with explosion animation
  explode(): void; // Red/orange/yellow particle explosion + screen shake (2-3px, 150ms)
}
```

**Slow-Mo Power-Up Implementation:**

```typescript
class SlowMoDot extends Phaser.GameObjects.Sprite implements ICollidable, IRenderable {
  color: UIColor.SLOW_MO; // Shimmering White (#ECF0F1)
  clockIcon: Phaser.GameObjects.Image; // Blue clock icon

  onTap(): void; // Activates slow-mo with radial blue glow effect
  activateSlowMo(): void; // 3-second duration, blue vignette, smooth time scaling

  // Specific mechanics from PRD
  static readonly DURATION = 3000; // 3 seconds
  static readonly INITIAL_CHARGES = 3; // Player starts with 3 charges
}
```

### Game Engine Core

**GameEngine Class:**

```typescript
class GameEngine {
  private state: GameState;
  private difficultyManager: DifficultyManager;
  private inputHandler: InputHandler;
  private objectSpawner: ObjectSpawner;

  // Finite State Machine: READY → PLAYING → GAME_OVER
  changeState(newState: GameState): void;
  update(delta: number): void;
}
```

**DifficultyManager:**

```typescript
class DifficultyManager {
  // Specific formulas from PRD
  calculateSpeed(elapsedTime: number): number {
    return this.baseSpeed * Math.pow(this.growthRate, elapsedTime);
  }

  calculateSize(elapsedTime: number): number {
    return this.baseSize * Math.pow(this.shrinkRate, elapsedTime);
  }

  // Initial tuning parameters from PRD
  private baseSpeed = 100; // px/sec
  private growthRate = 1.04;
  private baseSize = 80; // px diameter
  private shrinkRate = 0.98;

  // Dot count increases by 1 every 15 seconds
  calculateDotCount(elapsedTime: number): number {
    return Math.floor(elapsedTime / 15000) + 1;
  }
}
```

### Object Pooling System

**Design Rationale**: Prevents garbage collection overhead during intensive gameplay by reusing objects instead of constant creation/destruction cycles.

```typescript
class ObjectPool<T extends IGameObject> {
  private pool: T[];
  private activeObjects: T[];

  get(): T | null;
  release(object: T): void;
  update(delta: number): void;
}

// Phaser Group integration
class GameScene extends Phaser.Scene {
  private dotPool: Phaser.GameObjects.Group;
  private bombPool: Phaser.GameObjects.Group;

  // Maximum pool sizes based on performance testing
  private readonly MAX_DOTS = 50;
  private readonly MAX_BOMBS = 20;
}
```

## Data Models

### Client-Server Architecture Models

**Shared Interfaces (src/shared/):**

```typescript
// API Request/Response Types
interface SubmitScoreRequest {
  score: number;
  sessionTime: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: number;
  totalPlayers: number;
}

// Game Configuration
interface GameConfig {
  baseSpeed: number;
  growthRate: number;
  baseSize: number;
  shrinkRate: number;
  slowMoCharges: number;
  slowMoDuration: number;
}
```

### Game State Model

```typescript
interface GameState {
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
```

### Difficulty Parameters

```typescript
interface DifficultyParams {
  baseSpeed: number;
  speedMultiplier: number;
  baseDotSize: number;
  sizeReductionRate: number;
  baseSpawnRate: number;
  spawnRateIncrease: number;
  bombSpawnChance: number;
}
```

### Leaderboard Model

```typescript
interface LeaderboardEntry {
  username: string;
  score: number;
  timestamp: number;
  rank: number;
}

interface WeeklyLeaderboard {
  entries: LeaderboardEntry[];
  weekStart: Date;
  weekEnd: Date;
  totalPlayers: number;
}
```

### UX Principles and Design System

**Core UX Principles (from Frontend Spec):**

- **Clarity Above All**: Player must understand what to do within seconds
- **Immediate Feedback**: Every tap, point scored, and error has immediate visual response
- **Minimalist Aesthetic**: Clean, modern, performance-friendly design avoiding visual clutter
- **"Juiciness"**: Tactile, satisfying interactions with key animations

**Color Palette (High Contrast for Accessibility):**

```typescript
enum GameColor {
  RED = '#E74C3C',
  GREEN = '#2ECC71',
  BLUE = '#3498DB',
  YELLOW = '#F1C40F',
  PURPLE = '#9B59B6',
}

enum UIColor {
  BACKGROUND = '#2C3E50', // Dark Slate
  TEXT_PRIMARY = '#FFFFFF', // White
  TEXT_SECONDARY = '#ECF0F1', // Light Grey
  BUTTON_PRIMARY = '#3498DB', // Bright Blue
  BUTTON_SECONDARY = '#95A5A6', // Mid Grey
  BOMB = '#34495E', // Near Black
  SLOW_MO = '#ECF0F1', // Shimmering White
}
```

**Typography System (Poppins Font Family):**

```typescript
interface TypographyScale {
  gameTitle: '72pt Poppins Bold'; // H1 - Game title with color-shifting gradient
  modalTitle: '48pt Poppins Bold'; // H2 - Modal titles
  headerUI: '24pt Poppins Regular'; // Header UI - Score, time, charges
  bodyButton: '20pt Poppins Medium'; // Body/Button text
}
```

**Iconography Standards:**

- Simple, solid, universally recognizable SVG icons
- Bomb: Circle with curved fuse line
- Slow-Mo: Simple clock face icon
- All icons bundled locally for CSP compliance

## Error Handling

### API Error Handling Strategy

**Graceful Degradation Pattern:**

```typescript
class LeaderboardService {
  async submitScore(score: number): Promise<void> {
    try {
      await this.devvitAPI.submitScore(score);
    } catch (error) {
      // Log error but don't break gameplay
      console.warn('Leaderboard submission failed:', error);
      // Store locally for retry later
      this.storageService.queueScoreForRetry(score);
    }
  }

  async getScores(): Promise<LeaderboardEntry[]> {
    try {
      return await this.devvitAPI.getLeaderboard();
    } catch (error) {
      // Return cached scores or empty array
      return this.storageService.getCachedScores() || [];
    }
  }
}
```

### Game State Error Recovery

```typescript
class GameEngine {
  private handleGameError(error: Error): void {
    // Log error for debugging
    this.debugService.logError(error);

    // Attempt graceful recovery
    if (this.canRecover(error)) {
      this.resetToSafeState();
    } else {
      // Show error modal with restart option
      this.showErrorModal(error.message);
    }
  }

  private resetToSafeState(): void {
    this.changeState(GameState.READY);
    this.clearAllObjects();
    this.resetDifficulty();
  }
}
```

### Input Validation

```typescript
class InputHandler {
  validateTap(x: number, y: number): boolean {
    // Ensure tap coordinates are within game bounds
    return x >= 0 && x <= this.gameWidth && y >= 0 && y <= this.gameHeight;
  }

  handleInvalidInput(error: InputError): void {
    // Log but don't interrupt gameplay
    this.debugService.logInputError(error);
  }
}
```

## Testing Strategy

### High-Risk Areas and Test Strategies (from QA Review)

**Area 1: Dynamic Difficulty Scaling (High Risk)**

- **Risk**: Game enjoyability depends on exponential formulas; incorrect tuning makes game unplayable
- **Test Strategy**:
  - Prioritize debug panel functionality for live-tuning
  - Verify mathematical formulas: speed = baseSpeed _ growthRate^t, size = baseSize _ shrinkRate^t
  - Establish "Golden Path" metrics: 90+ second average survival target

**Area 2: Input Precision & Hit Registration (High Risk)**

- **Risk**: Perceived "misses" cause player frustration; hitbox accuracy critical
- **Test Strategy**:
  - Test hitbox visualization in debug mode
  - Verify logical tap area larger than visual sprite
  - Cross-device testing on physical mobile devices (not just emulators)

**Area 3: Devvit API & Backend Integration (Medium Risk)**

- **Risk**: Network latency, API errors, authentication issues can break leaderboard
- **Test Strategy**:
  - Test against mock LeaderboardService with various responses
  - Verify graceful degradation with clear error messages
  - Test API timeout handling and retry logic

### Unit Testing Approach

**Core Game Logic Testing:**

```typescript
describe('DifficultyManager', () => {
  test('speed formula matches PRD specification', () => {
    const manager = new DifficultyManager();
    const baseSpeed = 100;
    const growthRate = 1.04;
    const time = 30; // 30 seconds

    const expectedSpeed = baseSpeed * Math.pow(growthRate, time);
    expect(manager.calculateSpeed(time)).toBe(expectedSpeed);
  });

  test('maintains 90+ second survival target', () => {
    const manager = new DifficultyManager();
    const speeds = [];

    for (let time = 0; time <= 120; time += 1) {
      speeds.push(manager.calculateSpeed(time));
    }

    // Verify curve allows for 90+ second gameplay
    expect(speeds[90]).toBeLessThan(MAXIMUM_PLAYABLE_SPEED);
  });
});

describe('GameEngine', () => {
  test('slow-mo mechanics work correctly', () => {
    const engine = new GameEngine(mockServices);
    expect(engine.getSlowMoCharges()).toBe(3); // Initial charges

    engine.activateSlowMo();
    expect(engine.getSlowMoCharges()).toBe(2);
    expect(engine.isSlowMoActive()).toBe(true);

    // After 3 seconds
    jest.advanceTimersByTime(3000);
    expect(engine.isSlowMoActive()).toBe(false);
  });
});
```

**Mock Service Implementation:**

```typescript
class MockLeaderboardService implements ILeaderboardService {
  private mockScores: LeaderboardEntry[] = [];
  private shouldFail = false;

  async submitScore(score: number): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Mock API failure');
    }
    this.mockScores.push({ score, username: 'testuser', timestamp: Date.now(), rank: 1 });
  }

  simulateAPIFailure(fail: boolean): void {
    this.shouldFail = fail;
  }
}
```

### Integration Testing

**Reddit API Integration:**

```typescript
describe('Devvit Integration', () => {
  test('handles Reddit API rate limiting gracefully', async () => {
    const service = new DevvitLeaderboardService();

    // Simulate rate limiting
    mockDevvitAPI.setRateLimit(true);

    const result = await service.submitScore(100);
    expect(result).toBeUndefined(); // Should not throw
    expect(mockStorage.getQueuedScores()).toContain(100);
  });
});
```

### Performance Testing

**Frame Rate Validation:**

```typescript
describe('Performance', () => {
  test('maintains 55+ FPS with maximum objects', () => {
    const scene = new GameScene();
    scene.create();

    // Spawn maximum objects
    for (let i = 0; i < 50; i++) {
      scene.spawnDot();
    }
    for (let i = 0; i < 20; i++) {
      scene.spawnBomb();
    }

    const frameTime = measureFrameTime(() => {
      scene.update(16); // 60 FPS = 16ms per frame
    });

    expect(frameTime).toBeLessThan(16);
  });
});
```

### Visual Regression Testing

**UI Component Testing:**

```typescript
describe('UI Components', () => {
  test('game over modal displays correctly', () => {
    const scene = new GameOverScene();
    scene.create();

    const modal = scene.getGameOverModal();
    expect(modal.visible).toBe(true);
    expect(modal.getScoreText()).toContain('Final Score:');
  });
});
```

## Implementation Notes

### CSP Compliance Requirements

All assets must be bundled locally to comply with Content Security Policy:

- Phaser.js library included in bundle
- Local Poppins font files (no Google Fonts CDN)
- All sprites, icons (SVG), and audio files bundled
- No external CDN dependencies
- Simple, solid SVG icons for bomb fuse and clock symbols

### Performance Optimization Strategies

1. **Object Pooling**: Reuse game objects to prevent garbage collection
2. **Texture Atlasing**: Combine sprites into single texture for efficient rendering
3. **Culling**: Use Phaser's built-in culling for off-screen objects
4. **Separate UI Scene**: Prevent UI redraws during game world updates
5. **Efficient State Updates**: Minimize state changes and batch updates

## Screen Specifications and UI Components

### Screen Layout Specifications (from Frontend Spec)

**Splash Screen:**

- Vertically and horizontally centered content
- Game title "Color Rush" with subtle color-shifting gradient (H1, 72pt Poppins Bold)
- Primary "Start Game" button (large, prominent, Bright Blue #3498DB)
- Secondary "How to Play" button (smaller, Mid Grey #95A5A6)
- Button interactions: hover (scale-up), pressed (scale-down)

**Main Game Screen:**

- **Header Bar**: Clean, top-aligned with transparent background
  - Left: "Score: [value] | Best: [value]" (24pt Poppins Regular)
  - Center: "Time: [mm:ss]"
  - Right: Three clock icons for Slow-Mo charges (grey out when used)
- **Target Color Display**: Prominent box below header stating "TAP: [COLOR]" with matching text color
- **Play Area**: Canvas fills remaining screen space, objects spawn from screen edges

**Game Over Modal:**

- Centered card overlaying frozen game state with dimmed background
- Scale-up and fade-in animation (~250ms)
- "GAME OVER" title (48pt Poppins Bold)
- Score display and options: "Play Again" (auto-focused), "View Leaderboard"

## Animation and Interaction System

### Core Animation Specifications

**Tap Feedback System:**

```typescript
interface TapFeedback {
  // Instantaneous expanding ripple effect
  rippleEffect: {
    color: '#FFFFFF';
    duration: 200; // ms
    animation: 'scale-up and fade-out';
  };

  // Correct tap celebration
  correctTapPop: {
    particles: 5-7; // burst particles of dot's color
    duration: 300; // ms
    animation: 'fly-outwards and fade';
    dotShrink: 'rapid shrink to nothing';
  };

  // Bomb explosion
  bombExplosion: {
    particles: 'red/orange/yellow colors';
    screenShake: {
      offset: '2-3px';
      duration: 150; // ms
    };
  };

  // Slow-mo activation (3-second duration)
  slowMoActivation: {
    radialGlow: 'blue glow emanating from tap point';
    vignette: 'subtle blue vignette around screen edges';
    timeScaling: 'smooth ease-in-out curve';
    duration: 3000; // ms
  };
}
```

**Screen Transitions:**

- All scene transitions use simple cross-fade (250ms)
- Modal animations: scale-up and fade-in
- Button states: hover (scale-up), pressed (scale-down)

### Accessibility Considerations

- **Tap Targets**: Minimum 44px touch targets for all interactive elements (even if visual is smaller)
- **Color Palette**: High contrast dot colors chosen for color vision deficiency support
- **Typography**: Poppins font with high-contrast text colors for legibility
- **Hitbox Generosity**: Hitboxes slightly larger than visual sprites
- **Visual Feedback**: Immediate, clear animations for all user interactions

### Debug and Development Features

**Debug Panel (Development Only):**

- Real-time difficulty parameter tuning
- Hitbox visualization toggle
- Performance metrics display
- Mock API response simulation
- Game state inspection tools

**Design Rationale**: Debug panel is essential for balancing difficulty curves and optimizing performance during development, but completely disabled in production builds.
