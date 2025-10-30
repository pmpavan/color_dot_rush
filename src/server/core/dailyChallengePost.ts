import { context, reddit, redis } from '@devvit/web/server';

/**
 * Daily Challenge Post System
 * Creates engaging daily challenge posts to drive community engagement
 */

export interface DailyChallengeData {
  challengeId: string;
  challengeType: string;
  description: string;
  targetScore: number;
  bonusMultiplier: number;
  startDate: Date;
  endDate: Date;
  participants: number;
  topParticipants: Array<{
    username: string;
    score: number;
    rank: number;
  }>;
}

export interface DailyPostTemplate {
  title: string;
  content: string;
  flair?: string;
}

/**
 * Daily challenge types and configurations
 */
const DAILY_CHALLENGES = {
  SPEED_DEMON: {
    name: 'Speed Demon',
    description: 'Score 100+ points in under 60 seconds!',
    targetScore: 100,
    timeLimit: 60,
    bonusMultiplier: 1.5,
  },
  PERFECTIONIST: {
    name: 'Perfectionist',
    description: 'Get 50+ points without missing a single tap!',
    targetScore: 50,
    accuracyRequired: true,
    bonusMultiplier: 2.0,
  },
  BOMB_DODGER: {
    name: 'Bomb Dodger',
    description: 'Survive 2+ minutes with 5+ bombs on screen!',
    targetScore: 0,
    survivalTime: 120,
    bombCount: 5,
    bonusMultiplier: 1.8,
  },
  COLOR_MASTER: {
    name: 'Color Master',
    description: 'Score 200+ points with only blue and green dots!',
    targetScore: 200,
    allowedColors: ['blue', 'green'],
    bonusMultiplier: 1.3,
  },
  ENDURANCE: {
    name: 'Endurance Runner',
    description: 'Play for 5+ minutes and score 300+ points!',
    targetScore: 300,
    minDuration: 300,
    bonusMultiplier: 1.2,
  },
};

/**
 * Get today's challenge type based on day of week
 */
function getTodaysChallengeType(): string {
  const dayOfWeek = new Date().getDay();
  const challengeTypes = Object.keys(DAILY_CHALLENGES);
  return challengeTypes[dayOfWeek % challengeTypes.length] ?? challengeTypes[0] ?? 'SPEED_DEMON';
}

/**
 * Generate a unique challenge ID for today
 */
function generateChallengeId(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `challenge-${year}-${month}-${day}`;
}

/**
 * Get challenge data for today
 */
function getTodaysChallenge(): DailyChallengeData {
  const challengeType = getTodaysChallengeType();
  const challenge = DAILY_CHALLENGES[challengeType as keyof typeof DAILY_CHALLENGES];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    challengeId: generateChallengeId(),
    challengeType: challengeType,
    description: challenge.description,
    targetScore: challenge.targetScore,
    bonusMultiplier: challenge.bonusMultiplier,
    startDate: today,
    endDate: tomorrow,
    participants: 0,
    topParticipants: [],
  };
}

/**
 * Fetch daily challenge participation data
 */
async function fetchDailyChallengeData(challengeId: string): Promise<DailyChallengeData | null> {
  try {
    const challengeKey = `daily-challenge:${challengeId}`;
    
    // Check if challenge exists
    const exists = await redis.exists(challengeKey);
    if (exists === 0) {
      console.log(`No daily challenge data found for ${challengeId}`);
      return null;
    }
    
    // Get challenge metadata
    const challengeData = await redis.hGetAll(challengeKey);
    const participants = await redis.zCard(`${challengeKey}:participants`);
    
    // Get top 10 participants
    const topParticipants = await redis.zRange(`${challengeKey}:participants`, 0, 9, {
      by: 'rank',
      reverse: true,
    });
    
    const topParticipantsList = topParticipants.map((entry, index) => {
      const parts = entry.member.split(':');
      const username = parts[1] || 'Unknown';
      return {
        username,
        score: entry.score,
        rank: index + 1,
      };
    });
    
    return {
      challengeId,
      challengeType: challengeData.challengeType || 'UNKNOWN',
      description: challengeData.description || 'Daily Challenge',
      targetScore: parseInt(challengeData.targetScore || '0'),
      bonusMultiplier: parseFloat(challengeData.bonusMultiplier || '1.0'),
      startDate: new Date(challengeData.startDate || Date.now()),
      endDate: new Date(challengeData.endDate || Date.now() + 24 * 60 * 60 * 1000),
      participants,
      topParticipants: topParticipantsList,
    };
  } catch (error) {
    console.error('Error fetching daily challenge data:', error);
    return null;
  }
}

/**
 * Generate engaging daily challenge post content
 */
