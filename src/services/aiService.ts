import type { Ghost, AIDifficulty } from '../types/game';

export interface AIMove {
  ghostId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  isExit?: boolean;
}

export type PuzzleAIBehavior = 'deterministic' | 'rush_exit' | 'guard_doors' | 'hunt_blues' | 'passive';

export interface AIMoveOptions {
  difficulty?: AIDifficulty;
  puzzleBehavior?: PuzzleAIBehavior;
  playerSecretGhosts?: Ghost[];
}

// Generate valid moves for a ghost on a 6x6 board
export function getValidMovesForGhost(
  ghost: Ghost,
  allGhosts: Ghost[],
  playerRole: 'p1' | 'p2',
  isGlobalCoordinates: boolean = false,
  isOnlineMode: boolean = false
): { x: number; y: number; isExit?: boolean }[] {
  const moves: { x: number; y: number; isExit?: boolean }[] = [];
  const directions = [
    { dx: 0, dy: 1 },  // Forward (towards row 5)
    { dx: 0, dy: -1 }, // Backward
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  // Exit check: If ghost is GOOD (Blue) and already at an exit tile
  if (isOnlineMode || !isGlobalCoordinates) {
    // Local / Normalized perspective (both players in Online/AI advance from y=0 towards y=5)
    if (ghost.color === 'blue' && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5)) {
      moves.push({ x: ghost.x, y: 6, isExit: true });
    }
  } else {
    // Global board coordinates for Pass & Play
    if (playerRole === 'p1' && ghost.color === 'blue' && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5)) {
      moves.push({ x: ghost.x, y: 6, isExit: true });
    } else if (playerRole === 'p2' && ghost.color === 'blue' && ghost.y === 0 && (ghost.x === 0 || ghost.x === 5)) {
      moves.push({ x: ghost.x, y: -1, isExit: true });
    }
  }

  for (const { dx, dy } of directions) {
    const nx = ghost.x + dx;
    const ny = ghost.y + dy;

    // Normal board bounds 0..5
    if (nx >= 0 && nx <= 5 && ny >= 0 && ny <= 5) {
      // Cannot move onto friendly ghost
      const friendlyAtTarget = allGhosts.find(
        (g) => !g.isCaptured && !g.hasEscaped && g.owner === playerRole && g.x === nx && g.y === ny
      );
      if (!friendlyAtTarget) {
        moves.push({ x: nx, y: ny });
      }
    }
  }

  return moves;
}

interface ScoredMove {
  move: AIMove;
  score: number;
}

