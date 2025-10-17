---
inclusion: always
---

# Color Rush Game-Specific Guidelines

## Project Context

Color Rush is a reflex-based Devvit game for Reddit Community Games 2025. Players tap the correct "Target Color" dot while avoiding bombs and wrong colors.

## Core Game Mechanics

- **Target Color System**: Single color displayed prominently, changes dynamically
- **Dynamic Difficulty**: Exponential scaling of speed, dot size, and spawn rate
- **Strategic Element**: Limited Slow-Mo power-ups for tactical gameplay
- **Scoring**: +1 per correct tap, game over on wrong tap/bomb
- **Session Goal**: 90+ second average session length

## Technical Architecture Requirements

- **Framework**: Phaser.js v3 within Reddit Devvit Web environment
- **Scene Management**: BootScene → PreloaderScene → SplashScreenScene → GameScene + UIScene (concurrent) + GameOverScene (modal)
- **Object Pooling**: Phaser Groups for dots/bombs to prevent garbage collection overhead
- **State Management**: Finite State Machine (READY, PLAYING, GAME_OVER) within GameScene
- **Service Architecture**: Singleton services (LeaderboardService, StorageService, DebugService)
- **UI Decoupling**: Separate UIScene runs concurrently to prevent UI redraws during game world changes
- **Debug Panel**: Real-time tuning of difficulty parameters via DebugService (HIGH PRIORITY)
- **CSP Compliance**: All assets bundled locally, no external CDNs allowed

## Reddit Integration Priorities

- **Weekly Leaderboard**: Core competitive feature using Devvit Redis
- **Graceful Degradation**: Handle API failures without breaking gameplay
- **Community Focus**: Design for viral sharing and competition

## Quality Assurance Focus Areas

1. **Difficulty Scaling**: Must be perfectly balanced (45+ second survival target)
2. **Input Precision**: Hitboxes slightly larger than visual sprites
3. **Performance**: 55+ FPS on low-end devices, memory budget compliance
4. **API Resilience**: Mock services for testing, error handling

## Design System Constraints

- **Color Palette**: High contrast dots (Red #E74C3C, Green #2ECC71, Blue #3498DB, Yellow #F1C40F, Purple #9B59B6)
- **Typography**: Poppins font family
- **Animations**: "Juicy" feedback - pops, explosions, screen shake
- **Accessibility**: 44px minimum tap targets, color-blind friendly palette
