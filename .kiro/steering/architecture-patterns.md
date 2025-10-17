---
inclusion: always
---

# Color Rush Architecture Patterns

## Phaser.js Scene Architecture

### Scene Flow & Responsibilities

```typescript
// Scene progression and responsibilities
BootScene -> PreloaderScene -> SplashScreenScene -> GameScene + UIScene -> GameOverScene

// BootScene: Minimal asset loading for loading screen
// PreloaderScene: Load all main game assets with progress bar
// SplashScreenScene: Main menu with Start Game and How to Play
// GameScene: Core game logic, physics, object management
// UIScene: Concurrent overlay for HUD (score, timer, target color)
// GameOverScene: Modal overlay with final score and options
```

### Key Architectural Decisions

- **Decoupled UI Scene**: UIScene runs concurrently with GameScene to prevent UI redraws during game world changes
- **Object Pooling**: Use Phaser Groups to recycle dots/bombs instead of destroy/create cycles
- **Finite State Machine**: GameScene manages READY, PLAYING, GAME_OVER states
- **Service Singletons**: LeaderboardService, StorageService, DebugService for cross-cutting concerns

## Service Architecture Patterns

### LeaderboardService

```typescript
interface ILeaderboardService {
  submitScore(score: number): Promise<void>;
  getScores(): Promise<LeaderboardEntry[]>;
}

// Mock implementation for testing
class MockLeaderboardService implements ILeaderboardService {
  // Simulate API responses, errors, latency
}

// Real implementation for production
class DevvitLeaderboardService implements ILeaderboardService {
  // Actual Reddit API integration
}
```

### StorageService

```typescript
interface IStorageService {
  getBestScore(): number;
  setBestScore(score: number): void;
}
```

### DebugService

```typescript
interface IDebugService {
  showDebugPanel(): void;
  hideDebugPanel(): void;
  updateDifficultyParams(params: DifficultyParams): void;
  visualizeHitboxes(enabled: boolean): void;
}
```

## Object Pooling Pattern

### Efficient Game Object Management

```typescript
// Use Phaser Groups for object pooling
class GameScene extends Phaser.Scene {
  private dotPool: Phaser.GameObjects.Group;
  private bombPool: Phaser.GameObjects.Group;

  create() {
    this.dotPool = this.add.group({
      classType: Dot,
      maxSize: 50,
      runChildUpdate: true,
    });

    this.bombPool = this.add.group({
      classType: Bomb,
      maxSize: 20,
      runChildUpdate: true,
    });
  }

  spawnDot() {
    let dot = this.dotPool.getFirstDead();
    if (!dot) {
      dot = new Dot(this);
      this.dotPool.add(dot);
    }
    dot.activate();
  }
}
```

## Performance Optimization Patterns

### CSP Compliance

- Bundle all assets locally (no external CDNs)
- Include Phaser.js library in bundle
- Local font files, no Google Fonts CDN

### Memory Management

- Object pooling for frequently created/destroyed objects
- Proper cleanup in scene transitions
- Efficient texture atlasing for sprites

### Rendering Optimization

- Separate UI scene to minimize redraws
- Use Phaser's built-in culling for off-screen objects
- Optimize particle systems for explosions/effects

## Testing Architecture

### Mock Services Pattern

```typescript
// Dependency injection for testability
class GameEngine {
  constructor(
    private leaderboardService: ILeaderboardService,
    private storageService: IStorageService,
    private debugService: IDebugService
  ) {}
}

// Test configuration
const testServices = {
  leaderboard: new MockLeaderboardService(),
  storage: new MockStorageService(),
  debug: new MockDebugService(),
};

// Production configuration
const prodServices = {
  leaderboard: new DevvitLeaderboardService(),
  storage: new DevvitStorageService(),
  debug: new ProductionDebugService(), // disabled
};
```

## State Management Pattern

### Game State FSM

```typescript
enum GameState {
  READY = 'ready',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

class GameScene extends Phaser.Scene {
  private currentState: GameState = GameState.READY;

  changeState(newState: GameState) {
    this.exitState(this.currentState);
    this.currentState = newState;
    this.enterState(newState);
  }

  private enterState(state: GameState) {
    switch (state) {
      case GameState.READY:
        // Initialize game objects
        break;
      case GameState.PLAYING:
        // Start spawning, enable input
        break;
      case GameState.GAME_OVER:
        // Stop spawning, show game over
        break;
    }
  }
}
```