function generateDailyChallengePostContent(challenge: DailyChallengeData): DailyPostTemplate {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  // Generate title with emoji and excitement
  const title = `🎯 Daily Challenge - ${challenge.challengeType} - ${dateStr}`;
  
  // Build challenge description
  let challengeDescription = `## 🏆 Today's Challenge: ${challenge.challengeType}\n\n`;
  challengeDescription += `**${challenge.description}**\n\n`;
  challengeDescription += `- **Target Score:** ${challenge.targetScore.toLocaleString()} points\n`;
  challengeDescription += `- **Bonus Multiplier:** ${challenge.bonusMultiplier}x\n`;
  challengeDescription += `- **Challenge ID:** \`${challenge.challengeId}\`\n\n`;
  
  // Add leaderboard if participants exist
  let leaderboardSection = '';
  if (challenge.participants > 0) {
    leaderboardSection = `## 🏅 Current Leaderboard\n\n`;
    leaderboardSection += `**${challenge.participants} players participating!**\n\n`;
    
    if (challenge.topParticipants.length > 0) {
      leaderboardSection += '| Rank | Player | Score |\n';
      leaderboardSection += '|------|--------|-------|\n';
      
      challenge.topParticipants.forEach((participant, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        const rankDisplay = medal ? `${medal} ${participant.rank}` : participant.rank;
        leaderboardSection += `| ${rankDisplay} | u/${participant.username} | ${participant.score.toLocaleString()} |\n`;
      });
    }
    leaderboardSection += '\n';
  } else {
    leaderboardSection = `## 🚀 Be the First!\n\n`;
    leaderboardSection += `No participants yet! Be the first to complete today's challenge!\n\n`;
  }
  
  // Generate engaging content
  const content = `# 🎮 Daily Color Dot Rush Challenge

${challengeDescription}

${leaderboardSection}

## 🎯 How to Participate

1. **Play Color Dot Rush** - Start a new game
2. **Complete the Challenge** - Meet the requirements above
3. **Submit Your Score** - Your score will be automatically tracked
4. **Compete for the Top Spot** - See your name on the leaderboard!

## 🏆 Rewards

- **🏅 Top 3 Players** - Featured in tomorrow's challenge post
- **⭐ Bonus Points** - ${challenge.bonusMultiplier}x multiplier for challenge completion
- **🎖️ Achievement Badges** - Unlock special badges for consistent participation
- **👑 Weekly Champion** - Best daily challenge performer gets special recognition

## ⏰ Challenge Rules

- **Duration:** 24 hours (resets at midnight UTC)
- **Eligibility:** All players can participate
- **Scoring:** Your best attempt counts
- **Fair Play:** No cheating or exploits allowed

## 🎪 Special Features

- **Daily Variety** - Different challenges every day of the week
- **Progressive Difficulty** - Challenges get more interesting over time
- **Community Competition** - See how you stack up against other players
- **Achievement System** - Unlock rewards for consistent participation

---

**Good luck, and may the fastest fingers win!** ⚡

*Challenge ends at midnight UTC. New challenge starts tomorrow!* 🌅`;

  return {
    title,
    content,
    flair: 'Daily Challenge',
  };
}

/**
 * Create the daily challenge post
 */
export async function createDailyChallengePost(): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      throw new Error('subredditName is required');
    }
    
    console.log('Creating daily challenge post...');
    
    // Get today's challenge
    const todaysChallenge = getTodaysChallenge();
    const challengeId = todaysChallenge.challengeId;
    
    // Try to fetch existing challenge data
    let challengeData = await fetchDailyChallengeData(challengeId);
    
    // If no existing data, use the default challenge
    if (!challengeData) {
      challengeData = todaysChallenge;
      console.log('No existing challenge data, using default challenge');
    }
    
    // Generate post content
    const postTemplate = generateDailyChallengePostContent(challengeData);
    
    console.log('Daily challenge post template generated:', {
      title: postTemplate.title,
      contentLength: postTemplate.content.length,
      participants: challengeData.participants,
    });
    
    // Create the Reddit post
    const post = await reddit.submitPost({
      subredditName: subredditName,
      title: postTemplate.title,
      text: postTemplate.content,
      ...(postTemplate.flair && { flairId: postTemplate.flair }),
    });
    
    console.log(`Daily challenge post created successfully: ${post.id}`);
    
    return {
      success: true,
      postId: post.id,
    };
    
  } catch (error) {
    console.error('Error creating daily challenge post:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if it's time to post the daily challenge (every day at 8 AM)
 */
export function shouldPostDailyChallenge(): boolean {
  const now = new Date();
  const hour = now.getHours();
  
  // Post every day between 8 AM and 10 AM (to avoid spam)
  return hour >= 8 && hour < 10;
}

/**
 * Get the next scheduled daily post time
 */
export function getNextDailyPostTime(): Date {
  const now = new Date();
  const nextPost = new Date(now);
  
  // If it's past 10 AM, schedule for tomorrow at 8 AM
  if (now.getHours() >= 10) {
    nextPost.setDate(now.getDate() + 1);
  }
  
  // Set to 8 AM
  nextPost.setHours(8, 0, 0, 0);
  
  return nextPost;
}

/**
 * Submit a daily challenge score
 */
export async function submitDailyChallengeScore(
  challengeId: string,
  userId: string,
  username: string,
  score: number
): Promise<{ success: boolean; rank?: number; error?: string }> {
  try {
    const challengeKey = `daily-challenge:${challengeId}`;
    const participantsKey = `${challengeKey}:participants`;
    
    // Store participant score
    const userScoreEntry = `${userId}:${username}:${Date.now()}`;
    await redis.zAdd(participantsKey, { member: userScoreEntry, score });
    
    // Set expiration for challenge data (2 days to handle timezone issues)
    await redis.expire(challengeKey, 2 * 24 * 60 * 60);
    await redis.expire(participantsKey, 2 * 24 * 60 * 60);
    
    // Calculate user's rank
    const rank = await redis.zRank(participantsKey, userScoreEntry);
    const totalParticipants = await redis.zCard(participantsKey);
    const userRank = rank !== undefined ? totalParticipants - rank : undefined;
    
    console.log(`Daily challenge score submitted: ${score} by ${username}, rank: ${userRank}`);
    
    return {
      success: true,
      ...(userRank !== undefined && { rank: userRank }),
    };
    
  } catch (error) {
    console.error('Error submitting daily challenge score:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get today's challenge information
 */
export function getTodaysChallengeInfo(): DailyChallengeData {
  return getTodaysChallenge();
}
