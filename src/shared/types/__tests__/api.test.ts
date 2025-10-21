import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SubmitScoreRequest,
  LeaderboardEntry,
  LeaderboardResponse,
  SubmitScoreResponse,
  InitResponse,
  IncrementResponse,
  DecrementResponse,
} from '../api';

// Mock validation functions (to be implemented)
const validateSubmitScoreRequest = (data: any): data is SubmitScoreRequest => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.score === 'number' &&
    typeof data.sessionTime === 'number' &&
    data.score >= 0 &&
    data.sessionTime >= 0
  );
};

const validateLeaderboardEntry = (data: any): data is LeaderboardEntry => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.username === 'string' &&
    typeof data.score === 'number' &&
    typeof data.timestamp === 'number' &&
    typeof data.rank === 'number' &&
    data.username.length > 0 &&
    data.score >= 0 &&
    data.timestamp > 0 &&
    data.rank > 0
  );
};

const validateLeaderboardResponse = (data: any): data is LeaderboardResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.entries) &&
    data.entries.every(validateLeaderboardEntry) &&
    typeof data.totalPlayers === 'number' &&
    data.totalPlayers >= 0 &&
    (data.userRank === undefined || (typeof data.userRank === 'number' && data.userRank > 0))
  );
};

const validateSubmitScoreResponse = (data: any): data is SubmitScoreResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.success === 'boolean' &&
    (data.rank === undefined || (typeof data.rank === 'number' && data.rank > 0)) &&
    (data.message === undefined || typeof data.message === 'string')
  );
};

