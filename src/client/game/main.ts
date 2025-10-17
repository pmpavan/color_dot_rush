import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { Leaderboard } from './scenes/Leaderboard';
import { SplashScreen } from './scenes/SplashScreen';
import { UIScene } from './scenes/UIScene';
import { ResponsiveCanvas } from './utils/ResponsiveCanvas';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#2C3E50', // Dark Slate background from design spec
  scale: {
    // Responsive design for mobile-first Reddit experience
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
    min: {
      width: 320,
      height: 240,
    },
    max: {
      width: 2048,
      height: 1536,
    },
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity for Color Rush
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  scene: [Boot, Preloader, SplashScreen, MainGame, UIScene, GameOver, Leaderboard],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });
  
  // Initialize responsive canvas handling
  const responsiveCanvas = new ResponsiveCanvas(game);
  
  // Store reference for cleanup if needed
  (game as any).responsiveCanvas = responsiveCanvas;
  
  return game;
};

export default StartGame;
