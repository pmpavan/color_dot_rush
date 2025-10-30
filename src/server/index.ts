import express from 'express';
import {
  SubmitScoreRequest,
  SubmitScoreResponse,
  LeaderboardResponse,
  LeaderboardEntry,
} from '../shared/types/api';
import { redis, createServer, context, reddit } from '@devvit/web/server';
import { createPost } from './core/post';
import { createWeeklyLeaderboardPost, shouldPostWeeklyLeaderboard, getNextWeeklyPostTime } from './core/weeklyLeaderboardPost';
import { createDailyChallengePost, shouldPostDailyChallenge, submitDailyChallengeScore, getTodaysChallengeInfo } from './core/dailyChallengePost';
import { executeScheduledTasks, getScheduledTasksStatus } from './core/scheduledTasks';
import { shareScore, getAvailablePlatforms, getShareStatistics } from './core/socialSharing';
import { getPostConfiguration, updatePostConfiguration, getConfigurationStatus } from './core/postConfiguration';
import { createModToolsMenu, getSystemStatus, executeModAction, createModToolsStatusPost } from './core/modTools';

const app = express();

// Log server startup
console.log('=== SERVER STARTUP ===');
console.log('Server starting at:', new Date().toISOString());
console.log('App name: color-dot-rush');

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

// Logging middleware to track all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const router = express.Router();

// Color Dot Rush API Endpoints

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
    console.log('=== MENU POST-CREATE TRIGGERED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Context subreddit:', context.subredditName);
    console.log('Request body:', JSON.stringify(_req.body));
    
    const post = await createPost();
    
    console.log('=== POST CREATED SUCCESSFULLY ===');
    console.log('Post ID:', post.id);
    console.log('Post URL:', `https://reddit.com/r/${context.subredditName}/comments/${post.id}`);

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error('=== MENU POST-CREATE ERROR ===');
    console.error(`Error creating post: ${error}`);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Test endpoint for debugging
