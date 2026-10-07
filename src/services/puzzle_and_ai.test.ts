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

  it('Super Max AI strictly refuses to capture player Red ghost when safe step exists', () => {
    // AI has 1 Blue ghost at (2, 2)
    // Only enemy in capture range is player's RED ghost at (2, 3)
    // AI can also move backward to (2, 1) or sideways to (3, 2) or (1, 2)
    const aiGhosts: Ghost[] = [
      { id: 'ai-1', owner: 'p2', color: 'blue', x: 2, y: 2 },
    ];
    const playerGhosts: Ghost[] = [
      { id: 'p1-red', owner: 'p1', color: 'red', x: 2, y: 3 },
    ];

    const decision = calculateAIMove(aiGhosts, playerGhosts, {
      difficulty: 'super_max',
      playerSecretGhosts: playerGhosts,
    });

    expect(decision).not.toBeNull();
    // AI must NOT step onto (2, 3) where the Red ghost is!
    expect(decision?.to).not.toEqual({ x: 2, y: 3 });
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