// AI calculation function supporting difficulty levels and deterministic puzzle modes
export function calculateAIMove(
  aiGhosts: Ghost[],
  playerGhosts: Ghost[],
  optionsOrDifficulty?: AIDifficulty | AIMoveOptions,
  legacyOptions?: AIMoveOptions
): AIMove | null {
  const activeAiGhosts = aiGhosts.filter((g) => !g.isCaptured && !g.hasEscaped);
  const activePlayerGhosts = playerGhosts.filter((g) => !g.isCaptured && !g.hasEscaped);

  if (activeAiGhosts.length === 0) return null;

  // Resolve options
  let difficulty: AIDifficulty = 'hard';
  let puzzleBehavior: PuzzleAIBehavior | undefined;
  let playerSecretGhosts: Ghost[] | undefined;

  if (typeof optionsOrDifficulty === 'string') {
    difficulty = optionsOrDifficulty;
    if (legacyOptions) {
      puzzleBehavior = legacyOptions.puzzleBehavior;
      playerSecretGhosts = legacyOptions.playerSecretGhosts;
    }
  } else if (optionsOrDifficulty && typeof optionsOrDifficulty === 'object') {
    difficulty = optionsOrDifficulty.difficulty || 'hard';
    puzzleBehavior = optionsOrDifficulty.puzzleBehavior;
    playerSecretGhosts = optionsOrDifficulty.playerSecretGhosts;
  }

  const isDeterministic = !!puzzleBehavior;

  // 1. Immediate Win: If any AI blue ghost can escape off the board, take it immediately!
  for (const ghost of activeAiGhosts) {
    if (ghost.color === 'blue') {
      const valid = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2', false);
      const exitMove = valid.find((m) => m.isExit);
      if (exitMove) {
        return {
          ghostId: ghost.id,
          from: { x: ghost.x, y: ghost.y },
          to: { x: exitMove.x, y: exitMove.y },
          isExit: true,
        };
      }
    }
  }

  // 2. If an AI blue ghost can move onto an exit tile (x=0, y=5) or (x=5, y=5) safely, prioritize it!
  for (const ghost of activeAiGhosts) {
    if (ghost.color === 'blue') {
      const valid = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2', false);
      const enterExitMove = valid.find((m) => (m.x === 0 || m.x === 5) && m.y === 5);
      if (enterExitMove) {
        // In puzzle mode or high difficulty, check if target square is free
        const isOccupied = activePlayerGhosts.some((pg) => pg.x === enterExitMove.x && pg.y === enterExitMove.y);
        if (!isOccupied || difficulty === 'super_max') {
          return {
            ghostId: ghost.id,
            from: { x: ghost.x, y: ghost.y },
            to: enterExitMove,
          };
        }
      }
    }
  }

  // Collect all valid candidate moves
  const candidateMoves: ScoredMove[] = [];

  // Map true secret colors of player ghosts if known (for Super Max omniscient AI)
  const playerColorMap = new Map<string, 'blue' | 'red'>();
  if (playerSecretGhosts) {
    for (const pg of playerSecretGhosts) {
      if (pg.color === 'blue' || pg.color === 'red') {
        playerColorMap.set(pg.id, pg.color);
      }
    }
  }
  for (const pg of activePlayerGhosts) {
    if (pg.color === 'blue' || pg.color === 'red') {
      playerColorMap.set(pg.id, pg.color);
    }
  }

  for (const ghost of activeAiGhosts) {
    const validMoves = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2', false);

    for (const target of validMoves) {
      if (target.isExit) continue;

      let score = 0;
      const targetGhost = activePlayerGhosts.find((g) => g.x === target.x && g.y === target.y);

      // Distance to nearest exit (x=0,y=5 or x=5,y=5)
      const distToExitLeft = Math.abs(target.x - 0) + Math.abs(5 - target.y);
      const distToExitRight = Math.abs(target.x - 5) + Math.abs(5 - target.y);
      const distToExit = Math.min(distToExitLeft, distToExitRight);

      // --- PUZZLE-SPECIFIC BEHAVIORS ---
      if (puzzleBehavior === 'passive') {
        // Move sideways or backward; avoid advancing aggressively
        score -= (target.y - ghost.y) * 20;
        if (targetGhost) score -= 50; // Avoid captures
      } else if (puzzleBehavior === 'rush_exit') {
        // Rush forward towards player's back row / corner exits
        score += (target.y - ghost.y) * 35;
        score += (10 - distToExit) * 15;
      } else if (puzzleBehavior === 'guard_doors') {
        // Sentry near the corner exits
        const isNearDoor = (target.x <= 1 || target.x >= 4) && target.y >= 3;
        if (isNearDoor) score += 30;
        score += (target.y - ghost.y) * 10;
      } else if (puzzleBehavior === 'hunt_blues') {
        // Advance aggressively toward player pieces
        if (targetGhost) score += 60;
        const minDistToPlayer = Math.min(
          ...activePlayerGhosts.map((pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y))
        );
        score += (10 - minDistToPlayer) * 12;
      } else if (difficulty === 'easy') {
        // --- EASY DIFFICULTY ---
        // Basic forward momentum, casual moves, frequent minor suboptimal choices
        score += (target.y - ghost.y) * 8;
        if (targetGhost) score += 10;
        // Moderate random noise for casual play
        score += Math.random() * 20;
      } else if (difficulty === 'super_max') {
        // --- SUPER MAX (OMNISCIENT MASTER AI) ---
        // Knows true player colors!
        if (targetGhost) {
          const trueColor = playerColorMap.get(targetGhost.id);
          if (trueColor === 'red') {
            // STRICT AVOIDANCE: Never capture player's red poison pills!
            score -= 1000;
          } else if (trueColor === 'blue') {
            // RELENTLESS HUNT: Aggressively eliminate player's blue ghosts!
            score += 200;
          } else {
            score += 20;
          }
        }

        if (ghost.color === 'blue') {
          // AI Blue Ghost: Race to exit while keeping safe from capture
          score += (target.y - ghost.y) * 25;
          score += (10 - distToExit) * 12;

          // Check if target is threatened by any player ghost
          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            score -= 50;
          }
        } else {
          // AI Red Ghost: Aggressively screen, pin, or bait player's blue ghosts
          score += (target.y - ghost.y) * 15;
          // Red ghosts love being threatened by player's pieces!
          const isThreatenedByPlayer = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatenedByPlayer) {
            score += 40;
          }
        }
      } else {
        // --- HARD DIFFICULTY (TACTICAL BLUFFING, FAIR PLAY) ---
        // Does not cheat, evaluates threat zones & bluff potential
        if (ghost.color === 'blue') {
          score += (target.y - ghost.y) * 18;
          score += (10 - distToExit) * 6;

          if (targetGhost) {
            score += 20;
          }

          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            score -= 35;
          }
        } else {
          // Red Ghost: aggressive bluffing
          score += (target.y - ghost.y) * 20;
          if (targetGhost) {
            score += 25;
          }

          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            score += 30; // red ghost wants to get captured
          }
          score += (10 - distToExit) * 3;
        }
      }

      candidateMoves.push({
        move: {
          ghostId: ghost.id,
          from: { x: ghost.x, y: ghost.y },
          to: { x: target.x, y: target.y },
        },
        score,
      });
    }
  }

  if (candidateMoves.length === 0) return null;

  // In puzzle mode (deterministic), sort with fixed tie-breakers to ensure reproducible puzzle solutions
  if (isDeterministic) {
    candidateMoves.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.01) {
        return b.score - a.score;
      }
      // Fixed tie-breaker: sort by ghostId, then to.x, then to.y
      if (a.move.ghostId !== b.move.ghostId) {
        return a.move.ghostId.localeCompare(b.move.ghostId);
      }
      if (a.move.to.x !== b.move.to.x) {
        return a.move.to.x - b.move.to.x;
      }
      return a.move.to.y - b.move.to.y;
    });
    return candidateMoves[0].move;
  }

  // In standard game mode (Easy / Hard / Super Max):
  // Implement Tie-Breaker Variance:
  // "when there is equal options that they will randomly choose from the choices.
  // Example is whether to move the column 1, or column 4 piece has the same outcome
  // then it might be one on one occasion and another on one other occasion."
  candidateMoves.sort((a, b) => b.score - a.score);
  const bestScore = candidateMoves[0].score;

  // Pool all moves whose score is within 0.5 points of the best score (effectively equal options)
  const tieThreshold = 0.5;
  const topTiePool = candidateMoves.filter((m) => bestScore - m.score <= tieThreshold);

  if (topTiePool.length > 1) {
    const randomIndex = Math.floor(Math.random() * topTiePool.length);
    return topTiePool[randomIndex].move;
  }

  return candidateMoves[0].move;
}
