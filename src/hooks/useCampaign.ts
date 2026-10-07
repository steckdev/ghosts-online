import { useState, useRef, useCallback } from 'react';
import type { PuzzleLevel, LevelProgress } from '../types/game';
import { PUZZLE_LEVELS } from '../data/puzzleLevels';
import {
  getLevelProgress,
  saveLevelCompletion,
  resetAllLevelProgress,
} from '../utils/levelStorage';

export interface LevelCompleteModalData {
  isOpen: boolean;
  level: PuzzleLevel;
  movesTaken: number;
  starsEarned: number;
  isNewBest: boolean;
  bestMoves: number;
}

export function useCampaign() {
  const [currentLevel, setCurrentLevel] = useState<PuzzleLevel | null>(null);
  const currentLevelRef = useRef<PuzzleLevel | null>(null);
  const [levelMovesTaken, setLevelMovesTaken] = useState<number>(0);
  const levelMovesTakenRef = useRef<number>(0);
  const [isLevelSelectOpen, setIsLevelSelectOpen] = useState(false);
  const [levelProgress, setLevelProgress] = useState<Record<number, LevelProgress>>(() => getLevelProgress());
  const [levelCompleteModalData, setLevelCompleteModalData] = useState<LevelCompleteModalData | null>(null);

  const setLevel = useCallback((level: PuzzleLevel | null) => {
    setCurrentLevel(level);
    currentLevelRef.current = level;
    setLevelMovesTaken(0);
    levelMovesTakenRef.current = 0;
    setLevelCompleteModalData(null);
  }, []);

  const incrementMoves = useCallback(() => {
    setLevelMovesTaken((m) => {
      const next = m + 1;
      levelMovesTakenRef.current = next;
      return next;
    });
  }, []);

  const recordLevelWin = useCallback((movesOverride?: number) => {
    const lvl = currentLevelRef.current;
    if (!lvl) return;

    const finalMoves = movesOverride !== undefined ? movesOverride : levelMovesTakenRef.current;
    const saveRes = saveLevelCompletion(lvl.id, finalMoves, lvl.parMoves);
    const updatedProg = getLevelProgress();
    setLevelProgress(updatedProg);

    setLevelCompleteModalData({
      isOpen: true,
      level: lvl,
      movesTaken: finalMoves,
      starsEarned: saveRes.stars,
      isNewBest: saveRes.isNewBest,
      bestMoves: updatedProg[lvl.id]?.bestMoves || finalMoves,
    });
  }, []);

  const resetCampaignProgress = useCallback(() => {
    const defaults = resetAllLevelProgress();
    setLevelProgress(defaults);
  }, []);

  return {
    currentLevel,
    currentLevelRef,
    levelMovesTaken,
    levelMovesTakenRef,
    isLevelSelectOpen,
    levelProgress,
    levelCompleteModalData,
    setLevel,
    incrementMoves,
    recordLevelWin,
    setIsLevelSelectOpen,
    setLevelCompleteModalData,
    resetCampaignProgress,
    puzzleLevels: PUZZLE_LEVELS,
  };
}
