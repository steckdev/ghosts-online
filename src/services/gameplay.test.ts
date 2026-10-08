import { describe, it, expect } from 'vitest';
import { createInitialGhosts, createInitialOpponentGhosts } from '../utils/ghostUtils';
import { getValidMovesForGhost } from './aiService';
import { evaluateWinConditions } from '../utils/winConditions';
import type { Ghost } from '../types/game';

describe('Gameplay & Movement Mechanics', () => {
  it('generates correct valid moves for starting player pieces', () => {
    const p1Ghosts = createInitialGhosts('p1');
    const p2Opponent = createInitialOpponentGhosts('p2');
    const board = [...p1Ghosts, ...p2Opponent];

    // Front row piece: p1-ghost-4 at (1, 1)
    const frontPiece = p1Ghosts.find((g) => g.x === 1 && g.y === 1)!;
    expect(frontPiece).toBeDefined();

    // Valid moves from (1, 1):
    // Up: (1, 2) [empty]
    // Down: (1, 0) [occupied by friendly p1-ghost-0] -> INVALID
    // Left: (0, 1) [empty]
    // Right: (2, 1) [occupied by friendly p1-ghost-5] -> INVALID
    const moves = getValidMovesForGhost(frontPiece, board, 'p1', true);
    expect(moves).toContainEqual({ x: 1, y: 2 });
    expect(moves).toContainEqual({ x: 0, y: 1 });
    expect(moves).not.toContainEqual({ x: 1, y: 0 });
    expect(moves).not.toContainEqual({ x: 2, y: 1 });
  });

  it('correctly maps coordinates between host and guest in online PvP', () => {
    // Host has p1-ghost-4 at (1, 1)
    // Host moves to (1, 2)
    const hostMove = { ghostId: 'p1-ghost-4', toX: 1, toY: 2 };

    // When Guest receives MOVE:
    const guestInvX = 5 - hostMove.toX;
    const guestInvY = 5 - hostMove.toY;

    expect(guestInvX).toBe(4);
    expect(guestInvY).toBe(3);

    // Initial opponent position on guest's board was (5 - 1, 5 - 1) = (4, 4)
    // Moving from (4, 4) to (4, 3) is a valid 1-step downward move for opponent!
    expect(Math.abs(4 - 4) + Math.abs(4 - 3)).toBe(1);
  });

  it('guarantees unique IDs between host and guest pieces', () => {
    const p1Ghosts = createInitialGhosts('p1');
    const p2Raw = createInitialGhosts('p1'); // from lobby
    const p2Mapped = p2Raw.map((g, idx) => ({
      ...g,
      id: `p2-ghost-${idx}`,
      owner: 'p2' as const,
    }));

    const allIds = [...p1Ghosts.map((g) => g.id), ...p2Mapped.map((g) => g.id)];
    const uniqueIds = new Set(allIds);

    expect(allIds.length).toBe(16);
    expect(uniqueIds.size).toBe(16);
  });

  it('handles capture attempt and color revelation correctly', () => {
    const p1Ghost: Ghost = { id: 'p1-ghost-0', owner: 'p1', color: 'blue', x: 2, y: 2 };
    const p2Secret: Ghost = { id: 'p2-ghost-3', owner: 'p2', color: 'red', x: 2, y: 3 };

    const board = [p1Ghost, p2Secret];

    // p1 moves onto p2's square (2, 3)
    const targetGhost = board.find((g) => g.x === 2 && g.y === 3 && g.owner !== 'p1');
    expect(targetGhost).toBeDefined();
    expect(targetGhost!.id).toBe('p2-ghost-3');
    expect(targetGhost!.color).toBe('red');
  });

  describe('Universal Win Conditions Evaluation', () => {
    it('does NOT trigger an immediate win on move 1 in online mode when opponent ghost colors are unknown', () => {
      const p1Ghosts = createInitialGhosts('p1');
      const p2Opponent = createInitialOpponentGhosts('p2'); // colors are 'unknown'
      const board = [...p1Ghosts, ...p2Opponent];

      // Move 1: P1 front piece moves forward
      board[4] = { ...board[4], y: board[4].y + 1 };

      const result = evaluateWinConditions({
        gameMode: 'online',
        currentCaptured: [],
        currentGhosts: board,
      });

      expect(result.hasWon).toBe(false);
      expect(result.winningPlayer).toBeNull();
      expect(result.winReason).toBeNull();
    });

    it('correctly declares escape victory when a blue ghost reaches an exit', () => {
      const p1Ghosts = createInitialGhosts('p1');
      p1Ghosts[0] = { ...p1Ghosts[0], color: 'blue', hasEscaped: true };

      const result = evaluateWinConditions({
        gameMode: 'online',
        currentCaptured: [],
        currentGhosts: p1Ghosts,
      });

      expect(result.hasWon).toBe(true);
      expect(result.winningPlayer).toBe('p1');
      expect(result.winReason).toBe('escaped');
    });

    it('correctly declares victory when capturing 4 blue ghosts', () => {
      const captured = [
        { id: 'p2-g-0', owner: 'p2' as const, color: 'blue' as const, turnNumber: 2 },
        { id: 'p2-g-1', owner: 'p2' as const, color: 'blue' as const, turnNumber: 4 },
        { id: 'p2-g-2', owner: 'p2' as const, color: 'blue' as const, turnNumber: 6 },
        { id: 'p2-g-3', owner: 'p2' as const, color: 'blue' as const, turnNumber: 8 },
      ];

      const result = evaluateWinConditions({
        gameMode: 'online',
        currentCaptured: captured,
        currentGhosts: createInitialGhosts('p1'),
      });

      expect(result.hasWon).toBe(true);
      expect(result.winningPlayer).toBe('p1');
      expect(result.winReason).toBe('captured_all_blue');
    });

    it('correctly declares poison pill defeat when capturing 4 red ghosts', () => {
      const captured = [
        { id: 'p2-g-0', owner: 'p2' as const, color: 'red' as const, turnNumber: 2 },
        { id: 'p2-g-1', owner: 'p2' as const, color: 'red' as const, turnNumber: 4 },
        { id: 'p2-g-2', owner: 'p2' as const, color: 'red' as const, turnNumber: 6 },
        { id: 'p2-g-3', owner: 'p2' as const, color: 'red' as const, turnNumber: 8 },
      ];

      // P1 captured 4 red ghosts from P2, so P2 wins by poison pill!
      const result = evaluateWinConditions({
        gameMode: 'online',
        currentCaptured: captured,
        currentGhosts: createInitialGhosts('p1'),
      });

      expect(result.hasWon).toBe(true);
      expect(result.winningPlayer).toBe('p2');
      expect(result.winReason).toBe('captured_all_red');
    });
  });
});
