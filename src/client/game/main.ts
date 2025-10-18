import '../style.css';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { Leaderboard } from './scenes/Leaderboard';
import { SplashScreen } from './scenes/SplashScreen';
import { UIScene } from './scenes/UIScene';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS, // Use CANVAS renderer explicitly for better compatibility
  parent: 'game-container',
  width: 800,
  height: 600,
  backgroundColor: 0x2c3e50, // Use hex number instead of string
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
    pixelArt: false,
    transparent: false,
  },
  canvasStyle: 'willReadFrequently: true',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot],
};

const StartGame = (parent: string) => {
  console.log('Color Rush: Creating Phaser game instance...');

  try {
    const game = new Game({ ...config, parent });
    console.log('Color Rush: Phaser game created successfully');

    // Add global access for debugging
    (window as any).colorRushGame = game;

    return game;
  } catch (error) {
    console.error('Color Rush: Failed to create Phaser game:', error);
    throw error;
  }
};

export default StartGame;
