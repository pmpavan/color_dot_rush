# Requirements Document

## Introduction

Fix the asset loading system where the Preloader is incorrectly skipping asset loading and using "graphics-only mode" instead of loading actual game assets. The logs show the Preloader is avoiding texture generation and asset loading, which forces the UI system into fallback modes. The system should load actual assets (SVG files, textures) and only use graphics-only mode as a true fallback when asset loading fails.

## Glossary

- **HUD**: Heads-Up Display containing game UI elements (score, timer, target color, slow-mo charges)
- **Preloader Scene**: Phaser scene responsible for loading all game assets before gameplay begins
- **Asset Loading**: Process of loading SVG files, textures, and other game resources
- **Graphics-Only Mode**: Fallback mode that creates assets programmatically when file loading fails
- **Asset Manifest**: Configuration defining which assets should be loaded from files
- **Texture Generation**: Process of creating Phaser textures from loaded asset files
- **DOMTextRenderer**: Primary text rendering system using DOM elements with loaded fonts
- **Resource Verification**: Process that confirms all required assets and fonts are properly loaded

## Requirements

### Requirement 1

**User Story:** As a player, I want the game to load actual asset files (SVGs, textures) during the preloader phase, so that I see the intended visual design with proper graphics.

#### Acceptance Criteria

1. THE Preloader Scene SHALL attempt to load all SVG assets from the public/assets directory
2. THE Preloader Scene SHALL load dot SVGs (dot-red.svg, dot-blue.svg, dot-green.svg, dot-yellow.svg, dot-purple.svg)
3. THE Preloader Scene SHALL load bomb.svg and slowmo-dot.svg assets
4. THE Preloader Scene SHALL load clock-icon.svg for the slow-mo charge display
5. THE Preloader Scene SHALL only use graphics-only mode if actual asset loading fails

### Requirement 2

**User Story:** As a developer, I want the asset loading system to properly handle both successful loading and failure cases, so that the game works reliably across different environments.

#### Acceptance Criteria

1. THE Preloader Scene SHALL first attempt to load assets from files using Phaser's load.svg() method
2. IF asset loading succeeds, THEN THE system SHALL use the loaded textures for game objects
3. IF asset loading fails, THEN THE system SHALL fall back to graphics-only mode with programmatic asset creation
4. THE system SHALL provide clear logging about which assets loaded successfully and which failed
5. THE system SHALL not preemptively skip asset loading without attempting it first

### Requirement 3

**User Story:** As a developer, I want proper asset loading verification before proceeding to gameplay, so that missing assets are detected early and handled appropriately.

#### Acceptance Criteria

1. THE Preloader Scene SHALL verify that critical assets (dots, bomb, slowmo-dot) are loaded before proceeding
2. THE system SHALL maintain a list of required assets and check their availability
3. IF any critical assets fail to load, THEN THE system SHALL retry loading or use graphics-only mode
4. THE system SHALL display loading progress based on actual asset loading, not simulated progress
5. THE system SHALL only transition to the next scene after successful asset verification

### Requirement 4

**User Story:** As a player, I want the UI to use loaded assets when available, so that I see the intended visual design with proper icons and graphics.

#### Acceptance Criteria

1. WHEN SVG assets are successfully loaded, THE UI SHALL use these assets for dot icons and UI elements
2. THE slow-mo charge display SHALL use the loaded clock-icon.svg when available
3. THE target color display SHALL use the appropriate loaded dot SVG for the current target color
4. THE system SHALL prefer loaded assets over programmatically generated graphics
5. THE UI SHALL maintain visual consistency by using the same asset source throughout the game

### Requirement 5

**User Story:** As a player, I want the game to verify all resources are properly loaded before opening the game screen, so that I don't encounter missing UI elements or rendering issues.

#### Acceptance Criteria

1. THE system SHALL verify that all Poppins fonts (400, 500, 700) are loaded and ready before transitioning to the game screen
2. THE system SHALL verify that all required assets and textures are loaded before starting the game
3. IF any critical resources are not loaded, THEN THE system SHALL wait or retry loading before proceeding
4. THE system SHALL display a loading indicator while verifying resource availability
5. THE system SHALL only transition to the game screen after successful resource verification

### Requirement 6

**User Story:** As a developer, I want to clean up all fallback-related code and dependencies, so that the codebase is maintainable and focused.

#### Acceptance Criteria

1. THE system SHALL remove all unused fallback renderer classes and files
2. THE system SHALL remove fallback-related imports and dependencies
3. THE system SHALL remove fallback configuration options from all config files
4. THE system SHALL update all documentation to reflect the simplified rendering approach
5. THE system SHALL remove all fallback-related test cases and mocks
