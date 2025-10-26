/**
 * Daily Challenge Service
 * Handles daily challenge participation and scoring
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

export interface DailyChallengeService {
  getTodaysChallenge(): Promise<DailyChallengeData | null>;
  submitScore(challengeId: string, score: number): Promise<{ success: boolean; rank?: number; error?: string }>;
  isChallengeActive(challengeId: string): boolean;
}

/**
 * Production Daily Challenge Service
 * Uses Devvit API endpoints for daily challenges
 */
export class DevvitDailyChallengeService implements DailyChallengeService {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  /**
   * Get today's challenge information
   */
  async getTodaysChallenge(): Promise<DailyChallengeData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/daily-challenge-info`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.challenge;
      } else {
        throw new Error(result.message || 'Failed to get daily challenge info');
      }
    } catch (error) {
      console.error('Error getting daily challenge info:', error);
      return null;
    }
  }

  /**
   * Submit score for daily challenge
   */
  async submitScore(challengeId: string, score: number): Promise<{ success: boolean; rank?: number; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/submit-daily-challenge-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          challengeId,
          score,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          rank: result.rank,
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to submit daily challenge score',
        };
      }
    } catch (error) {
      console.error('Error submitting daily challenge score:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if challenge is still active
   */
  isChallengeActive(challengeId: string): boolean {
    // Parse challenge ID to get date
    const parts = challengeId.split('-');
    if (parts.length !== 4 || parts[0] !== 'challenge') {
      return false;
    }

    const year = parseInt(parts[1]);
    const month = parseInt(parts[2]) - 1; // JavaScript months are 0-indexed
    const day = parseInt(parts[3]);

    const challengeDate = new Date(year, month, day);
    const now = new Date();
    const tomorrow = new Date(challengeDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return now >= challengeDate && now < tomorrow;
  }
}

/**
 * Mock Daily Challenge Service for development/testing
 */
export class MockDailyChallengeService implements DailyChallengeService {
  private submittedScores: Map<string, number[]> = new Map();

  async getTodaysChallenge(): Promise<DailyChallengeData | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const today = new Date();
    const challengeId = `challenge-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const challengeTypes = ['SPEED_DEMON', 'PERFECTIONIST', 'BOMB_DODGER', 'COLOR_MASTER', 'ENDURANCE'];
    const challengeType = challengeTypes[today.getDay() % challengeTypes.length];
    
    const challengeDescriptions = {
      SPEED_DEMON: 'Score 100+ points in under 60 seconds!',
      PERFECTIONIST: 'Get 50+ points without missing a single tap!',
      BOMB_DODGER: 'Survive 2+ minutes with 5+ bombs on screen!',
      COLOR_MASTER: 'Score 200+ points with only blue and green dots!',
      ENDURANCE: 'Play for 5+ minutes and score 300+ points!',
    };
    
    const challengeTargets = {
      SPEED_DEMON: 100,
      PERFECTIONIST: 50,
      BOMB_DODGER: 0,
      COLOR_MASTER: 200,
      ENDURANCE: 300,
    };
    
    const challengeMultipliers = {
      SPEED_DEMON: 1.5,
      PERFECTIONIST: 2.0,
      BOMB_DODGER: 1.8,
      COLOR_MASTER: 1.3,
      ENDURANCE: 1.2,
    };
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get mock participants
    const participants = this.submittedScores.get(challengeId)?.length || 0;
    const topParticipants = this.getTopParticipants(challengeId);
    
    return {
      challengeId,
      challengeType,
      description: challengeDescriptions[challengeType as keyof typeof challengeDescriptions],
      targetScore: challengeTargets[challengeType as keyof typeof challengeTargets],
      bonusMultiplier: challengeMultipliers[challengeType as keyof typeof challengeMultipliers],
      startDate: today,
      endDate: tomorrow,
      participants,
      topParticipants,
    };
  }

  async submitScore(challengeId: string, score: number): Promise<{ success: boolean; rank?: number; error?: string }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Store score
      if (!this.submittedScores.has(challengeId)) {
        this.submittedScores.set(challengeId, []);
      }
      
      const scores = this.submittedScores.get(challengeId)!;
      scores.push(score);
      
      // Calculate rank
      const sortedScores = [...scores].sort((a, b) => b - a);
      const rank = sortedScores.indexOf(score) + 1;
      
      console.log(`Mock daily challenge: Submitted score ${score} for ${challengeId}, rank: ${rank}`);
      
      return {
        success: true,
        rank,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  isChallengeActive(challengeId: string): boolean {
    const parts = challengeId.split('-');
    if (parts.length !== 4 || parts[0] !== 'challenge') {
      return false;
    }

    const year = parseInt(parts[1]);
    const month = parseInt(parts[2]) - 1;
    const day = parseInt(parts[3]);

    const challengeDate = new Date(year, month, day);
    const now = new Date();
    const tomorrow = new Date(challengeDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return now >= challengeDate && now < tomorrow;
  }

  private getTopParticipants(challengeId: string): Array<{ username: string; score: number; rank: number }> {
    const scores = this.submittedScores.get(challengeId) || [];
    const sortedScores = [...scores].sort((a, b) => b - a).slice(0, 10);
    
    const mockUsernames = [
      'ColorMaster', 'DotHunter', 'ReflexKing', 'SpeedDemon', 'BombDodger',
      'Perfectionist', 'EnduranceRunner', 'ColorWizard', 'TapMaster', 'GameChampion'
    ];
    
    return sortedScores.map((score, index) => ({
      username: mockUsernames[index] || `Player${index + 1}`,
      score,
      rank: index + 1,
    }));
  }
}

/**
 * Daily Challenge Service Factory
 */
export class DailyChallengeServiceFactory {
  private static instance: DailyChallengeService | null = null;

  static getInstance(): DailyChallengeService {
    if (!this.instance) {
      // Use mock service in development, production service in production
      if (process.env.NODE_ENV === 'development') {
        this.instance = new MockDailyChallengeService();
      } else {
        this.instance = new DevvitDailyChallengeService();
      }
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}

/**
 * Convenience function to get the daily challenge service
 */
export function getDailyChallengeService(): DailyChallengeService {
  return DailyChallengeServiceFactory.getInstance();
}
