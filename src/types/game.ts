export type GhostColor = 'blue' | 'red' | 'unknown';
export type PlayerRole = 'p1' | 'p2';
export type GameMode = 'online' | 'ai' | 'pass-and-play' | 'levels';
export type AIDifficulty = 'easy' | 'hard' | 'super_max';

export interface Ghost {
  id: string;
  owner: PlayerRole;
  color: GhostColor;
  x: number; // 0 to 5 (from player's own perspective: 0-5 x, 0-5 y)
  y: number; // 0 is player's back row, 5 is opponent's back row (exit row)
  isCaptured?: boolean;
  hasEscaped?: boolean;
}

export type WinReason = 'captured_all_blue' | 'captured_all_red' | 'escaped';

export interface CapturedGhost {
  id: string;
  owner: PlayerRole;
  color: 'blue' | 'red';
  turnNumber: number;
}

export interface PuzzleLevel {
  id: number;
  name: string;
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  parMoves: number;
  description: string;
  hint: string;
  playerGhosts: { id: string; color: 'blue' | 'red'; x: number; y: number }[];
  aiGhosts: { id: string; color: 'blue' | 'red'; x: number; y: number }[];
  initialCaptured?: CapturedGhost[];
  aiBehavior?: 'deterministic' | 'rush_exit' | 'guard_doors' | 'hunt_blues' | 'passive';
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  stars: number; // 0, 1, 2, or 3
  bestMoves: number;
  unlocked: boolean;
}

export interface GameState {
  mode: GameMode;
  localPlayer: PlayerRole; // which player this client controls ('p1' or 'p2')
  turn: PlayerRole;
  turnNumber: number;
  status: 'lobby' | 'setup' | 'playing' | 'gameover';
  winner?: PlayerRole;
  winReason?: WinReason;
  selectedGhostId: string | null;
  validMoves: { x: number; y: number; isExit?: boolean }[];
  lastMove?: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    ghostId: string;
    isCapture?: boolean;
    capturedColor?: 'blue' | 'red';
  };
  capturedGhosts: CapturedGhost[];
  roomCode?: string;
  peerStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  opponentReady: boolean;
  localReady: boolean;
}

// PeerJS network protocol messages
export type NetworkMessage =
  | {
      type: 'SYNC_SETUP';
      // Only sends ghost IDs and positions, color is kept HIDDEN for anti-cheating!
      ghosts: { id: string; x: number; y: number }[];
    }
  | {
      type: 'READY';
      ghosts: { id: string; x: number; y: number }[];
    }
  | {
      type: 'MOVE';
      ghostId: string;
      toX: number;
      toY: number;
      nextTurn?: PlayerRole;
      turnNumber?: number;
    }
  | {
      type: 'CAPTURE_ATTEMPT';
      ghostId: string;
      toX: number;
      toY: number;
      targetGhostId: string;
      nextTurn?: PlayerRole;
      turnNumber?: number;
    }
  | {
      type: 'CAPTURE_REVEAL';
      targetGhostId: string;
      revealedColor: 'blue' | 'red';
    }
  | {
      type: 'ESCAPE';
      ghostId: string;
    }
  | {
      type: 'REMATCH_REQUEST';
    }
  | {
      type: 'REMATCH_ACCEPT';
    }
  | {
      type: 'STATE_SYNC';
      ghosts: {
        id: string;
        x: number;
        y: number;
        isCaptured?: boolean;
        hasEscaped?: boolean;
        color?: GhostColor;
      }[];
      turn: PlayerRole;
      turnNumber: number;
      capturedGhosts: CapturedGhost[];
    }
  | {
      type: 'STATE_SYNC_REQUEST';
      fromRole: PlayerRole;
    }
  | {
      type: 'PING';
    }
  | {
      type: 'PONG';
    }
  | {
      type: 'EMOTE';
      emoji: string;
      sender: PlayerRole;
    };
