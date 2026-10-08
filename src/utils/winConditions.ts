import type { Ghost, PlayerRole, WinReason, CapturedGhost, GameMode, PuzzleLevel } from '../types/game';

export interface WinConditionResult {
  hasWon: boolean;
  winningPlayer: PlayerRole | null;
  winReason: WinReason | null;
}

export interface EvaluateWinConditionsParams {
  gameMode: GameMode;
  currentCaptured: CapturedGhost[];
  currentGhosts: Ghost[];
  currentLevel?: PuzzleLevel | null;
  aiSecretColors?: Record<string, 'blue' | 'red'>;
}

/**
 * Universal Win Condition Evaluator
 *
 * Rules:
 * 1. Escaped Good Ghost: First player to move a Good Ghost out through an exit door wins.
 * 2. 4 Enemy Good Ghosts Captured: Capturing all 4 Good Ghosts of the opponent wins.
 * 3. 4 Friendly Bad Ghosts Captured (Poison Pill): If an opponent captures all 4 of your Bad Ghosts, you win (opponent loses).
 * 4. Puzzle Elimination (ONLY in 'levels' mode): Custom puzzles may start with fewer than 4 ghosts or 0 blue ghosts.
 *    In standard modes ('online', 'ai', 'pass-and-play'), opponent ghosts have secret or unknown colors
 *    and standard 8-ghost rules 1-3 apply.
 */
export function evaluateWinConditions(params: EvaluateWinConditionsParams): WinConditionResult {
  const { gameMode, currentCaptured, currentGhosts, currentLevel, aiSecretColors = {} } = params;

  // 1. Escaped ghost check (immediate victory)
  const escaped = currentGhosts.find((g) => g.hasEscaped);
  if (escaped) {
    return {
      hasWon: true,
      winningPlayer: escaped.owner,
      winReason: 'escaped',
    };
  }

  // 2. 4 Blue Ghosts captured
  const p1CapturedBlueFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'blue').length;
  const p2CapturedBlueFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'blue').length;

  if (p1CapturedBlueFromP2 >= 4) {
    return {
      hasWon: true,
      winningPlayer: 'p1',
      winReason: 'captured_all_blue',
    };
  } else if (p2CapturedBlueFromP1 >= 4) {
    return {
      hasWon: true,
      winningPlayer: 'p2',
      winReason: 'captured_all_blue',
    };
  }

  // 3. 4 Red Ghosts captured (Poison Pill trap -> opponent loses, capturer's opponent wins)
  const p1CapturedRedFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'red').length;
  const p2CapturedRedFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'red').length;

  if (p1CapturedRedFromP2 >= 4) {
    return {
      hasWon: true,
      winningPlayer: 'p2',
      winReason: 'captured_all_red',
    };
  } else if (p2CapturedRedFromP1 >= 4) {
    return {
      hasWon: true,
      winningPlayer: 'p1',
      winReason: 'captured_all_red',
    };
  }

  // 4. Board Elimination Check ONLY for custom campaign levels:
  if (gameMode === 'levels') {
    const activeAiGhosts = currentGhosts.filter((g) => g.owner === 'p2' && !g.isCaptured && !g.hasEscaped);
    const activeP1Ghosts = currentGhosts.filter((g) => g.owner === 'p1' && !g.isCaptured && !g.hasEscaped);

    const activeAiBlueGhosts = activeAiGhosts.filter(
      (g) => g.color === 'blue' || aiSecretColors[g.id] === 'blue'
    );
    const activeP1BlueGhosts = activeP1Ghosts.filter((g) => g.color === 'blue');

    const p1StartedWithBlue = currentLevel ? currentLevel.playerGhosts.some((g) => g.color === 'blue') : false;
    const aiStartedWithBlue = currentLevel ? currentLevel.aiGhosts.some((g) => g.color === 'blue') : false;

    // Player 1 defeated: 0 active ghosts left, or all player blue ghosts captured
    if (activeP1Ghosts.length === 0 || (p1StartedWithBlue && activeP1BlueGhosts.length === 0)) {
      return {
        hasWon: true,
        winningPlayer: 'p2',
        winReason: 'captured_all_blue',
      };
    }
    // AI defeated: 0 active ghosts left, or all AI blue ghosts captured (only if AI started with blue)
    else if (activeAiGhosts.length === 0 || (aiStartedWithBlue && activeAiBlueGhosts.length === 0)) {
      return {
        hasWon: true,
        winningPlayer: 'p1',
        winReason: 'captured_all_blue',
      };
    }
  }

  return {
    hasWon: false,
    winningPlayer: null,
    winReason: null,
  };
}
