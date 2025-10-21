/**
 * Performance Monitor for Color Dot Rush
 * Monitors FPS, memory usage, and input response times
 * Ensures 60 FPS performance and 16ms input response requirements
 */

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  frameTime: number;
  inputLatency: number;
  memoryUsage: number;
  objectCount: number;
  renderTime: number;
  updateTime: number;
}

export class PerformanceMonitor {
  private game: Phaser.Game;
  private isEnabled: boolean = false;
  
  // FPS tracking
  private fpsHistory: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  
  // Input latency tracking
  private inputStartTime: number = 0;
  private inputLatencies: number[] = [];
  
  // Memory tracking
  private memoryCheckInterval: number = 0;
  
  // Performance thresholds
  private readonly TARGET_FPS = 60;
  private readonly TARGET_FRAME_TIME = 16.67; // 60 FPS = 16.67ms per frame
  private readonly TARGET_INPUT_LATENCY = 16; // 16ms max input response
  private readonly FPS_HISTORY_SIZE = 60; // Track last 60 frames
  private readonly LATENCY_HISTORY_SIZE = 30; // Track last 30 inputs
  
  // Performance warnings
  private lowFpsWarningCount = 0;
  private highLatencyWarningCount = 0;
  
  constructor(game: Phaser.Game) {
    this.game = game;
  }

  /**
   * Enable performance monitoring
   */
  public enable(): void {
    if (this.isEnabled) return;
    
    this.isEnabled = true;
    this.setupMonitoring();
    console.log('Performance monitoring enabled');
  }

  /**
   * Disable performance monitoring
   */
  public disable(): void {
    if (!this.isEnabled) return;
    
    this.isEnabled = false;
    this.cleanup();
    console.log('Performance monitoring disabled');
  }

  /**
   * Setup performance monitoring systems
   */
  private setupMonitoring(): void {
    // Setup FPS monitoring
    this.game.events.on('step', this.trackFrameRate, this);
    
    // Setup memory monitoring (check every 5 seconds)
    this.memoryCheckInterval = window.setInterval(() => {
      this.checkMemoryUsage();
    }, 5000);
    
    // Setup input latency monitoring
    this.setupInputLatencyTracking();
  }

  /**
   * Track frame rate and frame time
   */
  private trackFrameRate(): void {
    const currentTime = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime;
      const fps = 1000 / frameTime;
      
      // Add to FPS history
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }
      
