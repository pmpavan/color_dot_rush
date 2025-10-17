### **Software Architecture Document: Color Rush**

|                     |                     |
| :------------------ | :------------------ |
| **Project:**        | Color Rush          |
| **Document Owner:** | System Architecture |
| **Status:**         | Finalized           |
| **Last Updated:**   | October 17, 2025    |

#### **1\. Introduction**

This document outlines the software architecture for **Color Rush**, a reflex-based game developed for the Reddit Community Games 2025\. It translates the requirements from the Project Brief, PRD, Game Plan, and Frontend Specification into a technical blueprint for development. The primary goal is to define a clean, scalable, and performant structure that leverages the Phaser.js framework within the constraints of the Reddit Devvit platform.

#### **2\. Architectural Goals & Constraints**

##### **Goals:**

- **Performance:** The application must deliver a smooth, 60 FPS experience.
- **Maintainability:** The codebase must be modular and easy to understand.
- **Scalability:** The architecture must support future enhancements without major refactoring.

##### **Constraints:**

- **Platform:** The game must be developed exclusively within the **Reddit Devvit Web environment**.
- **Framework:** **Phaser.js (v3)** is the mandated 2D game framework.
- **Content Security Policy (CSP):** Devvit enforces a strict CSP. **All assets** must be bundled locally. No external CDNs or URLs are permitted.
- **Backend:** All backend logic will be handled through the APIs provided by the Devvit platform.

#### **3\. System Overview**

The system is a client-server architecture where the "server" is the Reddit/Devvit platform. The client is a single-page application built with Phaser.js that runs within an iframe on Reddit.

- **Client (Phaser.js App):** Responsible for all rendering, game logic, physics, and input handling.
- **Devvit Platform (Host & API Gateway):** Hosts the static bundled assets and provides the secure bridge for the client to communicate with Reddit's backend.
- **Reddit Services (Backend):** Manages user authentication and leaderboard data.

#### **4\. Client-Side Architecture (Phaser.js)**

##### **4.1. Scene Management**

The game will be divided into multiple, distinct scenes:

- **BootScene:** Loads assets for the preloader.
- **PreloaderScene:** Loads all main game assets.
- **SplashScreenScene:** Manages the main menu UI.
- **GameScene:** The core of the application. Manages all game logic.
- **UIScene:** Runs concurrently on top of the GameScene to render the HUD.
- **GameOverScene:** A modal scene launched on top of the game when it ends.

##### **4.2. Game Logic & State Management**

- **GameScene Controller:** This scene will be the central controller for all gameplay. It will be responsible for:
  - Spawning and destroying game objects directly (no complex pooling).
  - Managing a startTime variable to track elapsed time (t).
  - In its update loop, calculating the current speed and size for all objects using the exponential formulas from the PRD.
  - Handling all input events via a scene-level input.on('gameobjectdown', ...) listener for reliability.
  - Managing the game state (PLAYING, GAME_OVER).
- **Difficulty Calculation:** The GameScene will contain two methods, calculateSpeed(t) and calculateSize(t), that implement the speed \= baseSpeed \* growthRate^t and size \= baseSize \* shrinkRate^t formulas.

##### **4.3. Service & Tooling Modules (Singletons)**

- **LeaderboardService:** A dedicated module responsible for all communication with the Reddit/Devvit API.
- **DebugService (Development Build Only):** A module for managing QA tools, including the on-screen debug panel to tune difficulty formula variables.

#### **5\. Key Architectural Decisions & Rationale**

- **Decoupled UI Scene:** A crucial decision for performance. It prevents the UI from having to be redrawn every time the game world changes.
- **Direct Object Management:** A shift away from a complex, bug-prone object pooling system to a simpler create/destroy lifecycle managed directly by the GameScene. This prioritizes stability and correctness for the hackathon.
- **Centralized Input Handling:** Using a single, scene-wide input listener in GameScene is more robust and avoids the event propagation issues that plagued earlier versions.
- **Inclusion of a DebugService:** Architecting a dedicated service for debug tools ensures that testability is a first-class citizen and can be stripped from the final production build.
- **Test-Driven Integration:** The architecture mandates the creation of a **mock LeaderboardService** to allow frontend development to proceed without a dependency on the live backend.

#### **6\. Deployment**

The application will be bundled into a set of static files (HTML, JS, assets) using the Devvit CLI. The production build will strip out the DebugService.
