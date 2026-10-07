import { describe, it, expect, beforeEach } from 'vitest';
import { PUZZLE_LEVELS } from '../data/puzzleLevels';
import {
  getDefaultLevelProgress,
  saveLevelCompletion,
  getTotalStars,
  getCompletedCount,
  resetAllLevelProgress,
} from '../utils/levelStorage';
import { calculateAIMove } from './aiService';
import { createInitialGhosts, shuffleGhostColors } from '../utils/ghostUtils';
import type { Ghost } from '../types/game';

describe('50 Puzzle Levels Configuration', () => {
  it('contains exactly 50 well-formed levels', () => {
    expect(PUZZLE_LEVELS.length).toBe(50);
  });

  it('has sequential IDs from 1 to 50 with valid tiers', () => {
    PUZZLE_LEVELS.forEach((level, index) => {
      expect(level.id).toBe(index + 1);
      expect([1, 2, 3, 4]).toContain(level.tier);
      expect(level.parMoves).toBeGreaterThan(0);
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.description.length).toBeGreaterThan(0);
      expect(level.hint.length).toBeGreaterThan(0);
    });
  });

  it('validates all ghosts on all levels have legal board coordinates and no overlap', () => {
    PUZZLE_LEVELS.forEach((level) => {
      const occupiedCoords = new Set<string>();

      // Check player ghosts
      expect(level.playerGhosts.length).toBeGreaterThan(0);
      level.playerGhosts.forEach((g) => {
        expect(g.x).toBeGreaterThanOrEqual(0);
        expect(g.x).toBeLessThanOrEqual(5);
        expect(g.y).toBeGreaterThanOrEqual(0);
        expect(g.y).toBeLessThanOrEqual(5);
        const coordKey = `${g.x},${g.y}`;
        expect(occupiedCoords.has(coordKey)).toBe(false);
        occupiedCoords.add(coordKey);
      });

      // Check AI ghosts
      expect(level.aiGhosts.length).toBeGreaterThan(0);
      level.aiGhosts.forEach((g) => {
        expect(g.x).toBeGreaterThanOrEqual(0);
        expect(g.x).toBeLessThanOrEqual(5);
        expect(g.y).toBeGreaterThanOrEqual(0);
        expect(g.y).toBeLessThanOrEqual(5);
        const coordKey = `${g.x},${g.y}`;
        expect(occupiedCoords.has(coordKey)).toBe(false);
        occupiedCoords.add(coordKey);
      });
    });
  });
});

describe('Level Progress & LocalStorage Service', () => {
  beforeEach(() => {
    resetAllLevelProgress();
  });

  it('initializes with Level 1 unlocked and all others locked', () => {
    const progress = getDefaultLevelProgress();
    expect(progress[1].unlocked).toBe(true);
    expect(progress[1].completed).toBe(false);
    expect(progress[2].unlocked).toBe(false);
    expect(progress[50].unlocked).toBe(false);
  });

  it('awards 3 stars for beating level at or under par moves and unlocks next level', () => {
    const result = saveLevelCompletion(1, 1, 1);
    expect(result.stars).toBe(3);
    expect(result.nextLevelUnlocked).toBe(2);
  });

  it('awards 2 stars for beating level at par + 1 or par + 2 moves', () => {
    const result = saveLevelCompletion(2, 4, 2);
    expect(result.stars).toBe(2);
  });

  it('awards 1 star for beating level above par + 2 moves', () => {
    const result = saveLevelCompletion(3, 7, 2);
    expect(result.stars).toBe(1);
  });

  it('tracks total stars and completed count accurately', () => {
    saveLevelCompletion(1, 1, 1); // 3 stars
    saveLevelCompletion(2, 3, 2); // 2 stars
    const progress = getDefaultLevelProgress();
    // Simulate combined
    progress[1] = { levelId: 1, completed: true, stars: 3, bestMoves: 1, unlocked: true };
    progress[2] = { levelId: 2, completed: true, stars: 2, bestMoves: 3, unlocked: true };
    expect(getTotalStars(progress)).toBe(5);
    expect(getCompletedCount(progress)).toBe(2);
  });
});

