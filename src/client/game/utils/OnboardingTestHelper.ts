/**
 * Onboarding Test Helper
 * Provides utilities for testing the onboarding flow
 */

import { OnboardingService } from '../../services/OnboardingService';

export class OnboardingTestHelper {
  /**
   * Reset onboarding status for testing
   */
  public static resetOnboardingForTesting(): void {
    console.log('OnboardingTestHelper: Resetting onboarding status for testing');
    OnboardingService.resetOnboarding();
  }

  /**
   * Check if onboarding would be shown
   */
  public static wouldShowOnboarding(): boolean {
    return OnboardingService.isFirstTimeUser() && !OnboardingService.hasCompletedOnboarding();
  }

  /**
   * Force onboarding to be shown (for testing)
   */
  public static forceShowOnboarding(): void {
    console.log('OnboardingTestHelper: Forcing onboarding to be shown');
    OnboardingService.resetOnboarding();
  }

  /**
   * Mark onboarding as completed (for testing)
   */
  public static markOnboardingCompleted(): void {
    console.log('OnboardingTestHelper: Marking onboarding as completed');
    OnboardingService.markOnboardingCompleted();
  }

  /**
   * Get onboarding status for debugging
   */
  public static getOnboardingStatus(): {
    isFirstTime: boolean;
    hasCompleted: boolean;
    wouldShow: boolean;
  } {
    return {
      isFirstTime: OnboardingService.isFirstTimeUser(),
      hasCompleted: OnboardingService.hasCompletedOnboarding(),
      wouldShow: this.wouldShowOnboarding()
    };
  }
}

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).OnboardingTestHelper = OnboardingTestHelper;
}
