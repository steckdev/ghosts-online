import type { LevelProgress } from '../types/game';

const STORAGE_KEY = 'ghosts_levels_progress_v1';
const TOTAL_LEVELS = 50;

export function getDefaultLevelProgress(): Record<number, LevelProgress> {
  const record: Record<number, LevelProgress> = {};
  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    record[i] = {
      levelId: i,
      completed: false,
      stars: 0,
      bestMoves: 0,
      unlocked: i === 1, // Level 1 is always unlocked
    };
  }
  return record;
}

let memoryStore: string | null = null;

function getStoredRaw(): string | null {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage.getItem(STORAGE_KEY);
  }
  return memoryStore;
}

function setStoredRaw(value: string): void {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, value);
  }
  memoryStore = value;
}

export function getLevelProgress(): Record<number, LevelProgress> {
  try {
    const raw = getStoredRaw();
    if (!raw) return getDefaultLevelProgress();

    const parsed = JSON.parse(raw) as Record<string, Partial<LevelProgress>>;
    const defaults = getDefaultLevelProgress();

    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      const savedItem = parsed[i.toString()] || parsed[i];
      if (savedItem) {
        defaults[i] = {
          levelId: i,
          completed: !!savedItem.completed,
          stars: savedItem.stars || 0,
          bestMoves: savedItem.bestMoves || 0,
          unlocked: i === 1 || !!savedItem.unlocked,
        };
      }
    }

    return defaults;
  } catch (e) {
    console.error('Failed to load level progress:', e);
    return getDefaultLevelProgress();
  }
}

export function saveLevelCompletion(
  levelId: number,
  movesTaken: number,
  parMoves: number
): { stars: number; isNewBest: boolean; nextLevelUnlocked: number | null } {
  const current = getLevelProgress();
  const existing = current[levelId] || {
    levelId,
    completed: false,
    stars: 0,
    bestMoves: 0,
    unlocked: true,
  };

  // Star calculation
  let stars = 1;
  if (movesTaken <= parMoves) {
    stars = 3;
  } else if (movesTaken <= parMoves + 2) {
    stars = 2;
  }

  const isNewBest = existing.bestMoves === 0 || movesTaken < existing.bestMoves;
  const bestMoves = existing.bestMoves === 0 ? movesTaken : Math.min(existing.bestMoves, movesTaken);
  const highestStars = Math.max(existing.stars, stars);

  current[levelId] = {
    levelId,
    completed: true,
    stars: highestStars,
    bestMoves,
    unlocked: true,
  };

  let nextLevelUnlocked: number | null = null;
  if (levelId < TOTAL_LEVELS) {
    const nextId = levelId + 1;
    if (!current[nextId].unlocked) {
      current[nextId].unlocked = true;
      nextLevelUnlocked = nextId;
    }
  }

  try {
    setStoredRaw(JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save level completion:', e);
  }

  return { stars, isNewBest, nextLevelUnlocked };
}

export function getTotalStars(progress: Record<number, LevelProgress>): number {
  return Object.values(progress).reduce((acc, curr) => acc + (curr.stars || 0), 0);
}

export function getCompletedCount(progress: Record<number, LevelProgress>): number {
  return Object.values(progress).filter((p) => p.completed).length;
}

export function resetAllLevelProgress(): Record<number, LevelProgress> {
  const defaults = getDefaultLevelProgress();
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    memoryStore = null;
  } catch (e) {
    console.error('Failed to reset progress:', e);
  }
  return defaults;
}
