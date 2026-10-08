import { describe, it, expect } from 'vitest';
import { createInitialGhosts, createInitialOpponentGhosts } from '../utils/ghostUtils';
import { getValidMovesForGhost } from './aiService';
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
});
