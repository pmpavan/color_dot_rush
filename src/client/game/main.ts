import '../style.css';
import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { Game as MainGame } from './scenes/Game';
import { Leaderboard } from './scenes/Leaderboard';
import { SplashScreen } from './scenes/SplashScreen';
import { UIScene } from './scenes/UIScene';
import { ResponsiveCanvas } from './utils/ResponsiveCanvas';
import { PerformanceMonitor } from './utils/PerformanceMonitor';
import { CSPComplianceChecker } from './utils/CSPComplianceChecker';
import { PerformanceOptimizer } from './utils/PerformanceOptimizer';
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
      // Performance optimizations
      timeScale: 1,
      maxEntries: 16, // Limit collision detection entries
      useTree: true, // Use spatial partitioning for better performance
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    // Performance optimizations for 60 FPS
    batchSize: 4096, // Increase batch size for better rendering performance
    maxLights: 10, // Limit lights for better performance
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
    // Performance monitoring
    deltaHistory: 10, // Track frame time history
    panicMax: 120, // Maximum panic threshold
    smoothStep: true, // Smooth frame stepping
  },
  // Performance optimizations
  disableContextMenu: true, // Disable right-click menu for better performance
  transparent: false, // Opaque background for better performance
  clearBeforeRender: true, // Clear canvas before each render
  preserveDrawingBuffer: false, // Don't preserve drawing buffer
  failIfMajorPerformanceCaveat: false, // Allow fallback renderers
  powerPreference: 'high-performance', // Request high-performance GPU
  scene: [Boot, Preloader, SplashScreen, MainGame, UIScene, GameOver, Leaderboard],
};

const StartGame = (parent: string) => {
  const game = new Game({ ...config, parent });
  
  // Initialize responsive canvas handling
  const responsiveCanvas = new ResponsiveCanvas(game);
  
  // Initialize performance monitoring
  const performanceMonitor = new PerformanceMonitor(game);
  
  // Initialize performance optimizer
  const performanceOptimizer = new PerformanceOptimizer(game, performanceMonitor);
  
  // Initialize CSP compliance checker
  const cspChecker = new CSPComplianceChecker();
  
  // Store references for cleanup if needed
  (game as any).responsiveCanvas = responsiveCanvas;
  (game as any).performanceMonitor = performanceMonitor;
  (game as any).performanceOptimizer = performanceOptimizer;
  (game as any).cspChecker = cspChecker;
  
  // Enable performance monitoring and optimization
  performanceMonitor.enable();
  
  // Auto-detect optimal settings based on device capabilities
  performanceOptimizer.autoDetectSettings();
  
  // Start automatic performance optimization
  performanceOptimizer.startOptimization();
  
  if (process.env.NODE_ENV !== 'production') {
    // Log performance summary every 30 seconds in development
    setInterval(() => {
      performanceMonitor.logPerformanceSummary();
    }, 30000);
    
    // Check CSP compliance on startup
    cspChecker.logComplianceReport().catch(console.error);
  }
  
  // Add global performance monitoring access for debugging
  if (process.env.NODE_ENV !== 'production') {
    (window as any).colorRushPerformance = {
      monitor: performanceMonitor,
      optimizer: performanceOptimizer,
      cspChecker: cspChecker,
      getMetrics: () => performanceMonitor.getMetrics(),
      getSettings: () => performanceOptimizer.getCurrentSettings(),
      setSettings: (settings: any) => performanceOptimizer.setSettings(settings),
      getReport: () => performanceOptimizer.getOptimizationReport(),
      checkCSP: () => cspChecker.logComplianceReport(),
    };
  }
  
  return game;
};

export default StartGame;
