import express from 'express';
import {
  SubmitScoreRequest,
  SubmitScoreResponse,
  LeaderboardResponse,
  LeaderboardEntry,
} from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost } from './core/post';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Color Rush API Endpoints

router.post<Record<string, never>, SubmitScoreResponse, SubmitScoreRequest>(
  '/api/submit-score',
  async (req, res): Promise<void> => {
    const startTime = Date.now();
    const { postId, userId } = context;

    // Automatic Reddit user authentication through Devvit middleware
    if (!postId || !userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required - missing user context',
      });
      return;
    }

    try {
      // Input validation using helper function
      const validation = validateScoreSubmission(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: validation.error || 'Invalid request data',
        });
        return;
      }

      const { score, sessionTime } = req.body;
      
      // Log session time for analytics (prevents unused variable warning)
      console.log(`Score submission: ${score} points in ${sessionTime}ms session`);

      // Get Reddit username for the authenticated user
      let username: string;
      try {
        const user = await reddit.getUserById(userId);
        if (!user) {
          throw new Error('User not found');
        }
        username = user.username;
      } catch (userError) {
        console.error('Error fetching user data:', userError);
        res.status(500).json({
          success: false,
          message: 'Failed to authenticate user',
        });
        return;
      }

      // Store score in Redis with weekly leaderboard key
      const weekKey = `leaderboard:${getWeekKey()}`;
      const timestamp = Date.now();
      const userScoreEntry = `${userId}:${username}:${timestamp}`;

      // Use Redis transaction for atomic operations with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Start transaction
          const txn = await redis.watch(weekKey);
          await txn.multi();
          
          // Add score to weekly leaderboard (higher scores rank higher)
          await txn.zAdd(weekKey, { member: userScoreEntry, score });
          
          // Set expiration for weekly leaderboard (8 days to handle week transitions)
          await txn.expire(weekKey, 8 * 24 * 60 * 60); // 8 days in seconds
          
          // Execute transaction
          await txn.exec();
          break;
        } catch (redisError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw redisError;
          }
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount - 1)));
        }
      }

      // Calculate user's current rank in the leaderboard
      let userRank: number | null = null;
      try {
        const rank = await redis.zRank(weekKey, userScoreEntry);
        if (rank !== undefined) {
          // Redis zRank returns 0-based rank (lowest score = rank 0)
          // For leaderboard, we want 1-based rank with highest score = rank 1
          const totalPlayers = await redis.zCard(weekKey);
          userRank = totalPlayers - rank;
        }
      } catch (rankError) {
        console.warn('Could not calculate user rank:', rankError);
        // Don't fail the request if rank calculation fails
      }

      // Check for 30-second timeout compliance
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > 25000) { // 25 seconds to leave buffer
        console.warn(`Score submission took ${elapsedTime}ms - approaching timeout`);
      }

      res.json({
        success: true,
        ...(userRank !== null && { rank: userRank }),
        message: 'Score submitted successfully',
      });

    } catch (error) {
      console.error('Error submitting score:', error);
      
      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > 25000) {
        res.status(408).json({
          success: false,
          message: 'Request timeout - please try again',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to submit score - please try again',
        });
      }
    }
  }
);

router.get<Record<string, never>, LeaderboardResponse>(
  '/api/get-leaderboard',
  async (req, res): Promise<void> => {
    const startTime = Date.now();
    const { userId } = context;

    try {
      const weekKey = `leaderboard:${getWeekKey()}`;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50); // Max 50 entries

      let entries: LeaderboardEntry[] = [];
      let userRank: number | null = null;
      let totalPlayers = 0;

      // Retry logic for Redis operations
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          // Get top scores (highest first) with retry logic
          const topScores = await redis.zRange(weekKey, 0, limit - 1, { 
            by: 'rank', 
            reverse: true 
          });

          // Get total player count
          totalPlayers = await redis.zCard(weekKey);

          // Process entries and extract usernames from Redis keys
          entries = topScores.map((entry, index) => {
            // Parse the Redis key format: userId:username:timestamp
            const parts = entry.member.split(':');
            let username = 'Unknown';
            let timestamp = Date.now();
            
            if (parts.length >= 3) {
              username = parts[1] || 'Unknown';
              timestamp = parseInt(parts[2] || '0') || Date.now();
            } else if (parts.length === 2) {
              // Fallback for older format
              username = parts[1] || 'Unknown';
            }

            return {
              username,
              score: entry.score,
              timestamp,
              rank: index + 1,
            };
          });

          // Calculate current user's rank if authenticated
          if (userId) {
            try {
              // Find user's best score in the leaderboard
              const userEntries = await redis.zRange(weekKey, 0, -1, { by: 'rank' });
              const userScoreEntries = userEntries.filter(entry => 
                entry.member.startsWith(`${userId}:`)
              );
              
              if (userScoreEntries.length > 0) {
                // Get the highest score entry for this user
                const bestUserEntry = userScoreEntries.reduce((best, current) => 
                  current.score > best.score ? current : best
                );
                
                const rank = await redis.zRank(weekKey, bestUserEntry.member);
                if (rank !== undefined) {
                  // Convert to 1-based rank with highest score = rank 1
                  userRank = totalPlayers - rank;
                }
              }
            } catch (rankError) {
              console.warn('Could not calculate user rank:', rankError);
              // Don't fail the request if rank calculation fails
            }
          }

          break; // Success, exit retry loop

        } catch (redisError) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw redisError;
          }
          
          // Exponential backoff: 100ms, 200ms, 400ms
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retryCount - 1)));
          
          // Check for timeout
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > 25000) { // 25 seconds to leave buffer
            throw new Error('Request timeout during retry');
          }
        }
      }

      // Check for 30-second timeout compliance
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > 25000) {
        console.warn(`Leaderboard fetch took ${elapsedTime}ms - approaching timeout`);
      }

      res.json({
        entries,
        ...(userRank !== null && { userRank }),
        totalPlayers,
      });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      
      // Check if we're approaching timeout
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > 25000) {
        res.status(408).json({
          entries: [],
          totalPlayers: 0,
        });
      } else {
        // Graceful degradation - return empty leaderboard instead of failing
        res.status(200).json({
          entries: [],
          totalPlayers: 0,
        });
      }
    }
  }
);

