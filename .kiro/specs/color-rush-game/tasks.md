# Implementation Plan

## Epic 1: Foundation & Tooling

- [x] 1. Set up Devvit Web project structure and core configuration

  - Initialize Devvit Web project using Phaser starter template from developers.reddit.com/new
  - Verify project structure: src/client/, src/server/, src/shared/, devvit.json, package.json
  - Set up development environment with Node.js 22.2.0+
  - Configure project metadata in devvit.json for Reddit Community Games 2025
  - Bundle Phaser.js library locally for CSP compliance
  - _Requirements: 6.7, 7.1 | PRD Story 1.1_

- [x] 2. Implement scene management architecture

  - Create scene flow: BootScene → PreloaderScene → SplashScreenScene → GameScene + UIScene → GameOverScene
  - Implement scene lifecycle management and transitions
  - Set up concurrent UIScene for HUD overlay to prevent redraws during game world updates
  - Configure responsive canvas sizing for mobile-first Reddit experience
  - _Requirements: 7.1, 7.2, 7.3 | PRD Story 1.2_

- [x] 3. Create QA debug panel for difficulty tuning

  - Implement toggleable debug panel with real-time parameter adjustment
  - Add controls for baseSpeed (100), growthRate (1.04), baseSize (80px), shrinkRate (0.98)
  - Create visual hitbox debugging mode to display collision areas
  - Ensure debug features are disabled in production builds
  - _Requirements: 8.1, 8.2 | PRD Story 1.3, QA High Priority_

- [x] 4. Create shared data models and interfaces

  - Define TypeScript interfaces in src/shared/ for GameState, DifficultyParams, LeaderboardEntry
  - Create API request/response types (SubmitScoreRequest, LeaderboardResponse)
  - Define color palette constants with high-contrast accessibility colors
  - Set up game configuration constants with specific PRD values (baseSpeed: 100, growthRate: 1.04, etc.)
  - _Requirements: 1.5, 2.6, 6.6 | PRD Story 1.2_

- [x] 5. Implement responsive canvas and asset loading
  - Set up Phaser.js v3 game instance with responsive HTML5 canvas
  - Bundle all assets locally: Phaser.js library, Poppins fonts, sprites, icons
  - Implement CSP-compliant asset loading (no external CDNs)
  - Configure canvas to fill available space on any device
  - _Requirements: 6.3, 6.7 | PRD Story 1.5_

## Epic 2: Core Gameplay Loop

