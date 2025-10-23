/**
 * Performance Optimizer for Color Dot Rush
 * Automatically adjusts game settings based on performance metrics
 * Ensures consistent 60 FPS performance across different devices
 */

import { PerformanceMonitor } from './PerformanceMonitor';

export interface OptimizationSettings {
  maxObjects: number;
  particleQuality: 'high' | 'medium' | 'low';
  effectsEnabled: boolean;
  antialiasing: boolean;
  shadowsEnabled: boolean;
  targetFPS: number;
  motionEffectsQuality: 'high' | 'medium' | 'low';
  reducedMotion: boolean;
}

export class PerformanceOptimizer {
  private performanceMonitor: PerformanceMonitor;
  private game: Phaser.Game;
  private currentSettings: OptimizationSettings;
  private optimizationInterval: number = 0;
  private isOptimizing: boolean = false;
  
  // Performance thresholds
  private readonly LOW_FPS_THRESHOLD = 45; // Below this, start optimizing
  private readonly GOOD_FPS_THRESHOLD = 55; // Above this, can increase quality
  private readonly CRITICAL_FPS_THRESHOLD = 30; // Emergency optimizations
  
  // Default settings for different performance levels
  private readonly HIGH_QUALITY_SETTINGS: OptimizationSettings = {
    maxObjects: 50,
    particleQuality: 'high',
    effectsEnabled: true,
    antialiasing: true,
    shadowsEnabled: true,
    targetFPS: 60,
    motionEffectsQuality: 'high',
    reducedMotion: false,
  };
  
  // Medium quality settings for future use
  // private readonly MEDIUM_QUALITY_SETTINGS: OptimizationSettings = {
  //   maxObjects: 35,
  //   particleQuality: 'medium',
  //   effectsEnabled: true,
  //   antialiasing: true,
  //   shadowsEnabled: false,
  //   targetFPS: 60,
  // };
  
  private readonly LOW_QUALITY_SETTINGS: OptimizationSettings = {
    maxObjects: 25,
    particleQuality: 'low',
    effectsEnabled: false,
    antialiasing: false,
    shadowsEnabled: false,
    targetFPS: 60,
    motionEffectsQuality: 'low',
    reducedMotion: true,
  };

  constructor(game: Phaser.Game, performanceMonitor: PerformanceMonitor) {
    this.game = game;
    this.performanceMonitor = performanceMonitor;
    this.currentSettings = { ...this.HIGH_QUALITY_SETTINGS };
  }

  /**
   * Start automatic performance optimization
   */
  public startOptimization(): void {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    
    // Check performance every 5 seconds
    this.optimizationInterval = window.setInterval(() => {
      this.checkAndOptimize();
    }, 5000);
    
    console.log('Performance optimization started');
  }

  /**
   * Stop automatic performance optimization
   */
  public stopOptimization(): void {
    if (!this.isOptimizing) return;
    
    this.isOptimizing = false;
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = 0;
    }
    