// Helper function to get current week key for leaderboard
function getWeekKey(): string {
  try {
    const now = new Date();
    // Get start of week (Sunday = 0, Monday = 1, etc.)
    // We'll use Monday as start of week for consistency
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0 days, Sunday = 6 days
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysToSubtract);
    startOfWeek.setHours(0, 0, 0, 0); // Reset to start of day
    
    // Format as YYYY-MM-DD for consistent weekly keys
    const year = startOfWeek.getFullYear();
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error generating week key:', error);
    // Fallback to current date if week calculation fails
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Helper function to get week start and end dates for API responses
function getWeekBounds(): { weekStart: Date; weekEnd: Date } {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);
    
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

// Helper function to validate and sanitize user input
function validateScoreSubmission(body: any): { isValid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body is required' };
  }

  const { score, sessionTime } = body;

  if (typeof score !== 'number') {
    return { isValid: false, error: 'Score must be a number' };
  }

  if (score < 0 || score > 1000000) { // Reasonable upper limit
    return { isValid: false, error: 'Score must be between 0 and 1,000,000' };
  }

  if (!Number.isInteger(score)) {
    return { isValid: false, error: 'Score must be an integer' };
  }

  if (typeof sessionTime !== 'number') {
    return { isValid: false, error: 'Session time must be a number' };
  }

  if (sessionTime < 0 || sessionTime > 3600000) { // Max 1 hour session
    return { isValid: false, error: 'Session time must be between 0 and 3,600,000 milliseconds' };
  }

  return { isValid: true };
}

// Additional leaderboard metadata endpoint
router.get('/api/leaderboard-info', async (_req, res): Promise<void> => {
  try {
    const weekKey = `leaderboard:${getWeekKey()}`;
    const { weekStart, weekEnd } = getWeekBounds();
    
    const totalPlayers = await redis.zCard(weekKey);
    
    res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      totalPlayers,
      weekKey: getWeekKey(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard info:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard information',
    });
  }
});

// Internal cleanup endpoint for old leaderboard data (called by scheduled tasks)
router.post('/internal/cleanup-leaderboards', async (_req, res): Promise<void> => {
  try {
    // Since Devvit Redis doesn't support keys() command, we'll track leaderboard keys
    // in a separate set and clean up based on date calculation
    const currentWeekKey = `leaderboard:${getWeekKey()}`;
    let cleanedCount = 0;
    
    // Calculate keys for the last 8 weeks and clean up older ones
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 56); // Keep 8 weeks of data
    
    // Generate potential old keys to clean up (check last 12 weeks)
    for (let weeksBack = 9; weeksBack <= 12; weeksBack++) {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (weeksBack * 7));
      
      // Calculate week key for this old date
      const dayOfWeek = oldDate.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(oldDate);
      startOfWeek.setDate(oldDate.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const year = startOfWeek.getFullYear();
      const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const day = String(startOfWeek.getDate()).padStart(2, '0');
      const oldWeekKey = `leaderboard:${year}-${month}-${day}`;
      
      if (oldWeekKey !== currentWeekKey && startOfWeek < cutoffDate) {
        try {
          // Check if key exists before trying to delete
          const exists = await redis.exists(oldWeekKey);
          if (exists > 0) {
            await redis.del(oldWeekKey);
            cleanedCount++;
          }
        } catch (deleteError) {
          console.warn(`Failed to delete old leaderboard key ${oldWeekKey}:`, deleteError);
        }
      }
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old leaderboard entries`,
      cleanedCount,
    });
  } catch (error) {
    console.error('Error cleaning up leaderboards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old leaderboards',
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
