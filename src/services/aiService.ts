import type { Ghost } from '../types/game';

export interface AIMove {
  ghostId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  isExit?: boolean;
}

// Generate valid moves for a ghost on a 6x6 board
export function getValidMovesForGhost(
  ghost: Ghost,
  allGhosts: Ghost[],
  playerRole: 'p1' | 'p2'
): { x: number; y: number; isExit?: boolean }[] {
  const moves: { x: number; y: number; isExit?: boolean }[] = [];
  const directions = [
    { dx: 0, dy: 1 },  // Forward (towards opponent's side)
    { dx: 0, dy: -1 }, // Backward
    { dx: -1, dy: 0 }, // Left
    { dx: 1, dy: 0 },  // Right
  ];

  // Exit check: If ghost is GOOD (Blue) and already at an exit tile on row 5 (opponent's back row, corners x=0 or x=5)
  // It can escape by moving off the board forward!
  if (ghost.color === 'blue' && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5)) {
    // Can step off the board through the exit gateway!
    moves.push({ x: ghost.x, y: 6, isExit: true });
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

// AI calculation function
export function calculateAIMove(
  aiGhosts: Ghost[],
  playerGhosts: Ghost[]
): AIMove | null {
  const activeAiGhosts = aiGhosts.filter((g) => !g.isCaptured && !g.hasEscaped);
  const activePlayerGhosts = playerGhosts.filter((g) => !g.isCaptured && !g.hasEscaped);

  if (activeAiGhosts.length === 0) return null;

  // 1. Immediate Win: If any AI blue ghost can escape off the board, take it immediately!
  for (const ghost of activeAiGhosts) {
    if (ghost.color === 'blue') {
      const valid = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2');
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

  // 2. If an AI blue ghost can move onto an exit tile (x=0, y=5) or (x=5, y=5) without immediate death, prioritize it!
  for (const ghost of activeAiGhosts) {
    if (ghost.color === 'blue') {
      const valid = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2');
      const enterExitMove = valid.find((m) => (m.x === 0 || m.x === 5) && m.y === 5);
      if (enterExitMove) {
        return {
          ghostId: ghost.id,
          from: { x: ghost.x, y: ghost.y },
          to: enterExitMove,
        };
      }
    }
  }

  // Collect all possible candidate moves and score them
  interface ScoredMove {
    move: AIMove;
    score: number;
  }
  const candidateMoves: ScoredMove[] = [];

  for (const ghost of activeAiGhosts) {
    const validMoves = getValidMovesForGhost(ghost, [...aiGhosts, ...playerGhosts], 'p2');

    for (const target of validMoves) {
      if (target.isExit) continue; // Handled above

      let score = 0;
      const targetGhost = activePlayerGhosts.find((g) => g.x === target.x && g.y === target.y);

      // Distance to nearest exit for this ghost
      const distToExitLeft = Math.abs(target.x - 0) + Math.abs(5 - target.y);
      const distToExitRight = Math.abs(target.x - 5) + Math.abs(5 - target.y);
      const distToExit = Math.min(distToExitLeft, distToExitRight);

      if (ghost.color === 'blue') {
        // BLUE GHOST BEHAVIOR:
        // Wants to advance towards exit tiles (high row y)
        score += (target.y - ghost.y) * 15; // Moving forward is heavily rewarded
        score += (10 - distToExit) * 5;     // Getting closer to corners

        // If target square captures a player ghost:
        if (targetGhost) {
          score += 20; // Capturing is good, but could be a red trap
        }

        // Penalty if moving into a threatened square (adjacent to an enemy)
        const isThreatened = activePlayerGhosts.some(
          (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
        );
        if (isThreatened) {
          score -= 35; // Blue ghosts avoid danger!
        }
      } else {
        // RED GHOST BEHAVIOR (POISON PILL / BLUFF):
        // Red ghosts LOVE marching aggressively right in front of the player!
        // Red wants to look like a blue ghost escaping, or tempt captures!
        score += (target.y - ghost.y) * 18;

        if (targetGhost) {
          score += 25; // Red can also capture
        }

        // Bonus if moving right into enemy strike range (tempting player to capture a red ghost!)
        const isThreatened = activePlayerGhosts.some(
          (pg) => Math.abs(pg.x - target.x) + Math.abs(pg.y - target.y) === 1
        );
        if (isThreatened) {
          score += 30; // Red actively baited!
        }

        // Red ghosts bluffing towards the exit mimics blue ghosts
        score += (10 - distToExit) * 3;
      }

      // Add a small dose of randomness for unpredictability
      score += Math.random() * 8;

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

  // Sort by highest score
  candidateMoves.sort((a, b) => b.score - a.score);

  // Pick top move or randomly from top 2 for variety
  const topCutoff = Math.min(candidateMoves.length, 2);
  const selected = candidateMoves[Math.floor(Math.random() * topCutoff)];
  return selected.move;
}
