import type { Ghost, AIDifficulty, CapturedGhost } from '../types/game';

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
  capturedGhosts?: CapturedGhost[];
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
  let capturedGhosts: CapturedGhost[] | undefined;

  if (typeof optionsOrDifficulty === 'string') {
    difficulty = optionsOrDifficulty;
    if (legacyOptions) {
      puzzleBehavior = legacyOptions.puzzleBehavior;
      playerSecretGhosts = legacyOptions.playerSecretGhosts;
      capturedGhosts = legacyOptions.capturedGhosts;
    }
  } else if (optionsOrDifficulty && typeof optionsOrDifficulty === 'object') {
    difficulty = optionsOrDifficulty.difficulty || 'hard';
    puzzleBehavior = optionsOrDifficulty.puzzleBehavior;
    playerSecretGhosts = optionsOrDifficulty.playerSecretGhosts;
    capturedGhosts = optionsOrDifficulty.capturedGhosts;
  }

  const isDeterministic = !!puzzleBehavior;

  const capturedList = capturedGhosts || [];
  // AI is 'p2'. Player 1's ghosts captured by AI have owner === 'p1'.
  const aiCapturedRedCount = capturedList.filter((g) => g.owner === 'p1' && g.color === 'red').length;
  const aiCapturedBlueCount = capturedList.filter((g) => g.owner === 'p1' && g.color === 'blue').length;
  // AI's ghosts captured by Player 1 have owner === 'p2'.
  const playerCapturedAiRedCount = capturedList.filter((g) => g.owner === 'p2' && g.color === 'red').length;

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

  // 2. Safe Gate Approach: If an AI blue ghost can move onto an exit tile (x=0, y=5) or (x=5, y=5)
  // and is NOT walking into an ambush where an adjacent player ghost would capture it next turn:
  for (const ghost of activeAiGhosts) {
    if (ghost.color === 'blue') {
      const valid = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2', false);
      const enterExitMove = valid.find((m) => (m.x === 0 || m.x === 5) && m.y === 5);
      if (enterExitMove) {
        // Check if an active player ghost is adjacent to that gate (Manhattan distance 1)
        // (excluding any player ghost that sits directly on the gate and is being captured by this move)
        const isAmbushed = activePlayerGhosts.some(
          (pg) =>
            !(pg.x === enterExitMove.x && pg.y === enterExitMove.y) &&
            Math.abs(pg.x - enterExitMove.x) + Math.abs(pg.y - enterExitMove.y) === 1
        );

        // If gate is free of ambushes, or if playing deterministic puzzle, take it!
        if (!isAmbushed || isDeterministic) {
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

  const activeAiBlues = activeAiGhosts.filter((g) => g.color === 'blue');

  for (const ghost of activeAiGhosts) {
    const validMoves = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2', false);

    for (const target of validMoves) {
      if (target.isExit) continue;

      let score = 0;
      const targetGhost = activePlayerGhosts.find((g) => g.x === target.x && g.y === target.y);

      // Distance to nearest exit (x=0,y=5 or x=5,y=5)
      // Dual-Flank Runner logic: If multiple AI Blue ghosts, balance them across left and right gates
      let targetGateX = 0;
      if (activeAiBlues.length >= 2 && ghost.color === 'blue') {
        targetGateX = ghost.x >= 3 ? 5 : 0;
      } else {
        const dLeft = Math.abs(target.x - 0) + Math.abs(5 - target.y);
        const dRight = Math.abs(target.x - 5) + Math.abs(5 - target.y);
        targetGateX = dLeft <= dRight ? 0 : 5;
      }
      const distToExit = Math.abs(target.x - targetGateX) + Math.abs(5 - target.y);

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
        score += (target.y - ghost.y) * 8;
        if (targetGhost) score += 10;
        score += Math.random() * 20;
      } else if (difficulty === 'super_max') {
        // --- SUPER MAX (OMNISCIENT MASTER AI) ---
        // Knows true player colors!
        if (targetGhost) {
          const trueColor = playerColorMap.get(targetGhost.id);
          if (trueColor === 'blue') {
            // RELENTLESS HUNT: Aggressively eliminate player's blue ghosts!
            score += (aiCapturedBlueCount === 3 ? 5000 : 250);
          } else if (trueColor === 'red') {
            // DYNAMIC RED BARRICADE SMASHING
            if (aiCapturedRedCount >= 3) {
              // 4th Red Ghost = DEFEAT! Strict refusal
              score -= 2000;
            } else {
              // Capturing Red is NOT lethal when count < 3!
              // Scale penalty: 0 red captured -> -5, 1 red captured -> -20, 2 red captured -> -60
              const baseRedPenalty = aiCapturedRedCount === 0 ? -5 : aiCapturedRedCount === 1 ? -20 : -60;
              score += baseRedPenalty;

              // Barricade detection: Does this player Red ghost block AI corridor or Blue runners?
              const isBarricade = activeAiGhosts.some(
                (ag) => Math.abs(ag.x - target.x) <= 1 && ag.y <= target.y
              );
              if (isBarricade) {
                // High bonus for smashing barricades to liberate advancing runners!
                const barricadeBonus = aiCapturedRedCount === 0 ? 60 : aiCapturedRedCount === 1 ? 45 : 25;
                score += barricadeBonus;
              }
            }
          } else {
            score += 20;
          }
        }

        if (ghost.color === 'blue') {
          // AI Blue Ghost: Race toward designated gate while avoiding traps
          score += (target.y - ghost.y) * 25;
          score += (10 - distToExit) * 14;

          // Check if target is threatened by any player ghost
          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            const isExitGate = (target.x === 0 || target.x === 5) && target.y === 5;
            score -= isExitGate ? 140 : 65;
          }

          // Bonus if fleeing from current threatened position to a safe tile
          const isCurrentlyThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - ghost.x) + Math.abs(pg.y - ghost.y) === 1
          );
          if (isCurrentlyThreatened && !isThreatened) {
            score += 45;
          }
        } else {
          // AI Red Ghost: Vanguard bodyguard & sacrificial screen
          score += (target.y - ghost.y) * 16;

          // 1. Vanguard Screen: Position ahead of advancing Blue teammates
          for (const bg of activeAiBlues) {
            if (target.y >= bg.y && Math.abs(target.x - bg.x) <= 1) {
              score += 30; // Vanguard bodyguard bonus!
            }
          }

          // 2. Interposition: Step between threatening player ghost and Blue teammate
          for (const bg of activeAiBlues) {
            const threateningPlayers = activePlayerGhosts.filter(
              (pg) => Math.abs(pg.x - bg.x) + Math.abs(pg.y - bg.y) === 1
            );
            if (threateningPlayers.length > 0) {
              const isBlockingThreat = threateningPlayers.some(
                (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) <= 1
              );
              if (isBlockingThreat) {
                score += 40;
              }
            }
          }

          // 3. Poison Bait: If player has 3 red captured, stepping in front of player is lethal trap!
          if (playerCapturedAiRedCount === 3) {
            const isNearPlayer = activePlayerGhosts.some(
              (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
            );
            if (isNearPlayer) {
              score += 180; // Instant win if player takes the bait!
            }
          } else {
            // General bait bonus: Red ghosts like being threatened by player
            const isThreatenedByPlayer = activePlayerGhosts.some(
              (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
            );
            if (isThreatenedByPlayer) {
              score += 35;
            }
          }
        }
      } else {
        // --- HARD DIFFICULTY (TACTICAL BLUFFING, FAIR PLAY) ---
        if (targetGhost) {
          if (aiCapturedRedCount >= 3) {
            score -= 30;
          } else {
            score += aiCapturedRedCount === 0 ? 35 : 20;
          }
        }

        if (ghost.color === 'blue') {
          score += (target.y - ghost.y) * 20;
          score += (10 - distToExit) * 8;

          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            const isExitGate = (target.x === 0 || target.x === 5) && target.y === 5;
            score -= isExitGate ? 100 : 40;
          }
        } else {
          // Red Ghost: aggressive bluffing and screening
          score += (target.y - ghost.y) * 18;
          for (const bg of activeAiBlues) {
            if (target.y >= bg.y && Math.abs(target.x - bg.x) <= 1) {
              score += 25;
            }
          }
          const isThreatened = activePlayerGhosts.some(
            (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
          );
          if (isThreatened) {
            score += playerCapturedAiRedCount === 3 ? 120 : 30;
          }
          score += (10 - distToExit) * 4;
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
