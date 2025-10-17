### **Frontend Specification: Color Rush**

|                     |                  |
| :------------------ | :--------------- |
| **Product:**        | Color Rush       |
| **Document Owner:** | UX Design        |
| **Status:**         | Finalized        |
| **Last Updated:**   | October 17, 2025 |

#### **1\. UX Principles**

- **Clarity Above All:** The player must understand what to do within seconds. The UI should be invisible, guiding the player's focus entirely to the game.
- **Immediate Feedback:** Every tap, every point scored, and every error must have an immediate, clear, and satisfying visual response.
- **Minimalist Aesthetic:** We will avoid any visual clutter that distracts from the core gameplay. The design is clean, modern, and performance-friendly.
- **"Juiciness":** Interactions should feel tactile and satisfying. Animations are key to making the game feel alive and responsive.

#### **2\. Visual Design System**

##### **Color Palette**

- **Background:** Dark Slate (\#2C3E50)
- **Text & UI Elements:** White (\#FFFFFF) / Light Grey (\#ECF0F1)
- **Primary Button (CTA):** Bright Blue (\#3498DB)
- **Secondary Button:** Mid Grey (\#95A5A6)
- **Game Dots (High Contrast):**
  - Red: \#E74C3C
  - Green: \#2ECC71
  - Blue: \#3498DB
  - Yellow: \#F1C40F
  - Purple: \#9B59B6
- **Bomb:** Near Black (\#34495E) with a white fuse icon.
- **Slow-Mo Dot:** Shimmering White (\#ECF0F1) with a blue clock icon.

##### **Typography**

- **Primary Font:** "Poppins" (Google Fonts)
- **H1 (Game Title):** 72pt, Bold
- **H2 (Modal Titles):** 48pt, Bold
- **Header UI Text:** 24pt, Regular
- **Body/Button Text:** 20pt, Medium

##### **Iconography**

- **Style:** Simple, solid, and universally recognizable SVG icons.
- **Bomb:** A simple circle with a small, curved line representing a fuse.
- **Slow-Mo Charge:** A simple clock face icon.

#### **3\. Screen & Component Specifications**

##### **Screen 1: Splash Screen**

- **Layout:** Vertically and horizontally centered content.
- **Elements:**
  1. **Game Title ("Color Rush"):** H1 size. Has a subtle, slow color-shifting gradient.
  2. **Primary Button ("Start Game"):** Large, prominent button.
  3. **Secondary Button ("How to Play"):** Smaller button below the primary.
- **Interaction:** Buttons must have clear hover (slight scale-up) and pressed (slight scale-down) states.

##### **Screen 2: How to Play (Modal)**

- **Layout:** A centered card that overlays the Splash Screen, dimming the background.
- **Content:** A visual guide using icons and minimal text to explain the rules.

##### **Screen 3: Main Game Screen**

- **Header:**
  - A clean, top-aligned bar.
  - **Left:** Score: \[value\] | Best: \[value\]
  - **Center:** Time: \[mm:ss\]
  - **Right:** Slow-Mo Charges displayed as three clock icons that grey out when used.
  - **Target Color Display:** A prominent box, centrally located just below the header, stating **"TAP: \[COLOR\]"**.
- **Play Area:**
  - The canvas takes up the remaining screen space.
  - Game objects will get visibly faster and smaller over time, creating a palpable sense of increasing difficulty and tension.
  - Objects spawn from just outside the four screen edges.

##### **Screen 4: Game Over (Modal)**

- **Layout:** A centered card overlaying the frozen game state.
- **Animation:** The modal scales up and fades in quickly.
- **Elements:** Title ("GAME OVER"), Score Display, "Play Again" button, "View Leaderboard" button.

#### **4\. Interaction & Animation Details**

- **Tap Feedback:** An instantaneous, expanding ripple effect at the point of every tap.
- **Correct Tap ("Celebratory Pop"):** A small burst of particles of the dot's color. The dot rapidly shrinks to nothing.
- **Bomb Explosion:** A larger, more intense particle explosion with red/orange/yellow colors, accompanied by a brief, sharp screen shake.
- **Slow-Mo Activation:** A radial blue glow emanates from the tapped power-up, and a subtle blue vignette appears around the screen edges for the duration of the effect.

#### **5\. Accessibility Notes**

- **Color Palette:** The selected dot colors are chosen to be highly distinct.
- **Tap Targets:** All interactive elements must have a minimum tap target size of 44x44 pixels, even if their visual appearance is smaller.
- **Readability:** The "Poppins" font and high-contrast text colors ensure all UI information is clearly legible.
