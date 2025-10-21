import StartGame from './game/main';

console.log('Color Dot Rush: Main script loaded');

function initializeGame() {
  console.log('Color Dot Rush: Initializing game...');
  const gameContainer = document.getElementById('game-container');
  if (!gameContainer) {
    console.error('Color Dot Rush: Game container not found!');
    // Create the container if it doesn't exist
    const appDiv = document.getElementById('app');
    if (appDiv) {
      const newContainer = document.createElement('div');
      newContainer.id = 'game-container';
      appDiv.appendChild(newContainer);
      console.log('Color Dot Rush: Created game container');
    } else {
      console.error('Color Dot Rush: App container not found either!');
      return;
    }
  }
  
  console.log('Color Dot Rush: Game container found, initializing Phaser...');
  try {
    const game = StartGame('game-container');
    console.log('Color Dot Rush: Game initialized successfully', game);
    
    // Add global access for debugging
    (window as any).colorRushGame = game;
    
    return game;
  } catch (error) {
    console.error('Color Dot Rush: Failed to initialize game:', error);
    console.error('Error stack:', error);
    
    // Show error message to user
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.innerHTML = `
        <div style="color: white; text-align: center; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Color Dot Rush - Loading Error</h2>
          <p>Failed to initialize the game. Please refresh the page.</p>
          <p style="font-size: 12px; color: #ccc;">Error: ${error}</p>
        </div>
      `;
    }
  }
}

// Try multiple initialization methods
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  // DOM is already loaded
  initializeGame();
}

// Fallback initialization after a short delay
setTimeout(() => {
  if (!(window as any).colorRushGame) {
    console.log('Color Dot Rush: Fallback initialization...');
    initializeGame();
  }
}, 1000);