- [x] 6. Create core game objects and object pooling system

  - ✅ Implement base GameObject interface and Dot class with color properties
  - ✅ Create Bomb class with explosion mechanics and fuse icon (Near Black #34495E)
  - ✅ Implement SlowMoDot power-up class with clock icon (Shimmering White #ECF0F1)
  - ✅ Set up Phaser Groups for object pooling (dots, bombs, power-ups) to prevent garbage collection
  - ✅ **COMPLETED**: Full object-oriented architecture with SOLID principles, comprehensive pooling system, and Color Rush specifications
  - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.6 | PRD Story 2.1_

- [x] 7. Implement object spawning and movement system

  - ✅ Create ObjectSpawner class for dynamic dot and bomb generation from screen edges
  - ✅ Implement movement patterns with configurable speed and direction
  - ✅ Add boundary detection and object cleanup when off-screen
  - ✅ Ensure balanced ratio of correct color dots to distractors
  - ✅ **COMPLETED**: Advanced spawning system with 8-directional edges, configurable ratios, and difficulty integration
  - _Requirements: 1.1, 2.3, 2.4 | PRD Story 2.1_

- [x] 8. Build target color system and scoring mechanics

  - Implement target color selection and prominent "TAP: [COLOR]" display
  - Create centralized scene-level input handler for tap detection and collision checking
  - Implement scoring system (+1 for correct taps, immediate game over for wrong taps/bombs)
  - Add visual feedback with expanding ripple effects and particle bursts
  - Ensure hitboxes are slightly larger than visual sprites (minimum 44px tap targets)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 6.6, 7.5 | PRD Story 2.2_

- [x] 9. Implement game over conditions and state management
  - Create finite state machine for GameScene (READY, PLAYING, GAME_OVER)
  - Implement game over triggers for wrong color taps and bomb explosions
  - Add bomb explosion animations with red/orange/yellow particles and screen shake (2-3px, 150ms)
  - Ensure immediate game termination on incorrect actions
  - _Requirements: 1.3, 1.4, 7.2 | PRD Story 2.3_

## Epic 3: Dynamic Difficulty Scaling

- [x] 10. Create dynamic difficulty scaling system

  - Implement DifficultyManager with specific PRD formulas: speed = baseSpeed _ growthRate^t, size = baseSize _ shrinkRate^t
  - Use exact parameter values: baseSpeed (100 px/sec), growthRate (1.04), baseSize (80px), shrinkRate (0.98)
  - Implement dot count increase: +1 dot every 15 seconds
  - Ensure 90+ second average session length target
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6 | PRD Story 3.1_

- [x] 11. Integrate difficulty tuning with debug panel
  - Connect debug panel controls to DifficultyManager parameters
  - Enable real-time adjustment of baseSpeed, growthRate, baseSize, shrinkRate during gameplay
  - Add visual feedback for parameter changes
  - Test formula accuracy against mathematical expectations
  - _Requirements: 2.6, 8.1 | PRD Story 3.2_

## Epic 4: Player Experience & UI

- [x] 12. Create splash screen with design system

  - Implement SplashScreenScene with vertically/horizontally centered content
  - Add game title "Color Rush" with subtle color-shifting gradient (72pt Poppins Bold)
  - Create primary "Start Game" button (Bright Blue #3498DB) and secondary "How to Play" button (Mid Grey #95A5A6)
  - Implement button interactions: hover (scale-up), pressed (scale-down)
  - _Requirements: 4.2 | PRD Story 4.1, Frontend Spec_

- [ ] 13. Implement game HUD and UI system

  - Create UIScene for concurrent HUD overlay (separate from GameScene to prevent redraws)
  - Build clean top-aligned header bar with transparent background
  - Add score display "Score: [value] | Best: [value]" in top-left (24pt Poppins Regular)
  - Add elapsed time display "Time: [mm:ss]" in center header
  - Implement prominent target color box below header stating "TAP: [COLOR]" with matching text color
  - Add slow-mo charge indicator with three clock icons in top-right (grey out when used)
  - _Requirements: 4.1, 4.6 | PRD Story 4.2, Frontend Spec_

- [ ] 14. Create game over modal and navigation
  - Implement GameOverScene with centered card overlaying frozen game state with dimmed background
  - Add scale-up and fade-in animation (~250ms)
  - Display "GAME OVER" title (48pt Poppins Bold), final score, and session time
  - Add "Play Again" button (auto-focused) and "View Leaderboard" option
  - Implement smooth transitions back to game or leaderboard view
  - _Requirements: 4.3 | PRD Story 4.3, Frontend Spec_

## Epic 5: Strategic Elements & Polish

- [ ] 15. Implement slow-motion power-up system

  - Create slow-mo activation by tapping special SlowMoDot (shimmering white with blue clock icon)
  - Implement 3-second duration slow-motion effect with smooth time scaling
  - Add visual effects: radial blue glow from tap point, subtle blue vignette around screen edges
  - Implement charge management: player starts with 3 charges, depleted until next game
  - Integrate slow-mo with game timing without affecting scoring fairness
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 | PRD Story 4.4_

- [ ] 16. Add visual effects and animations ("Juiciness")
  - Implement instantaneous expanding ripple effect for all taps (white, 200ms)
  - Create "celebratory pop" for correct taps: 5-7 burst particles of dot's color, dot shrinks to nothing (300ms)
  - Add bomb explosion animations with red/orange/yellow particles and screen shake (2-3px, 150ms)
  - Implement slow-mo activation effects with radial blue glow and smooth ease-in-out time scaling
  - Add smooth scene transitions and modal animations (250ms cross-fade)
  - _Requirements: 4.4, 4.5 | PRD Story 5.1, 5.2, Frontend Spec_

## Epic 6: Reddit Integration & Community

- [ ] 17. Create mock leaderboard service for development

  - Implement MockLeaderboardService with simulated API responses (success, slow response, errors, empty data)
  - Create test scenarios for network timeouts and unexpected API responses
  - Ensure UI shows clear "Could not load scores" messages during failures
  - Test graceful degradation without crashing on API errors
  - _Requirements: 5.5, 8.3 | PRD Story 6.1, QA Medium Risk_

- [ ] 18. Implement server-side Reddit leaderboard API

  - Create /api/submit-score endpoint in src/server/ using Devvit Redis for weekly leaderboard storage
  - Create /api/get-leaderboard endpoint returning weekly rankings with Reddit usernames
  - Implement automatic Reddit user authentication through Devvit middleware
  - Add graceful error handling, 30-second timeout compliance, and retry logic
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 | PRD Story 6.2_

- [ ] 19. Build client-side leaderboard integration
  - Implement fetch() calls from client to /api/submit-score and /api/get-leaderboard endpoints
  - Create leaderboard UI in Phaser showing top scores with Reddit usernames
  - Display player's current rank and position in weekly competition
  - Add automatic score submission on game over and fallback messaging for API failures
  - _Requirements: 5.1, 5.3, 5.4, 5.5 | PRD Story 6.3_

## Performance & Technical Requirements

- [ ] 20. Optimize performance and ensure CSP compliance

  - Verify all assets bundled locally: Phaser.js library, Poppins fonts, sprites, SVG icons
  - Implement efficient object pooling with Phaser Groups to maintain 60 FPS performance
  - Optimize rendering with separate UIScene to minimize redraws during game world updates
  - Ensure 16ms input response time and consistent frame rates
  - Test performance on low-end mobile devices (not just emulators)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 21. Validate debug panel and development tools

  - Verify DebugService functionality for real-time difficulty parameter tuning
  - Test hitbox visualization toggle and collision area accuracy
  - Validate performance metrics display (FPS, object count, memory usage)
  - Ensure mock API services work reliably for development workflow
  - Confirm all debug features are disabled in production builds
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]\* 22. Write comprehensive test suite

  - Create unit tests for difficulty formulas (speed = baseSpeed _ growthRate^t, size = baseSize _ shrinkRate^t)
  - Test slow-mo mechanics (3 charges, 3-second duration, visual effects)
  - Implement integration tests for Reddit API interactions and graceful error handling
  - Add performance tests for 60 FPS maintenance and object pooling efficiency
  - Test input precision and hitbox accuracy across devices
  - _Requirements: 8.4_

- [ ] 23. Final integration and hackathon submission preparation
  - Test complete game flow using `npm run dev` and Devvit playtest URL (e.g., r/color-rush_dev)
  - Validate difficulty curve achieves 90+ second average session length target
  - Optimize client bundle size and server endpoint performance (4MB payload, 10MB response limits)
  - Test cross-device compatibility on physical mobile devices
  - Run `npm run launch` for Reddit review and deployment to Community Games 2025
  - Document development experience for panel presentation
  - _Requirements: 5.5, 6.1, 6.2, 6.7 | PRD Success Metrics_