describe('Color Dot Rush API Types', () => {
  describe('SubmitScoreRequest', () => {
    it('should validate correct SubmitScoreRequest', () => {
      const validRequest: SubmitScoreRequest = {
        score: 42,
        sessionTime: 90000, // 90 seconds in milliseconds
      };

      expect(validateSubmitScoreRequest(validRequest)).toBe(true);
    });

    it('should reject SubmitScoreRequest with negative score', () => {
      const invalidRequest = {
        score: -1,
        sessionTime: 90000,
      };

      expect(validateSubmitScoreRequest(invalidRequest)).toBe(false);
    });

    it('should reject SubmitScoreRequest with negative session time', () => {
      const invalidRequest = {
        score: 42,
        sessionTime: -1000,
      };

      expect(validateSubmitScoreRequest(invalidRequest)).toBe(false);
    });

    it('should reject SubmitScoreRequest with missing fields', () => {
      const invalidRequest = {
        score: 42,
        // missing sessionTime
      };

      expect(validateSubmitScoreRequest(invalidRequest)).toBe(false);
    });

    it('should reject SubmitScoreRequest with wrong types', () => {
      const invalidRequest = {
        score: '42', // string instead of number
        sessionTime: 90000,
      };

      expect(validateSubmitScoreRequest(invalidRequest)).toBe(false);
    });

    it('should handle maximum score values (Color Dot Rush specific)', () => {
      const maxScoreRequest: SubmitScoreRequest = {
        score: 999999, // Very high score for long sessions
        sessionTime: 300000, // 5 minutes
      };

      expect(validateSubmitScoreRequest(maxScoreRequest)).toBe(true);
    });

    it('should handle zero values', () => {
      const zeroRequest: SubmitScoreRequest = {
        score: 0,
        sessionTime: 0,
      };

      expect(validateSubmitScoreRequest(zeroRequest)).toBe(true);
    });
  });

  describe('LeaderboardEntry', () => {
    it('should validate correct LeaderboardEntry', () => {
      const validEntry: LeaderboardEntry = {
        username: 'testuser123',
        score: 150,
        timestamp: Date.now(),
        rank: 1,
      };

      expect(validateLeaderboardEntry(validEntry)).toBe(true);
    });

    it('should reject LeaderboardEntry with empty username', () => {
      const invalidEntry = {
        username: '',
        score: 150,
        timestamp: Date.now(),
        rank: 1,
      };

      expect(validateLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it('should reject LeaderboardEntry with negative score', () => {
      const invalidEntry = {
        username: 'testuser',
        score: -10,
        timestamp: Date.now(),
        rank: 1,
      };

      expect(validateLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it('should reject LeaderboardEntry with zero or negative rank', () => {
      const invalidEntry = {
        username: 'testuser',
        score: 150,
        timestamp: Date.now(),
        rank: 0,
      };

      expect(validateLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it('should reject LeaderboardEntry with invalid timestamp', () => {
      const invalidEntry = {
        username: 'testuser',
        score: 150,
        timestamp: 0,
        rank: 1,
      };

      expect(validateLeaderboardEntry(invalidEntry)).toBe(false);
    });

    it('should handle Reddit username formats', () => {
      const redditUsernames = [
        'user_with_underscores',
        'user-with-dashes',
        'UserWithCaps',
        'user123',
        'u_very_long_username_that_might_exist',
      ];

      redditUsernames.forEach(username => {
        const entry: LeaderboardEntry = {
          username,
          score: 100,
          timestamp: Date.now(),
          rank: 1,
        };
        expect(validateLeaderboardEntry(entry)).toBe(true);
      });
    });
  });

  describe('LeaderboardResponse', () => {
    it('should validate correct LeaderboardResponse', () => {
      const validResponse: LeaderboardResponse = {
        entries: [
          {
            username: 'player1',
            score: 200,
            timestamp: Date.now(),
            rank: 1,
          },
          {
            username: 'player2',
            score: 150,
            timestamp: Date.now() - 1000,
            rank: 2,
          },
        ],
        userRank: 5,
        totalPlayers: 100,
      };

      expect(validateLeaderboardResponse(validResponse)).toBe(true);
    });

    it('should validate LeaderboardResponse without userRank', () => {
      const validResponse: LeaderboardResponse = {
        entries: [],
        totalPlayers: 0,
      };

      expect(validateLeaderboardResponse(validResponse)).toBe(true);
    });

    it('should reject LeaderboardResponse with invalid entries', () => {
      const invalidResponse = {
        entries: [
          {
            username: '', // invalid empty username
            score: 200,
            timestamp: Date.now(),
            rank: 1,
          },
        ],
        totalPlayers: 1,
      };

      expect(validateLeaderboardResponse(invalidResponse)).toBe(false);
    });

    it('should reject LeaderboardResponse with negative totalPlayers', () => {
      const invalidResponse = {
        entries: [],
        totalPlayers: -1,
      };

      expect(validateLeaderboardResponse(invalidResponse)).toBe(false);
    });

    it('should handle empty leaderboard (Color Dot Rush specific)', () => {
      const emptyResponse: LeaderboardResponse = {
        entries: [],
        totalPlayers: 0,
      };

      expect(validateLeaderboardResponse(emptyResponse)).toBe(true);
    });

    it('should validate leaderboard with maximum entries (weekly leaderboard)', () => {
      const entries: LeaderboardEntry[] = Array.from({ length: 100 }, (_, i) => ({
        username: `player${i + 1}`,
        score: 1000 - i * 10,
        timestamp: Date.now() - i * 1000,
        rank: i + 1,
      }));

      const fullResponse: LeaderboardResponse = {
        entries,
        userRank: 50,
        totalPlayers: 500,
      };

      expect(validateLeaderboardResponse(fullResponse)).toBe(true);
    });
  });

  describe('SubmitScoreResponse', () => {
    it('should validate successful SubmitScoreResponse', () => {
      const successResponse: SubmitScoreResponse = {
        success: true,
        rank: 5,
        message: 'Score submitted successfully!',
      };

      expect(validateSubmitScoreResponse(successResponse)).toBe(true);
    });

    it('should validate failed SubmitScoreResponse', () => {
      const failResponse: SubmitScoreResponse = {
        success: false,
        message: 'Failed to submit score: Network error',
      };

      expect(validateSubmitScoreResponse(failResponse)).toBe(true);
    });

    it('should validate minimal SubmitScoreResponse', () => {
      const minimalResponse: SubmitScoreResponse = {
        success: true,
      };

      expect(validateSubmitScoreResponse(minimalResponse)).toBe(true);
    });

    it('should reject SubmitScoreResponse with invalid rank', () => {
      const invalidResponse = {
        success: true,
        rank: 0, // rank should be > 0
      };

      expect(validateSubmitScoreResponse(invalidResponse)).toBe(false);
    });

    it('should handle Color Dot Rush specific success messages', () => {
      const colorDotRushMessages = [
        'New personal best!',
        'You made it to the weekly leaderboard!',
        'Score submitted to r/ColorRush community!',
        'Great reflexes! Try again to beat your score.',
      ];

      colorRushMessages.forEach(message => {
        const response: SubmitScoreResponse = {
          success: true,
          message,
        };
        expect(validateSubmitScoreResponse(response)).toBe(true);
      });
    });

    it('should handle Reddit API error messages', () => {
      const errorMessages = [
        'Reddit API rate limit exceeded',
        'Subreddit not found',
        'User not authenticated',
        'Network timeout',
      ];

      errorMessages.forEach(message => {
        const response: SubmitScoreResponse = {
          success: false,
          message,
        };
        expect(validateSubmitScoreResponse(response)).toBe(true);
      });
    });
  });

  describe('Legacy API Types (to be removed)', () => {
    describe('InitResponse', () => {
      it('should validate InitResponse', () => {
        const response: InitResponse = { count: 0 };
        expect(typeof response.count).toBe('number');
      });

      it('should handle negative counts', () => {
        const response: InitResponse = { count: -1 };
        expect(typeof response.count).toBe('number');
      });
    });

    describe('IncrementResponse', () => {
      it('should validate IncrementResponse', () => {
        const response: IncrementResponse = { count: 1 };
        expect(typeof response.count).toBe('number');
      });
    });

    describe('DecrementResponse', () => {
      it('should validate DecrementResponse', () => {
        const response: DecrementResponse = { count: -1 };
        expect(typeof response.count).toBe('number');
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete game session flow', () => {
      // Simulate a complete Color Dot Rush game session
      const gameSession = {
        startTime: Date.now() - 90000, // 90 seconds ago
        endTime: Date.now(),
        finalScore: 45,
      };

      const submitRequest: SubmitScoreRequest = {
        score: gameSession.finalScore,
        sessionTime: gameSession.endTime - gameSession.startTime,
      };

      expect(validateSubmitScoreRequest(submitRequest)).toBe(true);

      const submitResponse: SubmitScoreResponse = {
        success: true,
        rank: 12,
        message: 'Great job! You survived 90 seconds!',
      };

      expect(validateSubmitScoreResponse(submitResponse)).toBe(true);
    });

    it('should handle leaderboard ranking consistency', () => {
      const entries: LeaderboardEntry[] = [
        { username: 'pro_player', score: 500, timestamp: Date.now(), rank: 1 },
        { username: 'good_player', score: 300, timestamp: Date.now(), rank: 2 },
        { username: 'avg_player', score: 150, timestamp: Date.now(), rank: 3 },
      ];

      // Verify ranking order matches scores
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].score).toBeGreaterThanOrEqual(entries[i + 1].score);
        expect(entries[i].rank).toBeLessThan(entries[i + 1].rank);
      }

      const response: LeaderboardResponse = {
        entries,
        totalPlayers: 100,
        userRank: 25,
      };

      expect(validateLeaderboardResponse(response)).toBe(true);
    });

    it('should handle API error scenarios gracefully', () => {
      const errorScenarios: SubmitScoreResponse[] = [
        {
          success: false,
          message: 'Reddit API temporarily unavailable',
        },
        {
          success: false,
          message: 'Score validation failed',
        },
        {
          success: false,
          message: 'User not found in subreddit',
        },
      ];

      errorScenarios.forEach(scenario => {
        expect(validateSubmitScoreResponse(scenario)).toBe(true);
      });
    });

    it('should validate weekly leaderboard reset scenario', () => {
      // New week, empty leaderboard
      const newWeekResponse: LeaderboardResponse = {
        entries: [],
        totalPlayers: 0,
      };

      expect(validateLeaderboardResponse(newWeekResponse)).toBe(true);

      // First score of the week
      const firstScore: SubmitScoreRequest = {
        score: 25,
        sessionTime: 45000,
      };

      expect(validateSubmitScoreRequest(firstScore)).toBe(true);

      const firstRankResponse: SubmitScoreResponse = {
        success: true,
        rank: 1,
        message: 'First on the weekly leaderboard!',
      };

      expect(validateSubmitScoreResponse(firstRankResponse)).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long usernames', () => {
      const longUsername = 'a'.repeat(100); // Very long username
      const entry: LeaderboardEntry = {
        username: longUsername,
        score: 100,
        timestamp: Date.now(),
        rank: 1,
      };

      expect(validateLeaderboardEntry(entry)).toBe(true);
    });

    it('should handle maximum integer scores', () => {
      const maxScore = Number.MAX_SAFE_INTEGER;
      const request: SubmitScoreRequest = {
        score: maxScore,
        sessionTime: 1000,
      };

      expect(validateSubmitScoreRequest(request)).toBe(true);
    });

    it('should handle floating point precision issues', () => {
      const precisionScore = 42.999999999999;
      const request: SubmitScoreRequest = {
        score: Math.floor(precisionScore), // Should be 42
        sessionTime: 90123.456, // Milliseconds with decimals
      };

      expect(validateSubmitScoreRequest(request)).toBe(true);
    });

    it('should validate timestamp ranges', () => {
      const timestamps = [
        Date.now(), // Current time
        Date.now() - 86400000, // 24 hours ago
        Date.now() - 604800000, // 1 week ago
      ];

      timestamps.forEach(timestamp => {
        const entry: LeaderboardEntry = {
          username: 'testuser',
          score: 100,
          timestamp,
          rank: 1,
        };
        expect(validateLeaderboardEntry(entry)).toBe(true);
      });
    });
  });
});
