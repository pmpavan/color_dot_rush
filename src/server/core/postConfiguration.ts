import { redis } from '@devvit/web/server';

/**
 * Post Configuration System
 * Manages settings for daily and weekly challenge posts
 */

export interface PostConfiguration {
  dailyChallenge: {
    postTime: string; // HH:MM format (24-hour)
    timezone: string;
    challengeTypes: string[];
    autoPost: boolean;
  };
  weeklyLeaderboard: {
    postDay: number; // 0 = Sunday, 1 = Monday, etc.
    postTime: string; // HH:MM format (24-hour)
    timezone: string;
    autoPost: boolean;
  };
  socialSharing: {
    enabled: boolean;
    platforms: string[];
    includeScore: boolean;
    includeRank: boolean;
    customMessage: string;
  };
  notifications: {
    enabled: boolean;
    channels: string[];
    mentionMods: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PostConfiguration = {
  dailyChallenge: {
    postTime: '08:00',
    timezone: 'UTC',
    challengeTypes: ['SPEED_DEMON', 'PERFECTIONIST', 'BOMB_DODGER', 'COLOR_MASTER', 'ENDURANCE'],
    autoPost: false, // Disabled - keep code for future use
  },
  weeklyLeaderboard: {
    postDay: 1, // Monday
    postTime: '09:00',
    timezone: 'UTC',
    autoPost: true,
  },
  socialSharing: {
    enabled: true,
    platforms: ['reddit', 'twitter'],
    includeScore: true,
    includeRank: true,
    customMessage: 'Just scored {score} points in Color Dot Rush! Can you beat my score?',
  },
  notifications: {
    enabled: true,
    channels: ['modmail'],
    mentionMods: false,
  },
};

const CONFIG_KEY = 'post-configuration';

/**
 * Get current post configuration
 */
export async function getPostConfiguration(): Promise<PostConfiguration> {
  try {
    const configData = await redis.get(CONFIG_KEY);
    if (configData) {
      const parsed = JSON.parse(configData);
      // Merge with defaults to ensure all fields exist
      return {
        dailyChallenge: { ...DEFAULT_CONFIG.dailyChallenge, ...parsed.dailyChallenge },
        weeklyLeaderboard: { ...DEFAULT_CONFIG.weeklyLeaderboard, ...parsed.weeklyLeaderboard },
        socialSharing: { ...DEFAULT_CONFIG.socialSharing, ...parsed.socialSharing },
        notifications: { ...DEFAULT_CONFIG.notifications, ...parsed.notifications },
      };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error getting post configuration:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Update post configuration
 */
export async function updatePostConfiguration(
  updates: Partial<PostConfiguration>
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentConfig = await getPostConfiguration();
    const newConfig = {
      ...currentConfig,
      ...updates,
      dailyChallenge: { ...currentConfig.dailyChallenge, ...updates.dailyChallenge },
      weeklyLeaderboard: { ...currentConfig.weeklyLeaderboard, ...updates.weeklyLeaderboard },
      socialSharing: { ...currentConfig.socialSharing, ...updates.socialSharing },
      notifications: { ...currentConfig.notifications, ...updates.notifications },
    };
    
    await redis.set(CONFIG_KEY, JSON.stringify(newConfig));
    
    console.log('Post configuration updated:', newConfig);
    return { success: true };
  } catch (error) {
    console.error('Error updating post configuration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if daily challenge posting is scheduled
 */
export async function shouldPostDailyChallenge(): Promise<boolean> {
  try {
    const config = await getPostConfiguration();
    
    if (!config.dailyChallenge.autoPost) {
      return false;
    }
    
    const now = new Date();
    const [targetHour, targetMinute] = config.dailyChallenge.postTime.split(':').map(Number);
    
    // Check if current time matches the configured posting time (with 2-hour window)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Allow posting within 2 hours of the target time to handle delays
    const targetTimeInMinutes = (targetHour || 0) * 60 + (targetMinute || 0);
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    // Check if we're within 2 hours of the target time (120 minutes)
    return currentTimeInMinutes >= targetTimeInMinutes && currentTimeInMinutes < targetTimeInMinutes + 120;
  } catch (error) {
    console.error('Error checking daily challenge posting schedule:', error);
    return false;
  }
}

/**
 * Check if weekly leaderboard posting is scheduled
 */
export async function shouldPostWeeklyLeaderboard(): Promise<boolean> {
  try {
    const config = await getPostConfiguration();
    
    if (!config.weeklyLeaderboard.autoPost) {
      return false;
    }
    
    const now = new Date();
    const currentDay = now.getDay();
    const [targetHour, targetMinute] = config.weeklyLeaderboard.postTime.split(':').map(Number);
    
    // Check if current day and time match the configured posting schedule (with 2-hour window)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Allow posting within 2 hours of the target time to handle delays
    const targetTimeInMinutes = (targetHour || 0) * 60 + (targetMinute || 0);
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    return currentDay === config.weeklyLeaderboard.postDay &&
           currentTimeInMinutes >= targetTimeInMinutes &&
           currentTimeInMinutes < targetTimeInMinutes + 120;
  } catch (error) {
    console.error('Error checking weekly leaderboard posting schedule:', error);
    return false;
  }
}

/**
 * Get next scheduled post times
 */
export async function getNextScheduledPosts(): Promise<{
  dailyChallenge?: Date;
  weeklyLeaderboard?: Date;
}> {
  try {
    const config = await getPostConfiguration();
    const now = new Date();
    const result: { dailyChallenge?: Date; weeklyLeaderboard?: Date } = {};
    
    // Calculate next daily challenge post (always enabled)
    const [hour, minute] = config.dailyChallenge.postTime.split(':').map(Number);
    const nextDaily = new Date(now);
    nextDaily.setHours(hour || 0, minute || 0, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (nextDaily <= now) {
      nextDaily.setDate(nextDaily.getDate() + 1);
    }
    
    result.dailyChallenge = nextDaily;
    
    // Calculate next weekly leaderboard post (always enabled)
    const [weeklyHour, weeklyMinute] = config.weeklyLeaderboard.postTime.split(':').map(Number);
    const nextWeekly = new Date(now);
    
    // Find next occurrence of the target day
    const daysUntilTarget = (config.weeklyLeaderboard.postDay - now.getDay() + 7) % 7;
    nextWeekly.setDate(now.getDate() + daysUntilTarget);
    nextWeekly.setHours(weeklyHour || 0, weeklyMinute || 0, 0, 0);
    
    // If time has passed this week, schedule for next week
    if (nextWeekly <= now) {
      nextWeekly.setDate(nextWeekly.getDate() + 7);
    }
    
    result.weeklyLeaderboard = nextWeekly;
    
    return result;
  } catch (error) {
    console.error('Error calculating next scheduled posts:', error);
    return {};
  }
}

/**
 * Get configuration status
 */
export async function getConfigurationStatus(): Promise<{
  dailyChallenge: {
    nextPost: Date | undefined;
    autoPost: boolean;
  };
  weeklyLeaderboard: {
    nextPost: Date | undefined;
    autoPost: boolean;
  };
  socialSharing: {
    enabled: boolean;
    platforms: string[];
  };
}> {
  try {
    const config = await getPostConfiguration();
    const nextPosts = await getNextScheduledPosts();
    
    return {
      dailyChallenge: {
        nextPost: nextPosts.dailyChallenge,
        autoPost: config.dailyChallenge.autoPost,
      },
      weeklyLeaderboard: {
        nextPost: nextPosts.weeklyLeaderboard,
        autoPost: config.weeklyLeaderboard.autoPost,
      },
      socialSharing: {
        enabled: config.socialSharing.enabled,
        platforms: config.socialSharing.platforms,
      },
    };
  } catch (error) {
    console.error('Error getting configuration status:', error);
    return {
      dailyChallenge: { nextPost: undefined, autoPost: false },
      weeklyLeaderboard: { nextPost: undefined, autoPost: false },
      socialSharing: { enabled: false, platforms: [] },
    };
  }
}
