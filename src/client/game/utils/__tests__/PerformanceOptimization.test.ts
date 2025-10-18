/**
 * Performance Optimization Tests for Color Rush
 * Tests performance monitoring, CSP compliance, and optimization features
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { CSPComplianceChecker } from '../CSPComplianceChecker';
import { PerformanceOptimizer } from '../PerformanceOptimizer';

// Mock Phaser Game
const mockGame = {
  events: {
    on: vi.fn(),
    off: vi.fn(),
  },
  input: {
    on: vi.fn(),
  },
  scene: {
    scenes: [
      {
        children: { length: 25 },
        events: { emit: vi.fn() },
      },
      {
        children: { length: 15 },
        events: { emit: vi.fn() },
      },
    ],
  },
  canvas: {
    getContext: vi.fn().mockReturnValue({
      getParameter: vi.fn().mockReturnValue(4096),
    }),
  },
} as any;

// Mock performance API
const mockPerformance = {
  now: vi.fn().mockReturnValue(1000),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024, // 200MB
  },
};

// Mock window and global objects
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    setInterval: vi.fn().mockReturnValue(123),
    clearInterval: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      hardwareConcurrency: 4,
    },
  },
  writable: true,
});

Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    hardwareConcurrency: 4,
  },
  writable: true,
});

describe('Performance Optimization System', () => {
  let performanceMonitor: PerformanceMonitor;
  let performanceOptimizer: PerformanceOptimizer;
  let cspChecker: CSPComplianceChecker;

  beforeEach(() => {
    vi.clearAllMocks();
    performanceMonitor = new PerformanceMonitor(mockGame);
    performanceOptimizer = new PerformanceOptimizer(mockGame, performanceMonitor);
    cspChecker = new CSPComplianceChecker();
  });

  afterEach(() => {
    performanceMonitor.destroy();
    performanceOptimizer.destroy();
  });

  describe('PerformanceMonitor', () => {
    it('should initialize with correct default settings', () => {
      expect(performanceMonitor).toBeDefined();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.averageFps).toBe(0);
      expect(metrics.inputLatency).toBe(0);
    });

    it('should enable and disable monitoring correctly', () => {
      expect(mockGame.events.on).not.toHaveBeenCalled();
      
      performanceMonitor.enable();
      expect(mockGame.events.on).toHaveBeenCalledWith('step', expect.any(Function), performanceMonitor);
      
      performanceMonitor.disable();
      expect(mockGame.events.off).toHaveBeenCalledWith('step', expect.any(Function), performanceMonitor);
    });

    it('should track FPS correctly', () => {
      performanceMonitor.enable();
      
      // Simulate frame updates with proper sequence
      mockPerformance.now.mockReturnValueOnce(1000); // First call
      const stepCallback = mockGame.events.on.mock.calls.find(call => call[0] === 'step')[1];
      stepCallback(); // First frame - initializes lastFrameTime
      
      mockPerformance.now.mockReturnValueOnce(1016.67); // Second call - 60 FPS
      stepCallback(); // Second frame - calculates FPS
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeCloseTo(60, 0);
    });

    it('should record input latency', () => {
      performanceMonitor.enable();
      
      // Simulate input start
      mockPerformance.now.mockReturnValueOnce(1000);
      const inputCallback = mockGame.input.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      inputCallback();
      
      // Simulate input processing completion
      mockPerformance.now.mockReturnValueOnce(1010); // 10ms latency
      performanceMonitor.recordInputProcessed();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.inputLatency).toBe(10);
    });

    it('should detect performance issues', () => {
      performanceMonitor.enable();
      
      // Simulate low FPS with proper sequence
      mockPerformance.now.mockReturnValueOnce(1000);
      const stepCallback = mockGame.events.on.mock.calls.find(call => call[0] === 'step')[1];
      stepCallback(); // Initialize
      
      mockPerformance.now.mockReturnValueOnce(1100); // 10 FPS
      stepCallback(); // Calculate low FPS
      
      expect(performanceMonitor.isPerformanceGood()).toBe(false);
    });

    it('should get object count from scenes', () => {
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.objectCount).toBe(40); // 25 + 15 from mock scenes
    });
  });

  describe('PerformanceOptimizer', () => {
    it('should initialize with high quality settings by default', () => {
      const settings = performanceOptimizer.getCurrentSettings();
      expect(settings.maxObjects).toBe(50);
      expect(settings.particleQuality).toBe('high');
      expect(settings.effectsEnabled).toBe(true);
    });

    it('should auto-detect settings based on device capabilities', () => {
      performanceOptimizer.autoDetectSettings();
      
      const settings = performanceOptimizer.getCurrentSettings();
      // Should use high quality for desktop
      expect(settings.maxObjects).toBe(50);
      expect(settings.particleQuality).toBe('high');
    });

    it('should detect mobile devices and use low-end settings', () => {
      // Mock mobile user agent
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
      });
      
      const recommended = performanceOptimizer.getRecommendedSettings();
      expect(recommended.maxObjects).toBe(25);
      expect(recommended.particleQuality).toBe('low');
    });

    it('should start and stop optimization correctly', () => {
      performanceOptimizer.startOptimization();
      expect(window.setInterval).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      performanceOptimizer.stopOptimization();
      expect(window.clearInterval).toHaveBeenCalledWith(123);
    });

    it('should notify scenes about optimization changes', () => {
      performanceOptimizer.setSettings({ maxObjects: 30 });
      
      mockGame.scene.scenes.forEach(scene => {
        expect(scene.events.emit).toHaveBeenCalledWith('performance_optimization', {
          event: 'settings_update',
          data: expect.objectContaining({ maxObjects: 30 }),
        });
      });
    });

    it('should generate optimization report', () => {
      const report = performanceOptimizer.getOptimizationReport();
      
      expect(report).toHaveProperty('currentSettings');
      expect(report).toHaveProperty('performanceMetrics');
      expect(report).toHaveProperty('recommendations');
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('CSPComplianceChecker', () => {
    beforeEach(() => {
      // Mock DOM elements
      Object.defineProperty(global, 'document', {
        value: {
          querySelectorAll: vi.fn().mockReturnValue([]),
          styleSheets: [],
        },
        writable: true,
      });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
    });

    it('should initialize correctly', () => {
      expect(cspChecker).toBeDefined();
    });

    it('should check compliance and return report', async () => {
      const report = await cspChecker.checkCompliance();
      
      expect(report).toHaveProperty('compliant');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.issues)).toBe(true);
    });

    it('should detect external resources', () => {
      const isExternal = (cspChecker as any).isExternalResource('https://fonts.googleapis.com/css');
      expect(isExternal).toBe(true);
      
      const isLocal = (cspChecker as any).isExternalResource('./assets/font.woff2');
      expect(isLocal).toBe(false);
    });

    it('should validate required assets', async () => {
      // Mock successful asset loading
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const report = await cspChecker.checkCompliance();
      expect(report.summary.missingAssets).toBe(0);
    });

    it('should detect missing assets', async () => {
      // Mock failed asset loading
      global.fetch = vi.fn().mockRejectedValue(new Error('Not found'));
      
      const report = await cspChecker.checkCompliance();
      expect(report.summary.missingAssets).toBeGreaterThan(0);
      expect(report.compliant).toBe(false);
    });

    it('should generate readable report', async () => {
      const report = await cspChecker.checkCompliance();
      const reportText = cspChecker.generateReport(report);
      
      expect(reportText).toContain('CSP Compliance Report');
      expect(reportText).toContain('Status:');
      expect(reportText).toContain('Summary:');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate performance monitoring with optimization', () => {
      performanceMonitor.enable();
      performanceOptimizer.startOptimization();
      
      // Simulate low performance with proper sequence
      mockPerformance.now.mockReturnValueOnce(1000);
      const stepCallback = mockGame.events.on.mock.calls.find(call => call[0] === 'step')[1];
      stepCallback(); // Initialize
      
      mockPerformance.now.mockReturnValueOnce(1200); // 5 FPS
      stepCallback(); // Calculate low FPS
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeLessThan(30);
      
      // Performance optimizer should detect this and adjust settings
      const status = performanceMonitor.getPerformanceStatus();
      expect(status.status).toBe('poor');
      expect(status.issues.length).toBeGreaterThan(0);
    });

    it('should handle performance optimization events in game scenes', () => {
      const mockScene = mockGame.scene.scenes[0];
      
      performanceOptimizer.setSettings({ maxObjects: 20, effectsEnabled: false });
      
      expect(mockScene.events.emit).toHaveBeenCalledWith('performance_optimization', {
        event: 'settings_update',
        data: expect.objectContaining({
          maxObjects: 20,
          effectsEnabled: false,
        }),
      });
    });

    it('should provide comprehensive performance metrics', () => {
      performanceMonitor.enable();
      
      const metrics = performanceMonitor.getMetrics();
      
      // Verify all required metrics are present
      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('averageFps');
      expect(metrics).toHaveProperty('frameTime');
      expect(metrics).toHaveProperty('inputLatency');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(metrics).toHaveProperty('objectCount');
      
      // Verify memory usage calculation
      expect(metrics.memoryUsage).toBeCloseTo(50, 0); // 50MB from mock
    });
  });

  describe('Performance Thresholds', () => {
    it('should meet 60 FPS target requirement', () => {
      performanceMonitor.enable();
      
      // Simulate good performance (60 FPS) with proper sequence
      mockPerformance.now.mockReturnValueOnce(1000);
      const stepCallback = mockGame.events.on.mock.calls.find(call => call[0] === 'step')[1];
      stepCallback(); // Initialize
      
      mockPerformance.now.mockReturnValueOnce(1016.67); // 60 FPS
      stepCallback(); // Calculate FPS
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeGreaterThanOrEqual(55); // Allow 10% tolerance
    });

    it('should meet 16ms input response requirement', () => {
      performanceMonitor.enable();
      
      // Simulate fast input response (10ms)
      mockPerformance.now.mockReturnValueOnce(1000);
      const inputCallback = mockGame.input.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      inputCallback();
      
      mockPerformance.now.mockReturnValueOnce(1010); // 10ms latency
      performanceMonitor.recordInputProcessed();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.inputLatency).toBeLessThanOrEqual(16);
    });

    it('should detect when performance falls below thresholds', () => {
      performanceMonitor.enable();
      
      // Simulate poor performance with proper sequence
      mockPerformance.now.mockReturnValueOnce(1000);
      const stepCallback = mockGame.events.on.mock.calls.find(call => call[0] === 'step')[1];
      stepCallback(); // Initialize
      
      mockPerformance.now.mockReturnValueOnce(1100); // 10 FPS
      stepCallback(); // Calculate low FPS
      
      // Simulate high input latency
      mockPerformance.now.mockReturnValueOnce(1100);
      const inputCallback = mockGame.input.on.mock.calls.find(call => call[0] === 'pointerdown')[1];
      inputCallback();
      
      mockPerformance.now.mockReturnValueOnce(1150); // 50ms latency
      performanceMonitor.recordInputProcessed();
      
      expect(performanceMonitor.isPerformanceGood()).toBe(false);
      
      const status = performanceMonitor.getPerformanceStatus();
      expect(status.status).toBe('poor');
      expect(status.issues.some(issue => issue.includes('FPS'))).toBe(true);
      expect(status.issues.some(issue => issue.includes('latency'))).toBe(true);
    });
  });
});
