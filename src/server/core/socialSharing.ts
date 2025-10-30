import { context, reddit } from '@devvit/web/server';
import { getPostConfiguration } from './postConfiguration';

/**
 * Social Sharing System
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
 * Generate share message based on score data and configuration
 */
async function generateShareMessage(shareData: ShareData, options: ShareOptions): Promise<string> {
  try {
    const config = await getPostConfiguration();
    let message = options.customMessage || config.socialSharing.customMessage;
    
    // Replace placeholders in the message
    message = message.replace('{score}', shareData.score.toLocaleString());
    
    if (shareData.rank && options.includeRank) {
      message = message.replace('{rank}', shareData.rank.toString());
    }
    
    if (shareData.challengeType) {
      message = message.replace('{challenge}', shareData.challengeType);
    }
    
    if (shareData.gameMode) {
      message = message.replace('{mode}', shareData.gameMode);
    }
    
    // Add subreddit mention if enabled
    if (options.mentionSubreddit && context.subredditName) {
      message += `\n\nPlay Color Dot Rush in r/${context.subredditName}!`;
    }
    
    // Add hashtags for better discoverability
    message += '\n\n#ColorDotRush #RedditGames #CommunityGames';
    
    if (shareData.challengeType) {
      message += ` #${shareData.challengeType}`;
    }
    
    return message;
  } catch (error) {
    console.error('Error generating share message:', error);
    return `Just scored ${shareData.score.toLocaleString()} points in Color Dot Rush! Can you beat my score?`;
  }
}

/**
 * Share to Reddit (create a post in the subreddit)
 */
async function shareToReddit(shareData: ShareData, message: string): Promise<ShareResult> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required for Reddit sharing');
    }
    
    // Create a post in the subreddit
    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: `🎮 Score Share: ${shareData.score.toLocaleString()} points!`,
      text: message,
      flairId: 'Score Share',
    });
    
    return {
      success: true,
      platform: 'reddit',
      shareUrl: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
    };
  } catch (error) {
    console.error('Error sharing to Reddit:', error);
    return {
      success: false,
      platform: 'reddit',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Share to Twitter (via Reddit crosspost or external API)
 */
async function shareToTwitter(shareData: ShareData, message: string): Promise<ShareResult> {
  try {
    // For now, we'll create a Reddit post that can be cross-posted to Twitter
    // In a full implementation, you'd integrate with Twitter API
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required for Twitter sharing');
    }
    
    // Create a post that's optimized for Twitter sharing
    const twitterMessage = message.length > 200 ? message.substring(0, 197) + '...' : message;
    
    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: `🐦 Twitter Share: ${shareData.score.toLocaleString()} points!`,
      text: `${twitterMessage}\n\n*This post is optimized for Twitter sharing. Copy the text above to share on Twitter!*`,
      flairId: 'Social Share',
    });
    
    return {
      success: true,
      platform: 'twitter',
      shareUrl: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
    };
  } catch (error) {
    console.error('Error sharing to Twitter:', error);
    return {
      success: false,
      platform: 'twitter',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Share to Discord (via webhook or bot integration)
 */
async function shareToDiscord(shareData: ShareData, message: string): Promise<ShareResult> {
  try {
    // This would integrate with Discord webhooks or bot APIs
    // For now, we'll create a Reddit post that can be shared to Discord
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required for Discord sharing');
    }
    
    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: `💬 Discord Share: ${shareData.score.toLocaleString()} points!`,
      text: `${message}\n\n*Share this post in your Discord server to show off your score!*`,
      flairId: 'Social Share',
    });
    
    return {
      success: true,
      platform: 'discord',
      shareUrl: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
    };
  } catch (error) {
    console.error('Error sharing to Discord:', error);
    return {
      success: false,
      platform: 'discord',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main social sharing function
 */
export async function shareScore(
  shareData: ShareData,
  options?: Partial<ShareOptions>
): Promise<ShareResult[]> {
  try {
    const config = await getPostConfiguration();
    const shareOptions: ShareOptions = {
      platforms: options?.platforms || config.socialSharing.platforms,
      includeScore: options?.includeScore ?? config.socialSharing.includeScore,
      includeRank: options?.includeRank ?? config.socialSharing.includeRank,
      customMessage: options?.customMessage || config.socialSharing.customMessage,
      mentionSubreddit: options?.mentionSubreddit ?? true,
    };
    
    if (!config.socialSharing.enabled) {
      console.log('Social sharing is disabled');
      return [];
    }
    
    // Generate share message
    const message = await generateShareMessage(shareData, shareOptions);
    
    const results: ShareResult[] = [];
    
    // Share to each platform
    for (const platform of shareOptions.platforms) {
      try {
        let result: ShareResult;
        
        switch (platform.toLowerCase()) {
          case 'reddit':
            result = await shareToReddit(shareData, message);
            break;
          case 'twitter':
            result = await shareToTwitter(shareData, message);
            break;
          case 'discord':
            result = await shareToDiscord(shareData, message);
            break;
          default:
            result = {
              success: false,
              platform,
              error: `Unsupported platform: ${platform}`,
            };
        }
        
        results.push(result);
        
        if (result.success) {
          console.log(`Successfully shared to ${platform}: ${result.shareUrl}`);
        } else {
          console.error(`Failed to share to ${platform}: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error sharing to ${platform}:`, error);
        results.push({
          success: false,
          platform,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in social sharing:', error);
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
export function getAvailablePlatforms(): string[] {
  return ['reddit', 'twitter', 'discord'];
}

/**
 * Get share statistics
 */
export async function getShareStatistics(): Promise<{
  totalShares: number;
  platformBreakdown: Record<string, number>;
  recentShares: Array<{
    platform: string;
    score: number;
    timestamp: Date;
  }>;
}> {
  try {
    // This would track sharing statistics in Redis
    // For now, return mock data
    return {
      totalShares: 0,
      platformBreakdown: {},
      recentShares: [],
    };
  } catch (error) {
    console.error('Error getting share statistics:', error);
    return {
      totalShares: 0,
      platformBreakdown: {},
      recentShares: [],
    };
  }
}
