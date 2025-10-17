import { describe, it, expect, beforeEach } from 'vitest';
import { DifficultyManager } from '../DifficultyManager';
import { DEFAULT_DIFFICULTY_PARAMS } from '../../../shared/types/debug';

describe('DifficultyManager PRD Verification', () => {
  let manager: DifficultyManager;

  beforeEach(() => {
    manager = new DifficultyManager();
  });

  it('should use exact PRD parameter values', () => {
    const params = manager.getParams();
    
    expect(params.baseSpeed).toBe(100); // px/sec
    expect(params.growthRate).toBe(1.04);
    expect(params.baseSize).toBe(80); // px
    expect(params.shrinkRate).toBe(0.98);
  });

  it('should implement speed formula: speed = baseSpeed * growthRate^t', () => {
    // Test at various time points
    expect(manager.calculateSpeed(0)).toBe(100); // At t=0: 100 * 1.04^0 = 100
    
    const speed30 = manager.calculateSpeed(30);
    const expected30 = 100 * Math.pow(1.04, 30);
    expect(speed30).toBeCloseTo(expected30, 2);
    
    const speed60 = manager.calculateSpeed(60);
    const expected60 = 100 * Math.pow(1.04, 60);
    expect(speed60).toBeCloseTo(expected60, 2);
  });

  it('should implement size formula: size = baseSize * shrinkRate^t', () => {
    // Test at various time points
    expect(manager.calculateSize(0)).toBe(80); // At t=0: 80 * 0.98^0 = 80
    
    const size30 = manager.calculateSize(30);
    const expected30 = 80 * Math.pow(0.98, 30);
    expect(size30).toBeCloseTo(expected30, 2);
    
    const size60 = manager.calculateSize(60);
    const expected60 = 80 * Math.pow(0.98, 60);
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
  });

  it('should ensure 90+ second average session length target', () => {
    // The validateDifficultyCurve method should return true for 90 seconds
    expect(manager.validateDifficultyCurve(90)).toBe(true);
    
    // Check that difficulty at 90 seconds is still playable
    const speed90 = manager.calculateSpeed(90);
    const size90 = manager.calculateSize(90);
    
    // These values should be challenging but not impossible
    expect(speed90).toBeLessThan(5000); // Max playable speed
    expect(size90).toBeGreaterThan(10); // Min playable size
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
        expect(metrics.size).toBeLessThan(80);
      }
    });
  });
});
