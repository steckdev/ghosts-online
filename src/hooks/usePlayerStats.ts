import { useState, useCallback } from 'react';
import type { PlayerStats, Achievement, MatchResultData } from '../types/stats';
import {
  getPlayerStats,
  getAchievements,
  recordMatchResult,
  resetPlayerStats as resetStoredStats,
} from '../utils/statsStorage';
import { soundManager } from '../audio/soundEffects';

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats>(() => getPlayerStats());
  const [achievements, setAchievements] = useState<Achievement[]>(() => getAchievements());
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [recentToast, setRecentToast] = useState<Achievement | null>(null);

  const refreshStats = useCallback(() => {
    setStats(getPlayerStats());
    setAchievements(getAchievements());
  }, []);

  const recordMatch = useCallback((data: MatchResultData) => {
    const { updatedStats, newlyUnlocked } = recordMatchResult(data);
    setStats(updatedStats);
    setAchievements(getAchievements());

    if (newlyUnlocked.length > 0) {
      soundManager.playAchievement();
      // Show the first newly unlocked achievement
      setRecentToast(newlyUnlocked[0]);
    }

    return newlyUnlocked;
  }, []);

  const clearToast = useCallback(() => {
    setRecentToast(null);
  }, []);

  const resetCareerStats = useCallback(() => {
    resetStoredStats();
    setStats(getPlayerStats());
    setAchievements(getAchievements());
  }, []);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return {
    stats,
    achievements,
    unlockedCount,
    totalAchievementsCount: achievements.length,
    isStatsModalOpen,
    setIsStatsModalOpen,
    recentToast,
    clearToast,
    recordMatch,
    refreshStats,
    resetCareerStats,
  };
}
