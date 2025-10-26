/**
 * Social Sharing Service
 * Handles sharing game scores and achievements to social platforms
 */

export interface ShareData {
  score: number;
  rank?: number;
  challengeType?: string;
  gameMode?: string;
  sessionTime?: number;
  achievements?: string[];
}

export interface ShareResult {
  success: boolean;
  platform: string;
  shareUrl?: string;
  error?: string;
}

export interface ShareOptions {
  platforms: string[];
  includeScore: boolean;
  includeRank: boolean;
  customMessage?: string;
  mentionSubreddit?: boolean;
}

/**
 * Social Sharing Service Interface
 */
export interface ISocialSharingService {
  shareScore(shareData: ShareData, options?: Partial<ShareOptions>): Promise<ShareResult[]>;
  getAvailablePlatforms(): string[];
  getShareStatistics(): Promise<any>;
}

/**
 * Production Social Sharing Service
 * Uses Devvit API endpoints for social sharing
 */
export class DevvitSocialSharingService implements ISocialSharingService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Share score to social platforms
   */
  async shareScore(shareData: ShareData, options?: Partial<ShareOptions>): Promise<ShareResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/share-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...shareData,
          options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.results || [];
      } else {
        throw new Error(result.message || 'Failed to share score');
      }
    } catch (error) {
      console.error('Error sharing score:', error);
      return [{
        success: false,
        platform: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      }];
    }
  }

  /**
   * Get available sharing platforms
   */
  getAvailablePlatforms(): string[] {
    return ['reddit', 'twitter', 'discord'];
  }

  /**
   * Get share statistics
   */
  async getShareStatistics(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/share-statistics`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.statistics;
      } else {
        throw new Error(result.message || 'Failed to get share statistics');
      }
    } catch (error) {
      console.error('Error getting share statistics:', error);
      return {
        totalShares: 0,
        platformBreakdown: {},
        recentShares: [],
      };
    }
  }
}

/**
 * Mock Social Sharing Service for development/testing
 */
export class MockSocialSharingService implements ISocialSharingService {
  private shareCount = 0;

  async shareScore(shareData: ShareData, options?: Partial<ShareOptions>): Promise<ShareResult[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.shareCount++;
    
    const platforms = options?.platforms || ['reddit', 'twitter'];
    const results: ShareResult[] = [];
    
    for (const platform of platforms) {
      // Simulate occasional failures
      const success = Math.random() > 0.1; // 90% success rate
      
      results.push({
        success,
        platform,
        shareUrl: success ? `https://${platform}.com/post/${Date.now()}` : undefined,
        error: success ? undefined : 'Simulated network error',
      });
    }
    
    console.log(`Mock social sharing: Shared score ${shareData.score} to ${platforms.length} platforms`);
    return results;
  }

  getAvailablePlatforms(): string[] {
    return ['reddit', 'twitter', 'discord'];
  }

  async getShareStatistics(): Promise<any> {
    return {
      totalShares: this.shareCount,
      platformBreakdown: {
        reddit: Math.floor(this.shareCount * 0.6),
        twitter: Math.floor(this.shareCount * 0.3),
        discord: Math.floor(this.shareCount * 0.1),
      },
      recentShares: [],
    };
  }
}

/**
 * Social Sharing Service Factory
 */
export class SocialSharingServiceFactory {
  private static instance: ISocialSharingService | null = null;

  static getInstance(): ISocialSharingService {
    if (!this.instance) {
      // Use mock service in development, production service in production
      if (process.env.NODE_ENV === 'development') {
        this.instance = new MockSocialSharingService();
      } else {
        this.instance = new DevvitSocialSharingService();
      }
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}

/**
 * Convenience function to get the social sharing service
 */
export function getSocialSharingService(): ISocialSharingService {
  return SocialSharingServiceFactory.getInstance();
}
