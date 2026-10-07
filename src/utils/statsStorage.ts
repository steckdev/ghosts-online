import type { PlayerStats, Achievement, MatchResultData, ModeRecord } from '../types/stats';
import { getTotalStars, getCompletedCount, getLevelProgress } from './levelStorage';

const STATS_STORAGE_KEY = 'ghosts_career_stats_v1';
const ACHIEVEMENTS_STORAGE_KEY = 'ghosts_achievements_v1';

function createEmptyModeRecord(): ModeRecord {
  return { played: 0, wins: 0, losses: 0 };
}

export function getDefaultPlayerStats(): PlayerStats {
  return {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalLosses: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    byMode: {
      ai: createEmptyModeRecord(),
      levels: createEmptyModeRecord(),
      'pass-and-play': createEmptyModeRecord(),
      online: createEmptyModeRecord(),
    },
    byAIDifficulty: {
      easy: createEmptyModeRecord(),
      hard: createEmptyModeRecord(),
      super_max: createEmptyModeRecord(),
    },
    byWinReason: {
      escaped: 0,
      captured_all_blue: 0,
      captured_all_red: 0,
    },
    byLossReason: {
      escaped: 0,
      captured_all_blue: 0,
      captured_all_red: 0,
    },
    totalGhostsCaptured: {
      blue: 0,
      red: 0,
    },
    totalGhostsLost: {
      blue: 0,
      red: 0,
    },
    fewestMovesToWin: null,
    fastestWinSeconds: null,
    lastUpdated: Date.now(),
  };
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'Novice Exorcist',
    description: 'Win your very first game of Ghosts.',
    category: 'mastery',
    iconName: 'Award',
    unlocked: false,
  },
  {
    id: 'great_escape_1',
    title: 'Midnight Phantom Run',
    description: 'Win a match by escaping a Good Ghost through an Exit Gateway.',
    category: 'escape',
    iconName: 'DoorOpen',
    unlocked: false,
  },
  {
    id: 'blue_purge',
    title: 'Heroic Exorcism',
    description: 'Win a match by capturing all 4 of your opponent’s Good (Blue) Ghosts.',
    category: 'combat',
    iconName: 'Trophy',
    unlocked: false,
  },
  {
    id: 'poison_trap',
    title: 'Poison Pill Mastermind',
    description: 'Win a match by tricking your opponent into capturing all 4 of your Bad (Red) Ghosts.',
    category: 'deception',
    iconName: 'Skull',
    unlocked: false,
  },
  {
    id: 'speed_demon',
    title: 'Phantom Blitz',
    description: 'Win a match in 8 moves or fewer.',
    category: 'escape',
    iconName: 'Zap',
    unlocked: false,
  },
  {
    id: 'super_max_slayer',
    title: 'Mind Reader',
    description: 'Defeat the omniscient Super Max AI in single-player battle.',
    category: 'mastery',
    iconName: 'Crown',
    unlocked: false,
  },
  {
    id: 'clean_sheet',
    title: 'Untouchable Spirits',
    description: 'Win a match without losing a single Good (Blue) Ghost.',
    category: 'mastery',
    iconName: 'ShieldCheck',
    unlocked: false,
  },
  {
    id: 'pacifist_escape',
    title: 'Shadow Step',
    description: 'Win by exit gateway escape without capturing a single opponent ghost.',
    category: 'escape',
    iconName: 'Footprints',
    unlocked: false,
  },
  {
    id: 'campaign_initiate',
    title: 'Crypt Initiate',
    description: 'Complete all Tier 1 Campaign Levels (Levels 1–10).',
    category: 'campaign',
    iconName: 'Compass',
    unlocked: false,
    progress: { current: 0, target: 10 },
  },
  {
    id: 'campaign_labyrinth',
    title: 'Maze Runner',
    description: 'Complete all Tier 2 Campaign Levels (Levels 11–25).',
    category: 'campaign',
    iconName: 'Map',
    unlocked: false,
    progress: { current: 0, target: 25 },
  },
  {
    id: 'campaign_sanctum',
    title: 'Poison Ward',
    description: 'Complete all Tier 3 Campaign Levels (Levels 26–40).',
    category: 'campaign',
    iconName: 'ShieldAlert',
    unlocked: false,
    progress: { current: 0, target: 40 },
  },
  {
    id: 'campaign_grandmaster',
    title: 'Dungeon Grandmaster',
    description: 'Complete all 50 Campaign Levels.',
    category: 'campaign',
    iconName: 'Medal',
    unlocked: false,
    progress: { current: 0, target: 50 },
  },
  {
    id: 'starlight_collector',
    title: 'Starlight Exorcist',
    description: 'Earn 75 stars across Campaign Levels.',
    category: 'campaign',
    iconName: 'Star',
    unlocked: false,
    progress: { current: 0, target: 75 },
  },
  {
    id: 'constellation_master',
    title: 'Constellation Master',
    description: 'Earn all 150 stars (3 stars on all 50 levels).',
    category: 'campaign',
    iconName: 'Sparkles',
    unlocked: false,
    progress: { current: 0, target: 150 },
  },
  {
    id: 'streak_3',
    title: 'Spectral Momentum',
    description: 'Win 3 matches in a row.',
    category: 'mastery',
    iconName: 'Flame',
    unlocked: false,
    progress: { current: 0, target: 3 },
  },
  {
    id: 'streak_5',
    title: 'Unstoppable Phantom',
    description: 'Win 5 matches in a row.',
    category: 'mastery',
    iconName: 'Flame',
    unlocked: false,
    progress: { current: 0, target: 5 },
  },
  {
    id: 'veteran',
    title: 'Keeper of the Crypt',
    description: 'Play 25 total matches.',
    category: 'mastery',
    iconName: 'Hourglass',
    unlocked: false,
    progress: { current: 0, target: 25 },
  },
  {
    id: 'centurion',
    title: 'Hundred Battles',
    description: 'Play 100 total matches.',
    category: 'mastery',
    iconName: 'Swords',
    unlocked: false,
    progress: { current: 0, target: 100 },
  },
  {
    id: 'blue_hunter_50',
    title: 'Spectral Harvester',
    description: 'Capture 50 total Good (Blue) Ghosts across your career.',
    category: 'combat',
    iconName: 'Ghost',
    unlocked: false,
    progress: { current: 0, target: 50 },
  },
  {
    id: 'red_baiter_50',
    title: 'Demonic Overdose',
    description: 'Trick opponents into swallowing 50 Bad (Red) Ghosts.',
    category: 'deception',
    iconName: 'FlaskConical',
    unlocked: false,
    progress: { current: 0, target: 50 },
  },
  {
    id: 'online_victor',
    title: 'P2P Net Phantom',
    description: 'Win a peer-to-peer online multiplayer match.',
    category: 'mastery',
    iconName: 'Wifi',
    unlocked: false,
  },
];

