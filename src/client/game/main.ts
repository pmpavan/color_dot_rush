import '../style.css';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { Leaderboard } from './scenes/Leaderboard';
import { SplashScreen } from './scenes/SplashScreen';
import { SimpleUIScene } from './scenes/SimpleUIScene';
import * as Phaser from 'phaser';
import { Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Use AUTO like reference templates for better compatibility
  parent: 'game-container',
  width: '100%',
  height: '100%',
  backgroundColor: 0x2c3e50,
  scale: {
    mode: Phaser.Scale.RESIZE, // Resize to fill container completely
    autoCenter: Phaser.Scale.NO_CENTER, // No centering, fill container
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot, Preloader, SplashScreen, MainGame, SimpleUIScene, GameOver, Leaderboard],
};

const StartGame = (parent: string) => {
  console.log('Color Dot Rush: Creating Phaser game instance...');
  console.log('Color Dot Rush: Config:', config);

  try {
    const game = new Game({ ...config, parent });
    console.log('Color Dot Rush: Phaser game created successfully');
    console.log('Color Dot Rush: Scene manager:', game.scene);
    console.log('Color Dot Rush: Available scenes:', game.scene.scenes.map(s => s.scene.key));

    // Add global access for debugging
    (window as any).colorRushGame = game;

    // Add debugging for scene events
    game.events.on('ready', () => {
      console.log('Color Dot Rush: Game ready event fired');
    });

    return game;
  } catch (error) {
    console.error('Color Dot Rush: Failed to create Phaser game:', error);
    throw error;
  }
};

export default StartGame;
