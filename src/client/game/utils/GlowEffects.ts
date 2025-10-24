/**
 * Glow Effects System for Neon Pulse Theme
 * Provides utilities for creating neon glow effects on game objects
 */

import { GameColor } from '../../../shared/types/game';

export interface GlowConfig {
  color: string;
  intensity: number; // 0-1
  radius: number;
  blur: number;
  alpha: number;
}

export class GlowEffects {
  /**
   * Get glow configuration for a specific game color
   */
  static getGlowConfig(color: GameColor): GlowConfig {
    switch (color) {
      case GameColor.RED:
        return {
          color: '#FF0000',
          intensity: 0.8,
          radius: 20,
          blur: 15,
          alpha: 0.6
        };
      case GameColor.GREEN:
        return {
          color: '#00FF00',
          intensity: 0.8,
          radius: 20,
          blur: 15,
          alpha: 0.6
        };
      case GameColor.BLUE:
        return {
          color: '#00BFFF',
          intensity: 0.8,
          radius: 20,
          blur: 15,
          alpha: 0.6
        };
      case GameColor.YELLOW:
        return {
          color: '#FFA500',
          intensity: 0.8,
          radius: 20,
          blur: 15,
          alpha: 0.6
        };
      case GameColor.PURPLE:
        return {
          color: '#FF69B4',
          intensity: 0.8,
          radius: 20,
          blur: 15,
          alpha: 0.6
        };
      default:
        return {
          color: '#FFFFFF',
          intensity: 0.5,
          radius: 15,
          blur: 10,
          alpha: 0.4
        };
    }
  }

  /**
   * Get glow configuration for bomb (Warning Red with flicker)
   */
  static getBombGlowConfig(): GlowConfig {
    return {
      color: '#FF0000',
      intensity: 0.9,
      radius: 25,
      blur: 20,
      alpha: 0.7
    };
  }

  /**
   * Get glow configuration for slow-mo dot (Bright White/Cyan)
   */
  static getSlowMoGlowConfig(): GlowConfig {
    return {
      color: '#FFFFFF', // Bright white - distinct from all regular dot colors
      intensity: 1.0,
      radius: 30,
      blur: 25,
      alpha: 0.8
    };
  }

  /**
   * Create a glow effect using Phaser graphics
   */
  static createGlowEffect(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: GlowConfig,
    depth: number = 1000
  ): Phaser.GameObjects.Graphics {
    const glow = scene.add.graphics();
    glow.setDepth(depth);
    
    // CRITICAL: Draw at (0, 0) relative to the graphics object
    // Then use setPosition to move the entire graphics
    // This allows proper repositioning with setPosition later
    
    // Create multiple layers for realistic glow effect
    const layers = [
      { radius: config.radius * 0.3, alpha: config.alpha * 0.3, blur: config.blur * 0.5 },
      { radius: config.radius * 0.6, alpha: config.alpha * 0.5, blur: config.blur * 0.7 },
      { radius: config.radius, alpha: config.alpha, blur: config.blur }
    ];

    layers.forEach((layer, index) => {
      const color = Phaser.Display.Color.HexStringToColor(config.color);
      glow.fillStyle(color.color, layer.alpha);
      // Draw at (0, 0) relative to graphics object
      glow.fillCircle(0, 0, layer.radius);
    });
    
    // Position the graphics at the desired location
    glow.setPosition(x, y);

    return glow;
  }

  /**
   * Create animated glow effect with pulsing
   */
  static createPulsingGlow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: GlowConfig,
    depth: number = 1000
  ): { glow: Phaser.GameObjects.Graphics; tween: Phaser.Tweens.Tween } {
    const glow = this.createGlowEffect(scene, x, y, config, depth);
    
    const tween = scene.tweens.add({
      targets: glow,
      alpha: config.alpha * 0.5,
      duration: 1000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });

    return { glow, tween };
  }

  /**
   * Create flickering glow effect for bombs
   */
  static createFlickeringGlow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: GlowConfig,
    depth: number = 1000
  ): { glow: Phaser.GameObjects.Graphics; tween: Phaser.Tweens.Tween } {
    const glow = this.createGlowEffect(scene, x, y, config, depth);
    
    const tween = scene.tweens.add({
      targets: glow,
      alpha: config.alpha * 0.3,
      duration: 150,
      ease: 'Power2.easeInOut',
      yoyo: true,
      repeat: -1
    });

    return { glow, tween };
  }

  /**
   * Apply glow effect to a Phaser game object
   */
  static applyGlowToObject(
    object: Phaser.GameObjects.GameObject,
    config: GlowConfig,
    scene: Phaser.Scene
  ): Phaser.GameObjects.Graphics {
    const glow = this.createGlowEffect(scene, object.x, object.y, config, object.depth - 1);
    
    // Update glow position when object moves
    const updateGlow = () => {
      glow.setPosition(object.x, object.y);
    };
    
    // Store reference for cleanup
    (object as any).glowEffect = glow;
    (object as any).updateGlow = updateGlow;
    
    return glow;
  }

  /**
   * Remove glow effect from an object
   */
  static removeGlowFromObject(object: Phaser.GameObjects.GameObject): void {
    if ((object as any).glowEffect) {
      (object as any).glowEffect.destroy();
      delete (object as any).glowEffect;
      delete (object as any).updateGlow;
    }
  }

  /**
   * Create CSS box-shadow string for DOM elements
   */
  static createCSSGlow(config: GlowConfig): string {
    return `0 0 ${config.blur}px ${config.radius}px ${config.color}${Math.floor(config.alpha * 255).toString(16).padStart(2, '0')}`;
  }

  /**
   * Create multiple CSS box-shadow layers for realistic glow
   */
  static createCSSMultiLayerGlow(config: GlowConfig): string {
    const layers = [
      `0 0 ${config.blur * 0.3}px ${config.radius * 0.3}px ${config.color}${Math.floor(config.alpha * 0.3 * 255).toString(16).padStart(2, '0')}`,
      `0 0 ${config.blur * 0.6}px ${config.radius * 0.6}px ${config.color}${Math.floor(config.alpha * 0.5 * 255).toString(16).padStart(2, '0')}`,
      `0 0 ${config.blur}px ${config.radius}px ${config.color}${Math.floor(config.alpha * 255).toString(16).padStart(2, '0')}`
    ];
    return layers.join(', ');
  }
}
