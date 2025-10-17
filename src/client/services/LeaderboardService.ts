import type { 
  LeaderboardEntry, 
  LeaderboardResponse, 
  SubmitScoreRequest, 
  SubmitScoreResponse 
} from '../../shared/types/api';

/**
 * Interface for leaderboard operations
 */
export interface ILeaderboardService {
  submitScore(score: number, sessionTime: number): Promise<SubmitScoreResponse>;
  getTopScores(): Promise<LeaderboardResponse>;
  getCurrentUserRank(): Promise<number | null>;
}

/**
 * Mock leaderboard service for development and testing
 * Simulates various API scenarios including success, errors, and timeouts
 */
export class MockLeaderboardService implements ILeaderboardService {
  private mockScores: LeaderboardEntry[] = [];
  private shouldFail = false;
  private shouldTimeout = false;
  private shouldReturnEmpty = false;
  private responseDelay = 0;
  private currentUser = 'TestUser';

  constructor() {
    this.initializeMockData();
  }

  /**
   * Initialize with sample leaderboard data
   */
  private initializeMockData(): void {
    this.mockScores = [
      { username: 'ColorMaster', score: 156, timestamp: Date.now() - 3600000, rank: 1 },
      { username: 'DotHunter', score: 142, timestamp: Date.now() - 7200000, rank: 2 },
      { username: 'ReflexKing', score: 138, timestamp: Date.now() - 10800000, rank: 3 },
      { username: 'SpeedTapper', score: 125, timestamp: Date.now() - 14400000, rank: 4 },
      { username: 'BombDodger', score: 119, timestamp: Date.now() - 18000000, rank: 5 },
      { username: 'QuickClick', score: 112, timestamp: Date.now() - 21600000, rank: 6 },
      { username: 'ColorRush', score: 108, timestamp: Date.now() - 25200000, rank: 7 },
      { username: 'TapMaster', score: 95, timestamp: Date.now() - 28800000, rank: 8 },
      { username: 'DotCatcher', score: 87, timestamp: Date.now() - 32400000, rank: 9 },
      { username: 'FastFingers', score: 73, timestamp: Date.now() - 36000000, rank: 10 },
    ];
  }

  /**
   * Submit a score to the leaderboard
   */
  async submitScore(score: number, sessionTime: number): Promise<SubmitScoreResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldTimeout) {
      throw new Error('Network timeout: Request took too long to complete');
    }

    if (this.shouldFail) {
      throw new Error('Failed to submit score: Server error (500)');
    }

    // Add the new score to mock data
    const newEntry: LeaderboardEntry = {
      username: this.currentUser,
      score,
      timestamp: Date.now(),
      rank: this.calculateRank(score),
    };

    // Insert in correct position and update ranks
    this.insertScore(newEntry);

    return {
      success: true,
      rank: newEntry.rank,
      message: `Score submitted successfully! Rank: ${newEntry.rank}`,
    };
  }

  /**
   * Get top scores from the leaderboard
   */
  async getTopScores(): Promise<LeaderboardResponse> {
    await this.simulateNetworkDelay();

    if (this.shouldTimeout) {
      throw new Error('Network timeout: Could not load scores');
    }

    if (this.shouldFail) {
      throw new Error('Failed to load leaderboard: Server unavailable');
    }

    if (this.shouldReturnEmpty) {
      return {
        entries: [],
        totalPlayers: 0,
      };
    }

    const userRank = this.mockScores.find(entry => entry.username === this.currentUser)?.rank;

    return {
      entries: [...this.mockScores],
      userRank,
      totalPlayers: this.mockScores.length,
    };
  }

  /**
   * Get current user's rank
   */
  async getCurrentUserRank(): Promise<number | null> {
    await this.simulateNetworkDelay();

    if (this.shouldTimeout || this.shouldFail) {
      return null;
    }

    const userEntry = this.mockScores.find(entry => entry.username === this.currentUser);
    return userEntry?.rank ?? null;
  }

  // Test configuration methods

  /**
   * Configure the service to simulate API failures
   */
  simulateAPIFailure(fail: boolean): void {
    this.shouldFail = fail;
  }

  /**
   * Configure the service to simulate network timeouts
   */
  simulateTimeout(timeout: boolean): void {
    this.shouldTimeout = timeout;
  }

  /**
   * Configure the service to return empty leaderboard
   */
  simulateEmptyResponse(empty: boolean): void {
    this.shouldReturnEmpty = empty;
  }

  /**
   * Set artificial response delay for testing slow networks
   */
  setResponseDelay(delayMs: number): void {
    this.responseDelay = delayMs;
  }

  /**
   * Set the current user for testing
   */
  setCurrentUser(username: string): void {
    this.currentUser = username;
  }

  /**
   * Reset to default state
   */
  reset(): void {
    this.shouldFail = false;
    this.shouldTimeout = false;
    this.shouldReturnEmpty = false;
    this.responseDelay = 0;
    this.currentUser = 'TestUser';
    this.initializeMockData();
  }

  /**
   * Get current mock data for testing
   */
  getMockData(): LeaderboardEntry[] {
    return [...this.mockScores];
  }

  // Private helper methods

  private async simulateNetworkDelay(): Promise<void> {
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }
  }

  private calculateRank(score: number): number {
    let rank = 1;
    for (const entry of this.mockScores) {
      if (entry.score > score) {
        rank++;
      }
    }
    return rank;
  }

  private insertScore(newEntry: LeaderboardEntry): void {
    // Remove existing entry for this user if it exists
    this.mockScores = this.mockScores.filter(entry => entry.username !== newEntry.username);
    
    // Insert new entry in correct position
    this.mockScores.push(newEntry);
    
    // Sort by score descending
    this.mockScores.sort((a, b) => b.score - a.score);
    
    // Update ranks
    this.mockScores.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Keep only top 10
    this.mockScores = this.mockScores.slice(0, 10);
  }
}

/**
 * Production leaderboard service (placeholder for future implementation)
 */
export class DevvitLeaderboardService implements ILeaderboardService {
  async submitScore(score: number, sessionTime: number): Promise<SubmitScoreResponse> {
    // TODO: Implement actual Devvit API calls in task 18
    const response = await fetch('/api/submit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, sessionTime } as SubmitScoreRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit score: ${response.statusText}`);
    }

    return response.json();
  }

  async getTopScores(): Promise<LeaderboardResponse> {
    // TODO: Implement actual Devvit API calls in task 18
    const response = await fetch('/api/get-leaderboard');

    if (!response.ok) {
      throw new Error(`Failed to load leaderboard: ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentUserRank(): Promise<number | null> {
    try {
      const leaderboard = await this.getTopScores();
      return leaderboard.userRank ?? null;
    } catch (error) {
      console.warn('Failed to get user rank:', error);
      return null;
    }
  }
}
