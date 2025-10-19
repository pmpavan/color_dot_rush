import { Scene } from 'phaser';
import { GameColor } from '../../../shared/types/game';
import { UIElement, UIElementType } from './UIElementFactory';

/**
 * Interface for UI elements that can be updated
 */
export interface UIElementMap {
  header?: UIElement;
  score?: UIElement;
  timer?: UIElement;
  slowMoCharges?: UIElement[];
  targetColor?: UIElement;
}

/**
 * UpdateHandler manages proper UI state updates with visual feedback
 * Supports all UI element types (text, graphics, minimal) with appropriate animations
 */
export class UpdateHandler {
  private scene: Scene;
  private uiElements: UIElementMap;

  constructor(scene: Scene, uiElements: UIElementMap) {
    this.scene = scene;
    this.uiElements = uiElements;
  }

  /**
   * Update score display with visual feedback and color changes
   * Implements requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.4
   */
  updateScore(score: number, bestScore: number): void {
    console.log('UpdateHandler: updateScore called with score:', score, 'bestScore:', bestScore);

    const scoreElement = this.uiElements.score;
    if (!scoreElement?.container) {
      console.warn('UpdateHandler: Score element not available');
      return;
    }

    try {
      // Update score using element's update method if available
      if (scoreElement.updateMethod) {
        scoreElement.updateMethod({ score, bestScore });
      } else {
        // Fallback to direct element manipulation
        this.updateScoreElementDirectly(scoreElement, score, bestScore);
      }

      // Add scale animation when score changes (requirement 7.1)
      this.animateScoreChange(scoreElement.container, score);

      console.log('UpdateHandler: Score updated successfully');
    } catch (error) {
      console.error('UpdateHandler: Error updating score:', error);
    }
  }

  /**
   * Update time display with MM:SS format
   * Implements requirements: 2.1, 2.2, 2.4
   */
  updateTime(elapsedTime: number): void {
    console.log('UpdateHandler: updateTime called with elapsedTime:', elapsedTime);

    const timerElement = this.uiElements.timer;
    if (!timerElement?.container) {
      console.warn('UpdateHandler: Timer element not available');
      return;
    }

    try {
      // Update time using element's update method if available
      if (timerElement.updateMethod) {
        timerElement.updateMethod(elapsedTime);
      } else {
        // Fallback to direct element manipulation
        this.updateTimeElementDirectly(timerElement, elapsedTime);
      }

      console.log('UpdateHandler: Time updated successfully');
    } catch (error) {
      console.error('UpdateHandler: Error updating time:', error);
    }
  }

  /**
   * Update target color display with dot icon and animations
   * Implements requirements: 4.1, 4.2, 4.4, 7.2, 7.5
   */
  updateTargetColor(color: GameColor): void {
    console.log('UpdateHandler: updateTargetColor called with color:', color);

    const targetColorElement = this.uiElements.targetColor;
    if (!targetColorElement?.container) {
      console.warn('UpdateHandler: Target color element not available');
      return;
    }

    try {
      // Update target color using element's update method if available
      if (targetColorElement.updateMethod) {
        targetColorElement.updateMethod(color);
      } else {
        // Fallback to direct element manipulation
        this.updateTargetColorElementDirectly(targetColorElement, color);
      }

      // Add pulsing animation to target color display (requirement 4.4)
      this.animateTargetColorChange(targetColorElement.container);

      // Update background border color to match target color (requirement 7.5)
      this.updateBackgroundBorderColor(color);

      console.log('UpdateHandler: Target color updated successfully');
    } catch (error) {
      console.error('UpdateHandler: Error updating target color:', error);
    }
  }

  /**
   * Update slow-mo charges with visual states and animations
   * Implements requirements: 3.1, 3.2, 3.3, 3.5, 7.3
   */
  updateSlowMoCharges(charges: number): void {
    console.log('UpdateHandler: updateSlowMoCharges called with charges:', charges);

    const slowMoCharges = this.uiElements.slowMoCharges;
    if (!slowMoCharges || slowMoCharges.length === 0) {
      console.warn('UpdateHandler: Slow-mo charges elements not available');
      return;
    }

    try {
      // Update each charge element
      slowMoCharges.forEach((charge, index) => {
        if (!charge?.container) return;

        const isActive = index < charges;

        // Update charge using element's update method if available
        if (charge.updateMethod) {
          charge.updateMethod(isActive);
        } else {
          // Fallback to direct element manipulation
          this.updateSlowMoChargeElementDirectly(charge, isActive);
        }

        // Add pulsing animation for active charges (requirement 3.5)
        if (isActive) {
          this.animateActiveCharge(charge.container);
        } else {
          // Stop pulsing animation for inactive charges
          this.stopChargeAnimation(charge.container);
        }
      });

      // Add flash effect when charges are consumed (requirement 7.3)
      if (charges < 3) {
        this.animateChargeConsumption(charges);
      }

      console.log('UpdateHandler: Slow-mo charges updated successfully');
    } catch (error) {
      console.error('UpdateHandler: Error updating slow-mo charges:', error);
    }
  }

