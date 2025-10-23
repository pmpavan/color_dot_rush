// High Score Service for Color Dot Rush
// Manages local high score storage and retrieval

/**
 * High score data structure
 */
export interface HighScoreData {
  score: number;
  date: string;
  level?: number;
}

/**
 * High Score Service - Manages local high score storage
 */
export class HighScoreService {
  private static readonly STORAGE_KEY = 'color-rush-high-score';
  private static readonly MAX_HIGH_SCORES = 10;

  /**
   * Get the current high score
   */
  public static getHighScore(): number {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data: HighScoreData = JSON.parse(stored);
        return data.score;
      }
    } catch (error) {
      console.warn('HighScoreService: Error reading high score from localStorage:', error);
    }
    return 0;
  }

  /**
   * Get high score data with metadata
   */
  public static getHighScoreData(): HighScoreData | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('HighScoreService: Error reading high score data from localStorage:', error);
    }
    return null;
  }

  /**
   * Set a new high score if it's higher than the current one
   */
  public static setHighScore(score: number, level?: number): boolean {
    const currentHighScore = this.getHighScore();
    
    if (score > currentHighScore) {
      try {
        const highScoreData: HighScoreData = {
          score: score,
          date: new Date().toISOString(),
          level: level
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(highScoreData));
        console.log(`HighScoreService: New high score set: ${score}`);
        return true;
      } catch (error) {
        console.error('HighScoreService: Error saving high score to localStorage:', error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Format high score for display
   */
  public static formatHighScore(score: number): string {
    return score.toLocaleString();
  }

  /**
   * Get formatted high score string
   */
  public static getFormattedHighScore(): string {
    const score = this.getHighScore();
    return this.formatHighScore(score);
  }

  /**
   * Clear all high score data
   */
  public static clearHighScores(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('HighScoreService: High scores cleared');
    } catch (error) {
      console.error('HighScoreService: Error clearing high scores:', error);
    }
  }

  /**
   * Check if a score is a new high score
   */
  public static isNewHighScore(score: number): boolean {
    return score > this.getHighScore();
  }

  /**
   * Get high score with fallback for display
   */
  public static getDisplayHighScore(): string {
    const score = this.getHighScore();
    return score > 0 ? this.formatHighScore(score) : '0';
  }
}
