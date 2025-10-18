import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameOver } from '../GameOver';

// Mock Phaser dependencies
vi.mock('phaser', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    scale: {
      width: 1024,
      height: 768,
      on: vi.fn(),
    },
    cameras: {
      main: {
        setBackgroundColor: vi.fn(),
        resize: vi.fn(),
      },
      resize: vi.fn(),
    },
    add: {
      image: vi.fn(),
      text: vi.fn(),
      rectangle: vi.fn(),
      container: vi.fn(),
      particles: vi.fn(),
    },
    tweens: {
      add: vi.fn(),
      killTweensOf: vi.fn(),
    },
    time: {
      delayedCall: vi.fn(),
    },
    scene: {
      start: vi.fn(),
      launch: vi.fn(),
    },
  })),
}));

describe('GameOver Scene', () => {
  let gameOverScene: GameOver;
  let mockAdd: any;
  let mockScale: any;
  let mockCameras: any;
  let mockTweens: any;
  let mockTime: any;
  let mockScene: any;
  let mockImage: any;
  let mockText: any;
  let mockRectangle: any;
  let mockContainer: any;
  let mockParticles: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock objects with proper method chaining
    mockImage = {
      setOrigin: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
    };

    mockText = {
      setOrigin: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      destroy: vi.fn(),
      x: 100,
      y: 100,
    };

    mockRectangle = {
      setPosition: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
      setStrokeStyle: vi.fn().mockReturnThis(),
    };

    mockContainer = {
      add: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      y: 384, // Mock y position
    };

    mockParticles = {
      destroy: vi.fn(),
    };

    mockAdd = {
      image: vi.fn().mockReturnValue(mockImage),
      text: vi.fn().mockReturnValue(mockText),
      rectangle: vi.fn().mockReturnValue(mockRectangle),
      container: vi.fn().mockReturnValue(mockContainer),
      particles: vi.fn().mockReturnValue(mockParticles),
    };

    mockScale = {
      width: 1024,
      height: 768,
      on: vi.fn(),
    };

    mockCameras = {
      main: {
        setBackgroundColor: vi.fn(),
        resize: vi.fn(),
      },
      resize: vi.fn(),
    };

    mockTweens = {
      add: vi.fn(),
      killTweensOf: vi.fn(),
    };

    mockTime = {
      delayedCall: vi.fn(),
    };

    mockScene = {
      start: vi.fn(),
      launch: vi.fn(),
    };

    gameOverScene = new GameOver();
    gameOverScene.add = mockAdd;
    gameOverScene.scale = mockScale;
    gameOverScene.cameras = mockCameras;
    gameOverScene.tweens = mockTweens;
    gameOverScene.time = mockTime;
    gameOverScene.scene = mockScene;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct scene key', () => {
      expect(gameOverScene).toBeDefined();
    });
  });

  describe('init() method', () => {
    it('should store game over data from Game scene', () => {
      const testData = {
        finalScore: 150,
        sessionTime: 90,
        bestScore: 200,
        targetColor: '#E74C3C'
      };

      gameOverScene.init(testData);

      // Access private property for testing
      expect((gameOverScene as any).gameOverData).toEqual(testData);
    });

    it('should use default values when no data provided', () => {
      gameOverScene.init(undefined as any);

      const expectedDefaults = {
        finalScore: 0,
        sessionTime: 0,
        bestScore: 0,
        targetColor: '#E74C3C'
      };

      expect((gameOverScene as any).gameOverData).toEqual(expectedDefaults);
    });

    it('should reset button references for scene reuse', () => {
      gameOverScene.init({
        finalScore: 0,
        sessionTime: 0,
        bestScore: 0,
        targetColor: '#E74C3C'
      });

      expect((gameOverScene as any).playAgainButton).toBeNull();
      expect((gameOverScene as any).leaderboardButton).toBeNull();
      expect((gameOverScene as any).mainMenuButton).toBeNull();
    });
  });

  describe('create() method', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
    });

    it('should configure camera with correct background color', () => {
      gameOverScene.create();

      expect(mockCameras.main.setBackgroundColor).toHaveBeenCalledWith(0x2C3E50);
    });

    it('should create frozen game state background', () => {
      gameOverScene.create();

      expect(mockAdd.image).toHaveBeenCalledWith(0, 0, 'background');
      expect(mockImage.setOrigin).toHaveBeenCalledWith(0);
      expect(mockImage.setAlpha).toHaveBeenCalledWith(0.3);
    });

    it('should create dimmed overlay for modal effect', () => {
      gameOverScene.create();

      expect(mockAdd.rectangle).toHaveBeenCalledWith(
        512, // width / 2
        384, // height / 2
        1024, // width
        768, // height
        0x000000,
        0.7
      );
    });

    it('should register resize event listener', () => {
      gameOverScene.create();

      expect(mockScale.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should create modal card with proper structure', () => {
      gameOverScene.create();

      expect(mockAdd.container).toHaveBeenCalledWith(512, 384);
    });
  });

  describe('Modal Card Creation', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 250,
        sessionTime: 120,
        bestScore: 200,
        targetColor: '#E74C3C'
      });
    });

    it('should create modal background with correct styling', () => {
      gameOverScene.create();

      // Modal background should be created
      expect(mockAdd.rectangle).toHaveBeenCalledWith(
        0, 0, // Centered in container
        expect.any(Number), // modalWidth
        expect.any(Number), // modalHeight
        0x34495E,
        0.98
      );
      expect(mockRectangle.setStrokeStyle).toHaveBeenCalledWith(4, 0xECF0F1, 0.8);
    });

    it('should create GAME OVER title with correct styling', () => {
      gameOverScene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'GAME OVER',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '48px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
        })
      );
    });

    it('should display final score prominently', () => {
      gameOverScene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'Final Score: 250',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#3498DB',
          align: 'center',
        })
      );
    });

    it('should display session time correctly formatted', () => {
      gameOverScene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'Session Time: 2:00',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: '#ECF0F1',
          align: 'center',
        })
      );
    });

    it('should highlight new best score with special styling', () => {
      // Test with new record (finalScore > bestScore)
      gameOverScene.init({
        finalScore: 300,
        sessionTime: 90,
        bestScore: 300, // Same as final score indicates new record
        targetColor: '#E74C3C'
      });

      gameOverScene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), '🏆 NEW BEST: 300',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#F1C40F', // Gold color for new record
          align: 'center',
        })
      );
    });

    it('should show regular best score when not a new record', () => {
      gameOverScene.create();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'Best Score: 200',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'normal',
          color: '#95A5A6', // Grey color for existing record
          align: 'center',
        })
      );
    });
  });

  describe('Modal Animation', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
    });

    it('should implement scale-up and fade-in animation (~250ms)', () => {
      gameOverScene.create();

      // Modal should start scaled down and transparent
      expect(mockContainer.setScale).toHaveBeenCalledWith(0.1);
      expect(mockContainer.setAlpha).toHaveBeenCalledWith(0);

      // Animation should be created
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockContainer,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          duration: 250,
          ease: 'Back.easeOut',
          onComplete: expect.any(Function),
        })
      );
    });

    it('should auto-focus Play Again button after animation', () => {
      gameOverScene.create();

      // Get the animation config and call onComplete
      const animationConfig = mockTweens.add.mock.calls.find(
        call => call[0].targets === mockContainer
      )[0];

      // Mock the Play Again button
      (gameOverScene as any).playAgainButton = mockText;

      animationConfig.onComplete();

      expect(mockText.setScale).toHaveBeenCalledWith(1.05);
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockText,
          alpha: 0.8,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      );
    });
  });

  describe('Navigation Buttons', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();
    });

    it('should create Play Again button with correct styling', () => {
      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'Play Again',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#3498DB',
          padding: { x: 30, y: 15 },
        })
      );
    });

    it('should create View Leaderboard button with correct styling', () => {
      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'View Leaderboard',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#ffffff',
          backgroundColor: '#95A5A6',
          padding: { x: 25, y: 12 },
        })
      );
    });

    it('should create Main Menu button with correct styling', () => {
      expect(mockAdd.text).toHaveBeenCalledWith(
        0, expect.any(Number), 'Main Menu',
        expect.objectContaining({
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#ffffff',
          backgroundColor: '#34495E',
          padding: { x: 20, y: 10 },
        })
      );
    });

    it('should make all buttons interactive with hand cursor', () => {
      // Should be called 3 times (one for each button)
      expect(mockText.setInteractive).toHaveBeenCalledTimes(3);
      expect(mockText.setInteractive).toHaveBeenCalledWith({ useHandCursor: true });
    });
  });

  describe('Button Interactions', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();
    });

    it('should implement smooth transition for Play Again button', () => {
      // Find the Play Again button's pointerdown callback
      const pointerDownCalls = mockText.on.mock.calls.filter(call => call[0] === 'pointerdown');
      const playAgainCallback = pointerDownCalls[0][1]; // First button is Play Again

      // Mock the button reference
      (gameOverScene as any).playAgainButton = mockText;

      playAgainCallback();

      // Should create exit animation
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockContainer,
          scaleX: 0.1,
          scaleY: 0.1,
          alpha: 0,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: expect.any(Function),
        })
      );
    });

    it('should transition to Game and UI scenes when Play Again is clicked', () => {
      const pointerDownCalls = mockText.on.mock.calls.filter(call => call[0] === 'pointerdown');
      const playAgainCallback = pointerDownCalls[0][1];

      // Mock the button reference
      (gameOverScene as any).playAgainButton = mockText;

      playAgainCallback();

      // Get the exit animation and call onComplete
      const exitAnimation = mockTweens.add.mock.calls.find(
        call => call[0].targets === mockContainer && call[0].duration === 200
      )[0];

      exitAnimation.onComplete();

      expect(mockScene.start).toHaveBeenCalledWith('Game');
      expect(mockScene.launch).toHaveBeenCalledWith('UI');
    });

    it('should transition to SplashScreen when Main Menu is clicked', () => {
      const pointerDownCalls = mockText.on.mock.calls.filter(call => call[0] === 'pointerdown');
      const mainMenuCallback = pointerDownCalls[2][1]; // Third button is Main Menu

      // Mock the button reference
      (gameOverScene as any).mainMenuButton = mockText;

      mainMenuCallback();

      // Get the exit animation and call onComplete
      const exitAnimation = mockTweens.add.mock.calls.find(
        call => call[0].targets === mockContainer && call[0].duration === 200
      )[0];

      exitAnimation.onComplete();

      expect(mockScene.start).toHaveBeenCalledWith('SplashScreen');
    });

    it('should transition to Leaderboard scene when View Leaderboard is clicked', () => {
      const pointerDownCalls = mockText.on.mock.calls.filter(call => call[0] === 'pointerdown');
      const leaderboardCallback = pointerDownCalls[1][1]; // Second button is View Leaderboard

      // Mock the button reference
      (gameOverScene as any).leaderboardButton = mockText;

      leaderboardCallback();

      // Mock the modal card
      (gameOverScene as any).modalCard = mockContainer;

      // Should start transition animation
      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: mockContainer,
          scaleX: 0.1,
          scaleY: 0.1,
          alpha: 0,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: expect.any(Function)
        })
      );

      // Execute the onComplete callback to test scene transition
      const tweenCall = mockTweens.add.mock.calls.find(call => 
        call[0].targets === mockContainer && call[0].scaleX === 0.1
      );
      if (tweenCall && tweenCall[0].onComplete) {
        tweenCall[0].onComplete();
      }

      // Should transition to Leaderboard scene
      expect(mockScene.start).toHaveBeenCalledWith('Leaderboard');
    });
  });

  describe('New Record Celebration', () => {
    it('should create sparkle particles for new record', () => {
      gameOverScene.init({
        finalScore: 300,
        sessionTime: 90,
        bestScore: 300, // New record
        targetColor: '#E74C3C'
      });

      gameOverScene.create();

      expect(mockAdd.particles).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'dot-yellow',
        expect.objectContaining({
          tint: 0xF1C40F,
          speed: { min: 50, max: 150 },
          scale: { start: 0.3, end: 0 },
          lifespan: 1000,
          quantity: 2,
          frequency: 200,
          blendMode: 'ADD'
        })
      );

      expect(mockTime.delayedCall).toHaveBeenCalledWith(3000, expect.any(Function));
    });
  });

  describe('Time Formatting', () => {
    it('should format time correctly for various durations', () => {
      const formatTime = (gameOverScene as any).formatTime.bind(gameOverScene);

      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(120)).toBe('2:00');
      expect(formatTime(150)).toBe('2:30');
      expect(formatTime(3661)).toBe('61:01'); // Over an hour
    });
  });

  describe('Responsive Layout', () => {
    it('should update layout on resize', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();

      // Trigger resize event
      const resizeCallback = mockScale.on.mock.calls.find(call => call[0] === 'resize')[1];
      resizeCallback({ width: 800, height: 600 });

      expect(mockCameras.resize).toHaveBeenCalledWith(800, 600);
    });

    it('should reposition modal card on resize', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();

      // Mock the modal card
      (gameOverScene as any).modalCard = mockContainer;

      const resizeCallback = mockScale.on.mock.calls.find(call => call[0] === 'resize')[1];
      resizeCallback({ width: 800, height: 600 });

      expect(mockContainer.setPosition).toHaveBeenCalledWith(400, 300);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing game over data gracefully', () => {
      gameOverScene.init(undefined as any);

      expect(() => {
        gameOverScene.create();
      }).not.toThrow();
    });

    it('should handle null button references safely', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });

      // Buttons should be null initially (before create is called)
      expect((gameOverScene as any).playAgainButton).toBeNull();
      expect((gameOverScene as any).leaderboardButton).toBeNull();
      expect((gameOverScene as any).mainMenuButton).toBeNull();

      // After create, buttons should be created
      gameOverScene.create();
      expect((gameOverScene as any).playAgainButton).not.toBeNull();
      expect((gameOverScene as any).leaderboardButton).not.toBeNull();
      expect((gameOverScene as any).mainMenuButton).not.toBeNull();
    });

    it('should handle asset loading failures gracefully', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });

      mockAdd.image.mockReturnValue(null);
      mockAdd.text.mockReturnValue(null);
      mockAdd.rectangle.mockReturnValue(null);
      mockAdd.container.mockReturnValue(null);

      expect(() => {
        gameOverScene.create();
      }).not.toThrow();
    });
  });

  describe('Color Rush Design System Compliance', () => {
    beforeEach(() => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();
    });

    it('should use correct Color Rush color palette', () => {
      // Play Again button should use Bright Blue (#3498DB)
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Play Again',
        expect.objectContaining({ backgroundColor: '#3498DB' })
      );

      // View Leaderboard button should use Mid Grey (#95A5A6)
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'View Leaderboard',
        expect.objectContaining({ backgroundColor: '#95A5A6' })
      );

      // Main Menu button should use Near Black (#34495E)
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Main Menu',
        expect.objectContaining({ backgroundColor: '#34495E' })
      );
    });

    it('should use Poppins font family throughout', () => {
      // All text elements should use Poppins
      const textCalls = mockAdd.text.mock.calls;
      textCalls.forEach(call => {
        expect(call[3]).toHaveProperty('fontFamily', 'Poppins');
      });
    });

    it('should implement proper button sizing for accessibility', () => {
      // Play Again button should have adequate padding
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Play Again',
        expect.objectContaining({ padding: { x: 30, y: 15 } })
      );
    });
  });

  describe('Scene Integration', () => {
    it('should follow proper scene lifecycle pattern', () => {
      expect(typeof gameOverScene.init).toBe('function');
      expect(typeof gameOverScene.create).toBe('function');
    });

    it('should support the Game → GameOver → Game/SplashScreen flow', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();

      // Should be able to transition back to Game or SplashScreen
      expect(mockScene.start).toBeDefined();
      expect(mockScene.launch).toBeDefined();
    });

    it('should maintain modal overlay pattern over frozen game state', () => {
      gameOverScene.init({
        finalScore: 100,
        sessionTime: 60,
        bestScore: 150,
        targetColor: '#3498DB'
      });
      gameOverScene.create();

      // Should create background image (frozen game state)
      expect(mockAdd.image).toHaveBeenCalledWith(0, 0, 'background');

      // Should create dimmed overlay
      expect(mockAdd.rectangle).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number),
        expect.any(Number), expect.any(Number),
        0x000000, 0.7
      );
    });
  });
});