router.get('/internal/test-mod-tools', async (_req, res): Promise<void> => {
  try {
    console.log('Test mod tools endpoint called');
    res.json({
      success: true,
      message: 'Mod tools test endpoint working',
      subredditName: context.subredditName,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test endpoint failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Mod tools web interface endpoint
router.get('/mod-tools', async (_req, res): Promise<void> => {
  try {
    console.log('Serving mod tools web interface...');
    
    const modToolsHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Color Rush Mod Tools</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 {
            color: #667eea;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #28a745;
        }
        .status-card h3 {
            margin: 0 0 10px 0;
            color: #495057;
        }
        .status-card p {
            margin: 5px 0;
            color: #6c757d;
        }
        .endpoint-list {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .endpoint-list h3 {
            margin-top: 0;
            color: #495057;
        }
        .endpoint {
            background: white;
            border-radius: 4px;
            padding: 10px;
            margin: 10px 0;
            border-left: 3px solid #007bff;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .config-examples {
            background: #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .config-examples h3 {
            margin-top: 0;
            color: #495057;
        }
        .code-block {
            background: #2d3748;
            color: #e2e8f0;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
        }
        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .action-button {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background 0.2s;
        }
        .action-button:hover {
            background: #0056b3;
        }
        .action-button:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Color Rush Mod Tools</h1>
        
        <div class="status-grid">
            <div class="status-card">
                <h3>🎯 Daily Challenge</h3>
                <p><strong>Status:</strong> ✅ Enabled</p>
                <p><strong>Next Post:</strong> Every day at 8:00 AM UTC</p>
                <p><strong>Types:</strong> Speed Demon, Perfectionist, Bomb Dodger, Color Master, Endurance</p>
            </div>
            
            <div class="status-card">
                <h3>📈 Weekly Leaderboard</h3>
                <p><strong>Status:</strong> ✅ Enabled</p>
                <p><strong>Next Post:</strong> Every Monday at 9:00 AM UTC</p>
                <p><strong>Features:</strong> Top 20 players, weekly statistics</p>
            </div>
            
            <div class="status-card">
                <h3>📱 Social Sharing</h3>
                <p><strong>Status:</strong> ✅ Enabled</p>
                <p><strong>Platforms:</strong> Reddit, Twitter, Discord</p>
                <p><strong>Features:</strong> Score sharing, rank display</p>
            </div>
        </div>

        <div class="quick-actions">
            <button id="daily-challenge-btn" name="daily-challenge-btn" class="action-button" onclick="executeTask('daily-challenge')" aria-label="Create Daily Challenge Post">Create Daily Challenge Post</button>
            <button id="weekly-leaderboard-btn" name="weekly-leaderboard-btn" class="action-button" onclick="executeTask('weekly-leaderboard')" aria-label="Create Weekly Leaderboard Post">Create Weekly Leaderboard Post</button>
            <button id="execute-all-btn" name="execute-all-btn" class="action-button" onclick="executeTask('execute-all')" aria-label="Execute All Scheduled Tasks">Execute All Tasks</button>
            <button id="check-status-btn" name="check-status-btn" class="action-button" onclick="checkStatus()" aria-label="Check System Status">Check System Status</button>
        </div>

        <div class="endpoint-list">
            <h3>🎛️ API Endpoints</h3>
            <div class="endpoint">GET /api/post-configuration - View current configuration</div>
            <div class="endpoint">POST /api/post-configuration - Update configuration</div>
            <div class="endpoint">GET /api/configuration-status - View system status</div>
            <div class="endpoint">GET /internal/scheduled-tasks-status - Check task status</div>
            <div class="endpoint">GET /api/share-statistics - View sharing statistics</div>
            <div class="endpoint">GET /api/daily-challenge-info - View challenge info</div>
        </div>

        <div class="config-examples">
            <h3>📝 Configuration Examples</h3>
            
            <h4>Disable Daily Challenges:</h4>
            <div class="code-block">
{
  "dailyChallenge": {
    "enabled": false
  }
}
            </div>
            
            <h4>Change Posting Times:</h4>
            <div class="code-block">
{
  "dailyChallenge": {
    "postTime": "10:00"
  },
  "weeklyLeaderboard": {
    "postTime": "11:00"
  }
}
            </div>
            
            <h4>Disable Social Sharing:</h4>
            <div class="code-block">
{
  "socialSharing": {
    "enabled": false
  }
}
            </div>
        </div>
    </div>

    <script>
        async function executeTask(taskType) {
            const button = event.target;
            button.disabled = true;
            button.textContent = 'Executing...';
            
            try {
                let endpoint = '';
                switch(taskType) {
                    case 'daily-challenge':
                        endpoint = '/internal/daily-challenge-post';
                        break;
                    case 'weekly-leaderboard':
                        endpoint = '/internal/weekly-leaderboard-post';
                        break;
                    case 'execute-all':
                        endpoint = '/internal/execute-scheduled-tasks';
                        break;
                }
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    alert('Task executed successfully!');
                } else {
                    alert('Task failed. Check console for details.');
                }
            } catch (error) {
                alert('Error executing task: ' + error.message);
            } finally {
                button.disabled = false;
                button.textContent = button.textContent.replace('Executing...', '');
            }
        }
        
        async function checkStatus() {
            try {
                const response = await fetch('/internal/scheduled-tasks-status');
                const data = await response.json();
                alert('System Status: ' + JSON.stringify(data, null, 2));
            } catch (error) {
                alert('Error checking status: ' + error.message);
            }
        }
    </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(modToolsHTML);
    
  } catch (error) {
    console.error('Error serving mod tools interface:', error);
    res.status(500).send('Error loading mod tools interface');
  }
});

router.post('/internal/menu/mod-tools', async (_req, res): Promise<void> => {
  try {
    console.log('Mod tools menu action triggered');
    
    const { subredditName } = context;
    if (!subredditName) {
      console.error('subredditName is missing from context');
      throw new Error('subredditName is required');
    }
    
    console.log(`Creating mod tools post for subreddit: ${subredditName}`);

    // Create a comprehensive mod tools status post
    const title = `🔧 Color Rush Mod Tools - System Status`;
    
    const content = `# 🔧 Color Rush Mod Tools - System Status

## 📊 Current System Status

### 🎯 Daily Challenge
- **Status**: ✅ Enabled
- **Next Post**: Every day at 8:00 AM UTC
- **Challenge Types**: Speed Demon, Perfectionist, Bomb Dodger, Color Master, Endurance

### 📈 Weekly Leaderboard  
- **Status**: ✅ Enabled
- **Next Post**: Every Monday at 9:00 AM UTC
- **Features**: Top 20 players, weekly statistics, community engagement

### 📱 Social Sharing
- **Status**: ✅ Enabled
- **Platforms**: Reddit, Twitter, Discord
- **Features**: Score sharing, rank display, customizable messages

## 🎛️ Quick Actions

### Manual Posting
- **Create Daily Challenge Post**: Use \`/internal/daily-challenge-post\` endpoint
- **Create Weekly Leaderboard Post**: Use \`/internal/weekly-leaderboard-post\` endpoint
- **Execute All Tasks**: Use \`/internal/execute-scheduled-tasks\` endpoint

### Configuration
- **View Config**: \`GET /api/post-configuration\`
- **Update Config**: \`POST /api/post-configuration\` with JSON body
- **View Status**: \`GET /api/configuration-status\`

### Monitoring
- **Task Status**: \`GET /internal/scheduled-tasks-status\`
- **Share Stats**: \`GET /api/share-statistics\`
- **Challenge Info**: \`GET /api/daily-challenge-info\`

## 📝 Configuration Examples

### Disable Daily Challenges
\`\`\`json
{
  "dailyChallenge": {
    "enabled": false
  }
}
\`\`\`

### Change Posting Times
\`\`\`json
{
  "dailyChallenge": {
    "postTime": "10:00"
  },
  "weeklyLeaderboard": {
    "postTime": "11:00"
  }
}
\`\`\`

### Disable Social Sharing
\`\`\`json
{
  "socialSharing": {
    "enabled": false
  }
}
\`\`\`

---

*This post is automatically generated for moderators. Use the API endpoints above to manage the system.*`;

    console.log('Mod tools accessed - showing system status...');
    
    // Get system status information
    const systemStatus = await getSystemStatus();
    const configStatus = await getConfigurationStatus();
    
    // Create a comprehensive status message
    const statusMessage = `🔧 **Color Rush Mod Tools - System Status**

**🎯 Daily Challenge System:**
• Status: ✅ Always Enabled
• Next Post: ${systemStatus.dailyChallenge.nextPost || 'Not scheduled'}
• Challenge Types: Speed Demon, Perfectionist, Bomb Dodger, Color Master, Endurance

**📈 Weekly Leaderboard System:**
• Status: ✅ Always Enabled
• Next Post: ${systemStatus.weeklyLeaderboard.nextPost || 'Not scheduled'}
• Features: Top 20 players, weekly statistics

**📱 Social Sharing System:**
• Status: ${systemStatus.socialSharing.enabled ? '✅ Enabled' : '❌ Disabled'}
• Platforms: Reddit, Twitter, Discord
• Features: Score sharing, rank display

**🎛️ Available Actions:**
• Create Daily Challenge Post
• Create Weekly Leaderboard Post  
• Execute All Scheduled Tasks
• Check System Status

**📝 Configuration:**
• Daily Challenge: Always Enabled
• Weekly Leaderboard: Always Enabled
• Social Sharing: ${configStatus.socialSharing.enabled ? 'Enabled' : 'Disabled'}

*Use the API endpoints to manage settings and execute tasks.*`;

    // Return JSON response with showToast for proper Devvit menu action format
    res.json({
      showToast: {
        text: statusMessage,
        appearance: 'neutral'
      }
    });
    
  } catch (error) {
    console.error(`Error in mod tools endpoint: ${error}`);
    console.error('Error details:', error);
    
    // Return error response matching the working post-create format
    res.status(400).json({
      status: 'error',
      message: `Mod tools error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Weekly Leaderboard Post Endpoints

router.post('/internal/weekly-leaderboard-post', async (_req, res): Promise<void> => {
  try {
    console.log('Weekly leaderboard post endpoint called');
    
    const result = await createWeeklyLeaderboardPost();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Weekly leaderboard post created successfully',
        postId: result.postId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create weekly leaderboard post',
      });
    }
  } catch (error) {
    console.error('Error in weekly leaderboard post endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating weekly leaderboard post',
    });
  }
});

router.get('/internal/weekly-leaderboard-status', async (_req, res): Promise<void> => {
  try {
    const shouldPost = shouldPostWeeklyLeaderboard();
    const nextPostTime = getNextWeeklyPostTime();
    
    res.json({
      shouldPostNow: shouldPost,
      nextScheduledPost: nextPostTime.toISOString(),
      nextPostDate: nextPostTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    });
  } catch (error) {
    console.error('Error getting weekly leaderboard status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weekly leaderboard status',
    });
  }
});

// Test endpoint to verify logging works
router.get('/internal/test-logging', async (_req, res): Promise<void> => {
  console.log('=== TEST LOGGING ENDPOINT CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('This is a test log message to verify logging works');
  console.error('This is a test error log to verify error logging works');
  
  res.json({
    success: true,
    message: 'Test logging endpoint called - check logs!',
    timestamp: new Date().toISOString(),
  });
});

// Scheduled Tasks Endpoints

router.post('/internal/execute-scheduled-tasks', async (_req, res): Promise<void> => {
  try {
    console.log('=== SCHEDULER TRIGGERED ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Context subreddit:', context.subredditName);
    
    const results = await executeScheduledTasks();
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log('=== SCHEDULER RESULTS ===');
    console.log(`Total tasks: ${results.length}, Successful: ${successCount}, Failed: ${failureCount}`);
    results.forEach((result, index) => {
      console.log(`Task ${index + 1} (${result.taskName}):`, {
        success: result.success,
        error: result.error,
        result: result.result,
      });
    });
    
    res.json({
      success: true,
      message: `Scheduled tasks executed: ${successCount} successful, ${failureCount} failed`,
      results: results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
    });
  } catch (error) {
    console.error('=== SCHEDULER ERROR ===');
    console.error('Error executing scheduled tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute scheduled tasks',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/internal/scheduled-tasks-status', async (_req, res): Promise<void> => {
  try {
    const status = await getScheduledTasksStatus();
    
    res.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error('Error getting scheduled tasks status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get scheduled tasks status',
    });
  }
});

// Daily Challenge Endpoints

router.post('/internal/daily-challenge-post', async (_req, res): Promise<void> => {
  try {
    console.log('Daily challenge post endpoint called');
    
    const result = await createDailyChallengePost();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Daily challenge post created successfully',
        postId: result.postId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create daily challenge post',
      });
    }
  } catch (error) {
    console.error('Error in daily challenge post endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating daily challenge post',
    });
  }
});

router.get('/internal/daily-challenge-info', async (_req, res): Promise<void> => {
  try {
    const challengeInfo = getTodaysChallengeInfo();
    
    res.json({
      success: true,
      challenge: challengeInfo,
    });
  } catch (error) {
    console.error('Error getting daily challenge info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get daily challenge info',
    });
  }
});

router.post('/api/submit-daily-challenge-score', async (req, res): Promise<void> => {
  try {
    const { challengeId, score } = req.body;
    const { userId } = context;
    
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }
    
    if (!challengeId || typeof score !== 'number') {
      res.status(400).json({
        success: false,
        message: 'Invalid request data',
      });
      return;
    }
    
    // Get username for the authenticated user
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
    
    const result = await submitDailyChallengeScore(challengeId, userId, username, score);
    
    if (result.success) {
      res.json({
        success: true,
        rank: result.rank,
        message: 'Daily challenge score submitted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to submit daily challenge score',
      });
    }
  } catch (error) {
    console.error('Error submitting daily challenge score:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while submitting daily challenge score',
    });
  }
});

// Social Sharing Endpoints

router.post('/api/share-score', async (req, res): Promise<void> => {
  try {
    const { score, rank, challengeType, gameMode, sessionTime, achievements } = req.body;
    
    const shareData = {
      score,
      rank,
      challengeType,
      gameMode,
      sessionTime,
      achievements,
    };
    
    const results = await shareScore(shareData);
    
    res.json({
      success: true,
      results: results,
    });
  } catch (error) {
    console.error('Error sharing score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share score',
    });
  }
});

router.get('/api/social-sharing-platforms', async (_req, res): Promise<void> => {
  try {
    const platforms = getAvailablePlatforms();
    
    res.json({
      success: true,
      platforms: platforms,
    });
  } catch (error) {
    console.error('Error getting social sharing platforms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get social sharing platforms',
    });
  }
});

router.get('/api/share-statistics', async (_req, res): Promise<void> => {
  try {
    const statistics = await getShareStatistics();
    
    res.json({
      success: true,
      statistics: statistics,
    });
  } catch (error) {
    console.error('Error getting share statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get share statistics',
    });
  }
});

// Configuration Endpoints

router.get('/api/post-configuration', async (_req, res): Promise<void> => {
  try {
    const config = await getPostConfiguration();
    
    res.json({
      success: true,
      configuration: config,
    });
  } catch (error) {
    console.error('Error getting post configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get post configuration',
    });
  }
});

router.post('/api/post-configuration', async (req, res): Promise<void> => {
  try {
    const updates = req.body;
    
    const result = await updatePostConfiguration(updates);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Post configuration updated successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to update post configuration',
      });
    }
  } catch (error) {
    console.error('Error updating post configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating post configuration',
    });
  }
});

router.get('/api/configuration-status', async (_req, res): Promise<void> => {
  try {
    const status = await getConfigurationStatus();
    
    res.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error('Error getting configuration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration status',
    });
  }
});

// Mod Tools Endpoints

router.get('/api/mod-tools/menu', async (_req, res): Promise<void> => {
  try {
    const menu = await createModToolsMenu();
    
    res.json({
      success: true,
      menu: menu,
    });
  } catch (error) {
    console.error('Error getting mod tools menu:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mod tools menu',
    });
  }
});

router.get('/api/mod-tools/status', async (_req, res): Promise<void> => {
  try {
    const status = await getSystemStatus();
    
    res.json({
      success: true,
      status: status,
    });
  } catch (error) {
    console.error('Error getting mod tools status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mod tools status',
    });
  }
});

router.post('/api/mod-tools/action', async (req, res): Promise<void> => {
  try {
    const { action, parameters } = req.body;
    
    if (!action) {
      res.status(400).json({
        success: false,
        message: 'Action is required',
      });
      return;
    }
    
    const result = await executeModAction(action, parameters);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error('Error executing mod action:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while executing mod action',
    });
  }
});

router.post('/internal/mod-tools/status-post', async (_req, res): Promise<void> => {
  try {
    const result = await createModToolsStatusPost();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Mod tools status post created successfully',
        postId: result.postId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to create mod tools status post',
      });
    }
  } catch (error) {
    console.error('Error creating mod tools status post:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating mod tools status post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => {
  console.error('=== SERVER ERROR ===');
  console.error(`server error; ${err.stack}`);
});

server.listen(port, () => {
  console.log('=== SERVER LISTENING ===');
  console.log(`http://localhost:${port}`);
  console.log('All routes registered:', router.stack.length, 'routes');
  console.log('Scheduler endpoints configured in devvit.json');
});
