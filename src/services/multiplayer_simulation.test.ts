import { describe, it, expect } from 'vitest';
import { createInitialGhosts, createInitialOpponentGhosts } from '../utils/ghostUtils';
import { getValidMovesForGhost } from './aiService';
import type { Ghost, PlayerRole, CapturedGhost, NetworkMessage } from '../types/game';

// Simulation Harness representing the client game state on either device
class SimulatedPlayerClient {
  public role: PlayerRole;
  public gameMode = 'online' as const;
  public turn: PlayerRole = 'p1';
  public turnNumber: number = 1;
  public ghosts: Ghost[] = [];
  public mySecretGhosts: Ghost[] = [];
  public capturedGhosts: CapturedGhost[] = [];
  public selectedGhostId: string | null = null;
  public validMoves: { x: number; y: number; isExit?: boolean }[] = [];
  public winner?: PlayerRole;
  public winReason?: 'captured_all_blue' | 'captured_all_red' | 'escaped';
  public sentMessages: NetworkMessage[] = [];

  constructor(role: PlayerRole, initialGhosts: Ghost[]) {
    this.role = role;
    this.mySecretGhosts = initialGhosts.map((g, idx) => ({
      ...g,
      id: `${role}-ghost-${idx}`,
      owner: role,
    }));
    const opponentRole: PlayerRole = role === 'p1' ? 'p2' : 'p1';
    const oppPieces = createInitialOpponentGhosts(opponentRole);
    this.ghosts = [...this.mySecretGhosts, ...oppPieces];
  }

  public get isMyTurn(): boolean {
    return this.turn === this.role;
  }

  public selectGhost(ghostId: string): boolean {
    if (!this.isMyTurn) return false;
    const ghost = this.ghosts.find((g) => g.id === ghostId && g.owner === this.role);
    if (!ghost) return false;
    this.selectedGhostId = ghostId;
    this.validMoves = getValidMovesForGhost(ghost, this.ghosts, this.role, true, true);
    return true;
  }

  public moveGhost(targetX: number, targetY: number): NetworkMessage | null {
    if (!this.isMyTurn || !this.selectedGhostId) return null;
    const moving = this.ghosts.find((g) => g.id === this.selectedGhostId);
    if (!moving) return null;

    const isValid = this.validMoves.some((m) => m.x === targetX && m.y === targetY && !m.isExit);
    if (!isValid) return null;

    const targetGhost = this.ghosts.find(
      (g) => !g.isCaptured && !g.hasEscaped && g.x === targetX && g.y === targetY
    );
    const isCapture = Boolean(targetGhost && targetGhost.owner !== moving.owner);

    this.ghosts = this.ghosts.map((g) => {
      if (targetGhost && g.id === targetGhost.id) {
        return { ...g, isCaptured: true };
      }
      if (g.id === moving.id) {
        return { ...g, x: targetX, y: targetY };
      }
      return g;
    });

    // Secret ghosts state updated so sync never resets piece
    this.mySecretGhosts = this.mySecretGhosts.map((g) =>
      g.id === moving.id ? { ...g, x: targetX, y: targetY } : g
    );

    const nextTurn: PlayerRole = this.turn === 'p1' ? 'p2' : 'p1';
    const nextTurnNum = this.turnNumber + 1;
    this.turn = nextTurn;
    this.turnNumber = nextTurnNum;
    this.selectedGhostId = null;
    this.validMoves = [];

    let msg: NetworkMessage;
    if (isCapture && targetGhost) {
      msg = {
        type: 'CAPTURE_ATTEMPT',
        ghostId: moving.id,
        toX: targetX,
        toY: targetY,
        targetGhostId: targetGhost.id,
        nextTurn,
        turnNumber: nextTurnNum,
      };
    } else {
      msg = {
        type: 'MOVE',
        ghostId: moving.id,
        toX: targetX,
        toY: targetY,
        nextTurn,
        turnNumber: nextTurnNum,
      };
    }

    this.sentMessages.push(msg);
    return msg;
  }

