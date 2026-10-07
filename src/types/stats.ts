import type { GameMode, AIDifficulty, WinReason } from './game';

export interface ModeRecord {
  played: number;
  wins: number;
  losses: number;
}

export interface PlayerStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  currentWinStreak: number;
  bestWinStreak: number;

  byMode: {
    ai: ModeRecord;
    levels: ModeRecord;
    'pass-and-play': ModeRecord;
    online: ModeRecord;
  };

  byAIDifficulty: {
    easy: ModeRecord;
    hard: ModeRecord;
    super_max: ModeRecord;
  };

  byWinReason: {
    escaped: number;
    captured_all_blue: number;
    captured_all_red: number;
  };

  byLossReason: {
    escaped: number;
    captured_all_blue: number;
    captured_all_red: number;
  };

  totalGhostsCaptured: {
    blue: number;
    red: number;
  };

  totalGhostsLost: {
    blue: number;
    red: number;
  };

  fewestMovesToWin: number | null;
  fastestWinSeconds: number | null;
  lastUpdated: number;
}

export type AchievementCategory = 'combat' | 'escape' | 'deception' | 'campaign' | 'mastery';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress?: {
    current: number;
    target: number;
  };
}

export interface MatchResultData {
  gameMode: GameMode;
  aiDifficulty?: AIDifficulty;
  levelId?: number;
  isWinner: boolean;
  winReason?: WinReason;
  movesTaken: number;
  durationSeconds?: number;
  capturedBlues: number;
  capturedReds: number;
  lostBlues: number;
  lostReds: number;
  starsEarned?: number;
}
