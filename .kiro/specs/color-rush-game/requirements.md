# Requirements Document

## Introduction

Color Rush is a minimalist, high-energy reflex game designed for the Reddit Community Games 2025 hackathon. The game challenges players to tap colored dots matching a target color while avoiding bombs and wrong colors. Built on the Devvit Web platform using Phaser.js v3, it integrates seamlessly with Reddit's ecosystem, featuring a competitive weekly leaderboard to foster community engagement. The core gameplay loop emphasizes quick reflexes, strategic power-up usage, and progressive difficulty scaling to create an addictive "just one more try" experience with a target session length of 90+ seconds.

## Requirements

### Requirement 1: Core Gameplay Mechanics

**User Story:** As a player, I want to tap colored dots that match the target color to score points, so that I can test my reflexes and compete for high scores.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL display a clearly indicated target color
2. WHEN a player taps a dot matching the target color THEN the system SHALL award 1 point and provide visual feedback
3. WHEN a player taps a dot of the wrong color THEN the system SHALL immediately end the game
4. WHEN a player taps a bomb THEN the system SHALL immediately end the game with explosion animation
5. WHEN dots spawn THEN the system SHALL use a high-contrast color palette (Red #E74C3C, Green #2ECC71, Blue #3498DB, Yellow #F1C40F, Purple #9B59B6)

### Requirement 2: Dynamic Difficulty Scaling

**User Story:** As a player, I want the game to become progressively more challenging over time, so that I remain engaged and my skills are continuously tested.

#### Acceptance Criteria

1. WHEN the game progresses THEN the system SHALL calculate speed using the formula: speed = baseSpeed \* growthRate^t (where t is elapsed time)
2. WHEN the game progresses THEN the system SHALL calculate size using the formula: size = baseSize \* shrinkRate^t
3. WHEN the game progresses THEN the system SHALL increase the number of dots on screen by 1 every 15 seconds
4. WHEN the game progresses THEN the system SHALL maintain a balanced ratio of correct color dots to distractors
5. WHEN difficulty scaling occurs THEN the system SHALL ensure the game remains playable for an average of 90+ seconds
6. WHEN difficulty parameters are set THEN the system SHALL use initial values: baseSpeed: 100 px/sec, growthRate: 1.04, baseSize: 80px diameter, shrinkRate: 0.98

### Requirement 3: Strategic Power-Up System

**User Story:** As a player, I want access to limited slow-motion power-ups, so that I can strategically manage difficult high-speed moments.

#### Acceptance Criteria

1. WHEN the game starts THEN the system SHALL provide the player with 3 slow-mo charges
2. WHEN a player taps a special slow-mo dot THEN the system SHALL activate slow-motion effect for 3 seconds
3. WHEN slow-mo is active THEN the system SHALL display a radial blue glow and subtle blue vignette around screen edges
4. WHEN slow-mo charges are depleted THEN the system SHALL disable the power-up until the next game
5. WHEN slow-mo is used THEN the system SHALL maintain fair scoring without penalties
6. WHEN slow-mo dots appear THEN the system SHALL display them as shimmering white with a blue clock icon

### Requirement 4: User Interface and Experience

**User Story:** As a player, I want clear visual feedback and intuitive navigation, so that I can focus on gameplay without confusion.

#### Acceptance Criteria

1. WHEN playing THEN the system SHALL display current score, best score, elapsed time, and target color prominently
2. WHEN the game starts THEN the system SHALL show a splash screen with "Start Game" and "How to Play" options
3. WHEN the game ends THEN the system SHALL display a game over modal with final score and options to replay or view leaderboard
4. WHEN objects are tapped THEN the system SHALL provide immediate visual feedback with "pop" animations for correct taps
5. WHEN bombs explode THEN the system SHALL show explosion animations and screen shake effects
6. WHEN UI elements are displayed THEN the system SHALL ensure minimum 44px tap targets for accessibility

### Requirement 5: Reddit Platform Integration

**User Story:** As a competitive player, I want my scores automatically submitted to a community leaderboard, so that I can compete with other Reddit users.

#### Acceptance Criteria

1. WHEN a game ends THEN the system SHALL automatically submit the score to the weekly leaderboard via Devvit API
2. WHEN leaderboard submission fails THEN the system SHALL gracefully degrade without breaking gameplay
3. WHEN viewing the leaderboard THEN the system SHALL display top scores with Reddit usernames
4. WHEN the leaderboard is accessed THEN the system SHALL show the player's current rank if applicable
5. WHEN leaderboard data is unavailable THEN the system SHALL display appropriate fallback messaging

### Requirement 6: Performance and Technical Requirements

**User Story:** As a player, I want smooth, responsive gameplay across different devices, so that I have a fair and enjoyable gaming experience.

#### Acceptance Criteria

1. WHEN the game runs THEN the system SHALL maintain 60 FPS performance
2. WHEN objects are spawned THEN the system SHALL use Phaser Groups for object pooling to prevent garbage collection overhead
3. WHEN assets are loaded THEN the system SHALL bundle all resources locally including Phaser.js library and Poppins fonts to comply with CSP requirements
4. WHEN the game scales difficulty THEN the system SHALL maintain consistent performance without frame drops
5. WHEN input is received THEN the system SHALL respond within 16ms for 60 FPS gameplay
6. WHEN hitboxes are calculated THEN the system SHALL make them slightly larger than visual sprites with minimum 44px tap targets for accessibility
7. WHEN the game is built THEN the system SHALL use Devvit Web environment with client-server architecture and /api/ endpoints

### Requirement 7: Scene Architecture and State Management

**User Story:** As a developer, I want a well-structured scene management system, so that the game is modular, maintainable, and performs optimally.

#### Acceptance Criteria

1. WHEN the game initializes THEN the system SHALL implement scene flow: BootScene → PreloaderScene → SplashScreenScene → (GameScene + UIScene) → GameOverScene
2. WHEN in GameScene THEN the system SHALL manage game state using finite state machine with READY, PLAYING, and GAME_OVER states
3. WHEN UI needs to be displayed THEN the system SHALL use a separate UIScene running concurrently with GameScene to prevent UI redraws during game world updates
4. WHEN game objects need management THEN the system SHALL use direct object management with create/destroy lifecycle in GameScene
5. WHEN input is handled THEN the system SHALL use centralized scene-level input listener for reliability

### Requirement 8: Development and Testing Support

**User Story:** As a developer, I want debugging and tuning capabilities, so that I can optimize gameplay balance and identify issues quickly.

#### Acceptance Criteria

1. WHEN in development mode THEN the system SHALL provide a debug panel for real-time difficulty parameter tuning (baseSpeed, growthRate, baseSize, shrinkRate)
2. WHEN debugging is enabled THEN the system SHALL visualize hitboxes and collision areas
3. WHEN API calls fail THEN the system SHALL use mock LeaderboardService to maintain development workflow
4. WHEN testing THEN the system SHALL support automated testing of core game mechanics and difficulty formulas
5. WHEN in production THEN the system SHALL disable all debug features and logging