  public receiveMessage(msg: NetworkMessage): NetworkMessage | null {
    const oppRole: PlayerRole = this.role === 'p1' ? 'p2' : 'p1';

    if (msg.type === 'SYNC_SETUP') {
      const oppPieces: Ghost[] = msg.ghosts.map((g) => ({
        id: g.id,
        owner: oppRole,
        color: 'unknown',
        x: 5 - g.x,
        y: 5 - g.y,
      }));
      this.ghosts = [...this.mySecretGhosts, ...oppPieces];
      return null;
    }

    if (msg.type === 'MOVE') {
      const invX = 5 - msg.toX;
      const invY = 5 - msg.toY;
      this.ghosts = this.ghosts.map((g) =>
        g.id === msg.ghostId ? { ...g, x: invX, y: invY } : g
      );
      this.turn = msg.nextTurn || (this.turn === 'p1' ? 'p2' : 'p1');
      this.turnNumber = msg.turnNumber ?? this.turnNumber + 1;
      return null;
    }

    if (msg.type === 'CAPTURE_ATTEMPT') {
      const target = this.mySecretGhosts.find((g) => g.id === msg.targetGhostId);
      const revealedColor = (target?.color || 'blue') as 'blue' | 'red';
      const invX = 5 - msg.toX;
      const invY = 5 - msg.toY;

      this.ghosts = this.ghosts.map((g) => {
        if (g.id === msg.targetGhostId) {
          return { ...g, isCaptured: true, color: revealedColor };
        }
        if (g.id === msg.ghostId) {
          return { ...g, x: invX, y: invY };
        }
        return g;
      });

      this.mySecretGhosts = this.mySecretGhosts.map((g) =>
        g.id === msg.targetGhostId ? { ...g, isCaptured: true } : g
      );

      this.capturedGhosts.push({
        id: msg.targetGhostId,
        owner: this.role,
        color: revealedColor,
        turnNumber: msg.turnNumber ?? this.turnNumber,
      });

      this.turn = msg.nextTurn || (this.turn === 'p1' ? 'p2' : 'p1');
      this.turnNumber = msg.turnNumber ?? this.turnNumber + 1;

      return {
        type: 'CAPTURE_REVEAL',
        targetGhostId: msg.targetGhostId,
        revealedColor,
      };
    }

    if (msg.type === 'CAPTURE_REVEAL') {
      this.ghosts = this.ghosts.map((g) =>
        g.id === msg.targetGhostId ? { ...g, isCaptured: true, color: msg.revealedColor } : g
      );
      this.capturedGhosts.push({
        id: msg.targetGhostId,
        owner: oppRole,
        color: msg.revealedColor,
        turnNumber: this.turnNumber,
      });
      return null;
    }

    if (msg.type === 'STATE_SYNC_REQUEST') {
      return {
        type: 'STATE_SYNC',
        ghosts: this.ghosts.map((g) => ({
          id: g.id,
          x: g.x,
          y: g.y,
          isCaptured: g.isCaptured,
          hasEscaped: g.hasEscaped,
          color: g.isCaptured || g.hasEscaped ? g.color : 'unknown',
        })),
        turn: this.turn,
        turnNumber: this.turnNumber,
        capturedGhosts: this.capturedGhosts,
      };
    }

    if (msg.type === 'STATE_SYNC') {
      const oppPieces: Ghost[] = msg.ghosts
        .filter((g) => g.id.startsWith(oppRole))
        .map((g) => ({
          id: g.id,
          owner: oppRole,
          color: g.color || 'unknown',
          x: 5 - g.x,
          y: 5 - g.y,
          isCaptured: g.isCaptured,
          hasEscaped: g.hasEscaped,
        }));

      const myUpdated = this.mySecretGhosts.map((myG) => {
        const match = msg.ghosts.find((g) => g.id === myG.id);
        if (match) {
          return {
            ...myG,
            x: 5 - match.x,
            y: 5 - match.y,
            isCaptured: match.isCaptured,
            hasEscaped: match.hasEscaped,
          };
        }
        return myG;
      });

      this.ghosts = [...myUpdated, ...oppPieces];
      this.mySecretGhosts = myUpdated;
      this.turn = msg.turn;
      this.turnNumber = msg.turnNumber;
      this.capturedGhosts = msg.capturedGhosts;
      return null;
    }

    if (msg.type === 'ESCAPE') {
      this.winner = oppRole;
      this.winReason = 'escaped';
      return null;
    }

    return null;
  }

  public escapeGhost(): boolean {
    if (!this.selectedGhostId) return false;
    const ghost = this.ghosts.find((g) => g.id === this.selectedGhostId);
    if (!ghost || ghost.color !== 'blue') return false;

    // Both players in online mode advance from row 0 to row 5 to escape
    if (ghost.owner === this.role && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5)) {
      ghost.hasEscaped = true;
      this.winner = this.role;
      this.winReason = 'escaped';
      const msg: NetworkMessage = { type: 'ESCAPE', ghostId: ghost.id };
      this.sentMessages.push(msg);
      return true;
    }
    return false;
  }
}

