import express from 'express';
import {
  SubmitScoreRequest,
  SubmitScoreResponse,
  LeaderboardResponse,
  LeaderboardEntry,
} from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
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
    const { postId, userId } = context;

    if (!postId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Missing required context (postId or userId)',
      });
      return;
    }

    try {
      const { score } = req.body;

      if (typeof score !== 'number' || score < 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid score value',
        });
        return;
      }

      // Store score in Redis with weekly leaderboard key
      const weekKey = `leaderboard:${getWeekKey()}`;
      const userScoreKey = `${userId}:${Date.now()}`;

      await redis.zAdd(weekKey, { member: userScoreKey, score });

      // Get user's rank (simplified for now - will be calculated from leaderboard)
      const rank = null; // TODO: Calculate rank from leaderboard position

      res.json({
        success: true,
        ...(rank !== null && { rank: rank + 1 }),
        message: 'Score submitted successfully',
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit score',
      });
    }
  }
);

router.get<Record<string, never>, LeaderboardResponse>(
  '/api/get-leaderboard',
  async (_req, res): Promise<void> => {
    try {
      const weekKey = `leaderboard:${getWeekKey()}`;

      const entries: LeaderboardEntry[] = [];

      // Simplified leaderboard processing (will be enhanced in task 18)
      // For now, return mock data to establish the API structure
      try {
        // Get top 10 scores (will be properly implemented in task 18)
        await redis.zRange(weekKey, 0, 9, { by: 'rank', reverse: true });

        // Mock data for foundation setup
        entries.push(
          { username: 'Player1', score: 150, timestamp: Date.now(), rank: 1 },
          { username: 'Player2', score: 120, timestamp: Date.now(), rank: 2 },
          { username: 'Player3', score: 100, timestamp: Date.now(), rank: 3 }
        );
      } catch (error) {
        console.warn('Redis leaderboard not yet fully implemented:', error);
        // Return empty leaderboard on error
      }

      // Get total player count
      const totalPlayers = await redis.zCard(weekKey);

      res.json({
        entries,
        totalPlayers,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        entries: [],
        totalPlayers: 0,
      });
    }
  }
);

// Helper function to get current week key for leaderboard
function getWeekKey(): string {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const isoString = startOfWeek.toISOString();
  const dateString = isoString.split('T')[0];
  if (!dateString) {
    throw new Error('Failed to generate week key');
  }
  return dateString;
}

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
