import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../DifficultyManager';
import { DEFAULT_DIFFICULTY_PARAMS } from '../../../shared/types/debug';

describe('DifficultyManager PRD Verification', () => {
  let manager: DifficultyManager;

  beforeEach(() => {
    manager = new DifficultyManager();
  });

  it('should use optimized parameter values for 3.5+ minute gameplay', () => {
    const params = manager.getParams();
    
    expect(params.baseSpeed).toBe(100); // px/sec
    expect(params.growthRate).toBe(1.023); // Optimized for 3.5+ minute target
    expect(params.baseSize).toBe(100); // px (increased by 150%)
    expect(params.shrinkRate).toBe(0.9895); // Optimized for 3.5+ minute target
  });

  it('should implement speed formula: speed = baseSpeed * growthRate^t', () => {
    // Test at various time points with optimized parameters
    expect(manager.calculateSpeed(0)).toBe(100); // At t=0: 100 * 1.023^0 = 100
    
    const speed30 = manager.calculateSpeed(30);
    const expected30 = 100 * Math.pow(1.023, 30);
    expect(speed30).toBeCloseTo(expected30, 2);
    
    const speed60 = manager.calculateSpeed(60);
    const expected60 = 100 * Math.pow(1.023, 60);
    expect(speed60).toBeCloseTo(expected60, 2);
  });

  it('should implement size formula: size = baseSize * shrinkRate^t', () => {
    // Test at various time points with optimized parameters
    expect(manager.calculateSize(0)).toBe(100); // At t=0: 100 * 0.9895^0 = 100
    
    const size30 = manager.calculateSize(30);
    const expected30 = 100 * Math.pow(0.9895, 30);
    expect(size30).toBeCloseTo(expected30, 2);
    
    const size60 = manager.calculateSize(60);
    const expected60 = 100 * Math.pow(0.9895, 60);
    expect(size60).toBeCloseTo(expected60, 2);
  });

  it('should implement dot count increase: +1 dot every 15 seconds', () => {
    expect(manager.calculateDotCount(0)).toBe(1);   // 0-14s: 1 dot
    expect(manager.calculateDotCount(14)).toBe(1);  // 0-14s: 1 dot
    expect(manager.calculateDotCount(15)).toBe(2);  // 15-29s: 2 dots
    expect(manager.calculateDotCount(29)).toBe(2);  // 15-29s: 2 dots
    expect(manager.calculateDotCount(30)).toBe(3);  // 30-44s: 3 dots
    expect(manager.calculateDotCount(45)).toBe(4);  // 45-59s: 4 dots
    expect(manager.calculateDotCount(60)).toBe(5);  // 60-74s: 5 dots
    expect(manager.calculateDotCount(75)).toBe(6);  // 75-89s: 6 dots
    expect(manager.calculateDotCount(90)).toBe(7);  // 90s+: 7 dots
    expect(manager.calculateDotCount(210)).toBe(15); // 210s+: 15 dots
  });

  it('should ensure 3.5+ minute average session length target', () => {
    // The validateDifficultyCurve method should return true for 210 seconds (3.5 minutes)
    expect(manager.validateDifficultyCurve(210)).toBe(true);
    
    // Check that difficulty at 210 seconds is still playable
    const speed210 = manager.calculateSpeed(210);
    const size210 = manager.calculateSize(210);
    
    // These values should be challenging but not impossible
    expect(speed210).toBeLessThan(5000); // Max playable speed
    expect(size210).toBeGreaterThan(10); // Min playable size
  });

  it('should provide comprehensive difficulty metrics', () => {
    const metrics = manager.getDifficultyMetrics(45);
    
    expect(metrics).toHaveProperty('speed');
    expect(metrics).toHaveProperty('size');
    expect(metrics).toHaveProperty('dotCount');
    expect(metrics).toHaveProperty('elapsedTime');
    expect(metrics).toHaveProperty('params');
    
    expect(metrics.elapsedTime).toBe(45);
    expect(metrics.dotCount).toBe(4); // 45s = 4 dots
  });

  it('should allow parameter updates for debug tuning', () => {
    const originalParams = manager.getParams();
    
    manager.updateParams({ baseSpeed: 150, growthRate: 1.05 });
    
    const updatedParams = manager.getParams();
    expect(updatedParams.baseSpeed).toBe(150);
    expect(updatedParams.growthRate).toBe(1.05);
    expect(updatedParams.baseSize).toBe(originalParams.baseSize); // Unchanged
    expect(updatedParams.shrinkRate).toBe(originalParams.shrinkRate); // Unchanged
  });

  it('should reset to default parameters', () => {
    manager.updateParams({ baseSpeed: 200 });
    manager.resetToDefaults();
    
    const params = manager.getParams();
    expect(params).toEqual(DEFAULT_DIFFICULTY_PARAMS);
  });

  it('should calculate realistic difficulty progression', () => {
    // Test progression at key intervals
    const progressionTests = [
      { time: 0, expectedDots: 1 },
      { time: 15, expectedDots: 2 },
      { time: 30, expectedDots: 3 },
      { time: 45, expectedDots: 4 },
      { time: 60, expectedDots: 5 },
      { time: 75, expectedDots: 6 },
      { time: 90, expectedDots: 7 },
      { time: 120, expectedDots: 9 },
      { time: 150, expectedDots: 11 },
      { time: 180, expectedDots: 13 },
      { time: 210, expectedDots: 15 },
    ];

    progressionTests.forEach(({ time, expectedDots }) => {
      const metrics = manager.getDifficultyMetrics(time);
      
      expect(metrics.dotCount).toBe(expectedDots);
      expect(metrics.speed).toBeGreaterThan(0);
      expect(metrics.size).toBeGreaterThan(0);
      
      // Speed should increase over time
      if (time > 0) {
        expect(metrics.speed).toBeGreaterThan(100);
      }
      
      // Size should decrease over time
      if (time > 0) {
        expect(metrics.size).toBeLessThan(100);
      }
    });
  });

  it('should calculate responsive size based on screen dimensions', () => {
    // Test responsive sizing with different screen sizes
    const elapsedTime = 30; // 30 seconds
    const baseSize = manager.calculateSize(elapsedTime);

    // Test different screen sizes
    const smallScreen = manager.calculateResponsiveSize(elapsedTime, 400, 600); // Mobile portrait
    const mediumScreen = manager.calculateResponsiveSize(elapsedTime, 800, 600); // Reference size
    const largeScreen = manager.calculateResponsiveSize(elapsedTime, 1200, 800); // Desktop

    // Verify responsive scaling
    expect(smallScreen).toBeLessThan(mediumScreen);
    expect(largeScreen).toBeGreaterThan(mediumScreen);
    
    // Medium screen should be reasonably close to base size (within 30%)
    const sizeDifference = Math.abs(mediumScreen - baseSize) / baseSize;
    expect(sizeDifference).toBeLessThan(0.3);

    // Verify scale factors are within reasonable bounds
    expect(smallScreen).toBeGreaterThan(baseSize * 0.4); // Allow for rounding
    expect(largeScreen).toBeLessThanOrEqual(baseSize * 2.0);

    console.log('Responsive sizes:', { small: smallScreen, medium: mediumScreen, large: largeScreen, base: baseSize });
  });
});
