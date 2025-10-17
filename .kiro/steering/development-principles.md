---
inclusion: always
---

# Development Principles: TDD & SOLID

## Test-Driven Development (TDD)

Follow the Red-Green-Refactor cycle for all Color Rush development:

### TDD Process

1. **Red**: Write a failing test first
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code while keeping tests green

### Color Rush TDD Priorities

- **Game Logic**: Test difficulty scaling formulas, scoring, game state transitions
- **Input Handling**: Test tap detection, hitbox calculations, collision detection
- **API Integration**: Mock Reddit/Devvit services for leaderboard functionality
- **Performance**: Test object pooling, memory usage, frame rate consistency

### Testing Strategy

- Unit tests for game mechanics (scoring, difficulty scaling)
- Integration tests for Devvit API interactions
- Performance tests for object spawning and cleanup
- Visual regression tests for UI components

## SOLID Principles

### Single Responsibility Principle (SRP)

- **GameEngine**: Only handles core game loop and state
- **DifficultyManager**: Only manages scaling parameters
- **InputHandler**: Only processes tap events and collision detection
- **LeaderboardService**: Only handles Reddit API integration
- **SceneManager**: Only manages scene transitions

### Open/Closed Principle (OCP)

- **Extensible Systems**: Design for easy addition of new dot types, power-ups, or game modes
- **Plugin Architecture**: Allow new features without modifying core game engine
- **Configuration-Driven**: Use config objects for difficulty parameters, colors, animations

### Liskov Substitution Principle (LSP)

- **GameObject Hierarchy**: Dots, bombs, and power-ups should be interchangeable through base interfaces
- **Scene Interfaces**: All scenes (Splash, Game, GameOver) implement consistent lifecycle methods
- **Service Abstractions**: Mock and real API services are fully interchangeable

### Interface Segregation Principle (ISP)

- **Focused Interfaces**: Separate interfaces for renderable, collidable, and moveable objects
- **Service Contracts**: Distinct interfaces for scoring, leaderboard, and game state services
- **Event Handling**: Separate interfaces for different types of game events

### Dependency Inversion Principle (DIP)

- **Service Injection**: Game engine depends on abstractions, not concrete implementations
- **Configuration Management**: High-level game logic doesn't depend on low-level config details
- **API Abstraction**: Game logic doesn't directly depend on Devvit API specifics

## Implementation Guidelines

### Code Organization

```typescript
// Good: Follows SRP and DIP
class GameEngine {
  constructor(
    private difficultyManager: IDifficultyManager,
    private inputHandler: IInputHandler,
    private leaderboardService: ILeaderboardService
  ) {}
}

// Good: Interface segregation
interface IRenderable {
  render(context: CanvasRenderingContext2D): void;
}

interface ICollidable {
  getBounds(): Rectangle;
  onCollision(other: ICollidable): void;
}
```

### Testing Approach

- Write tests before implementing Color Rush features
- Mock Devvit APIs for reliable testing
- Test edge cases (rapid tapping, network failures, performance limits)
- Maintain high test coverage for critical game mechanics

### Refactoring Guidelines

- Continuously improve code structure while maintaining green tests
- Extract common patterns into reusable components
- Optimize performance without breaking existing functionality
- Keep the debug panel as a separate, testable module

## DRY Principle (Don't Repeat Yourself)

### Code Reuse Strategy

- **Shared Utilities**: Create common functions for color management, math calculations, and animations
- **Component Abstraction**: Extract reusable UI components (buttons, modals, score displays)
- **Configuration Management**: Single source of truth for game constants, colors, and difficulty parameters
- **Animation Library**: Reusable animation functions for pops, explosions, and transitions

### Color Rush DRY Applications

```typescript
// Good: Single source for game colors
export const GAME_COLORS = {
  RED: '#E74C3C',
  GREEN: '#2ECC71',
  BLUE: '#3498DB',
  YELLOW: '#F1C40F',
  PURPLE: '#9B59B6',
} as const;

// Good: Reusable animation utility
export function createPopAnimation(x: number, y: number, color: string) {
  // Single implementation used by all dot types
}

// Good: Common difficulty calculation
export function calculateDifficulty(elapsedTime: number): DifficultyParams {
  // Single formula used across all game objects
}
```

### Avoid Duplication

- **No Magic Numbers**: Use named constants for all game parameters
- **Shared Interfaces**: Common types for game objects, events, and services
- **Utility Functions**: Extract repeated calculations and validations
- **Template Components**: Reusable Devvit UI patterns

## KISS Principle (Keep It Simple, Stupid)

### Simplicity Guidelines

- **Clear Function Names**: Functions should do one thing and have obvious names
- **Minimal Dependencies**: Avoid over-engineering and complex abstractions
- **Readable Code**: Prefer clarity over cleverness
- **Simple State Management**: Keep game state flat and predictable

### Color Rush KISS Applications

```typescript
// Good: Simple, clear function
function isCorrectColor(dotColor: string, targetColor: string): boolean {
  return dotColor === targetColor;
}

// Good: Simple state structure
interface GameState {
  score: number;
  bestScore: number;
  elapsedTime: number;
  targetColor: string;
  slowMoCharges: number;
  isGameOver: boolean;
}

// Avoid: Over-complicated abstractions
// Bad: Complex inheritance hierarchies when simple composition works
```

### Simplicity in Architecture

- **Flat Component Structure**: Avoid deep nesting in Devvit components
- **Direct API Calls**: Don't over-abstract Devvit's simple API
- **Minimal Configuration**: Only make things configurable if actually needed
- **Clear Data Flow**: Predictable state updates and event handling

### Balance Simplicity with Quality

- **Simple but Tested**: Even simple code needs tests
- **Simple but Maintainable**: Use SOLID principles to keep simple code organized
- **Simple but Performant**: Don't sacrifice performance for perceived simplicity
