### **Product Requirements Document (PRD): Color Rush**

|                      |                                        |
| :------------------- | :------------------------------------- |
| **Product:**         | Color Rush                             |
| **Status:**          | Development-Ready                      |
| **Product Manager:** | \[Your Name/Team Name\]                |
| **Target Launch:**   | Reddit Community Games 2025 Submission |
| **Last Updated:**    | October 17, 2025                       |

#### **1\. Introduction & Vision**

**Color Rush** is a minimalist, high-energy reflex game designed for the Reddit platform. The vision is to create an instantly engaging, "just one more try" experience that fosters community competition. By integrating with Reddit's Devvit platform, we will deliver a seamless game that feels native to the user's feed, driving both initial engagement and long-term replayability through a competitive leaderboard. This project's success is defined by a successful hackathon submission that captures the attention of the judges and the Reddit community.

#### **2\. Problem & Opportunity**

- **The Problem:** Redditors often seek quick, engaging distractions ("coffee-break games") within the platform. There is a need for simple, competitive games that don't require leaving the Reddit ecosystem.
- **The Opportunity:** The Reddit Community Games 2025 hackathon provides a direct incentive and a massive audience for a well-designed Devvit game. A successful entry can gain significant visibility, win prizes, and qualify for the Reddit Developer Funds.

#### **3\. Target Audience & User Personas**

1. **Primary Persona: The Competitive Redditor**
   - **Description:** Spends time on Reddit looking for fun, engaging content. Enjoys casual games and the thrill of competition.
   - **Needs & Goals:** Wants a game that is easy to learn but hard to master. Motivated by high scores and seeing their username on a leaderboard. Wants to easily share their success with their community.
2. **Secondary Persona: The Hackathon Judge**
   - **Description:** An evaluator for the Reddit Community Games 2025\.
   - **Needs & Goals:** Wants to see a polished, bug-free game that makes excellent use of the Devvit platform. Looks for creativity, strong community integration, and adherence to the hackathon's theme.

#### **4\. User Flow**

The user journey is designed to be simple and cyclical, encouraging repeat plays.

Splash Screen \-\> (Optional: How to Play) \-\> Game Screen \-\> Game Over Modal \-\> (Optional: Leaderboard) \-\> Game Screen

#### **5\. Epics & User Stories**

This section outlines the development work broken down into themes (Epics) and actionable tasks (Stories).

##### **Epic 1: Foundation & Tooling**

_Focus: Establish a stable, testable, and compliant technical foundation._

- **Story 1.1: Project & Build Setup**
  - **As a developer,** I need to set up a new Devvit web project that correctly bundles the Phaser.js library locally,
  - **So that** the project complies with Reddit's CSP and we have a working development environment.
- **Story 1.2: Scene Management Architecture**
  - **As a developer,** I need to implement the core scene management system (Boot, Preloader, Splash, Game, UI, GameOver),
  - **So that** the application is modular and follows the defined architecture.
- **Story 1.3: QA Debug Panel**
  - **As a developer,** I need to create a toggleable debug panel,
  - **So that** the team can tune difficulty variables (baseSpeed, growthRate, etc.) in real-time.
- **Story 1.4: Visual Hitbox Debugging**
  - **As a developer,** I need to implement a debug mode that visually renders all game object hitboxes,
  - **So that** we can easily verify tap accuracy and fairness.
- **Story 1.5: Responsive Canvas**
  - **As a developer,** I need the Phaser canvas to be fully responsive,
  - **So that** it correctly resizes to fill the available space on any device.

##### **Epic 2: Core Gameplay Loop**

_Focus: Implement the primary game mechanics and rules._

- **Story 2.1: Object Spawning & Movement**
  - **As a player,** I want to see dots and bombs appear from the screen edges and move across the play area,
  - **So that** the game is dynamic and challenging.
- **Story 2.2: Tapping & Scoring**
  - **As a player,** I want to tap the "Target Color" dot to score a point, and for the target color to change instantly,
  - **So that** I can progress in the game and the controls feel responsive.
- **Story 2.3: Game Over Conditions**
  - **As a player,** I want the game to end when I tap a bomb or the wrong color,
  - **So that** the rules of the game are enforced.

##### **Epic 3: Dynamic Difficulty Scaling**

_Focus: Implement the mechanics that make the game progressively harder._

- **Story 3.1: Implement Difficulty Formulas**
  - **As a developer,** I need to implement the exponential formulas for object speed and size based on elapsed time (t),
  - **So that** the game's difficulty scales dynamically as designed.
  - **Functional Requirements:**
    - speed \= baseSpeed \* growthRate^t
    - size \= baseSize \* shrinkRate^t
- **Story 3.2: Implement Initial Tuning Parameters**
  - **As a developer,** I need to set the initial values for the difficulty parameters,
  - **So that** the game has a balanced starting point based on the game plan.
  - **Functional Requirements (Defaults):**
    - baseSpeed: 100 px/sec
    - growthRate: 1.04
    - baseSize: 80 px (diameter)
    - shrinkRate: 0.98
- **Story 3.3: Implement Dot Count Increase**
  - **As a player,** I want the number of dots on screen to increase over time,
  - **So that** the game becomes more crowded and challenging.
  - **Functional Requirement:** The number of dots on screen shall increase by 1 every 15 seconds.

##### **Epic 4: Player Experience & UI**

_Focus: Build the user-facing interface and supporting features._

- **Story 4.1: Splash & "How to Play" Screens**
  - **As a new player,** I want to see a start screen and have the option to view the rules,
  - **So that** I understand how to play the game before I begin.
- **Story 4.2: Game UI (HUD)**
  - **As a player,** I want to see my score, time, remaining Slow-Mo charges, and the target color,
  - **So that** I have all the necessary information during gameplay.
- **Story 4.3: Game Over Modal**
  - **As a player,** when the game ends, I want to see my final score and have options to "Play Again" or "View Leaderboard,"
  - **So that** I can easily restart or see my ranking.
- **Story 4.4: Slow-Mo Power-Up**
  - **As a player,** I want to be able to tap a special dot to activate a limited-use slow-motion effect,
  - **So that** I have a strategic tool to manage difficult moments.
  - **Functional Requirement:** Player starts with 3 charges. Effect lasts for 3 seconds.

##### **Epic 5: Visual & Audio Polish**

_Focus: Enhance the game's feel with satisfying feedback._

- **Story 5.1: Core Tap & Scoring Animations**
  - **As a player,** I want to see a "celebratory pop" and ripple effect when I tap correctly,
  - **So that** the game feels responsive and rewarding.
- **Story 5.2: Game Over Animations**
  - **As a player,** I want to see a satisfying "bomb explosion" and screen shake effect when I lose,
  - **So that** the game over state has a clear and impactful feel.

##### **Epic 6: Reddit Integration & Community**

_Focus: Connect the game to the Reddit platform._

- **Story 6.1: Mock Leaderboard Service**
  - **As a developer,** I need to create a mock LeaderboardService,
  - **So that** I can develop and test the leaderboard UI and its resilience to API errors.
- **Story 6.2: Live Leaderboard Integration**
  - **As a player,** I want my best score to be automatically submitted to a weekly leaderboard,
  - **So that** I can compete with the Reddit community.
- **Story 6.3: Leaderboard UI**
  - **As a player,** I want to be able to view the weekly leaderboard from the Game Over screen,
  - **So that** I can see my rank and the top scores.