  // Private helper methods for direct element manipulation

  private updateScoreElementDirectly(scoreElement: UIElement, score: number, bestScore: number): void {
    if (scoreElement.type === UIElementType.TEXT && scoreElement.textElement) {
      // Text mode - update text content and color
      scoreElement.textElement.setText(`Score: ${score} | Best: ${bestScore}`);
      
      // Change color based on score level (requirement 7.4)
      const color = this.getScoreColor(score);
      scoreElement.textElement.setColor(color);
    } else if (scoreElement.type === UIElementType.GRAPHICS && scoreElement.graphicsElements) {
      // Graphics mode - update indicator color and scale
      const scoreIndicator = scoreElement.graphicsElements[1] as Phaser.GameObjects.Arc;
      if (scoreIndicator?.setFillStyle) {
        const colorValue = this.getScoreColorValue(score);
        scoreIndicator.setFillStyle(colorValue);
        
        // Scale indicator based on score
        const scale = Math.min(1 + (score * 0.05), 1.5);
        scoreIndicator.setScale(scale);
      }
    } else if (scoreElement.type === UIElementType.MINIMAL && scoreElement.graphicsElements) {
      // Minimal mode - update circle color
      const scoreCircle = scoreElement.graphicsElements[0] as Phaser.GameObjects.Arc;
      if (scoreCircle?.setFillStyle) {
        const colorValue = this.getScoreColorValue(score);
        scoreCircle.setFillStyle(colorValue);
      }
    }
  }

