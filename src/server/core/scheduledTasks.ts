import { createWeeklyLeaderboardPost, shouldPostWeeklyLeaderboard } from './weeklyLeaderboardPost';
import { createDailyChallengePost, shouldPostDailyChallenge } from './dailyChallengePost';
import { shouldPostDailyChallenge as shouldPostDailyChallengeConfig, shouldPostWeeklyLeaderboard as shouldPostWeeklyLeaderboardConfig } from './postConfiguration';

/**
 * Scheduled Tasks System
 * Handles automated tasks like weekly leaderboard posts
 * 
 * Note: Since Devvit doesn't have built-in cron jobs, this system
 * can be triggered by external services or manual calls
 */

export interface ScheduledTaskResult {
  success: boolean;
  taskName: string;
  executedAt: Date;
  result?: any;
  error?: string;
}

/**
 * Execute all scheduled tasks
 * This should be called periodically (e.g., every hour) by an external service
 */
export async function executeScheduledTasks(): Promise<ScheduledTaskResult[]> {
  const results: ScheduledTaskResult[] = [];
  const now = new Date();
  
  // Task 1: Daily Challenge Post (DISABLED - keeping code for future use)
  try {
    const shouldPostDaily = false; // Disabled - check config: await shouldPostDailyChallengeConfig();
    if (shouldPostDaily) {
      const result = await createDailyChallengePost();
      
      results.push({
        success: result.success,
        taskName: 'daily-challenge-post',
        executedAt: now,
        result: result,
        ...(result.error && { error: result.error }),
      });
    } else {
      results.push({
        success: true,
        taskName: 'daily-challenge-post',
        executedAt: now,
        result: { skipped: true, reason: 'Not scheduled time' },
      });
    }
  } catch (error) {
    console.error('Error executing daily challenge post task:', error);
    results.push({
      success: false,
      taskName: 'daily-challenge-post',
      executedAt: now,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Task 2: Weekly Leaderboard Post
  try {
    const shouldPostWeekly = true; //await shouldPostWeeklyLeaderboardConfig();
    if (shouldPostWeekly) {
      const result = await createWeeklyLeaderboardPost();
      
      results.push({
        success: result.success,
        taskName: 'weekly-leaderboard-post',
        executedAt: now,
        result: result,
        ...(result.error && { error: result.error }),
      });
    } else {
      results.push({
        success: true,
        taskName: 'weekly-leaderboard-post',
        executedAt: now,
        result: { skipped: true, reason: 'Not scheduled time' },
      });
    }
  } catch (error) {
    console.error('Error executing weekly leaderboard post task:', error);
    results.push({
      success: false,
      taskName: 'weekly-leaderboard-post',
      executedAt: now,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  return results;
}

/**
 * Get status of all scheduled tasks
 */
export async function getScheduledTasksStatus(): Promise<{
  tasks: Array<{
    name: string;
    description: string;
    nextRun: Date;
    isEnabled: boolean;
  }>;
  lastExecution?: Date;
}> {
  try {
    const { getNextScheduledPosts } = await import('./postConfiguration');
    const nextPosts = await getNextScheduledPosts();
    
    return {
      tasks: [
        {
          name: 'daily-challenge-post',
          description: 'Posts daily challenge every day at 8 AM',
          nextRun: nextPosts.dailyChallenge || new Date(),
          isEnabled: false, // Disabled - keeping code for future use
        },
        {
          name: 'weekly-leaderboard-post',
          description: 'Posts weekly leaderboard every Monday at 9 AM',
          nextRun: nextPosts.weeklyLeaderboard || new Date(),
          isEnabled: true,
        },
        // Add more tasks here as they're implemented
      ],
      // lastExecution would be stored in Redis in a real implementation
    };
  } catch (error) {
    console.error('Error getting scheduled tasks status:', error);
    return {
      tasks: [
        {
          name: 'daily-challenge-post',
          description: 'Posts daily challenge every day at 8 AM',
          nextRun: new Date(),
          isEnabled: false,
        },
        {
          name: 'weekly-leaderboard-post',
          description: 'Posts weekly leaderboard every Monday at 9 AM',
          nextRun: new Date(),
          isEnabled: false,
        },
      ],
    };
  }
}

/**
 * Get next weekly post time (helper function)
 */
function getNextWeeklyPostTime(): Date {
  const now = new Date();
  const nextMonday = new Date(now);
  
  // Calculate days until next Monday
  const daysUntilMonday = (1 - now.getDay() + 7) % 7;
  if (daysUntilMonday === 0 && now.getHours() >= 11) {
    // If it's Monday but past 11 AM, schedule for next Monday
    nextMonday.setDate(now.getDate() + 7);
  } else {
    nextMonday.setDate(now.getDate() + daysUntilMonday);
  }
  
  // Set to 9 AM
  nextMonday.setHours(9, 0, 0, 0);
  
  return nextMonday;
}
