import type { PlayerRole, GameMode, AIDifficulty, WinReason, GhostColor } from './game';

export interface GhostSnapshot {
  id: string;
  owner: PlayerRole;
  x: number;
  y: number;
  color?: GhostColor;
  isCaptured?: boolean;
  hasEscaped?: boolean;
}

export interface MoveRecord {
  moveIndex: number;
  turn: PlayerRole;
  turnNumber: number;
  ghostId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  isCapture: boolean;
  capturedGhostId?: string;
  capturedColor?: 'blue' | 'red';
  isExit?: boolean;
  timestamp: number;
  boardSnapshot?: GhostSnapshot[];
}

export interface GameSessionLog {
  sessionId: string;
  gameMode: GameMode;
  aiDifficulty?: AIDifficulty;
  levelId?: number;
  levelName?: string;
  parMoves?: number;
  startTime: number;
  endTime?: number;
  winner?: PlayerRole;
  winReason?: WinReason;
  totalMoves: number;
  moves: MoveRecord[];
}
