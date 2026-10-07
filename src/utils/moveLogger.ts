import type { GameMode, AIDifficulty, PlayerRole, WinReason } from '../types/game';
import type { GameSessionLog, MoveRecord, GhostSnapshot } from '../types/history';

class MoveLoggerService {
  private currentSession: GameSessionLog | null = null;

  startNewSession(params: {
    gameMode: GameMode;
    aiDifficulty?: AIDifficulty;
    levelId?: number;
    levelName?: string;
    parMoves?: number;
  }): GameSessionLog {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.currentSession = {
      sessionId,
      gameMode: params.gameMode,
      aiDifficulty: params.aiDifficulty,
      levelId: params.levelId,
      levelName: params.levelName,
      parMoves: params.parMoves,
      startTime: Date.now(),
      totalMoves: 0,
      moves: [],
    };
    return this.currentSession;
  }

  recordMove(params: {
    turn: PlayerRole;
    turnNumber: number;
    ghostId: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    isCapture: boolean;
    capturedGhostId?: string;
    capturedColor?: 'blue' | 'red';
    isExit?: boolean;
    boardSnapshot?: GhostSnapshot[];
  }): MoveRecord | null {
    if (!this.currentSession) return null;

    const moveRecord: MoveRecord = {
      moveIndex: this.currentSession.moves.length + 1,
      turn: params.turn,
      turnNumber: params.turnNumber,
      ghostId: params.ghostId,
      from: params.from,
      to: params.to,
      isCapture: params.isCapture,
      capturedGhostId: params.capturedGhostId,
      capturedColor: params.capturedColor,
      isExit: params.isExit,
      timestamp: Date.now(),
      boardSnapshot: params.boardSnapshot,
    };

    this.currentSession.moves.push(moveRecord);
    this.currentSession.totalMoves = this.currentSession.moves.length;
    return moveRecord;
  }

  finishSession(winner: PlayerRole, winReason: WinReason): GameSessionLog | null {
    if (!this.currentSession) return null;
    this.currentSession.endTime = Date.now();
    this.currentSession.winner = winner;
    this.currentSession.winReason = winReason;
    return this.currentSession;
  }

  getCurrentSession(): GameSessionLog | null {
    return this.currentSession;
  }

  exportSessionAsJSON(): string {
    if (!this.currentSession) {
      return JSON.stringify({ message: 'No active session recorded' }, null, 2);
    }
    return JSON.stringify(this.currentSession, null, 2);
  }

  downloadSessionJSON(): void {
    if (typeof window === 'undefined') return;
    const jsonStr = this.exportSessionAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `ghosts_telemetry_${this.currentSession?.gameMode || 'game'}_${Date.now()}.json`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const moveLogger = new MoveLoggerService();
