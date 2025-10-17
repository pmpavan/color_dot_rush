# Color Rush Services

This directory contains the core services for the Color Rush game.

## DebugService

The `DebugService` provides a comprehensive debug panel for real-time difficulty tuning and game debugging.

### Features

- **Real-time Difficulty Tuning**: Adjust `baseSpeed`, `growthRate`, `baseSize`, and `shrinkRate` parameters while the game is running
- **Hitbox Visualization**: Toggle visual display of collision areas for all game objects
- **Performance Monitoring**: Display FPS and object count metrics
- **Keyboard Shortcut**: Press 'D' to toggle the debug panel
- **Production Safety**: Automatically disabled in production builds

### Usage

```typescript
import { DebugService } from './services/DebugService';

// Get singleton instance
const debugService = DebugService.getInstance();

// Show debug panel
debugService.showDebugPanel();

// Register callbacks for parameter changes
debugService.onDifficultyChange((params) => {
  console.log('New difficulty params:', params);
});

debugService.onHitboxToggle((enabled) => {
  console.log('Hitbox visualization:', enabled);
});
```

### Debug Panel Controls

- **Base Speed**: 50-200 px/sec (default: 100)
- **Growth Rate**: 1.01-1.10 (default: 1.04)
- **Base Size**: 40-120 px (default: 80)
- **Shrink Rate**: 0.95-0.99 (default: 0.98)
- **Show Hitboxes**: Toggle collision area visualization
- **Show FPS**: Toggle frame rate display
- **Show Object Count**: Toggle active object count display
- **Reset to Defaults**: Restore PRD-specified parameters

## DifficultyManager

The `DifficultyManager` implements the mathematical formulas for dynamic difficulty scaling as specified in the PRD.

### Formulas

- **Speed**: `speed = baseSpeed * growthRate^t`
- **Size**: `size = baseSize * shrinkRate^t`
- **Dot Count**: `+1 dot every 15 seconds`

### Usage

```typescript
import { DifficultyManager } from './services/DifficultyManager';

const difficultyManager = new DifficultyManager();

// Calculate current difficulty at 30 seconds
const elapsedSeconds = 30;
const speed = difficultyManager.calculateSpeed(elapsedSeconds);
const size = difficultyManager.calculateSize(elapsedSeconds);
const dotCount = difficultyManager.calculateDotCount(elapsedSeconds);

// Get comprehensive metrics
const metrics = difficultyManager.getDifficultyMetrics(elapsedSeconds);

// Update parameters (typically called by DebugService)
difficultyManager.updateParams({ baseSpeed: 120 });

// Validate difficulty curve for target session length
const isValid = difficultyManager.validateDifficultyCurve(90);
```

### Default Parameters (PRD Specification)

- **Base Speed**: 100 px/sec
- **Growth Rate**: 1.04 (4% increase per second)
- **Base Size**: 80 px diameter
- **Shrink Rate**: 0.98 (2% decrease per second)

## Integration with Game Scene

The debug system is automatically integrated into the main `Game` scene:

1. **Environment Detection**: Production builds use `ProductionDebugService` (disabled)
2. **Callback Registration**: Game scene registers for parameter and visualization changes
3. **Hitbox Rendering**: Debug graphics overlay shows collision areas when enabled
4. **Real-time Updates**: Difficulty parameters affect game objects immediately

## Testing

Both services include comprehensive unit tests:

```bash
npm test -- --run src/client/services/__tests__/
```

Tests cover:
- Mathematical formula accuracy
- Parameter validation
- Callback functionality
- Production environment behavior
- Edge cases and error handling

## Production Behavior

In production builds (`NODE_ENV=production`):
- Debug panel is completely disabled
- No DOM manipulation occurs
- No performance overhead
- All debug methods become no-ops
- Default parameters are used without modification