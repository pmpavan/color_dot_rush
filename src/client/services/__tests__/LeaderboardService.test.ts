import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockLeaderboardService } from '../LeaderboardService';
import type { LeaderboardEntry } from '../../../shared/types/api';

describe('MockLeaderboardService', () => {
  let service: MockLeaderboardService;

  beforeEach(() => {
    service = new MockLeaderboardService();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  describe('initialization', () => {
    it('should initialize with sample leaderboard data', async () => {
      const response = await service.getTopScores();
      
      expect(response.entries).toHaveLength(10);
      expect(response.totalPlayers).toBe(10);
      expect(response.entries[0].score).toBeGreaterThan(response.entries[1].score);
      expect(response.entries[0].rank).toBe(1);
    });

    it('should have properly ranked entries', async () => {
      const response = await service.getTopScores();
      
      response.entries.forEach((entry, index) => {
        expect(entry.rank).toBe(index + 1);
        if (index > 0) {
          expect(entry.score).toBeLessThanOrEqual(response.entries[index - 1].score);
        }
      });
    });
  });

  describe('submitScore', () => {
    it('should successfully submit a score', async () => {
      const result = await service.submitScore(100, 60000);
      
      expect(result.success).toBe(true);
      expect(result.rank).toBeGreaterThan(0);
      expect(result.message).toContain('Score submitted successfully');
    });

    it('should calculate correct rank for new score', async () => {
      // Submit a high score that should be rank 1
      const result = await service.submitScore(200, 60000);
      
      expect(result.rank).toBe(1);
      
      const leaderboard = await service.getTopScores();
      expect(leaderboard.entries[0].score).toBe(200);
      expect(leaderboard.entries[0].username).toBe('TestUser');
    });

    it('should update existing user score', async () => {
      // Submit first score
      await service.submitScore(100, 60000);
      let leaderboard = await service.getTopScores();
      const initialCount = leaderboard.totalPlayers;
      
      // Submit better score for same user
      await service.submitScore(150, 90000);
      leaderboard = await service.getTopScores();
      
      // Should not increase total players
      expect(leaderboard.totalPlayers).toBe(initialCount);
      
      // Should have updated score
      const userEntry = leaderboard.entries.find(e => e.username === 'TestUser');
      expect(userEntry?.score).toBe(150);
    });

    it('should maintain top 10 limit', async () => {
      // Submit multiple scores to exceed limit
      for (let i = 0; i < 15; i++) {
        service.setCurrentUser(`User${i}`);
        await service.submitScore(50 + i, 60000);
      }
      
      const leaderboard = await service.getTopScores();
      expect(leaderboard.entries).toHaveLength(10);
      expect(leaderboard.totalPlayers).toBe(10);
    });
  });

  describe('getTopScores', () => {
    it('should return leaderboard with user rank when user has score', async () => {
      await service.submitScore(120, 60000);
      const response = await service.getTopScores();
      
      expect(response.userRank).toBeDefined();
      expect(response.userRank).toBeGreaterThan(0);
    });

    it('should return leaderboard without user rank when user has no score', async () => {
      service.setCurrentUser('NonExistentUser');
      const response = await service.getTopScores();
      
      expect(response.userRank).toBeUndefined();
    });
  });

  describe('getCurrentUserRank', () => {
    it('should return null when user has no score', async () => {
      service.setCurrentUser('NonExistentUser');
      const rank = await service.getCurrentUserRank();
      
      expect(rank).toBeNull();
    });

    it('should return correct rank when user has score', async () => {
      await service.submitScore(130, 60000);
      const rank = await service.getCurrentUserRank();
      
      expect(rank).toBeGreaterThan(0);
    });
  });

  describe('error simulation', () => {
    it('should throw error when API failure is simulated', async () => {
      service.simulateAPIFailure(true);
      
      await expect(service.submitScore(100, 60000)).rejects.toThrow('Server error (500)');
      await expect(service.getTopScores()).rejects.toThrow('Server unavailable');
    });

    it('should throw timeout error when timeout is simulated', async () => {
      service.simulateTimeout(true);
      
      await expect(service.submitScore(100, 60000)).rejects.toThrow('Network timeout');
      await expect(service.getTopScores()).rejects.toThrow('Could not load scores');
    });

    it('should return null rank when timeout is simulated', async () => {
      service.simulateTimeout(true);
      const rank = await service.getCurrentUserRank();
      
      expect(rank).toBeNull();
    });

    it('should return null rank when API failure is simulated', async () => {
      service.simulateAPIFailure(true);
      const rank = await service.getCurrentUserRank();
      
      expect(rank).toBeNull();
    });
  });

  describe('empty response simulation', () => {
    it('should return empty leaderboard when configured', async () => {
      service.simulateEmptyResponse(true);
      const response = await service.getTopScores();
      
      expect(response.entries).toHaveLength(0);
      expect(response.totalPlayers).toBe(0);
      expect(response.userRank).toBeUndefined();
    });
  });

  describe('response delay simulation', () => {
    it('should respect configured response delay', async () => {
      service.setResponseDelay(1000);
      
      const startTime = Date.now();
      const promise = service.getTopScores();
      
      // Fast-forward timers
      vi.advanceTimersByTime(1000);
      
      await promise;
      // Note: In real time this would take 1000ms, but we're using fake timers
    });
  });

  describe('test configuration methods', () => {
    it('should reset to default state', async () => {
      // Configure various test scenarios
      service.simulateAPIFailure(true);
      service.simulateTimeout(true);
      service.simulateEmptyResponse(true);
      service.setResponseDelay(5000);
      service.setCurrentUser('CustomUser');
      
      // Reset
      service.reset();
      
      // Should work normally again
      const response = await service.getTopScores();
      expect(response.entries).toHaveLength(10);
      
      const result = await service.submitScore(100, 60000);
      expect(result.success).toBe(true);
    });

    it('should allow setting custom current user', async () => {
      service.setCurrentUser('CustomTestUser');
      await service.submitScore(100, 60000);
      
      const leaderboard = await service.getTopScores();
      const userEntry = leaderboard.entries.find(e => e.username === 'CustomTestUser');
      
      expect(userEntry).toBeDefined();
      expect(userEntry?.score).toBe(100);
    });

    it('should provide access to mock data for testing', () => {
      const mockData = service.getMockData();
      
      expect(mockData).toHaveLength(10);
      expect(mockData[0].rank).toBe(1);
      expect(mockData).not.toBe(service.getMockData()); // Should return a copy
    });
  });

  describe('edge cases', () => {
    it('should handle zero score submission', async () => {
      const result = await service.submitScore(0, 1000);
      
      expect(result.success).toBe(true);
      expect(result.rank).toBeGreaterThan(0);
    });

    it('should handle very high scores', async () => {
      const result = await service.submitScore(999999, 60000);
      
      expect(result.success).toBe(true);
      expect(result.rank).toBe(1);
    });

    it('should handle negative session time', async () => {
      const result = await service.submitScore(100, -1000);
      
      expect(result.success).toBe(true);
    });

    it('should maintain data consistency after multiple operations', async () => {
      // Perform multiple operations
      await service.submitScore(150, 60000);
      service.simulateAPIFailure(true);
      
      try {
        await service.submitScore(200, 90000);
      } catch {
        // Expected to fail
      }
      
      service.simulateAPIFailure(false);
      const leaderboard = await service.getTopScores();
      
      // Should still have consistent data
      expect(leaderboard.entries.every(entry => entry.rank > 0)).toBe(true);
      expect(leaderboard.entries.every((entry, index) => 
        index === 0 || entry.score <= leaderboard.entries[index - 1].score
      )).toBe(true);
    });
  });

  describe('realistic test scenarios', () => {
    it('should simulate slow network conditions', async () => {
      service.setResponseDelay(3000);
      
      const promise = service.getTopScores();
      vi.advanceTimersByTime(3000);
      
      const response = await promise;
      expect(response.entries).toHaveLength(10);
    });

    it('should simulate intermittent failures', async () => {
      // First call succeeds
      let response = await service.getTopScores();
      expect(response.entries).toHaveLength(10);
      
      // Second call fails
      service.simulateAPIFailure(true);
      await expect(service.getTopScores()).rejects.toThrow();
      
      // Third call succeeds again
      service.simulateAPIFailure(false);
      response = await service.getTopScores();
      expect(response.entries).toHaveLength(10);
    });

    it('should handle concurrent score submissions', async () => {
      const promises = [
        service.submitScore(100, 60000),
        service.submitScore(110, 65000),
        service.submitScore(120, 70000),
      ];
      
      // All should complete successfully (last one wins for same user)
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      const leaderboard = await service.getTopScores();
      const userEntry = leaderboard.entries.find(e => e.username === 'TestUser');
      expect(userEntry?.score).toBe(120); // Last submission wins
    });
  });
});
