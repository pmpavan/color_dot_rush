/**
 * Neon Motion Effects System for Color Dot Rush
 * Provides enhanced motion effects and animations for the Neon Pulse theme
 * Includes accessibility options and performance optimization
 */

import Phaser from 'phaser';

export interface MotionEffectConfig {
  duration: number;
  ease: string;
  yoyo: boolean;
  repeat: number;
  intensity: number;
  enabled: boolean;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  animationSpeed: 'normal' | 'slow' | 'fast';
}

export class NeonMotionEffects {
  private scene: Phaser.Scene;
  private activeTweens: Map<string, Phaser.Tweens.Tween> = new Map();
  private accessibilitySettings: AccessibilitySettings;
  private performanceMode: 'high' | 'medium' | 'low' = 'high';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.accessibilitySettings = {
      reducedMotion: false,
      highContrast: false,
      animationSpeed: 'normal'
    };
  }

  /**
   * Set accessibility settings for motion effects
   */
  public setAccessibilitySettings(settings: Partial<AccessibilitySettings>): void {
    this.accessibilitySettings = { ...this.accessibilitySettings, ...settings };
    this.updateActiveAnimations();
  }

  /**
   * Set performance mode for animations
   */
  public setPerformanceMode(mode: 'high' | 'medium' | 'low'): void {
    this.performanceMode = mode;
    this.updateActiveAnimations();
  }

  /**
   * Create subtle pulsing effect for active elements
   */
  public createSubtlePulse(
    target: any,
    config: Partial<MotionEffectConfig> = {}
  ): string {
    const tweenId = `pulse_${Date.now()}_${Math.random()}`;
    
    const defaultConfig: MotionEffectConfig = {
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      intensity: 0.05, // 5% scale variation
      enabled: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    if (!finalConfig.enabled || this.accessibilitySettings.reducedMotion) {
      return tweenId;
    }

    const adjustedDuration = this.adjustDurationForAccessibility(finalConfig.duration);
    const adjustedIntensity = this.adjustIntensityForPerformance(finalConfig.intensity);

    const tween = this.scene.tweens.add({
      targets: target,
      scaleX: 1 + adjustedIntensity,
      scaleY: 1 + adjustedIntensity,
      duration: adjustedDuration,
      ease: finalConfig.ease,
      yoyo: finalConfig.yoyo,
      repeat: finalConfig.repeat
    });

    this.activeTweens.set(tweenId, tween);
    return tweenId;
  }

  /**
   * Create smooth transition between states
   */
  public createSmoothTransition(
    target: any,
    properties: any,
    config: Partial<MotionEffectConfig> = {}
  ): string {
    const tweenId = `transition_${Date.now()}_${Math.random()}`;
    
    const defaultConfig: MotionEffectConfig = {
      duration: 300,
      ease: 'Power2.easeInOut',
      yoyo: false,
      repeat: 0,
      intensity: 1,
      enabled: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    if (!finalConfig.enabled || this.accessibilitySettings.reducedMotion) {
      // Apply properties immediately if motion is reduced
      Object.assign(target, properties);
      return tweenId;
    }

    const adjustedDuration = this.adjustDurationForAccessibility(finalConfig.duration);

    const tween = this.scene.tweens.add({
      targets: target,
      ...properties,
      duration: adjustedDuration,
      ease: finalConfig.ease,
      yoyo: finalConfig.yoyo,
      repeat: finalConfig.repeat,
      onComplete: () => {
        this.activeTweens.delete(tweenId);
      }
    });

    this.activeTweens.set(tweenId, tween);
    return tweenId;
  }

  /**
   * Create enhanced visual feedback for interactions
   */
  public createInteractionFeedback(
    target: any,
    type: 'tap' | 'hover' | 'focus' | 'success' | 'error',
    config: Partial<MotionEffectConfig> = {}
  ): string {
    const tweenId = `feedback_${type}_${Date.now()}_${Math.random()}`;
    
    let effectConfig: MotionEffectConfig;
    
    switch (type) {
      case 'tap':
        effectConfig = {
          duration: 150,
          ease: 'Back.easeOut',
          yoyo: false,
          repeat: 0,
          intensity: 0.1,
          enabled: true
        };
        break;
      case 'hover':
        effectConfig = {
          duration: 200,
          ease: 'Power2.easeOut',
          yoyo: false,
          repeat: 0,
          intensity: 0.05,
          enabled: true
        };
        break;
      case 'focus':
        effectConfig = {
          duration: 300,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          intensity: 0.03,
          enabled: true
        };
        break;
      case 'success':
        effectConfig = {
          duration: 400,
          ease: 'Elastic.easeOut',
          yoyo: false,
          repeat: 0,
          intensity: 0.15,
          enabled: true
        };
        break;
      case 'error':
        effectConfig = {
          duration: 200,
          ease: 'Bounce.easeOut',
          yoyo: true,
          repeat: 2,
          intensity: 0.08,
          enabled: true
        };
        break;
      default:
        effectConfig = {
          duration: 200,
          ease: 'Power2.easeOut',
          yoyo: false,
          repeat: 0,
          intensity: 0.05,
          enabled: true
        };
    }

    const finalConfig = { ...effectConfig, ...config };
    
    if (!finalConfig.enabled || this.accessibilitySettings.reducedMotion) {
      return tweenId;
    }

    const adjustedDuration = this.adjustDurationForAccessibility(finalConfig.duration);
    const adjustedIntensity = this.adjustIntensityForPerformance(finalConfig.intensity);

    const tween = this.scene.tweens.add({
      targets: target,
      scaleX: 1 + adjustedIntensity,
      scaleY: 1 + adjustedIntensity,
      duration: adjustedDuration,
      ease: finalConfig.ease,
      yoyo: finalConfig.yoyo,
      repeat: finalConfig.repeat,
      onComplete: () => {
        this.activeTweens.delete(tweenId);
      }
    });

    this.activeTweens.set(tweenId, tween);
    return tweenId;
  }

  /**
   * Create neon glow pulse effect
   */
  public createNeonGlowPulse(
    target: any,
    glowProperty: string = 'alpha',
    config: Partial<MotionEffectConfig> = {}
  ): string {
    const tweenId = `glow_${Date.now()}_${Math.random()}`;
    
    const defaultConfig: MotionEffectConfig = {
      duration: 1200,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      intensity: 0.3,
      enabled: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    if (!finalConfig.enabled || this.accessibilitySettings.reducedMotion) {
      return tweenId;
    }

    const adjustedDuration = this.adjustDurationForAccessibility(finalConfig.duration);
    const adjustedIntensity = this.adjustIntensityForPerformance(finalConfig.intensity);

    const tween = this.scene.tweens.add({
      targets: target,
      [glowProperty]: adjustedIntensity,
      duration: adjustedDuration,
      ease: finalConfig.ease,
      yoyo: finalConfig.yoyo,
      repeat: finalConfig.repeat
    });

    this.activeTweens.set(tweenId, tween);
    return tweenId;
  }

  /**
   * Create screen shake effect
   */
  public createScreenShake(
    intensity: number = 5,
    duration: number = 200,
    config: Partial<MotionEffectConfig> = {}
  ): string {
    const tweenId = `shake_${Date.now()}_${Math.random()}`;
    
    const defaultConfig: MotionEffectConfig = {
      duration: duration,
      ease: 'Power2.easeOut',
      yoyo: true,
      repeat: 3,
      intensity: intensity,
      enabled: true
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    if (!finalConfig.enabled || this.accessibilitySettings.reducedMotion) {
      return tweenId;
    }

    const adjustedDuration = this.adjustDurationForAccessibility(finalConfig.duration);
    const adjustedIntensity = this.adjustIntensityForPerformance(finalConfig.intensity);

    const camera = this.scene.cameras.main;
    const originalX = camera.x;
    const originalY = camera.y;

    const tween = this.scene.tweens.add({
      targets: camera,
      x: originalX + adjustedIntensity,
      y: originalY + adjustedIntensity,
      duration: adjustedDuration,
      ease: finalConfig.ease,
      yoyo: finalConfig.yoyo,
      repeat: finalConfig.repeat,
      onComplete: () => {
        camera.setPosition(originalX, originalY);
        this.activeTweens.delete(tweenId);
      }
    });

    this.activeTweens.set(tweenId, tween);
    return tweenId;
  }

  /**
   * Stop a specific animation
   */
  public stopAnimation(tweenId: string): void {
    const tween = this.activeTweens.get(tweenId);
    if (tween) {
      tween.remove();
      this.activeTweens.delete(tweenId);
    }
  }

  /**
   * Stop all animations
   */
  public stopAllAnimations(): void {
    this.activeTweens.forEach(tween => tween.remove());
    this.activeTweens.clear();
  }

  /**
   * Update active animations based on current settings
   */
  private updateActiveAnimations(): void {
    // This method can be used to adjust running animations
    // when accessibility or performance settings change
    this.activeTweens.forEach((tween, id) => {
      if (this.accessibilitySettings.reducedMotion) {
        tween.remove();
        this.activeTweens.delete(id);
      }
    });
  }

  /**
   * Adjust duration based on accessibility settings
   */
  private adjustDurationForAccessibility(duration: number): number {
    switch (this.accessibilitySettings.animationSpeed) {
      case 'slow':
        return duration * 1.5;
      case 'fast':
        return duration * 0.7;
      default:
        return duration;
    }
  }

  /**
   * Adjust intensity based on performance mode
   */
  private adjustIntensityForPerformance(intensity: number): number {
    switch (this.performanceMode) {
      case 'low':
        return intensity * 0.5;
      case 'medium':
        return intensity * 0.75;
      default:
        return intensity;
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.stopAllAnimations();
    this.activeTweens.clear();
  }
}
