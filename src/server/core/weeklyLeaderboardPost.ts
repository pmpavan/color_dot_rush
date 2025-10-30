import { context, reddit, redis } from '@devvit/web/server';
import { LeaderboardEntry } from '../../shared/types/api';

/**
 * Weekly Leaderboard Post System
 * Automatically creates engaging Reddit posts every Monday showcasing the weekly leaderboard
 */

export interface WeeklyLeaderboardData {
  entries: LeaderboardEntry[];
  totalPlayers: number;
  weekStart: Date;
  weekEnd: Date;
  weekKey: string;
}

export interface WeeklyPostTemplate {
  title: string;
  content: string;
  flair?: string;
}

/**
 * Generate a week key for the previous week (for Monday posts)
 */
function getPreviousWeekKey(): string {
  try {
    const now = new Date();
    // Go back to previous week
    const previousWeek = new Date(now);
    previousWeek.setDate(now.getDate() - 7);
    
    // Get start of that week (Monday)
    const dayOfWeek = previousWeek.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const startOfWeek = new Date(previousWeek);
    startOfWeek.setDate(previousWeek.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error generating previous week key:', error);
    // Fallback to current week if calculation fails
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

/**
 * Get week bounds for display purposes
 */
function getWeekBounds(weekKey: string): { weekStart: Date; weekEnd: Date } {
  try {
    const parts = weekKey.split('-').map(Number);
    const year = parts[0] ?? new Date().getFullYear();
    const month = parts[1] ?? new Date().getMonth() + 1;
    const day = parts[2] ?? new Date().getDate();
    
    const weekStart = new Date(year, month - 1, day);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  } catch (error) {
    console.error('Error calculating week bounds:', error);
    const now = new Date();
    return { 
      weekStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), 
      weekEnd: now 
    };
  }
}

/**
 * Fetch leaderboard data for a specific week
 */
async function fetchWeeklyLeaderboardData(weekKey: string): Promise<WeeklyLeaderboardData | null> {
  try {
    const leaderboardKey = `leaderboard:${weekKey}`;
    
    // Check if leaderboard exists
    const exists = await redis.exists(leaderboardKey);
    if (exists === 0) {
      console.log(`No leaderboard data found for week ${weekKey}`);
      return null;
    }
    
    // Get top 20 scores
    const topScores = await redis.zRange(leaderboardKey, 0, 19, { 
      by: 'rank', 
      reverse: true 
    });
    
    // Get total player count
    const totalPlayers = await redis.zCard(leaderboardKey);
    
    // Process entries
    const entries: LeaderboardEntry[] = topScores.map((entry, index) => {
      const parts = entry.member.split(':');
      let username = 'Unknown';
      let timestamp = Date.now();
      
      if (parts.length >= 3) {
        username = parts[1] || 'Unknown';
        timestamp = parseInt(parts[2] || '0') || Date.now();
      } else if (parts.length === 2) {
        username = parts[1] || 'Unknown';
      }
      
      return {
        username,
        score: entry.score,
        timestamp,
        rank: index + 1,
      };
    });
    
    const { weekStart, weekEnd } = getWeekBounds(weekKey);
    
    return {
      entries,
      totalPlayers,
      weekStart,
      weekEnd,
      weekKey,
    };
  } catch (error) {
    console.error('Error fetching weekly leaderboard data:', error);
    return null;
  }
}

/**
 * Generate engaging post content with leaderboard data
 */
function generateWeeklyPostContent(data: WeeklyLeaderboardData): WeeklyPostTemplate {
  const { entries, totalPlayers, weekStart, weekEnd } = data;
  
  // Format dates for display
  const weekStartStr = weekStart.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Generate title with emoji and excitement
  const title = `🏆 Weekly Color Dot Rush Leaderboard - ${weekStartStr} to ${weekEndStr}`;
  
  // Build leaderboard table
  let leaderboardTable = '';
  if (entries.length > 0) {
    leaderboardTable = '## 🎯 Top Players This Week\n\n';
    leaderboardTable += '| Rank | Player | Score |\n';
    leaderboardTable += '|------|--------|-------|\n';
    
    entries.forEach((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const rankDisplay = medal ? `${medal} ${entry.rank}` : entry.rank;
      leaderboardTable += `| ${rankDisplay} | u/${entry.username} | ${entry.score.toLocaleString()} |\n`;
    });
  }
  
  // Generate engaging content
  const content = `# 🎮 Color Dot Rush Weekly Results

**Week of ${weekStartStr} - ${weekEndStr}**

${leaderboardTable}

## 📊 Weekly Stats
- **Total Players:** ${totalPlayers.toLocaleString()}
- **Top Score:** ${entries[0]?.score.toLocaleString() ?? 'N/A'}
- **Average Score:** ${entries.length > 0 ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length).toLocaleString() : 'N/A'}

## 🎯 How to Play
- Tap the **correct colored dots** to score points
- Avoid **bombs** and **wrong colors** 
- Use **slow-motion power-ups** strategically
- Compete for the **weekly leaderboard**!

## 🏆 Next Week's Challenge
The leaderboard resets every Monday! Can you beat this week's top score of **${entries[0]?.score.toLocaleString() ?? '0'}**?

---

*Play Color Dot Rush and see if you can make it to next week's leaderboard!* 🚀

**Good luck, and may the fastest fingers win!** ⚡`;

  return {
    title,
    content,
    flair: 'Weekly Leaderboard',
  };
}

/**
 * Create the weekly leaderboard post
 */
export async function createWeeklyLeaderboardPost(): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required');
    }
    
    console.log('Creating weekly leaderboard post...');
    
    // Get previous week's data (since we're posting on Monday)
    const previousWeekKey = getPreviousWeekKey();
    console.log(`Fetching leaderboard data for week: ${previousWeekKey}`);
    
    const leaderboardData = await fetchWeeklyLeaderboardData(previousWeekKey);
    
    if (!leaderboardData) {
      console.log('No leaderboard data available for weekly post');
      return {
        success: false,
        error: 'No leaderboard data available for the previous week',
      };
    }
    
    if (leaderboardData.entries.length === 0) {
      console.log('No players in leaderboard for weekly post');
      return {
        success: false,
        error: 'No players participated in the previous week',
      };
    }
    
    // Generate post content
    const postTemplate = generateWeeklyPostContent(leaderboardData);
    
    console.log('Post template generated:', {
      title: postTemplate.title,
      contentLength: postTemplate.content.length,
      totalPlayers: leaderboardData.totalPlayers,
    });
    
    // Create the Reddit post
    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: postTemplate.title,
      text: postTemplate.content,
      ...(postTemplate.flair && { flairId: postTemplate.flair }),
    });
    
    console.log(`Weekly leaderboard post created successfully: ${post.id}`);
    
    return {
      success: true,
      postId: post.id,
    };
    
  } catch (error) {
    console.error('Error creating weekly leaderboard post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if it's time to post the weekly leaderboard (Mondays)
 */
export function shouldPostWeeklyLeaderboard(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours();
  
  // Post on Mondays between 9 AM and 11 AM (to avoid spam)
  return dayOfWeek === 1 && hour >= 9 && hour < 11;
}

/**
 * Get the next scheduled post time
 */
export function getNextWeeklyPostTime(): Date {
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
