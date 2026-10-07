import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPlayerStats,
  getAchievements,
  recordMatchResult,
  resetPlayerStats,
  DEFAULT_ACHIEVEMENTS,
} from '../utils/statsStorage';
import { resetAllLevelProgress, saveLevelCompletion } from '../utils/levelStorage';
import type { MatchResultData } from '../types/stats';

describe('Player Career Stats & Retro Achievements Engine', () => {
  beforeEach(() => {
    resetPlayerStats();
    resetAllLevelProgress();
  });

  describe('Initial Default State', () => {
    it('initializes with zeroed career statistics', () => {
      const stats = getPlayerStats();
      expect(stats.totalGamesPlayed).toBe(0);
      expect(stats.totalWins).toBe(0);
      expect(stats.totalLosses).toBe(0);
      expect(stats.currentWinStreak).toBe(0);
      expect(stats.bestWinStreak).toBe(0);
      expect(stats.fewestMovesToWin).toBeNull();
      expect(stats.byMode.ai.played).toBe(0);
      expect(stats.byMode.levels.played).toBe(0);
      expect(stats.byMode['pass-and-play'].played).toBe(0);
      expect(stats.byMode.online.played).toBe(0);
    });

    it('initializes all 21 achievements as locked', () => {
      const achievements = getAchievements();
      expect(achievements.length).toBe(21);
      expect(achievements.every((a) => !a.unlocked)).toBe(true);
    });

    it('contains all required achievement categories and valid icon references', () => {
      const categories = new Set(DEFAULT_ACHIEVEMENTS.map((a) => a.category));
      expect(categories.has('combat')).toBe(true);
      expect(categories.has('escape')).toBe(true);
      expect(categories.has('deception')).toBe(true);
      expect(categories.has('campaign')).toBe(true);
      expect(categories.has('mastery')).toBe(true);
    });
  });

  describe('Match Recording and Stats Aggregation', () => {
    it('correctly aggregates single player AI win', () => {
      const match: MatchResultData = {
        gameMode: 'ai',
        aiDifficulty: 'hard',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 12,
        capturedBlues: 2,
        capturedReds: 1,
        lostBlues: 1,
        lostReds: 0,
      };

      const { updatedStats } = recordMatchResult(match);
      expect(updatedStats.totalGamesPlayed).toBe(1);
      expect(updatedStats.totalWins).toBe(1);
      expect(updatedStats.totalLosses).toBe(0);
      expect(updatedStats.currentWinStreak).toBe(1);
      expect(updatedStats.bestWinStreak).toBe(1);
      expect(updatedStats.byMode.ai.played).toBe(1);
      expect(updatedStats.byMode.ai.wins).toBe(1);
      expect(updatedStats.byAIDifficulty.hard.played).toBe(1);
      expect(updatedStats.byAIDifficulty.hard.wins).toBe(1);
      expect(updatedStats.byWinReason.escaped).toBe(1);
      expect(updatedStats.totalGhostsCaptured.blue).toBe(2);
      expect(updatedStats.totalGhostsCaptured.red).toBe(1);
      expect(updatedStats.totalGhostsLost.blue).toBe(1);
      expect(updatedStats.totalGhostsLost.red).toBe(0);
      expect(updatedStats.fewestMovesToWin).toBe(12);
    });

    it('correctly handles win streaks and resets streak upon loss without losing best streak', () => {
      const winMatch: MatchResultData = {
        gameMode: 'ai',
        aiDifficulty: 'easy',
        isWinner: true,
        winReason: 'captured_all_blue',
        movesTaken: 15,
        capturedBlues: 4,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 1,
      };

      recordMatchResult(winMatch);
      recordMatchResult(winMatch);
      const afterTwoWins = recordMatchResult(winMatch).updatedStats;
      expect(afterTwoWins.currentWinStreak).toBe(3);
      expect(afterTwoWins.bestWinStreak).toBe(3);

      const lossMatch: MatchResultData = {
        gameMode: 'ai',
        aiDifficulty: 'hard',
        isWinner: false,
        winReason: 'escaped',
        movesTaken: 20,
        capturedBlues: 1,
        capturedReds: 2,
        lostBlues: 2,
        lostReds: 1,
      };

      const afterLoss = recordMatchResult(lossMatch).updatedStats;
      expect(afterLoss.totalGamesPlayed).toBe(4);
      expect(afterLoss.totalWins).toBe(3);
      expect(afterLoss.totalLosses).toBe(1);
      expect(afterLoss.currentWinStreak).toBe(0);
      expect(afterLoss.bestWinStreak).toBe(3);
      expect(afterLoss.byLossReason.escaped).toBe(1);
    });

    it('tracks lowest moves to win correctly', () => {
      recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 14,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });

      let stats = getPlayerStats();
      expect(stats.fewestMovesToWin).toBe(14);

      // Higher moves should not override best
      recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 22,
        capturedBlues: 2,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });
      stats = getPlayerStats();
      expect(stats.fewestMovesToWin).toBe(14);

      // Fewer moves should update
      recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 6,
        capturedBlues: 0,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });
      stats = getPlayerStats();
      expect(stats.fewestMovesToWin).toBe(6);
    });
  });

  describe('Achievement Unlocks Logic', () => {
    it('unlocks first_blood and great_escape_1 on initial escape victory', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 10,
        capturedBlues: 1,
        capturedReds: 1,
        lostBlues: 0,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('first_blood');
      expect(ids).toContain('great_escape_1');
      expect(ids).toContain('clean_sheet');
    });

    it('unlocks blue_purge on capturing all 4 opponent good ghosts', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'captured_all_blue',
        movesTaken: 16,
        capturedBlues: 4,
        capturedReds: 1,
        lostBlues: 2,
        lostReds: 1,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('blue_purge');
      expect(ids).not.toContain('clean_sheet');
    });

    it('unlocks poison_trap when tricked opponent takes all 4 bad red ghosts', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'captured_all_red',
        movesTaken: 14,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 1,
        lostReds: 4,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('poison_trap');
    });

    it('unlocks speed_demon on victory in 8 moves or fewer', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 7,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('speed_demon');
    });

    it('unlocks pacifist_escape when winning by escape with zero captures', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 9,
        capturedBlues: 0,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('pacifist_escape');
    });

    it('unlocks super_max_slayer when defeating Super Max AI', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'ai',
        aiDifficulty: 'super_max',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 18,
        capturedBlues: 2,
        capturedReds: 1,
        lostBlues: 1,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('super_max_slayer');
    });

    it('unlocks streak_3 upon reaching a 3-game win streak', () => {
      const winMatch: MatchResultData = {
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 12,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      };

      recordMatchResult(winMatch);
      recordMatchResult(winMatch);
      const { newlyUnlocked } = recordMatchResult(winMatch);
      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('streak_3');
    });

    it('unlocks online_victor when winning an online multiplayer match', () => {
      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'online',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 10,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('online_victor');
    });

    it('evaluates campaign progress achievements when campaign levels are completed', () => {
      // Simulate completing levels 1 to 10 with 3 stars each (30 stars)
      for (let i = 1; i <= 10; i++) {
        saveLevelCompletion(i, 5, 3);
      }

      const { newlyUnlocked } = recordMatchResult({
        gameMode: 'levels',
        levelId: 10,
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 5,
        capturedBlues: 1,
        capturedReds: 0,
        lostBlues: 0,
        lostReds: 0,
      });

      const ids = newlyUnlocked.map((a) => a.id);
      expect(ids).toContain('campaign_initiate');
    });
  });

  describe('Reset Career Stats', () => {
    it('fully resets all stats and locks all achievements upon reset', () => {
      recordMatchResult({
        gameMode: 'ai',
        isWinner: true,
        winReason: 'escaped',
        movesTaken: 6,
        capturedBlues: 2,
        capturedReds: 1,
        lostBlues: 0,
        lostReds: 0,
      });

      expect(getPlayerStats().totalWins).toBe(1);
      expect(getAchievements().filter((a) => a.unlocked).length).toBeGreaterThan(0);

      resetPlayerStats();

      const freshStats = getPlayerStats();
      const freshAchievements = getAchievements();

      expect(freshStats.totalWins).toBe(0);
      expect(freshStats.totalGamesPlayed).toBe(0);
      expect(freshStats.fewestMovesToWin).toBeNull();
      expect(freshAchievements.every((a) => !a.unlocked)).toBe(true);
    });
  });
});