      // Check for performance issues
      this.checkFrameRatePerformance(fps, frameTime);
    }
    
    this.lastFrameTime = currentTime;
    this.frameCount++;
  }

  /**
   * Check frame rate performance and warn if below target
   */
  private checkFrameRatePerformance(fps: number, frameTime: number): void {
    // Check if FPS is below target (allow 10% tolerance)
    if (fps < this.TARGET_FPS * 0.9) {
      this.lowFpsWarningCount++;
      
      // Log warning every 60 low FPS frames to avoid spam
      if (this.lowFpsWarningCount % 60 === 0) {
        console.warn(`Performance Warning: Low FPS detected - ${fps.toFixed(1)} FPS (${frameTime.toFixed(1)}ms frame time)`);
        this.suggestPerformanceOptimizations();
      }
    } else {
      // Reset warning count when performance is good
      this.lowFpsWarningCount = 0;
    }
  }

  /**
   * Setup input latency tracking
   */
  private setupInputLatencyTracking(): void {
    // Track pointer down events using scene input manager
    if (this.game.scene.scenes.length > 0) {
      const activeScene = this.game.scene.scenes[0];
      if (activeScene && activeScene.input) {
        activeScene.input.on('pointerdown', () => {
          this.inputStartTime = performance.now();
        });
      }
    }
    
    // This would be called from the game scene when input is processed
    // We'll provide a method for the game to call
  }

  /**
   * Record input processing completion (called from game scene)
   */
  public recordInputProcessed(): void {
    if (this.inputStartTime > 0) {
      const latency = performance.now() - this.inputStartTime;
      
      this.inputLatencies.push(latency);
      if (this.inputLatencies.length > this.LATENCY_HISTORY_SIZE) {
        this.inputLatencies.shift();
      }
      
      // Check for high input latency
      if (latency > this.TARGET_INPUT_LATENCY) {
        this.highLatencyWarningCount++;
        
        // Log warning every 10 high latency inputs
        if (this.highLatencyWarningCount % 10 === 0) {
          console.warn(`Performance Warning: High input latency - ${latency.toFixed(1)}ms (target: ${this.TARGET_INPUT_LATENCY}ms)`);
        }
      } else {
        this.highLatencyWarningCount = 0;
      }
      
      this.inputStartTime = 0;
    }
  }

  /**
   * Check memory usage (if available)
   */
  private checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      
      // Warn if memory usage is high (>80% of limit)
      if (usedMB > limitMB * 0.8) {
        console.warn(`Memory Warning: High memory usage - ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB (${((usedMB / limitMB) * 100).toFixed(1)}%)`);
      }
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    const currentFps = this.fpsHistory.length > 0 ? (this.fpsHistory[this.fpsHistory.length - 1] || 0) : 0;
    const averageFps = this.fpsHistory.length > 0 ? 
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length : 0;
    
    const currentFrameTime = currentFps > 0 ? 1000 / currentFps : 0;
    
    const averageInputLatency = this.inputLatencies.length > 0 ?
      this.inputLatencies.reduce((sum, latency) => sum + latency, 0) / this.inputLatencies.length : 0;
    
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    
    return {
      fps: Math.round((currentFps || 0) * 10) / 10,
      averageFps: Math.round((averageFps || 0) * 10) / 10,
      frameTime: Math.round((currentFrameTime || 0) * 100) / 100,
      inputLatency: Math.round(averageInputLatency * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 10) / 10,
      objectCount: this.getObjectCount(),
      renderTime: 0, // Would need deeper Phaser integration
      updateTime: 0, // Would need deeper Phaser integration
    };
  }

  /**
   * Get total object count from all scenes
   */
  private getObjectCount(): number {
    let totalObjects = 0;
    
    this.game.scene.scenes.forEach(scene => {
      if (scene.children) {
        totalObjects += scene.children.length;
      }
    });
    
    return totalObjects;
  }

  /**
   * Check if performance is meeting targets
   */
  public isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    
    return (
      metrics.fps >= this.TARGET_FPS * 0.9 && // Allow 10% tolerance
      metrics.inputLatency <= this.TARGET_INPUT_LATENCY &&
      metrics.frameTime <= this.TARGET_FRAME_TIME * 1.1 // Allow 10% tolerance
    );
  }

  /**
   * Get performance status summary
   */
  public getPerformanceStatus(): {
    status: 'good' | 'warning' | 'poor';
    issues: string[];
    suggestions: string[];
  } {
    const metrics = this.getMetrics();
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check FPS
    if (metrics.fps < this.TARGET_FPS * 0.8) {
      issues.push(`Low FPS: ${metrics.fps} (target: ${this.TARGET_FPS})`);
      suggestions.push('Reduce object count or visual effects');
    } else if (metrics.fps < this.TARGET_FPS * 0.9) {
      issues.push(`Slightly low FPS: ${metrics.fps} (target: ${this.TARGET_FPS})`);
    }
    
    // Check input latency
    if (metrics.inputLatency > this.TARGET_INPUT_LATENCY * 1.5) {
      issues.push(`High input latency: ${metrics.inputLatency}ms (target: ${this.TARGET_INPUT_LATENCY}ms)`);
      suggestions.push('Optimize input handling or reduce frame complexity');
    } else if (metrics.inputLatency > this.TARGET_INPUT_LATENCY) {
      issues.push(`Elevated input latency: ${metrics.inputLatency}ms (target: ${this.TARGET_INPUT_LATENCY}ms)`);
    }
    
    // Check memory usage
    if (metrics.memoryUsage > 100) {
      issues.push(`High memory usage: ${metrics.memoryUsage}MB`);
      suggestions.push('Check for memory leaks or reduce object pooling limits');
    }
    
    // Check object count
    if (metrics.objectCount > 200) {
      issues.push(`High object count: ${metrics.objectCount}`);
      suggestions.push('Increase object pooling or reduce spawn rates');
    }
    
    // Determine overall status
    let status: 'good' | 'warning' | 'poor' = 'good';
    if (issues.length > 0) {
      status = metrics.fps < this.TARGET_FPS * 0.8 || metrics.inputLatency > this.TARGET_INPUT_LATENCY * 1.5 ? 'poor' : 'warning';
    }
    
    return { status, issues, suggestions };
  }

  /**
   * Suggest performance optimizations based on current metrics
   */
  private suggestPerformanceOptimizations(): void {
    const metrics = this.getMetrics();
    const suggestions: string[] = [];
    
    if (metrics.fps < this.TARGET_FPS * 0.8) {
      suggestions.push('Consider reducing object spawn rates');
      suggestions.push('Disable non-essential visual effects');
      suggestions.push('Check for memory leaks in object pooling');
    }
    
    if (metrics.objectCount > 150) {
      suggestions.push('Reduce maximum pool sizes');
      suggestions.push('Increase object cleanup frequency');
    }
    
    if (metrics.memoryUsage > 80) {
      suggestions.push('Check for memory leaks');
      suggestions.push('Reduce texture sizes or use texture atlasing');
    }
    
    if (suggestions.length > 0) {
      console.log('Performance Optimization Suggestions:', suggestions);
    }
  }

  /**
   * Log performance summary
   */
  public logPerformanceSummary(): void {
    if (!this.isEnabled) return;
    
    const metrics = this.getMetrics();
    const status = this.getPerformanceStatus();
    
    console.log('=== Performance Summary ===');
    console.log(`Status: ${status.status.toUpperCase()}`);
    console.log(`FPS: ${metrics.fps} (avg: ${metrics.averageFps})`);
    console.log(`Frame Time: ${metrics.frameTime}ms (target: ${this.TARGET_FRAME_TIME}ms)`);
    console.log(`Input Latency: ${metrics.inputLatency}ms (target: ${this.TARGET_INPUT_LATENCY}ms)`);
    console.log(`Memory Usage: ${metrics.memoryUsage}MB`);
    console.log(`Object Count: ${metrics.objectCount}`);
    
    if (status.issues.length > 0) {
      console.log('Issues:', status.issues);
    }
    
    if (status.suggestions.length > 0) {
      console.log('Suggestions:', status.suggestions);
    }
    
    console.log('========================');
  }

  /**
   * Cleanup monitoring resources
   */
  private cleanup(): void {
    this.game.events.off('step', this.trackFrameRate, this);
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = 0;
    }
    
    // Clear history arrays
    this.fpsHistory = [];
    this.inputLatencies = [];
  }

  /**
   * Destroy the performance monitor
   */
  public destroy(): void {
    this.disable();
  }
}
