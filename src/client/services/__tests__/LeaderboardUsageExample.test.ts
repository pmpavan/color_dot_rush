import { describe, it, expect, beforeEach } from 'vitest';
import { MockLeaderboardService } from '../LeaderboardService';

/**
 * Example demonstrating how to integrate MockLeaderboardService
 * into game scenes for development and testing
 */
describe('LeaderboardService Usage Examples', () => {
  let leaderboardService: MockLeaderboardService;

  beforeEach(() => {
    leaderboardService = new MockLeaderboardService();
  });

  describe('game over scenario', () => {
    it('should handle successful score submission in GameOver scene', async () => {
      // Simulate game ending with a score
      const finalScore = 125;
      const sessionTime = 75000; // 75 seconds

      try {
        const result = await leaderboardService.submitScore(finalScore, sessionTime);
        
        // GameOver scene should display success message
        expect(result.success).toBe(true);
        expect(result.message).toContain('Score submitted successfully');
        expect(result.rank).toBeGreaterThan(0);
        
        // UI can show: "New High Score! Rank #3"
        console.log(`UI Message: New High Score! Rank #${result.rank}`);
        
      } catch (error) {
        // GameOver scene should show error but not crash
        console.error('Score submission failed:', error.message);
        // UI shows: "Could not submit score. Try again later."
      }
    });

    it('should handle network failure during score submission', async () => {
      leaderboardService.simulateAPIFailure(true);
      
      const finalScore = 150;
      const sessionTime = 90000;

      try {
        await leaderboardService.submitScore(finalScore, sessionTime);
        expect.fail('Should have thrown an error');
      } catch (error) {
        // GameOver scene handles gracefully
        expect(error.message).toContain('Server error');
        
        // UI shows fallback message
        console.log('UI Fallback: Could not submit score. Your score: 150');
      }
    });
  });

  describe('leaderboard scene', () => {
    it('should display leaderboard with proper formatting', async () => {
      // User has submitted a score previously
      await leaderboardService.submitScore(140, 85000);
      
      try {
        const response = await leaderboardService.getTopScores();
        
        // Leaderboard scene displays entries
        expect(response.entries).toHaveLength(10);
        
        // Format for UI display
        response.entries.forEach((entry, index) => {
          const displayText = `${entry.rank}. ${entry.username} - ${entry.score}`;
          console.log(`Leaderboard Row ${index + 1}: ${displayText}`);
          
          // Highlight current user
          if (entry.username === 'TestUser') {
            console.log(`  ^ Your Score (Rank #${entry.rank})`);
          }
        });
        
        // Show user's rank if available
        if (response.userRank) {
          console.log(`Your Current Rank: #${response.userRank}`);
        } else {
          console.log('Play a game to get ranked!');
        }
        
      } catch (error) {
        // Leaderboard scene shows error state
        console.error('Failed to load leaderboard:', error.message);
        // UI shows: "Could not load scores. Check your connection."
      }
    });

    it('should handle empty leaderboard gracefully', async () => {
      leaderboardService.simulateEmptyResponse(true);
      
      const response = await leaderboardService.getTopScores();
      
      expect(response.entries).toHaveLength(0);
      expect(response.totalPlayers).toBe(0);
      
      // UI shows empty state
      console.log('UI Empty State: No scores yet. Be the first to play!');
    });

    it('should show loading state during slow network', async () => {
      leaderboardService.setResponseDelay(2000);
      
      // UI shows loading spinner
      console.log('UI: Loading leaderboard...');
      
      const response = await leaderboardService.getTopScores();
      
      // UI hides loading and shows data
      console.log('UI: Leaderboard loaded successfully');
      expect(response.entries).toHaveLength(10);
    });
  });

  describe('development testing scenarios', () => {
    it('should test various error conditions for QA', async () => {
      const testScenarios = [
        { name: 'Normal Operation', config: () => leaderboardService.reset() },
        { name: 'API Failure', config: () => leaderboardService.simulateAPIFailure(true) },
        { name: 'Network Timeout', config: () => leaderboardService.simulateTimeout(true) },
        { name: 'Empty Response', config: () => leaderboardService.simulateEmptyResponse(true) },
        { name: 'Slow Network', config: () => leaderboardService.setResponseDelay(3000) },
      ];

      for (const scenario of testScenarios) {
        console.log(`\nTesting: ${scenario.name}`);
        scenario.config();

        try {
          const response = await leaderboardService.getTopScores();
          console.log(`✓ Success: ${response.entries.length} entries loaded`);
        } catch (error) {
          console.log(`✗ Error: ${error.message}`);
        }
      }
    });

    it('should demonstrate graceful degradation patterns', async () => {
      // Game should continue working even when leaderboard fails
      
      // 1. Normal gameplay - leaderboard works
      leaderboardService.reset();
      let response = await leaderboardService.getTopScores();
      expect(response.entries).toHaveLength(10);
      console.log('✓ Leaderboard available - show full UI');

      // 2. Network issues - leaderboard fails
      leaderboardService.simulateTimeout(true);
      try {
        await leaderboardService.getTopScores();
        expect.fail('Should have failed');
      } catch (error) {
        console.log('✗ Leaderboard unavailable - hide leaderboard button');
      }

      // 3. Network recovers - leaderboard works again
      leaderboardService.simulateTimeout(false);
      response = await leaderboardService.getTopScores();
      expect(response.entries).toHaveLength(10);
      console.log('✓ Leaderboard recovered - show UI again');
    });
  });

  describe('competitive gameplay simulation', () => {
    it('should simulate multiple players competing', async () => {
      const players = [
        { name: 'SpeedRunner', score: 180 },
        { name: 'Perfectionist', score: 165 },
        { name: 'Casual', score: 95 },
        { name: 'Newcomer', score: 45 },
      ];

      // Simulate players submitting scores
      for (const player of players) {
        leaderboardService.setCurrentUser(player.name);
        const result = await leaderboardService.submitScore(player.score, 60000);
        
        console.log(`${player.name} submitted score ${player.score} - Rank #${result.rank}`);
      }

      // Check final leaderboard
      const finalBoard = await leaderboardService.getTopScores();
      
      // Verify competitive integrity
      expect(finalBoard.entries.find(e => e.username === 'SpeedRunner')?.rank).toBe(1);
      expect(finalBoard.entries.find(e => e.username === 'Perfectionist')?.rank).toBe(2);
      
      console.log('\nFinal Leaderboard:');
      finalBoard.entries.slice(0, 5).forEach(entry => {
        console.log(`${entry.rank}. ${entry.username}: ${entry.score}`);
      });
    });
  });
});