describe('Full 2-Player Multiplayer Simulation & Sync Validation', () => {
  it('initializes host (p1) and guest (p2) with identical mirrored layouts', () => {
    const hostInit = createInitialGhosts('p1');
    const guestInit = createInitialGhosts('p1');

    const host = new SimulatedPlayerClient('p1', hostInit);
    const guest = new SimulatedPlayerClient('p2', guestInit);

    // Initial setup sync
    const guestSetupMsg: NetworkMessage = {
      type: 'SYNC_SETUP',
      ghosts: guest.mySecretGhosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
    };
    host.receiveMessage(guestSetupMsg);

    const hostSetupMsg: NetworkMessage = {
      type: 'SYNC_SETUP',
      ghosts: host.mySecretGhosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
    };
    guest.receiveMessage(hostSetupMsg);

    // Both boards have 16 pieces
    expect(host.ghosts.length).toBe(16);
    expect(guest.ghosts.length).toBe(16);

    // Turn 1 states
    expect(host.isMyTurn).toBe(true);
    expect(guest.isMyTurn).toBe(false);
  });

  it('executes Move 1 by Host and successfully updates both boards and turns', () => {
    const host = new SimulatedPlayerClient('p1', createInitialGhosts('p1'));
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // Host selects piece at (1, 1) [front-left]
    const selected = host.selectGhost('p1-ghost-4');
    expect(selected).toBe(true);
    expect(host.validMoves).toContainEqual({ x: 1, y: 2 });

    // Host moves to (1, 2)
    const moveMsg = host.moveGhost(1, 2);
    expect(moveMsg).not.toBeNull();
    expect(moveMsg?.type).toBe('MOVE');
    expect(host.isMyTurn).toBe(false); // Host's turn ended

    // Guest receives move message over WebRTC
    guest.receiveMessage(moveMsg!);

    // On Guest's board, the opponent ghost p1-ghost-4 is now at (5-1, 5-2) = (4, 3)
    const movedOnGuest = guest.ghosts.find((g) => g.id === 'p1-ghost-4');
    expect(movedOnGuest?.x).toBe(4);
    expect(movedOnGuest?.y).toBe(3);

    // Crucial check: Guest's turn is now ACTIVE!
    expect(guest.isMyTurn).toBe(true);
    expect(guest.turn).toBe('p2');
    expect(guest.turnNumber).toBe(2);
  });

  it('executes Move 2 by Guest and hands turn back to Host cleanly', () => {
    const host = new SimulatedPlayerClient('p1', createInitialGhosts('p1'));
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // Turn 1: Host moves
    host.selectGhost('p1-ghost-4');
    const move1 = host.moveGhost(1, 2)!;
    guest.receiveMessage(move1);

    // Turn 2: Guest can now move
    expect(guest.isMyTurn).toBe(true);
    const guestSelect = guest.selectGhost('p2-ghost-4');
    expect(guestSelect).toBe(true);
    expect(guest.validMoves).toContainEqual({ x: 1, y: 2 });

    const move2 = guest.moveGhost(1, 2)!;
    expect(move2.type).toBe('MOVE');
    expect(guest.isMyTurn).toBe(false);

    // Host receives Move 2
    host.receiveMessage(move2);

    // On Host's board, guest piece p2-ghost-4 is at (4, 3)
    const guestOnHost = host.ghosts.find((g) => g.id === 'p2-ghost-4');
    expect(guestOnHost?.x).toBe(4);
    expect(guestOnHost?.y).toBe(3);

    // Turn is back to Host
    expect(host.isMyTurn).toBe(true);
    expect(host.turn).toBe('p1');
    expect(host.turnNumber).toBe(3);
  });

  it('strictly prevents out-of-turn moves', () => {
    const host = new SimulatedPlayerClient('p1', createInitialGhosts('p1'));
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // On turn 1, Guest cannot select or move
    expect(guest.isMyTurn).toBe(false);
    expect(guest.selectGhost('p2-ghost-4')).toBe(false);
    expect(guest.moveGhost(1, 2)).toBeNull();

    // Host makes turn 1
    host.selectGhost('p1-ghost-4');
    const move1 = host.moveGhost(1, 2)!;
    guest.receiveMessage(move1);

    // On turn 2, Host cannot select or move
    expect(host.isMyTurn).toBe(false);
    expect(host.selectGhost('p1-ghost-5')).toBe(false);
    expect(host.moveGhost(2, 2)).toBeNull();
  });

  it('correctly handles zero-knowledge capture and reveals captured ghost color', () => {
    const host = new SimulatedPlayerClient('p1', createInitialGhosts('p1'));
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // Move host ghost onto guest ghost location to simulate capture
    // Set a known target color for guest piece p2-ghost-0 to red
    const targetGuest = guest.mySecretGhosts.find((g) => g.id === 'p2-ghost-0')!;
    targetGuest.color = 'red';
    targetGuest.x = 1;
    targetGuest.y = 3; // (4, 2) on host board

    // Place host piece directly adjacent at (4, 1)
    const hostPiece = host.ghosts.find((g) => g.id === 'p1-ghost-0')!;
    hostPiece.x = 4;
    hostPiece.y = 1;

    // Update host's view of opponent pieces
    host.ghosts = host.ghosts.map((g) =>
      g.id === 'p2-ghost-0' ? { ...g, x: 4, y: 2, color: 'unknown' } : g
    );

    // Host selects and captures (4, 2)
    host.selectGhost('p1-ghost-0');
    const capMsg = host.moveGhost(4, 2)!;
    expect(capMsg.type).toBe('CAPTURE_ATTEMPT');

    // Guest receives capture attempt and returns CAPTURE_REVEAL
    const revealMsg = guest.receiveMessage(capMsg)!;
    expect(revealMsg).not.toBeNull();
    expect(revealMsg.type).toBe('CAPTURE_REVEAL');
    if (revealMsg.type === 'CAPTURE_REVEAL') {
      expect(revealMsg.revealedColor).toBe('red');
    }

    // Host receives reveal and records red capture
    host.receiveMessage(revealMsg);
    expect(host.capturedGhosts.length).toBe(1);
    expect(host.capturedGhosts[0].color).toBe('red');
  });

  it('allows Guest (Player 2) to escape from row 5 in online PvP mode', () => {
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // Position guest blue piece at top-left corner (0, 5)
    const blueGhost = guest.ghosts.find((g) => g.owner === 'p2')!;
    blueGhost.color = 'blue';
    blueGhost.x = 0;
    blueGhost.y = 5;

    guest.turn = 'p2';
    guest.selectedGhostId = blueGhost.id;

    // In online mode, Guest escapes at row 5
    const escaped = guest.escapeGhost();
    expect(escaped).toBe(true);
    expect(guest.winner).toBe('p2');
    expect(guest.winReason).toBe('escaped');
    expect(guest.sentMessages.some((m) => m.type === 'ESCAPE')).toBe(true);
  });

  it('recovers full match state upon reload without resetting pieces to starting positions', () => {
    const host = new SimulatedPlayerClient('p1', createInitialGhosts('p1'));
    const guest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));

    // Move 1: Host moves p1-ghost-4 to (1, 2)
    host.selectGhost('p1-ghost-4');
    const move1 = host.moveGhost(1, 2)!;
    guest.receiveMessage(move1);

    // Move 2: Guest moves p2-ghost-4 to (1, 2)
    guest.selectGhost('p2-ghost-4');
    const move2 = guest.moveGhost(1, 2)!;
    host.receiveMessage(move2);

    expect(guest.turn).toBe('p1');
    expect(guest.turnNumber).toBe(3);

    // SIMULATE RELOAD: Guest refreshes the page!
    // Instead of resetting to starting rows (y=0,1), Guest rejoins and requests live state sync:
    const reloadedGuest = new SimulatedPlayerClient('p2', createInitialGhosts('p1'));
    const syncRequest: NetworkMessage = { type: 'STATE_SYNC_REQUEST', fromRole: 'p2' };

    // Host responds with current live board
    const syncResponse = host.receiveMessage(syncRequest)!;
    expect(syncResponse).not.toBeNull();
    expect(syncResponse.type).toBe('STATE_SYNC');

    // Reloaded guest applies the state sync
    reloadedGuest.receiveMessage(syncResponse);

    // Verify pieces are NOT at starting positions!
    // Host's moved piece p1-ghost-4 is at (4, 3) on Guest's board (not at starting 4, 4)
    const hostPieceOnGuest = reloadedGuest.ghosts.find((g) => g.id === 'p1-ghost-4');
    expect(hostPieceOnGuest?.x).toBe(4);
    expect(hostPieceOnGuest?.y).toBe(3);

    // Turn and turnNumber are fully preserved
    expect(reloadedGuest.turn).toBe('p1');
    expect(reloadedGuest.turnNumber).toBe(3);
    expect(reloadedGuest.isMyTurn).toBe(false);
  });
});
