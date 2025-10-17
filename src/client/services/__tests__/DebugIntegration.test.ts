/**
 * @vitest-environment jsdom
 */
import { DebugService, ProductionDebugService } from '../DebugService';
import { DifficultyManager } from '../DifficultyManager';
import { DEFAULT_DIFFICULTY_PARAMS } from '../../../shared/types/debug';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';

describe('Debug System Integration', () => {
  let debugService: DebugService;
  let difficultyManager: DifficultyManager;

  beforeEach(() => {
    // Reset singleton instance
    (DebugService as any).instance = null;
    debugService = new (DebugService as any)();
    difficultyManager = new DifficultyManager();
  });

  afterEach(() => {
    debugService.destroy();
  });

  describe('Debug Service and Difficulty Manager Integration', () => {
    it('should update difficulty manager when debug parameters change', () => {
      // Setup integration like in Game scene
      debugService.onDifficultyChange((params) => {
        difficultyManager.updateParams(params);
      });

      // Update parameters through debug service
      const newParams = { baseSpeed: 150, growthRate: 1.05 };
      debugService.updateDifficultyParams(newParams);

      // Verify difficulty manager was updated
      const updatedParams = difficultyManager.getParams();
      expect(updatedParams.baseSpeed).toBe(150);
      expect(updatedParams.growthRate).toBe(1.05);
    });

    it('should maintain correct difficulty calculations with debug parameters', () => {
      // Setup integration
      debugService.onDifficultyChange((params) => {
        difficultyManager.updateParams(params);
      });

      // Test with modified parameters
      debugService.updateDifficultyParams({ baseSpeed: 200, growthRate: 1.06 });

      // Test difficulty calculations
      const speed30s = difficultyManager.calculateSpeed(30);
      const size30s = difficultyManager.calculateSize(30);

      // Verify calculations use updated parameters
      const expectedSpeed = 200 * Math.pow(1.06, 30);
      const expectedSize = DEFAULT_DIFFICULTY_PARAMS.baseSize * Math.pow(DEFAULT_DIFFICULTY_PARAMS.shrinkRate, 30);

      expect(speed30s).toBeCloseTo(expectedSpeed, 2);
      expect(size30s).toBeCloseTo(expectedSize, 2);
    });

    it('should validate difficulty curve with debug parameters', () => {
      // Setup integration
      debugService.onDifficultyChange((params) => {
        difficultyManager.updateParams(params);
      });

      // Test with reasonable parameters
      debugService.updateDifficultyParams({ 
        baseSpeed: 100, 
        growthRate: 1.04,
        baseSize: 80,
        shrinkRate: 0.98
      });

      // Should be valid for 90 second target
      expect(difficultyManager.validateDifficultyCurve(90)).toBe(true);

      // Test with extreme parameters that would be unplayable
      debugService.updateDifficultyParams({ 
        baseSpeed: 100, 
        growthRate: 1.20, // Very high growth rate
      });

      // Should be invalid for 90 second target
      expect(difficultyManager.validateDifficultyCurve(90)).toBe(false);
    });
  });

  describe('Debug Panel Functionality', () => {
    it('should handle all debug operations without errors', () => {
      expect(() => {
        // Test all debug panel operations
        debugService.showDebugPanel();
        debugService.updateDifficultyParams({ baseSpeed: 120 });
        debugService.visualizeHitboxes(true);
        debugService.updateDebugConfig({ showFPS: true });
        debugService.updateElapsedTime(30000); // 30 seconds
        debugService.hideDebugPanel();
        debugService.toggleDebugPanel();
      }).not.toThrow();
    });

    it('should handle real-time elapsed time updates', () => {
      expect(() => {
        // Test elapsed time updates for real-time calculations
        debugService.updateElapsedTime(0);
        debugService.updateElapsedTime(15000); // 15 seconds
        debugService.updateElapsedTime(60000); // 60 seconds
        debugService.updateElapsedTime(90000); // 90 seconds
      }).not.toThrow();
    });

    it('should maintain state consistency', () => {
      // Test parameter updates
      debugService.updateDifficultyParams({ baseSpeed: 150 });
      expect(debugService.getDifficultyParams().baseSpeed).toBe(150);

      // Test hitbox visualization
      debugService.visualizeHitboxes(true);
      expect(debugService.isHitboxVisualizationEnabled()).toBe(true);

      // Test debug config
      debugService.updateDebugConfig({ showFPS: true, showObjectCount: true });
      const config = debugService.getDebugConfig();
      expect(config.showFPS).toBe(true);
      expect(config.showObjectCount).toBe(true);
    });
  });

  describe('Production Environment Behavior', () => {
    it('should handle production debug service gracefully', () => {
      const prodDebugService = new ProductionDebugService();
      
      expect(() => {
        // All operations should be no-ops
        prodDebugService.showDebugPanel();
        prodDebugService.updateDifficultyParams({ baseSpeed: 200 });
        prodDebugService.visualizeHitboxes(true);
        prodDebugService.onDifficultyChange(() => {});
        prodDebugService.onHitboxToggle(() => {});
      }).not.toThrow();

      // Should always return defaults
      expect(prodDebugService.isEnabled()).toBe(false);
      expect(prodDebugService.getDifficultyParams()).toEqual(DEFAULT_DIFFICULTY_PARAMS);
      expect(prodDebugService.isHitboxVisualizationEnabled()).toBe(false);
    });
  });
});
