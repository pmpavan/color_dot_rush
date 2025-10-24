/**
 * Onboarding Service for Color Dot Rush
 * Manages first-time user experience and tutorial flow
 */

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  highlightElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'wait' | 'swipe' | 'tap';
  duration?: number; // in milliseconds
  showVisualDemo?: boolean; // Whether to show visual dot examples
  demoDots?: Array<{
    color: string;
    type: 'normal' | 'bomb' | 'slowmo';
    x: number;
    y: number;
  }>;
}

export class OnboardingService {
  private static readonly STORAGE_KEY = 'color-rush-onboarding-completed';
  private static readonly FIRST_TIME_KEY = 'color-rush-first-time';

  /**
   * Check if user has completed onboarding
   */
  public static hasCompletedOnboarding(): boolean {
    try {
      const completed = localStorage.getItem(this.STORAGE_KEY);
      return completed === 'true';
    } catch (error) {
      console.warn('OnboardingService: Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Check if this is the first time user is playing
   */
  public static isFirstTimeUser(): boolean {
    try {
      const firstTime = localStorage.getItem(this.FIRST_TIME_KEY);
      return firstTime !== 'false';
    } catch (error) {
      console.warn('OnboardingService: Error checking first time status:', error);
      return true; // Default to first time if we can't check
    }
  }

  /**
   * Mark onboarding as completed
   */
  public static markOnboardingCompleted(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, 'true');
      localStorage.setItem(this.FIRST_TIME_KEY, 'false');
    } catch (error) {
      console.warn('OnboardingService: Error marking onboarding as completed:', error);
    }
  }

  /**
   * Reset onboarding status (for testing)
   */
  public static resetOnboarding(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.FIRST_TIME_KEY);
    } catch (error) {
      console.warn('OnboardingService: Error resetting onboarding:', error);
    }
  }

  /**
   * Get onboarding steps for the game tutorial
   */
  public static getOnboardingSteps(): OnboardingStep[] {
    return [
      {
        id: 'welcome',
        title: 'Welcome to Color Rush!',
        description: 'Tap the colored dots that match the target color to score points. Avoid the bombs!',
        position: 'center',
        duration: 3000,
        showVisualDemo: true,
        demoDots: [
          { color: '#ff4444', type: 'normal', x: 0.3, y: 0.4 },
          { color: '#44ff44', type: 'normal', x: 0.7, y: 0.6 },
          { color: '#4444ff', type: 'normal', x: 0.5, y: 0.3 }
        ]
      },
      {
        id: 'target-color',
        title: 'Target Color',
        description: 'This shows which color you need to tap. It changes randomly during the game.',
        highlightElement: 'target-color-display',
        position: 'bottom',
        duration: 4000,
        showVisualDemo: true,
        demoDots: [
          { color: '#ff4444', type: 'normal', x: 0.3, y: 0.4 },
          { color: '#ff4444', type: 'normal', x: 0.7, y: 0.6 },
          { color: '#44ff44', type: 'normal', x: 0.5, y: 0.3 }
        ]
      },
      {
        id: 'score',
        title: 'Your Score',
        description: 'Each correct tap increases your score. Try to get the highest score possible!',
        highlightElement: 'score-display',
        position: 'top',
        duration: 3000
      },
      {
        id: 'bombs',
        title: 'Avoid Bombs!',
        description: 'Don\'t tap the bombs - they will end your game. Only tap the colored dots.',
        position: 'center',
        duration: 4000,
        showVisualDemo: true,
        demoDots: [
          { color: '#ff4444', type: 'normal', x: 0.3, y: 0.4 },
          { color: '#44ff44', type: 'normal', x: 0.7, y: 0.6 },
          { color: '#000000', type: 'bomb', x: 0.5, y: 0.3 }
        ]
      },
      {
        id: 'slow-mo',
        title: 'Slow Motion',
        description: 'Special slow-motion dots give you extra time. Tap them to slow down the game!',
        position: 'center',
        duration: 3000,
        showVisualDemo: true,
        demoDots: [
          { color: '#ff4444', type: 'normal', x: 0.3, y: 0.4 },
          { color: '#44ff44', type: 'normal', x: 0.7, y: 0.6 },
          { color: '#ffff44', type: 'slowmo', x: 0.5, y: 0.3 }
        ]
      },
      {
        id: 'ready',
        title: 'Ready to Play!',
        description: 'You\'re all set! The game will start in a moment. Good luck!',
        position: 'center',
        duration: 2000
      }
    ];
  }
}