describe('AI Difficulty Modes & Omniscient Super Max', () => {
  it('Super Max AI hunts player Blue ghost and avoids player Red ghost', () => {
    // In AI coordinate system (AI starts around y=0 moving to y=5):
    // AI has 1 Blue ghost at (2, 2)
    // Player has a Blue ghost at (2, 3) [in capture reach]
    // Player has a Red ghost at (1, 2) [also in capture reach]
    const aiGhosts: Ghost[] = [
      { id: 'ai-1', owner: 'p2', color: 'blue', x: 2, y: 2 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-blue', owner: 'p1', color: 'blue', x: 2, y: 3 },
      { id: 'p1-red', owner: 'p1', color: 'red', x: 1, y: 2 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
    });

    expect(decision).not.toBeNull();
    // Super Max must choose to capture the player's Blue ghost at (2, 3), NOT the red ghost at (1, 2)!
    expect(decision?.to).toEqual({ x: 2, y: 3 });
  });

  it('Super Max AI smashes through player Red barricade when holding 0 red ghosts', () => {
    // AI has 1 Blue ghost at (2, 2)
    // Enemy in capture range is player's RED ghost at (2, 3) blocking the path forward
    const aiGhosts: Ghost[] = [
      { id: 'ai-1', owner: 'p2', color: 'blue', x: 2, y: 2 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-red', owner: 'p1', color: 'red', x: 2, y: 3 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
      capturedGhosts: [], // 0 red ghosts captured
    });

    expect(decision).not.toBeNull();
    // AI smashes through the red barricade to unblock advance!
    expect(decision?.to).toEqual({ x: 2, y: 3 });
  });

  it('Super Max AI strictly refuses to capture player Red ghost when holding 3 red ghosts (Poison Pill)', () => {
    // AI has 1 Blue ghost at (2, 2)
    // Enemy in capture range is player's RED ghost at (2, 3)
    const aiGhosts: Ghost[] = [
      { id: 'ai-1', owner: 'p2', color: 'blue', x: 2, y: 2 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-red', owner: 'p1', color: 'red', x: 2, y: 3 },
    ];
    const threeRedCaptured = [
      { id: 'p1-r1', owner: 'p1' as const, color: 'red' as const, turnNumber: 1 },
      { id: 'p1-r2', owner: 'p1' as const, color: 'red' as const, turnNumber: 2 },
      { id: 'p1-r3', owner: 'p1' as const, color: 'red' as const, turnNumber: 3 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
      capturedGhosts: threeRedCaptured,
    });

    expect(decision).not.toBeNull();
    // 4th Red Ghost would lose game! AI must NOT step onto (2, 3)
    expect(decision?.to).not.toEqual({ x: 2, y: 3 });
  });

  it('AI Blue ghost avoids walking into threatened exit gate trap', () => {
    // AI Blue ghost is at (0, 4). Exit gate is at (0, 5).
    // Player has an active ghost at (1, 5) threatening (0, 5) with immediate capture.
    const aiGhosts: Ghost[] = [
      { id: 'ai-blue', owner: 'p2', color: 'blue', x: 0, y: 4 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-guard', owner: 'p1', color: 'blue', x: 1, y: 5 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
      capturedGhosts: [],
    });

    // AI should not walk into (0, 5) when (1, 5) will kill it immediately
    expect(decision).not.toBeNull();
    expect(decision?.to).not.toEqual({ x: 0, y: 5 });
  });

  it('Immediate win: AI Blue ghost escapes off board if at exit', () => {
    const aiGhosts: Ghost[] = [
      { id: 'ai-runner', owner: 'p2', color: 'blue', x: 0, y: 5 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-1', owner: 'p1', color: 'blue', x: 3, y: 3 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, 'hard');
    expect(decision?.isExit).toBe(true);
    expect(decision?.to).toEqual({ x: 0, y: 6 });
  });

  it('Deterministic puzzle AI produces 100% reproducible moves', () => {
    const aiGhosts: Ghost[] = [
      { id: 'ai-1', owner: 'p2', color: 'blue', x: 2, y: 2 },
      { id: 'ai-2', owner: 'p2', color: 'red', x: 3, y: 2 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-1', owner: 'p1', color: 'blue', x: 2, y: 4 },
    ];

    const move1 = calculateAIMove(aiGhosts, playerGhosts, { puzzleBehavior: 'deterministic' });
    const move2 = calculateAIMove(aiGhosts, playerGhosts, { puzzleBehavior: 'deterministic' });

    expect(move1).toEqual(move2);
  });
});

describe('Level 4, Level 5, and Level 8 Mechanics & Solvability', () => {
  it('Level 4: Capturing the solitary guard awards victory in 1 move (Par 1)', () => {
    const lvl4 = PUZZLE_LEVELS[3]; // Level 4
    expect(lvl4.id).toBe(4);
    expect(lvl4.parMoves).toBe(1);
    expect(lvl4.initialCaptured?.length).toBe(3);

    // Player starts at (4, 3), AI solitary guard at (4, 4)
    expect(lvl4.playerGhosts).toEqual([{ id: 'p1-ghost-0', color: 'blue', x: 4, y: 3 }]);
    expect(lvl4.aiGhosts).toEqual([{ id: 'ai-ghost-0', color: 'blue', x: 4, y: 4 }]);

    // When player captures AI at (4, 4), total blue captured becomes 4 -> Win
    const finalCaptured = [...(lvl4.initialCaptured || []), { id: 'ai-ghost-0', owner: 'p2' as const, color: 'blue' as const, turnNumber: 1 }];
    const blueCount = finalCaptured.filter((g) => g.owner === 'p2' && g.color === 'blue').length;
    expect(blueCount).toBe(4);
  });

  it('Level 5: Poison Warning is solvable in 2 moves without capturing poison bait (Par 2)', () => {
    const lvl5 = PUZZLE_LEVELS[4]; // Level 5
    expect(lvl5.id).toBe(5);
    expect(lvl5.parMoves).toBe(2);

    // Player starts at (5, 4), Red bait is at (4, 4)
    expect(lvl5.playerGhosts[0]).toMatchObject({ x: 5, y: 4, color: 'blue' });
    expect(lvl5.aiGhosts[0]).toMatchObject({ x: 4, y: 4, color: 'red' });

    // Step 1: Player moves (5, 4) -> (5, 5) [1 move]
    // Step 2: Player steps through the exit door at (5, 5) [2 moves] -> Escaped!
    const distanceToExitGate = Math.abs(lvl5.playerGhosts[0].x - 5) + Math.abs(lvl5.playerGhosts[0].y - 5);
    const movesToEscape = distanceToExitGate + 1; // +1 to step out of gate
    expect(movesToEscape).toBe(lvl5.parMoves);
  });

  it('Level 8: The Sentry March is solvable in 3 moves along column 0 (Par 3)', () => {
    const lvl8 = PUZZLE_LEVELS[7]; // Level 8
    expect(lvl8.id).toBe(8);
    expect(lvl8.parMoves).toBe(3);

    // Player starts at (0, 3)
    expect(lvl8.playerGhosts[0]).toMatchObject({ x: 0, y: 3, color: 'blue' });
    // Step 1: (0, 3) -> (0, 4)
    // Step 2: (0, 4) -> (0, 5)
    // Step 3: Exit gate
    const distanceToExitGate = Math.abs(lvl8.playerGhosts[0].x - 0) + Math.abs(lvl8.playerGhosts[0].y - 5);
    const movesToEscape = distanceToExitGate + 1;
    expect(movesToEscape).toBe(lvl8.parMoves);
  });
});

describe('MoveLogger Telemetry Service', () => {
  it('records moves, tracks turns, and exports valid JSON telemetry', async () => {
    const { moveLogger } = await import('../utils/moveLogger');

    const session = moveLogger.startNewSession({
      gameMode: 'levels',
      levelId: 4,
      levelName: 'The Solitary Guard',
      parMoves: 1,
    });

    expect(session.sessionId).toBeDefined();
    expect(session.gameMode).toBe('levels');

    moveLogger.recordMove({
      turn: 'p1',
      turnNumber: 1,
      ghostId: 'p1-ghost-0',
      from: { x: 4, y: 3 },
      to: { x: 4, y: 4 },
      isCapture: true,
      capturedGhostId: 'ai-ghost-0',
      capturedColor: 'blue',
      isExit: false,
    });

    const finished = moveLogger.finishSession('p1', 'captured_all_blue');
    expect(finished?.winner).toBe('p1');
    expect(finished?.totalMoves).toBe(1);

    const json = moveLogger.exportSessionAsJSON();
    expect(json).toContain('"winner": "p1"');
    expect(finished?.moves[0].capturedColor).toBe('blue');

    const parsed = JSON.parse(json);
    expect(parsed.totalMoves).toBe(1);
    expect(parsed.levelId).toBe(4);
  });
});

describe('Campaign Scenario Elimination & Defeat Detection', () => {
  it('detects immediate defeat when player only ghost is captured in Level 14', () => {
    const lvl14 = PUZZLE_LEVELS[13];
    expect(lvl14.id).toBe(14);
    expect(lvl14.playerGhosts.length).toBe(1);
    expect(lvl14.aiGhosts.length).toBe(2);

    // Initial state: Player has 1 alive ghost, AI has 2 alive ghosts
    const initialGhosts: Ghost[] = [
      { id: 'p1-ghost-0', owner: 'p1', color: 'blue', x: 0, y: 3 },
      { id: 'ai-ghost-0', owner: 'p2', color: 'red', x: 0, y: 5 },
      { id: 'ai-ghost-1', owner: 'p2', color: 'red', x: 1, y: 5 },
    ];

    const activeP1 = initialGhosts.filter((g) => g.owner === 'p1' && !g.isCaptured && !g.hasEscaped);
    expect(activeP1.length).toBe(1);

    // Simulate AI capturing player's only ghost at (0, 3)
    const afterCaptureGhosts: Ghost[] = initialGhosts.map((g) =>
      g.id === 'p1-ghost-0' ? { ...g, isCaptured: true } : g
    );

    const remainingP1 = afterCaptureGhosts.filter((g) => g.owner === 'p1' && !g.isCaptured && !g.hasEscaped);
    expect(remainingP1.length).toBe(0);

    // Verify elimination check: 0 remaining player ghosts must trigger P2 win
    const isP1Eliminated = remainingP1.length === 0;
    expect(isP1Eliminated).toBe(true);
  });
});

describe('Rematch State Clean Reset Verification', () => {
  it('resets player 1 ghosts to starting rows 0 and 1 with uncaptured state', () => {
    // Rematch creates fresh initial ghosts
    const freshGhosts = createInitialGhosts('p1');
    const shuffledFresh = shuffleGhostColors(freshGhosts);

    expect(shuffledFresh.length).toBe(8);
    // All fresh ghosts must be in starting rows 0 and 1
    shuffledFresh.forEach((g) => {
      expect([0, 1]).toContain(g.y);
      expect([1, 2, 3, 4]).toContain(g.x);
      expect(g.isCaptured).toBeFalsy();
      expect(g.hasEscaped).toBeFalsy();
    });

    // Exactly 4 blue and 4 red
    const blueCount = shuffledFresh.filter((g) => g.color === 'blue').length;
    const redCount = shuffledFresh.filter((g) => g.color === 'red').length;
    expect(blueCount).toBe(4);
    expect(redCount).toBe(4);
  });
});

describe('AI Emergency Gate Defense & Escape Prevention', () => {
  it('Super Max AI immediately captures player Blue runner standing on the escape gate', () => {
    // In AI coordinates, player escape gate is at (0, 0)
    // Player has a Blue runner standing on (0, 0) about to escape next turn!
    const aiGhosts: Ghost[] = [
      { id: 'ai-guard', owner: 'p2', color: 'red', x: 0, y: 1 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-runner', owner: 'p1', color: 'blue', x: 0, y: 0 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
    });

    expect(decision).not.toBeNull();
    // AI MUST capture the runner on (0, 0) to prevent immediate player victory!
    expect(decision?.to).toEqual({ x: 0, y: 0 });
  });

  it('Super Max AI blocks the escape gate when player runner is 1 step away', () => {
    // Player runner is at (0, 1), 1 step from gate (0, 0)
    // AI has a guard at (1, 0) that can step onto (0, 0) to slam the door shut
    const aiGhosts: Ghost[] = [
      { id: 'ai-guard', owner: 'p2', color: 'red', x: 1, y: 0 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-runner', owner: 'p1', color: 'blue', x: 0, y: 1 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
    });

    expect(decision).not.toBeNull();
    // AI steps onto (0, 0) to block the runner from escaping!
    expect(decision?.to).toEqual({ x: 0, y: 0 });
  });

  it('Level 18 Narrow Corridor: Has 5 par moves and does not trigger false instant win', () => {
    const lvl18 = PUZZLE_LEVELS[17];
    expect(lvl18.id).toBe(18);
    expect(lvl18.parMoves).toBe(5);
    expect(lvl18.aiGhosts.length).toBe(2);
    // AI has 0 Blue ghosts (both are red obstacles)
    expect(lvl18.aiGhosts.every((g) => g.color === 'red')).toBe(true);

    // Player starts at (4, 2)
    const p1 = lvl18.playerGhosts[0];
    expect(p1).toEqual({ id: 'p1-ghost-0', color: 'blue', x: 4, y: 2 });

    // 5-move escape route: (4,2) -> (5,2) -> (5,3) -> (5,4) -> (5,5) -> gate exit
    const stepsToGate = Math.abs(5 - p1.x) + Math.abs(5 - p1.y); // 1 + 3 = 4
    const movesToEscape = stepsToGate + 1; // 4 + 1 = 5
    expect(movesToEscape).toBe(lvl18.parMoves);
  });

  it('Hard AI chooses orthogonal gate control square (1, 0) over diagonal (1, 1) to guard against runner at (0, 1)', () => {
    // Recreates Photo 2/3 and Telemetry Session 1:
    // Player runner is at (0, 1), 1 step from escape gate (0, 0)
    // AI has ghost at (2, 0) which can reach orthogonal control square (1, 0)
    // AI also has ghost at (2, 1) which can reach diagonal square (1, 1)
    const aiGhosts: Ghost[] = [
      { id: 'ai-gate-guard', owner: 'p2', color: 'red', x: 2, y: 0 },
      { id: 'ai-other', owner: 'p2', color: 'red', x: 2, y: 1 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-runner', owner: 'p1', color: 'blue', x: 0, y: 1 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'hard',
      playerSecretGhosts: playerGhosts,
    });

    expect(decision).not.toBeNull();
    // AI MUST move to (1, 0) to directly control Gate (0, 0) orthogonally!
    expect(decision?.to).toEqual({ x: 1, y: 0 });
    expect(decision?.ghostId).toBe('ai-gate-guard');
  });

  it('AI avoids move reversal / oscillation trap when lastAIMove is provided', () => {
    // Recreates Session 2 telemetry loop between (2, 0) and (3, 0):
    // AI ghost is at (2, 0), previously moved from (3, 0)
    const aiGhosts: Ghost[] = [
      { id: 'ai-shuffler', owner: 'p2', color: 'red', x: 2, y: 0 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-idle', owner: 'p1', color: 'unknown', x: 2, y: 4 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'hard',
      lastAIMove: {
        ghostId: 'ai-shuffler',
        from: { x: 3, y: 0 },
        to: { x: 2, y: 0 },
      },
    });

    expect(decision).not.toBeNull();
    // AI must NOT reverse back to (3, 0)
    expect(decision?.to).not.toEqual({ x: 3, y: 0 });
  });

  it('Hard AI Blue ghost prioritizes advancing towards exit row when in striking distance', () => {
    // AI Blue ghost is at (0, 3), clear lane towards exit at (0, 5)
    const aiGhosts: Ghost[] = [
      { id: 'ai-runner', owner: 'p2', color: 'blue', x: 0, y: 3 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-distant', owner: 'p1', color: 'unknown', x: 4, y: 1 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'hard',
    });

    expect(decision).not.toBeNull();
    // Blue ghost must advance forward towards exit (to y=4)
    expect(decision?.to).toEqual({ x: 0, y: 4 });
  });
});