let memoryStatsStore: string | null = null;
let memoryAchievementsStore: string | null = null;

function getStoredStatsRaw(): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage.getItem(STATS_STORAGE_KEY);
  }
  return memoryStatsStore;
}

function setStoredStatsRaw(value: string | null): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    if (value === null) {
      window.localStorage.removeItem(STATS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(STATS_STORAGE_KEY, value);
    }
  }
  memoryStatsStore = value;
}

function getStoredAchievementsRaw(): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
  }
  return memoryAchievementsStore;
}

function setStoredAchievementsRaw(value: string | null): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    if (value === null) {
      window.localStorage.removeItem(ACHIEVEMENTS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, value);
    }
  }
  memoryAchievementsStore = value;
}

export function getPlayerStats(): PlayerStats {
  try {
    const raw = getStoredStatsRaw();
    if (!raw) return getDefaultPlayerStats();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultPlayerStats(),
      ...parsed,
      byMode: {
        ...getDefaultPlayerStats().byMode,
        ...(parsed.byMode || {}),
      },
      byAIDifficulty: {
        ...getDefaultPlayerStats().byAIDifficulty,
        ...(parsed.byAIDifficulty || {}),
      },
      byWinReason: {
        ...getDefaultPlayerStats().byWinReason,
        ...(parsed.byWinReason || {}),
      },
      byLossReason: {
        ...getDefaultPlayerStats().byLossReason,
        ...(parsed.byLossReason || {}),
      },
      totalGhostsCaptured: {
        ...getDefaultPlayerStats().totalGhostsCaptured,
        ...(parsed.totalGhostsCaptured || {}),
      },
      totalGhostsLost: {
        ...getDefaultPlayerStats().totalGhostsLost,
        ...(parsed.totalGhostsLost || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load career stats:', err);
    return getDefaultPlayerStats();
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    setStoredStatsRaw(JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save career stats:', err);
  }
}

export function createDefaultAchievements(): Achievement[] {
  return DEFAULT_ACHIEVEMENTS.map((def) => ({
    ...def,
    progress: def.progress ? { ...def.progress } : undefined,
  }));
}

export function getAchievements(): Achievement[] {
  try {
    const raw = getStoredAchievementsRaw();
    if (!raw) return createDefaultAchievements();
    const saved: Record<string, { unlocked: boolean; unlockedAt?: number; progress?: { current: number; target: number } }> = JSON.parse(raw);
    return DEFAULT_ACHIEVEMENTS.map((def) => {
      const match = saved[def.id];
      if (!match) {
        return {
          ...def,
          progress: def.progress ? { ...def.progress } : undefined,
        };
      }
      return {
        ...def,
        unlocked: match.unlocked,
        unlockedAt: match.unlockedAt,
        progress: match.progress || (def.progress ? { ...def.progress } : undefined),
      };
    });
  } catch (err) {
    console.error('Failed to load achievements:', err);
    return createDefaultAchievements();
  }
}

export function saveAchievements(achievements: Achievement[]): void {
  try {
    const serialized: Record<string, { unlocked: boolean; unlockedAt?: number; progress?: { current: number; target: number } }> = {};
    for (const a of achievements) {
      serialized[a.id] = {
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt,
        progress: a.progress,
      };
    }
    setStoredAchievementsRaw(JSON.stringify(serialized));
  } catch (err) {
    console.error('Failed to save achievements:', err);
  }
}

export function recordMatchResult(data: MatchResultData): {
  updatedStats: PlayerStats;
  newlyUnlocked: Achievement[];
} {
  const stats = getPlayerStats();
  const achievements = getAchievements();
  const newlyUnlocked: Achievement[] = [];

  // Update Games Played, Wins, Losses
  stats.totalGamesPlayed += 1;
  if (data.isWinner) {
    stats.totalWins += 1;
    stats.currentWinStreak += 1;
    if (stats.currentWinStreak > stats.bestWinStreak) {
      stats.bestWinStreak = stats.currentWinStreak;
    }
  } else {
    stats.totalLosses += 1;
    stats.currentWinStreak = 0;
  }

  // Update By Mode
  if (stats.byMode[data.gameMode]) {
    stats.byMode[data.gameMode].played += 1;
    if (data.isWinner) {
      stats.byMode[data.gameMode].wins += 1;
    } else {
      stats.byMode[data.gameMode].losses += 1;
    }
  }

  // Update AI Difficulty
  if (data.gameMode === 'ai' && data.aiDifficulty && stats.byAIDifficulty[data.aiDifficulty]) {
    stats.byAIDifficulty[data.aiDifficulty].played += 1;
    if (data.isWinner) {
      stats.byAIDifficulty[data.aiDifficulty].wins += 1;
    } else {
      stats.byAIDifficulty[data.aiDifficulty].losses += 1;
    }
  }

  // Update Win / Loss Reason
  if (data.winReason) {
    if (data.isWinner) {
      stats.byWinReason[data.winReason] = (stats.byWinReason[data.winReason] || 0) + 1;
    } else {
      stats.byLossReason[data.winReason] = (stats.byLossReason[data.winReason] || 0) + 1;
    }
  }

  // Update Ghosts Captured & Lost
  stats.totalGhostsCaptured.blue += data.capturedBlues;
  stats.totalGhostsCaptured.red += data.capturedReds;
  stats.totalGhostsLost.blue += data.lostBlues;
  stats.totalGhostsLost.red += data.lostReds;

  // Update Records
  if (data.isWinner && data.movesTaken > 0) {
    if (stats.fewestMovesToWin === null || data.movesTaken < stats.fewestMovesToWin) {
      stats.fewestMovesToWin = data.movesTaken;
    }
  }

  if (data.isWinner && data.durationSeconds && data.durationSeconds > 0) {
    if (stats.fastestWinSeconds === null || data.durationSeconds < stats.fastestWinSeconds) {
      stats.fastestWinSeconds = data.durationSeconds;
    }
  }

  stats.lastUpdated = Date.now();

  // Evaluate Achievements
  const campaignProgress = getLevelProgress();
  const totalStars = getTotalStars(campaignProgress);
  const completedLevels = getCompletedCount(campaignProgress);

  const unlockAchievement = (id: string) => {
    const ach = achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked) {
      ach.unlocked = true;
      ach.unlockedAt = Date.now();
      newlyUnlocked.push(ach);
    }
  };

  const updateProgress = (id: string, current: number, target: number) => {
    const ach = achievements.find((a) => a.id === id);
    if (ach) {
      ach.progress = { current: Math.min(current, target), target };
      if (current >= target && !ach.unlocked) {
        ach.unlocked = true;
        ach.unlockedAt = Date.now();
        newlyUnlocked.push(ach);
      }
    }
  };

  // 1. First Blood
  if (data.isWinner) {
    unlockAchievement('first_blood');
  }

  // 2. Midnight Phantom Run (Escape)
  if (data.isWinner && data.winReason === 'escaped') {
    unlockAchievement('great_escape_1');
  }

  // 3. Heroic Exorcism (Captured all 4 Blue)
  if (data.isWinner && data.winReason === 'captured_all_blue') {
    unlockAchievement('blue_purge');
  }

  // 4. Poison Pill Mastermind (Captured all 4 Red)
  if (data.isWinner && data.winReason === 'captured_all_red') {
    unlockAchievement('poison_trap');
  }

  // 5. Phantom Blitz (Win in <= 8 moves)
  if (data.isWinner && data.movesTaken <= 8) {
    unlockAchievement('speed_demon');
  }

  // 6. Super Max Slayer
  if (data.isWinner && data.gameMode === 'ai' && data.aiDifficulty === 'super_max') {
    unlockAchievement('super_max_slayer');
  }

  // 7. Clean Sheet (Untouchable: 0 friendly Blue ghosts lost)
  if (data.isWinner && data.lostBlues === 0) {
    unlockAchievement('clean_sheet');
  }

  // 8. Pacifist Escape (Escape without capturing any enemy ghosts)
  if (data.isWinner && data.winReason === 'escaped' && data.capturedBlues === 0 && data.capturedReds === 0) {
    unlockAchievement('pacifist_escape');
  }

  // 9-12. Campaign Progression
  updateProgress('campaign_initiate', Math.min(completedLevels, 10), 10);
  updateProgress('campaign_labyrinth', Math.min(completedLevels, 25), 25);
  updateProgress('campaign_sanctum', Math.min(completedLevels, 40), 40);
  updateProgress('campaign_grandmaster', Math.min(completedLevels, 50), 50);

  // 13-14. Stars Progression
  updateProgress('starlight_collector', totalStars, 75);
  updateProgress('constellation_master', totalStars, 150);

  // 15-16. Streaks
  updateProgress('streak_3', stats.currentWinStreak, 3);
  updateProgress('streak_5', stats.currentWinStreak, 5);

  // 17-18. Games Played
  updateProgress('veteran', stats.totalGamesPlayed, 25);
  updateProgress('centurion', stats.totalGamesPlayed, 100);

  // 19-20. Total Captures
  updateProgress('blue_hunter_50', stats.totalGhostsCaptured.blue, 50);
  updateProgress('red_baiter_50', stats.totalGhostsLost.red, 50);

  // 21. Online match victory
  if (data.isWinner && data.gameMode === 'online') {
    unlockAchievement('online_victor');
  }

  // Save changes
  savePlayerStats(stats);
  saveAchievements(achievements);

  return {
    updatedStats: stats,
    newlyUnlocked,
  };
}

export function resetPlayerStats(): void {
  try {
    setStoredStatsRaw(null);
    setStoredAchievementsRaw(null);
  } catch (err) {
    console.error('Failed to reset career stats:', err);
  }
}
