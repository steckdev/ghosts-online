import type { Ghost, PlayerRole, CapturedGhost, GameMode } from '../types/game';

export interface SavedGameSession {
  roomCode: string;
  gameMode: GameMode;
  localPlayer: PlayerRole;
  isHost: boolean;
  turn: PlayerRole;
  turnNumber: number;
  ghosts: Ghost[];
  mySecretGhosts: Ghost[];
  capturedGhosts: CapturedGhost[];
  status: 'playing' | 'gameover';
  timestamp: number;
}

const SESSION_KEY = 'good_ghosts_active_match';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

export function saveActiveSession(session: Omit<SavedGameSession, 'timestamp'>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: SavedGameSession = {
      ...session,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota issues
  }
}

export function loadActiveSession(expectedRoomCode?: string): SavedGameSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: SavedGameSession = JSON.parse(raw);
    if (Date.now() - session.timestamp > MAX_AGE_MS) {
      clearActiveSession();
      return null;
    }
    if (expectedRoomCode && session.roomCode.toUpperCase() !== expectedRoomCode.toUpperCase()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
