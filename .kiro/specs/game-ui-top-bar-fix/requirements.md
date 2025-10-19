# Requirements Document

## Introduction

This specification addresses critical UI display issues in the Color Rush game page where essential UI components (score, timer, target color, slow-mo charges) are missing or not rendering properly in the top bar during gameplay. The game UI scene is not displaying the expected elements, leaving players without crucial game information.

## Glossary

- **UIScene**: The Phaser scene responsible for rendering the game's heads-up display (HUD) elements
- **GameScene**: The main game scene that handles gameplay logic and communicates with UIScene
- **Top Bar**: The header area containing score, timer, and slow-mo charge indicators
- **Target Color Display**: The prominent display showing which color dot the player should tap
- **HUD Elements**: All user interface components visible during gameplay (score, timer, target color, charges)
- **Font Fallback System**: The mechanism for handling font loading failures and providing alternative text rendering

## Requirements

### Requirement 1

**User Story:** As a player, I want to see my current score and best score displayed in the top bar, so that I can track my progress during gameplay.

#### Acceptance Criteria

1. WHEN the game starts, THE UIScene SHALL display the current score as "Score: 0" in the top-left area of the screen
2. WHEN the player scores points, THE UIScene SHALL update the score display to show "Score: [current_score] | Best: [best_score]"
3. WHEN the current score exceeds the best score, THE UIScene SHALL update the best score display immediately
4. THE UIScene SHALL persist the best score using localStorage for future game sessions
5. THE UIScene SHALL display score text in white color with Poppins font family and 24px font size

### Requirement 2

**User Story:** As a player, I want to see the elapsed game time displayed in the top center, so that I can track how long I've been playing.

#### Acceptance Criteria

1. WHEN the game starts, THE UIScene SHALL display "Time: 0:00" in the center of the top bar
2. WHILE the game is active, THE UIScene SHALL update the time display every second in MM:SS format
3. THE UIScene SHALL display time text in white color with Poppins font family and 24px font size
4. THE UIScene SHALL position the time display at the horizontal center of the screen

### Requirement 3

**User Story:** As a player, I want to see my available slow-mo charges displayed in the top right, so that I can plan when to use this strategic ability.

#### Acceptance Criteria

1. WHEN the game starts, THE UIScene SHALL display 3 clock icons representing available slow-mo charges
2. WHEN a slow-mo charge is used, THE UIScene SHALL dim the corresponding clock icon and reduce its opacity to 0.4
3. WHEN a charge is available, THE UIScene SHALL display the clock icon with full opacity and blue outline
4. THE UIScene SHALL position the slow-mo charges in the top-right area with 35px spacing between icons
5. THE UIScene SHALL animate active charges with subtle pulsing effect

### Requirement 4

**User Story:** As a player, I want to see the target color prominently displayed below the top bar, so that I know which color dots to tap.

#### Acceptance Criteria

1. WHEN the game starts, THE UIScene SHALL display "TAP" text followed by a colored dot icon representing the target color below the top bar
2. WHEN the target color changes, THE UIScene SHALL update the dot icon to display the new target color
3. THE UIScene SHALL display "TAP" text in white with 32px bold Poppins font and the dot icon in the actual target color
4. THE UIScene SHALL add a pulsing animation to the target color display for visual emphasis
5. THE UIScene SHALL center the target color display horizontally on the screen

### Requirement 5

**User Story:** As a developer, I want the UI to handle font loading failures gracefully, so that the game remains playable even when fonts don't load properly.

#### Acceptance Criteria

1. WHEN Poppins fonts fail to load, THE UIScene SHALL fall back to system fonts (Arial, sans-serif)
2. IF text-based UI creation fails, THE UIScene SHALL create a graphics-only fallback UI
3. IF graphics-only UI creation fails, THE UIScene SHALL create a minimal UI with basic shapes
4. THE UIScene SHALL log appropriate error messages for debugging font loading issues
5. THE UIScene SHALL ensure all UI elements remain functional regardless of font loading status

### Requirement 6

**User Story:** As a player using different screen sizes, I want the UI to adapt properly to my device, so that all elements are visible and properly positioned.

#### Acceptance Criteria

1. WHEN the screen size changes, THE UIScene SHALL recalculate and update all element positions
2. THE UIScene SHALL maintain a minimum 20px margin from screen edges for all UI elements
3. THE UIScene SHALL scale the target color display to maximum 80% of screen width
4. THE UIScene SHALL position elements using responsive calculations based on screen dimensions
5. THE UIScene SHALL ensure the header background spans the full width of the screen

### Requirement 7

**User Story:** As a player, I want visual feedback when UI elements update, so that I can easily notice changes in game state.

#### Acceptance Criteria

1. WHEN the score increases, THE UIScene SHALL briefly scale the score container to 110% and back
2. WHEN the target color changes, THE UIScene SHALL flash the target color display with a scale animation
3. WHEN a slow-mo charge is used, THE UIScene SHALL create a brief blue flash effect on the used charge
4. THE UIScene SHALL change score text color based on score level (white, green, gold)
5. THE UIScene SHALL update the target color background border to match the current target color