  private updateTimeElementDirectly(timerElement: UIElement, elapsedTime: number): void {
    const totalSeconds = Math.floor(elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    // MM:SS format as required (requirement 2.1)
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    if (timerElement.type === UIElementType.TEXT && timerElement.textElement) {
      // Text mode - update text content (requirement 2.2)
      timerElement.textElement.setText(`Time: ${timeString}`);
      
      // Ensure time display is positioned at screen center (requirement 2.4)
      // Position is handled by ResponsiveLayoutManager, but we ensure text is centered
      timerElement.textElement.setOrigin(0.5, 0.5);
    } else if (timerElement.type === UIElementType.GRAPHICS && timerElement.graphicsElements) {
      // Graphics mode - rotate clock hand (requirement 2.2)
      const timeHand = timerElement.graphicsElements[1] as Phaser.GameObjects.Line;
      if (timeHand?.setRotation) {
        const rotation = (totalSeconds * 6) * (Math.PI / 180); // 6 degrees per second
        timeHand.setRotation(rotation);
      }
    } else if (timerElement.type === UIElementType.MINIMAL && timerElement.graphicsElements) {
      // Minimal mode - pulse based on time (requirement 2.2)
      const timeCircle = timerElement.graphicsElements[0] as Phaser.GameObjects.Arc;
      if (timeCircle?.setAlpha) {
        const alpha = 0.5 + (Math.sin(totalSeconds * 0.5) * 0.5);
        timeCircle.setAlpha(alpha);
      }
    }
  }

  private updateTargetColorElementDirectly(targetColorElement: UIElement, color: GameColor): void {
    const colorValue = parseInt(color.replace('#', '0x'));

    if (targetColorElement.type === UIElementType.TEXT) {
      // Text mode - "TAP" text with colored dot icon (requirement 4.1, 4.2)
      if (targetColorElement.graphicsElements && targetColorElement.graphicsElements.length >= 2) {
        const background = targetColorElement.graphicsElements[0] as Phaser.GameObjects.Rectangle;
        const colorDot = targetColorElement.graphicsElements[1] as Phaser.GameObjects.Arc;
        
        // Update dot color to match target color (requirement 4.2)
        if (colorDot?.setFillStyle) {
          colorDot.setFillStyle(colorValue);
        }
        // Update background border color to match target color (requirement 7.5)
        if (background?.setStrokeStyle) {
          background.setStrokeStyle(3, colorValue, 0.9);
        }
      }
    } else if (targetColorElement.type === UIElementType.GRAPHICS) {
      // Graphics mode - update target circle color and background
      if (targetColorElement.graphicsElements && targetColorElement.graphicsElements.length >= 2) {
        const background = targetColorElement.graphicsElements[0] as Phaser.GameObjects.Rectangle;
        const targetCircle = targetColorElement.graphicsElements[1] as Phaser.GameObjects.Arc;
        
        if (targetCircle?.setFillStyle) {
          targetCircle.setFillStyle(colorValue);
        }
        // Update background border color to match target color (requirement 7.5)
        if (background?.setStrokeStyle) {
          background.setStrokeStyle(3, colorValue, 0.9);
        }
      }
    } else if (targetColorElement.type === UIElementType.MINIMAL) {
      // Minimal mode - update circle color
      if (targetColorElement.graphicsElements && targetColorElement.graphicsElements[0]) {
        const targetCircle = targetColorElement.graphicsElements[0] as Phaser.GameObjects.Arc;
        if (targetCircle?.setFillStyle) {
          targetCircle.setFillStyle(colorValue);
        }
      }
    }
  }

  private updateSlowMoChargeElementDirectly(chargeElement: UIElement, isActive: boolean): void {
    if (!chargeElement.graphicsElements || chargeElement.graphicsElements.length === 0) return;

    const charge = chargeElement.graphicsElements[0] as Phaser.GameObjects.Arc;
    if (!charge?.setFillStyle) return;

    if (isActive) {
      // Active charge - bright and visible (requirement 3.2)
      charge.setFillStyle(0xECF0F1); // Shimmering White
      charge.setAlpha(1.0);
      if (charge.setStrokeStyle) {
        charge.setStrokeStyle(2, 0x3498DB, 1.0); // Bright blue outline
      }
    } else {
      // Inactive charge - dimmed effect for used charges (requirement 3.3)
      charge.setFillStyle(0x95A5A6); // Mid Grey
      charge.setAlpha(0.4); // Dimming effect
      if (charge.setStrokeStyle) {
        charge.setStrokeStyle(2, 0x7F8C8D, 0.6); // Dim grey outline
      }
    }
  }

  // Animation methods

  private animateScoreChange(container: Phaser.GameObjects.Container, score: number): void {
    // Kill any existing scale animations
    this.scene.tweens.killTweensOf(container);

    // Scale animation when score changes (requirement 7.1)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        // Ensure container returns to normal scale
        container.setScale(1.0);
      }
    });

    // Additional visual feedback for milestone scores
    if (score > 0 && score % 10 === 0) {
      // Extra celebration animation for every 10 points
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Back.easeOut',
        delay: 150
      });
    }
  }

  private animateTargetColorChange(container: Phaser.GameObjects.Container): void {
    // Kill any existing animations
    this.scene.tweens.killTweensOf(container);

    // Flash effect when color changes (requirement 7.2)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
      onComplete: () => {
        // Restart pulsing animation (requirement 4.4)
        this.startTargetColorPulsing(container);
      }
    });
  }

  private startTargetColorPulsing(container: Phaser.GameObjects.Container): void {
    // Continuous pulsing animation for target color display
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private animateActiveCharge(container: Phaser.GameObjects.Container): void {
    // Kill any existing animations
    this.scene.tweens.killTweensOf(container);

    // Pulsing animation for active charges (requirement 3.5)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  private stopChargeAnimation(container: Phaser.GameObjects.Container): void {
    // Stop pulsing animation and reset scale
    this.scene.tweens.killTweensOf(container);
    container.setScale(1.0);
  }

  private animateChargeConsumption(remainingCharges: number): void {
    const slowMoCharges = this.uiElements.slowMoCharges;
    if (!slowMoCharges || remainingCharges >= slowMoCharges.length) return;

    // Flash effect when charges are consumed (requirement 7.3)
    const usedChargeIndex = remainingCharges; // The charge that was just used
    const usedCharge = slowMoCharges[usedChargeIndex];
    
    if (usedCharge?.container) {
      this.scene.tweens.add({
        targets: usedCharge.container,
        alpha: 0.1,
        duration: 150,
        ease: 'Power2.easeOut',
        yoyo: true,
        onComplete: () => {
          // Set to inactive alpha after flash (requirement 3.3)
          usedCharge.container.setAlpha(0.4);
        }
      });
    }
  }

  private updateBackgroundBorderColor(color: GameColor): void {
    // Update background border color to match target color (requirement 7.5)
    const targetColorElement = this.uiElements.targetColor;
    if (!targetColorElement?.graphicsElements) return;

    const background = targetColorElement.graphicsElements[0] as Phaser.GameObjects.Rectangle;
    if (background?.setStrokeStyle) {
      const colorValue = parseInt(color.replace('#', '0x'));
      background.setStrokeStyle(3, colorValue, 0.9);
    }
  }

  // Helper methods for color management

  private getScoreColor(score: number): string {
    // Score color changes based on score level (requirement 7.4)
    if (score > 20) return '#FFD700'; // Gold for high scores
    if (score > 10) return '#2ECC71'; // Green for medium scores
    return '#FFFFFF'; // White for low scores
  }

  private getScoreColorValue(score: number): number {
    // Score color values for graphics mode
    if (score > 20) return 0xFFD700; // Gold
    if (score > 10) return 0x2ECC71; // Green
    return 0xFFFFFF; // White
  }

  /**
   * Update UI elements reference (for when UI is recreated)
   */
  updateUIElements(uiElements: UIElementMap): void {
    this.uiElements = uiElements;
    console.log('UpdateHandler: UI elements reference updated');
  }

  /**
   * Cleanup method to stop all animations with comprehensive error handling patterns
   * Uses SafeCleanupHelpers for consistent error handling across all utility classes
   */
  destroy(): void {
    // Import the helper functions (dynamic import to avoid circular dependencies)
    const { 
      handlePartialDestructionState, 
      validateSceneState,
      safelyKillTweens,
      logDestructionError 
    } = require('./SafeCleanupHelpers');

    console.log('UpdateHandler: Starting destruction with comprehensive error handling');

    // Validate scene state before attempting cleanup
    const sceneValidation = validateSceneState(this.scene, 'UpdateHandler');
    
    if (!sceneValidation.isValid) {
      console.warn('UpdateHandler: Scene validation failed, proceeding with limited cleanup', {
        validationErrors: sceneValidation.validationErrors
      });
    }

    // Define cleanup operations for partial destruction state handling
    const cleanupOperations = [
      {
        name: 'killUIElementTweens',
        operation: () => {
          // Stop all animations on UI elements
          Object.values(this.uiElements).forEach(element => {
            if (element?.container) {
              try {
                if (this.scene && this.scene.tweens && typeof this.scene.tweens.killTweensOf === 'function') {
                  this.scene.tweens.killTweensOf(element.container);
                }
              } catch (error) {
                logDestructionError('UpdateHandler', 'killUIElementTween', error, {
                  elementType: element.type
                });
              }
            }
          });
          console.log('UpdateHandler: UI element animations stopped successfully');
        },
        required: false
      },
      {
        name: 'killSlowMoChargeTweens',
        operation: () => {
          // Stop animations on slow-mo charges array
          if (this.uiElements.slowMoCharges) {
            this.uiElements.slowMoCharges.forEach((charge, index) => {
              if (charge?.container) {
                try {
                  if (this.scene && this.scene.tweens && typeof this.scene.tweens.killTweensOf === 'function') {
                    this.scene.tweens.killTweensOf(charge.container);
                  }
                } catch (error) {
                  logDestructionError('UpdateHandler', `killSlowMoChargeTween_${index}`, error, {
                    chargeIndex: index
                  });
                }
              }
            });
          }
          console.log('UpdateHandler: Slow-mo charge animations stopped successfully');
        },
        required: false
      },
      {
        name: 'killAllSceneTweens',
        operation: () => {
          // Use the safe tween killing helper for any remaining tweens
          if (safelyKillTweens(this.scene, undefined, 'UpdateHandler')) {
            console.log('UpdateHandler: All scene tweens killed successfully');
          }
        },
        required: false
      },
      {
        name: 'clearUIElementsReferences',
        operation: () => {
          // Clear UI elements references
          this.uiElements = {} as UIElementMap;
          console.log('UpdateHandler: UI elements references cleared successfully');
        },
        required: true
      }
    ];

    // Execute cleanup with partial destruction state handling
    const cleanupStatus = handlePartialDestructionState(
      this.scene,
      cleanupOperations,
      'UpdateHandler'
    );

    // Log final cleanup status
    if (cleanupStatus.completed) {
      console.log('UpdateHandler: Destruction completed successfully', {
        tweensKilled: cleanupStatus.tweensKilled,
        errorCount: cleanupStatus.errors.length
      });
    } else {
      console.warn('UpdateHandler: Destruction completed with errors', {
        errors: cleanupStatus.errors,
        tweensKilled: cleanupStatus.tweensKilled
      });
    }

    console.log('UpdateHandler: Destroyed and cleaned up');
  }
}