    console.log('Performance optimization stopped');
  }

  /**
   * Check current performance and optimize if needed
   */
  private checkAndOptimize(): void {
    const metrics = this.performanceMonitor.getMetrics();
    const currentFPS = metrics.averageFps;
    
    console.log(`Performance check: ${currentFPS.toFixed(1)} FPS (target: ${this.currentSettings.targetFPS})`);
    
    // Emergency optimizations for very low FPS
    if (currentFPS < this.CRITICAL_FPS_THRESHOLD) {
      this.applyEmergencyOptimizations();
      return;
    }
    
    // Apply optimizations based on FPS
    if (currentFPS < this.LOW_FPS_THRESHOLD) {
      this.decreaseQuality();
    } else if (currentFPS > this.GOOD_FPS_THRESHOLD) {
      this.increaseQuality();
    }
    
    // Apply current settings to the game
    this.applySettings();
  }

  /**
   * Apply emergency optimizations for critically low FPS
   */
  private applyEmergencyOptimizations(): void {
    console.warn('Applying emergency performance optimizations');
    
    this.currentSettings = { ...this.LOW_QUALITY_SETTINGS };
    this.currentSettings.maxObjects = Math.min(this.currentSettings.maxObjects, 15);
    this.currentSettings.effectsEnabled = false;
    this.currentSettings.particleQuality = 'low';
    
    this.applySettings();
    
    // Notify game scenes to reduce object counts immediately
    this.notifyScenes('emergency_optimization', this.currentSettings);
  }

  /**
   * Decrease quality settings to improve performance
   */
  private decreaseQuality(): void {
    let changed = false;
    
    // Step down quality levels
    if (this.currentSettings.particleQuality === 'high') {
      this.currentSettings.particleQuality = 'medium';
      changed = true;
    } else if (this.currentSettings.particleQuality === 'medium') {
      this.currentSettings.particleQuality = 'low';
      changed = true;
    }
    
    // Reduce max objects
    if (this.currentSettings.maxObjects > 20) {
      this.currentSettings.maxObjects = Math.max(20, this.currentSettings.maxObjects - 5);
      changed = true;
    }
    
    // Disable effects if still struggling
    if (this.currentSettings.effectsEnabled && this.currentSettings.maxObjects <= 25) {
      this.currentSettings.effectsEnabled = false;
      changed = true;
    }
    
    // Disable antialiasing as last resort
    if (this.currentSettings.antialiasing && !this.currentSettings.effectsEnabled) {
      this.currentSettings.antialiasing = false;
      changed = true;
    }
    
    if (changed) {
      console.log('Decreased quality settings for better performance:', this.currentSettings);
    }
  }

  /**
   * Increase quality settings when performance allows
   */
  private increaseQuality(): void {
    let changed = false;
    
    // Only increase quality if we have headroom (FPS well above target)
    const metrics = this.performanceMonitor.getMetrics();
    if (metrics.averageFps < this.GOOD_FPS_THRESHOLD + 5) {
      return; // Not enough headroom
    }
    
    // Step up quality levels gradually
    if (!this.currentSettings.antialiasing) {
      this.currentSettings.antialiasing = true;
      changed = true;
    } else if (!this.currentSettings.effectsEnabled) {
      this.currentSettings.effectsEnabled = true;
      changed = true;
    } else if (this.currentSettings.maxObjects < 50) {
      this.currentSettings.maxObjects = Math.min(50, this.currentSettings.maxObjects + 5);
      changed = true;
    } else if (this.currentSettings.particleQuality === 'low') {
      this.currentSettings.particleQuality = 'medium';
      changed = true;
    } else if (this.currentSettings.particleQuality === 'medium') {
      this.currentSettings.particleQuality = 'high';
      changed = true;
    }
    
    if (changed) {
      console.log('Increased quality settings due to good performance:', this.currentSettings);
    }
  }

  /**
   * Apply current settings to the game
   */
  private applySettings(): void {
    // Apply renderer settings
    if (this.game.renderer) {
      // Note: Some settings may require game restart to take effect
      // We'll focus on settings that can be changed at runtime
    }
    
    // Notify all scenes about the new settings
    this.notifyScenes('settings_update', this.currentSettings);
  }

  /**
   * Notify all game scenes about optimization changes
   */
  private notifyScenes(event: string, data: any): void {
    this.game.scene.scenes.forEach(scene => {
      if (scene.events) {
        scene.events.emit('performance_optimization', { event, data });
      }
    });
  }

  /**
   * Get current optimization settings
   */
  public getCurrentSettings(): OptimizationSettings {
    return { ...this.currentSettings };
  }

  /**
   * Manually set optimization settings
   */
  public setSettings(settings: Partial<OptimizationSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...settings };
    this.applySettings();
    console.log('Manual optimization settings applied:', this.currentSettings);
  }

  /**
   * Reset to default high quality settings
   */
  public resetToHighQuality(): void {
    this.currentSettings = { ...this.HIGH_QUALITY_SETTINGS };
    this.applySettings();
    console.log('Reset to high quality settings');
  }

  /**
   * Get recommended settings based on device capabilities
   */
  public getRecommendedSettings(): OptimizationSettings {
    // Detect device capabilities
    const canvas = this.game.canvas;
    const gl = canvas?.getContext('webgl') || canvas?.getContext('experimental-webgl');
    
    // Check for mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check for low-end device indicators
    const isLowEnd = (
      isMobile ||
      navigator.hardwareConcurrency <= 2 ||
      (gl && (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE) < 4096)
    );
    
    if (isLowEnd) {
      return { ...this.LOW_QUALITY_SETTINGS };
    } else {
      return { ...this.HIGH_QUALITY_SETTINGS };
    }
  }

  /**
   * Auto-detect and apply optimal settings
   */
  public autoDetectSettings(): void {
    const recommended = this.getRecommendedSettings();
    this.setSettings(recommended);
    console.log('Auto-detected optimal settings:', recommended);
  }

  /**
   * Get performance optimization report
   */
  public getOptimizationReport(): {
    currentSettings: OptimizationSettings;
    performanceMetrics: any;
    recommendations: string[];
  } {
    const metrics = this.performanceMonitor.getMetrics();
    const recommendations: string[] = [];
    
    if (metrics.fps < this.LOW_FPS_THRESHOLD) {
      recommendations.push('Consider reducing visual effects');
      recommendations.push('Lower particle quality');
      recommendations.push('Reduce maximum object count');
    }
    
    if (metrics.inputLatency > 16) {
      recommendations.push('Optimize input handling');
      recommendations.push('Reduce frame complexity');
    }
    
    if (metrics.memoryUsage > 100) {
      recommendations.push('Check for memory leaks');
      recommendations.push('Optimize object pooling');
    }
    
    return {
      currentSettings: this.getCurrentSettings(),
      performanceMetrics: metrics,
      recommendations,
    };
  }

  /**
   * Destroy the optimizer and clean up
   */
  public destroy(): void {
    this.stopOptimization();
  }
}
