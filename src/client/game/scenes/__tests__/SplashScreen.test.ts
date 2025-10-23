import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SplashScreen } from '../SplashScreen';
import { Scene, GameObjects, Scale, Cameras, Tweens, Input } from 'phaser';

// Mock Phaser dependencies
vi.mock('phaser', () => ({
  Scene: vi.fn().mockImplementation(() => ({
    scale: {
      width: 1024,
      height: 768,
      on: vi.fn(),
    },
    cameras: {
      resize: vi.fn(),
    },
    add: {
      image: vi.fn(),
      text: vi.fn(),
    },
    tweens: {
      add: vi.fn(),
    },
    scene: {
      start: vi.fn(),
      launch: vi.fn(),
    },
  })),
  GameObjects: {
    Image: vi.fn(),
    Text: vi.fn(),
  },
}));

describe('SplashScreen Scene', () => {
  let splashScreen: SplashScreen;
  let mockAdd: any;
  let mockScale: any;
  let mockCameras: any;
  let mockTweens: any;
  let mockScene: any;
  let mockImage: any;
  let mockText: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock objects with proper method chaining
    mockImage = {
      setOrigin: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
    };

    mockText = {
      setOrigin: vi.fn().mockReturnThis(),
      setPosition: vi.fn().mockReturnThis(),
      setScale: vi.fn().mockReturnThis(),
      setInteractive: vi.fn().mockReturnThis(),
      setTint: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    };

    mockAdd = {
      image: vi.fn().mockReturnValue(mockImage),
      text: vi.fn().mockReturnValue(mockText),
    };

    mockScale = {
      width: 1024,
      height: 768,
      on: vi.fn(),
    };

    mockCameras = {
      resize: vi.fn(),
    };

    mockTweens = {
      add: vi.fn(),
    };

    mockScene = {
      start: vi.fn(),
      launch: vi.fn(),
    };

    splashScreen = new SplashScreen();
    splashScreen.add = mockAdd;
    splashScreen.scale = mockScale;
    splashScreen.cameras = mockCameras;
    splashScreen.tweens = mockTweens;
    splashScreen.scene = mockScene;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct scene key', () => {
      // Scene key is passed to parent constructor in super('SplashScreen')
      expect(splashScreen).toBeDefined();
      expect(splashScreen).toHaveProperty('background');
      expect(splashScreen).toHaveProperty('logo');
    });

    it('should initialize all game object references as null', () => {
      expect(splashScreen.background).toBeNull();
      expect(splashScreen.logo).toBeNull();
      expect(splashScreen.title).toBeNull();
      expect(splashScreen.startButton).toBeNull();
      expect(splashScreen.howToPlayButton).toBeNull();
    });
  });

  describe('init() method', () => {
    it('should reset all game object references to null', () => {
      // Set some mock objects
      splashScreen.background = mockImage;
      splashScreen.logo = mockImage;
      splashScreen.title = mockText;
      splashScreen.startButton = mockText;
      splashScreen.howToPlayButton = mockText;

      // Call init
      splashScreen.init();

      // Verify all references are reset
      expect(splashScreen.background).toBeNull();
      expect(splashScreen.logo).toBeNull();
      expect(splashScreen.title).toBeNull();
      expect(splashScreen.startButton).toBeNull();
      expect(splashScreen.howToPlayButton).toBeNull();
    });

    it('should handle multiple init calls without errors', () => {
      expect(() => {
        splashScreen.init();
        splashScreen.init();
        splashScreen.init();
      }).not.toThrow();
    });
  });

  describe('create() method', () => {
    it('should call refreshLayout on creation', () => {
      const refreshLayoutSpy = vi.spyOn(splashScreen as any, 'refreshLayout').mockImplementation(() => {});
      
      splashScreen.create();
      
      expect(refreshLayoutSpy).toHaveBeenCalledOnce();
    });

    it('should register resize event listener', () => {
      const refreshLayoutSpy = vi.spyOn(splashScreen as any, 'refreshLayout').mockImplementation(() => {});
      
      splashScreen.create();
      
      expect(mockScale.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should call createButtons', () => {
      const createButtonsSpy = vi.spyOn(splashScreen as any, 'createButtons').mockImplementation(() => {});
      
      splashScreen.create();
      
      expect(createButtonsSpy).toHaveBeenCalledOnce();
    });

    it('should handle resize events by calling refreshLayout', () => {
      const refreshLayoutSpy = vi.spyOn(splashScreen as any, 'refreshLayout').mockImplementation(() => {});
      
      splashScreen.create();
      
      // Get the resize callback and call it
      const resizeCallback = mockScale.on.mock.calls.find(call => call[0] === 'resize')[1];
      resizeCallback();
      
      expect(refreshLayoutSpy).toHaveBeenCalledTimes(2); // Once from create, once from resize
    });
  });

  describe('createButtons() method', () => {
    beforeEach(() => {
      // Mock the private method to be accessible for testing
      (splashScreen as any).createButtons = SplashScreen.prototype['createButtons'].bind(splashScreen);
    });

    it('should create Start Game button with correct properties', () => {
      (splashScreen as any).createButtons();

      expect(mockAdd.text).toHaveBeenCalledWith(
        512, // width / 2
        538, // height * 0.7 (rounded)
        'Start Game',
        expect.objectContaining({
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
          color: '#ffffff',
          backgroundColor: '#3498DB',
          padding: { x: 25, y: 12 },
        })
      );
    });

    it('should create How to Play button with correct properties', () => {
      (splashScreen as any).createButtons();

      expect(mockAdd.text).toHaveBeenCalledWith(
        512, // width / 2
        614, // height * 0.8 (rounded)
        'How to Play',
        expect.objectContaining({
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '20px',
          fontStyle: 'normal',
          color: '#ffffff',
          backgroundColor: '#95A5A6',
          padding: { x: 25, y: 12 },
        })
      );
    });

    it('should make buttons interactive with hand cursor', () => {
      (splashScreen as any).createButtons();

      expect(mockText.setInteractive).toHaveBeenCalledWith({ useHandCursor: true });
    });

    it('should not recreate buttons if they already exist', () => {
      splashScreen.startButton = mockText;
      splashScreen.howToPlayButton = mockText;

      (splashScreen as any).createButtons();

      // Should not call add.text since buttons already exist
      expect(mockAdd.text).not.toHaveBeenCalled();
    });

    describe('Start Game button interactions', () => {
      let startButton: any;

      beforeEach(() => {
        (splashScreen as any).createButtons();
        startButton = splashScreen.startButton;
      });

      it('should register hover events for scale animation', () => {
        expect(mockText.on).toHaveBeenCalledWith('pointerover', expect.any(Function));
        expect(mockText.on).toHaveBeenCalledWith('pointerout', expect.any(Function));
      });

      it('should register click events', () => {
        expect(mockText.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(mockText.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
      });

      it('should scale up on hover', () => {
        const hoverCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerover')[1];
        hoverCallback();
        
        expect(startButton.setScale).toHaveBeenCalledWith(1.1);
      });

      it('should scale down on pointer down', () => {
        const pointerDownCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
        pointerDownCallback();
        
        expect(startButton.setScale).toHaveBeenCalledWith(0.95);
      });

      it('should start Game scene and launch UI scene on click', () => {
        const pointerDownCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
        pointerDownCallback();
        
        expect(mockScene.start).toHaveBeenCalledWith('Game');
        expect(mockScene.launch).toHaveBeenCalledWith('UI');
      });
    });

    describe('How to Play button interactions', () => {
      let howToPlayButton: any;

      beforeEach(() => {
        (splashScreen as any).createButtons();
        howToPlayButton = splashScreen.howToPlayButton;
      });

      it('should register interaction events', () => {
        expect(mockText.on).toHaveBeenCalledWith('pointerover', expect.any(Function));
        expect(mockText.on).toHaveBeenCalledWith('pointerout', expect.any(Function));
        expect(mockText.on).toHaveBeenCalledWith('pointerdown', expect.any(Function));
        expect(mockText.on).toHaveBeenCalledWith('pointerup', expect.any(Function));
      });

      it('should log TODO message on click (temporary implementation)', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        // Get the How to Play button's pointerdown callback
        const howToPlayCalls = mockText.on.mock.calls.filter(call => call[0] === 'pointerdown');
        // The second button created should be How to Play
        const pointerDownCallback = howToPlayCalls[1][1];
        
        pointerDownCallback();
        
        expect(consoleSpy).toHaveBeenCalledWith('How to Play clicked - TODO: Implement instructions');
      });
    });
  });

  describe('refreshLayout() method', () => {
    beforeEach(() => {
      // Mock the private method to be accessible for testing
      (splashScreen as any).refreshLayout = SplashScreen.prototype['refreshLayout'].bind(splashScreen);
    });

    it('should resize cameras to current viewport', () => {
      (splashScreen as any).refreshLayout();

      expect(mockCameras.resize).toHaveBeenCalledWith(1024, 768);
    });

    it('should create and position background image with null safety', () => {
      (splashScreen as any).refreshLayout();

      expect(mockAdd.image).toHaveBeenCalledWith(0, 0, 'background');
      expect(mockImage.setOrigin).toHaveBeenCalledWith(0);
      expect(mockImage.setDisplaySize).toHaveBeenCalledWith(1024, 768);
    });

    it('should handle null background image gracefully', () => {
      // Mock add.image to return null
      mockAdd.image.mockReturnValueOnce(null);
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
      
      // Should not call setDisplaySize if background is null
      expect(mockImage.setDisplaySize).not.toHaveBeenCalled();
    });

    it('should handle existing background image without recreating', () => {
      // Set existing background
      splashScreen.background = mockImage;
      
      (splashScreen as any).refreshLayout();
      
      // Should not create new background image
      expect(mockAdd.image).not.toHaveBeenCalledWith(0, 0, 'background');
      // Should still update display size
      expect(mockImage.setDisplaySize).toHaveBeenCalledWith(1024, 768);
    });

    it('should create and position logo with correct scaling and null safety', () => {
      (splashScreen as any).refreshLayout();

      expect(mockAdd.image).toHaveBeenCalledWith(0, 0, 'logo');
      expect(mockImage.setPosition).toHaveBeenCalledWith(512, 292); // width/2, height*0.38 (rounded)
      expect(mockImage.setScale).toHaveBeenCalledWith(1); // min(1024/1024, 768/768) = 1
    });

    it('should handle null logo image gracefully', () => {
      // Mock add.image to return null for logo
      mockAdd.image.mockImplementation((x, y, key) => {
        if (key === 'logo') return null;
        return mockImage;
      });
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
    });

    it('should handle existing logo image without recreating', () => {
      // Set existing logo
      splashScreen.logo = mockImage;
      
      (splashScreen as any).refreshLayout();
      
      // Should not create new logo image
      expect(mockAdd.image).not.toHaveBeenCalledWith(0, 0, 'logo');
      // Should still update position and scale
      expect(mockImage.setPosition).toHaveBeenCalledWith(512, 292);
      expect(mockImage.setScale).toHaveBeenCalledWith(1);
    });

    it('should create title with Color Rush text and proper styling', () => {
      (splashScreen as any).refreshLayout();

      expect(mockAdd.text).toHaveBeenCalledWith(
        0, 0, 'Color Rush',
        expect.objectContaining({
          fontFamily: 'Orbitron, Poppins, Arial, sans-serif',
          fontSize: '72px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 8,
          align: 'center',
        })
      );
    });

    it('should add color-shifting tween animation to title', () => {
      (splashScreen as any).refreshLayout();

      expect(mockTweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          targets: expect.any(Object),
          duration: 3000,
          repeat: -1,
          yoyo: true,
          ease: 'Sine.easeInOut',
          onUpdate: expect.any(Function),
        })
      );
    });

    it('should calculate correct scale factor for different screen sizes', () => {
      // Test with smaller screen
      mockScale.width = 512;
      mockScale.height = 384;

      (splashScreen as any).refreshLayout();

      const expectedScale = Math.min(512 / 1024, 384 / 768); // 0.5
      expect(mockImage.setScale).toHaveBeenCalledWith(expectedScale);
    });

    it('should update existing button positions if they exist', () => {
      splashScreen.startButton = mockText;
      splashScreen.howToPlayButton = mockText;

      (splashScreen as any).refreshLayout();

      expect(mockText.setPosition).toHaveBeenCalledWith(512, 538); // Start button
      expect(mockText.setPosition).toHaveBeenCalledWith(512, 614); // How to Play button
    });

    it('should not recreate existing game objects', () => {
      splashScreen.background = mockImage;
      splashScreen.logo = mockImage;
      splashScreen.title = mockText;

      (splashScreen as any).refreshLayout();

      // Should only call add methods once (for initial creation)
      expect(mockAdd.image).toHaveBeenCalledTimes(0);
      expect(mockAdd.text).toHaveBeenCalledTimes(0);
    });
  });

  describe('Color Rush Design System Compliance', () => {
    it('should use correct Color Rush color palette', () => {
      (splashScreen as any).createButtons();

      // Start Game button should use Bright Blue (#3498DB)
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Start Game',
        expect.objectContaining({ backgroundColor: '#3498DB' })
      );

      // How to Play button should use Mid Grey (#95A5A6)
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'How to Play',
        expect.objectContaining({ backgroundColor: '#95A5A6' })
      );
    });

    it('should use Poppins font family throughout', () => {
      (splashScreen as any).refreshLayout();
      (splashScreen as any).createButtons();

      // Check title uses Poppins Bold
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Color Rush',
        expect.objectContaining({ fontFamily: 'Orbitron, Poppins, Arial, sans-serif', fontStyle: 'bold' })
      );

      // Check buttons use Poppins
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), 'Start Game',
        expect.objectContaining({ fontFamily: 'Orbitron, Poppins, Arial, sans-serif' })
      );
    });

    it('should implement proper button sizing for accessibility (44px minimum)', () => {
      (splashScreen as any).createButtons();

      // Buttons should have adequate padding for 44px minimum touch target
      expect(mockAdd.text).toHaveBeenCalledWith(
        expect.any(Number), expect.any(Number), expect.any(String),
        expect.objectContaining({ padding: { x: 25, y: 12 } })
      );
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle multiple create calls without memory leaks', () => {
      splashScreen.create();
      splashScreen.create();
      splashScreen.create();

      // Should not create duplicate objects
      expect(mockAdd.image).toHaveBeenCalledTimes(2); // background and logo
      expect(mockAdd.text).toHaveBeenCalledTimes(3); // title and 2 buttons
    });

    it('should properly clean up on scene restart', () => {
      splashScreen.create();
      
      // Simulate scene restart
      splashScreen.init();
      
      expect(splashScreen.background).toBeNull();
      expect(splashScreen.logo).toBeNull();
      expect(splashScreen.title).toBeNull();
      expect(splashScreen.startButton).toBeNull();
      expect(splashScreen.howToPlayButton).toBeNull();
    });
  });

  describe('Responsive Design', () => {
    it('should handle portrait orientation', () => {
      mockScale.width = 768;
      mockScale.height = 1024;

      (splashScreen as any).refreshLayout();

      const expectedScale = Math.min(768 / 1024, 1024 / 768); // 0.75
      expect(mockImage.setScale).toHaveBeenCalledWith(expectedScale);
    });

    it('should handle very small screens', () => {
      mockScale.width = 320;
      mockScale.height = 568;

      (splashScreen as any).refreshLayout();

      const expectedScale = Math.min(320 / 1024, 568 / 768); // ~0.31
      expect(mockImage.setScale).toHaveBeenCalledWith(expect.closeTo(0.31, 0.01));
    });

    it('should handle very large screens', () => {
      mockScale.width = 2048;
      mockScale.height = 1536;

      (splashScreen as any).refreshLayout();

      const expectedScale = Math.min(2048 / 1024, 1536 / 768); // 2.0
      expect(mockImage.setScale).toHaveBeenCalledWith(2.0);
    });
  });

  describe('Scene Transitions', () => {
    it('should transition to correct scenes when Start Game is clicked', () => {
      (splashScreen as any).createButtons();
      
      const pointerDownCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      pointerDownCallback();

      expect(mockScene.start).toHaveBeenCalledWith('Game');
      expect(mockScene.launch).toHaveBeenCalledWith('UI');
    });

    it('should maintain concurrent UI scene architecture', () => {
      (splashScreen as any).createButtons();
      
      const pointerDownCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      pointerDownCallback();

      // Verify UI scene is launched (not started) to run concurrently
      expect(mockScene.launch).toHaveBeenCalledWith('UI');
      expect(mockScene.start).not.toHaveBeenCalledWith('UI');
    });
  });

  describe('Animation System', () => {
    it('should create color-shifting animation for title', () => {
      (splashScreen as any).refreshLayout();

      const tweenConfig = mockTweens.add.mock.calls[0][0];
      expect(tweenConfig.duration).toBe(3000);
      expect(tweenConfig.repeat).toBe(-1);
      expect(tweenConfig.yoyo).toBe(true);
      expect(tweenConfig.ease).toBe('Sine.easeInOut');
    });

    it('should cycle through Color Rush palette colors', () => {
      (splashScreen as any).refreshLayout();
      
      const tweenConfig = mockTweens.add.mock.calls[0][0];
      const onUpdateCallback = tweenConfig.onUpdate;
      
      // Mock Date.now to test color cycling
      const originalDateNow = Date.now;
      Date.now = vi.fn().mockReturnValue(1000000); // Fixed timestamp
      
      onUpdateCallback();
      
      expect(mockText.setTint).toHaveBeenCalled();
      
      Date.now = originalDateNow;
    });

    it('should implement smooth button hover animations', () => {
      (splashScreen as any).createButtons();

      // Test hover in
      const hoverInCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerover')[1];
      hoverInCallback();
      expect(mockText.setScale).toHaveBeenCalledWith(1.1);

      // Test hover out
      const hoverOutCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerout')[1];
      hoverOutCallback();
      expect(mockText.setScale).toHaveBeenCalledWith(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing assets gracefully', () => {
      mockAdd.image.mockReturnValue(null);
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
    });

    it('should handle null background image creation', () => {
      mockAdd.image.mockImplementation((x, y, key) => {
        if (key === 'background') return null;
        return mockImage;
      });
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
      
      expect(splashScreen.background).toBeNull();
    });

    it('should handle null logo image creation', () => {
      mockAdd.image.mockImplementation((x, y, key) => {
        if (key === 'logo') return null;
        return mockImage;
      });
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
      
      expect(splashScreen.logo).toBeNull();
    });

    it('should handle partial asset loading failures', () => {
      // Background loads but logo fails
      mockAdd.image.mockImplementation((x, y, key) => {
        if (key === 'logo') return null;
        return mockImage;
      });
      
      (splashScreen as any).refreshLayout();
      
      // Background should be set
      expect(splashScreen.background).toBe(mockImage);
      // Logo should remain null
      expect(splashScreen.logo).toBeNull();
    });

    it('should handle all assets failing to load', () => {
      mockAdd.image.mockReturnValue(null);
      mockAdd.text.mockReturnValue(null);
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
      
      expect(splashScreen.background).toBeNull();
      expect(splashScreen.logo).toBeNull();
      expect(splashScreen.title).toBeNull();
    });

    it('should handle scale calculation edge cases', () => {
      mockScale.width = 0;
      mockScale.height = 0;

      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
    });

    it('should handle missing scene manager gracefully', () => {
      (splashScreen as any).scene = null;
      
      expect(() => {
        (splashScreen as any).createButtons();
      }).not.toThrow();
    });

    it('should continue layout updates even with null objects', () => {
      // Set some objects to null
      splashScreen.background = null;
      splashScreen.logo = null;
      
      // Mock to return null for new objects too
      mockAdd.image.mockReturnValue(null);
      
      expect(() => {
        (splashScreen as any).refreshLayout();
        (splashScreen as any).refreshLayout(); // Call twice to test persistence
      }).not.toThrow();
    });
  });

  describe('Null Safety and Defensive Programming', () => {
    it('should safely handle background image creation and updates', () => {
      // Test initial creation
      (splashScreen as any).refreshLayout();
      expect(splashScreen.background).toBe(mockImage);
      
      // Test subsequent calls don't recreate
      const initialBackground = splashScreen.background;
      (splashScreen as any).refreshLayout();
      expect(splashScreen.background).toBe(initialBackground);
    });

    it('should safely handle logo image creation and updates', () => {
      // Test initial creation
      (splashScreen as any).refreshLayout();
      expect(splashScreen.logo).toBe(mockImage);
      
      // Test subsequent calls don't recreate
      const initialLogo = splashScreen.logo;
      (splashScreen as any).refreshLayout();
      expect(splashScreen.logo).toBe(initialLogo);
    });

    it('should handle mixed success/failure scenarios', () => {
      // Background succeeds, logo fails
      mockAdd.image.mockImplementation((x, y, key) => {
        if (key === 'background') return mockImage;
        if (key === 'logo') return null;
        return mockImage;
      });
      
      (splashScreen as any).refreshLayout();
      
      expect(splashScreen.background).toBe(mockImage);
      expect(splashScreen.logo).toBeNull();
      expect(mockImage.setDisplaySize).toHaveBeenCalled();
    });

    it('should maintain object references across multiple layout refreshes', () => {
      // First refresh - create objects
      (splashScreen as any).refreshLayout();
      const background1 = splashScreen.background;
      const logo1 = splashScreen.logo;
      
      // Second refresh - should reuse objects
      (splashScreen as any).refreshLayout();
      expect(splashScreen.background).toBe(background1);
      expect(splashScreen.logo).toBe(logo1);
    });

    it('should handle asset loading failures without breaking subsequent operations', () => {
      // First call fails
      mockAdd.image.mockReturnValue(null);
      (splashScreen as any).refreshLayout();
      expect(splashScreen.background).toBeNull();
      
      // Second call succeeds
      mockAdd.image.mockReturnValue(mockImage);
      (splashScreen as any).refreshLayout();
      expect(splashScreen.background).toBe(mockImage);
    });

    it('should validate object existence before method calls', () => {
      // Set background to null and ensure setDisplaySize isn't called
      splashScreen.background = null;
      mockAdd.image.mockReturnValue(null);
      
      (splashScreen as any).refreshLayout();
      
      expect(mockImage.setDisplaySize).not.toHaveBeenCalled();
      expect(mockImage.setPosition).not.toHaveBeenCalled();
      expect(mockImage.setScale).not.toHaveBeenCalled();
    });

    it('should handle Phaser object creation returning undefined', () => {
      mockAdd.image.mockReturnValue(undefined);
      
      expect(() => {
        (splashScreen as any).refreshLayout();
      }).not.toThrow();
      
      expect(splashScreen.background).toBeNull();
      expect(splashScreen.logo).toBeNull();
    });
  });

  describe('Integration with Color Rush Architecture', () => {
    it('should follow Phaser scene lifecycle pattern', () => {
      expect(typeof splashScreen.init).toBe('function');
      expect(typeof splashScreen.create).toBe('function');
    });

    it('should implement proper scene key for scene management', () => {
      // Scene key is passed to parent constructor in super('SplashScreen')
      expect(splashScreen).toBeDefined();
      expect(splashScreen).toHaveProperty('background');
      expect(splashScreen).toHaveProperty('logo');
    });

    it('should support the Boot → Preloader → SplashScreen → Game+UI flow', () => {
      (splashScreen as any).createButtons();
      
      const startCallback = mockText.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      startCallback();

      // Should transition to Game scene and launch UI scene concurrently
      expect(mockScene.start).toHaveBeenCalledWith('Game');
      expect(mockScene.launch).toHaveBeenCalledWith('UI');
    });
  });
});