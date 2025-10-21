// Color Dot Rush API Types
export type SubmitScoreRequest = {
  score: number;
  sessionTime: number;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  timestamp: number;
  rank: number;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  userRank?: number;
  totalPlayers: number;
};

export type WeeklyLeaderboard = {
  entries: LeaderboardEntry[];
  weekStart: Date;
  weekEnd: Date;
  totalPlayers: number;
};

export type SubmitScoreResponse = {
  success: boolean;
  rank?: number;
  message?: string;
};

// Legacy API types for existing Game scene (will be removed in task 2)
export type InitResponse = {
  count: number;
};

export type IncrementResponse = {
  count: number;
};

export type DecrementResponse = {
  count: number;
};
