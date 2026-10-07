import React, { useState } from 'react';
import type { PlayerRole, GameMode, CapturedGhost, PuzzleLevel, AIDifficulty } from '../types/game';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Copy,
  Check,
  Users,
  Bot,
  LogOut,
  AlertTriangle,
  Trophy,
  RotateCcw,
  Grid,
  Lightbulb,
  Download,
} from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface HeaderHudProps {
  roomCode?: string;
  gameMode: GameMode;
  isMyTurn: boolean;
  localPlayer: PlayerRole;
  capturedGhosts: CapturedGhost[];
  currentLevel?: PuzzleLevel;
  levelMovesTaken?: number;
  aiDifficulty?: AIDifficulty;
  onOpenRules: () => void;
  onResetGame: () => void;
  onRestartLevel?: () => void;
  onOpenLevelSelect?: () => void;
  onExportMoves?: () => void;
}

export const HeaderHud: React.FC<HeaderHudProps> = ({
  roomCode,
  gameMode,
  isMyTurn,
  localPlayer,
  capturedGhosts,
  currentLevel,
  levelMovesTaken = 0,
  aiDifficulty,
  onOpenRules,
  onResetGame,
  onRestartLevel,
  onOpenLevelSelect,
  onExportMoves,
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(soundManager.isMuted());
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleToggleMute = () => {
    const next = soundManager.toggleMute();
    setMuted(next);
  };

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConfirmAbandon = () => {
    setShowAbandonConfirm(false);
    onResetGame();
  };

  // Captured opponent ghosts (captured by local player)
  const opponentRole = localPlayer === 'p1' ? 'p2' : 'p1';
  const opponentGoodCaptured = capturedGhosts.filter(
    (g) => g.owner === opponentRole && g.color === 'blue'
  ).length;
  const opponentBadCaptured = capturedGhosts.filter(
    (g) => g.owner === opponentRole && g.color === 'red'
  ).length;

  return (
    <header className="header-hud">
      {/* Top Title Bar */}
      <div className="title-row">
        <button
          className="hud-icon-btn rules-btn"
          onClick={onOpenRules}
          title="Game Rules & Guide"
          aria-label="How to Play"
        >
          <HelpCircle size={20} />
          <span className="btn-label-mobile">Rules</span>
        </button>

        <div className="game-title-wrapper">
          <h1 className="game-title-glow">GHOSTS</h1>
          <span className="game-subtitle">Alex Randolph 1982</span>
        </div>

        <div className="header-actions">
          {gameMode === 'levels' && onRestartLevel && (
            <button
              className="hud-icon-btn restart-level-btn"
              onClick={onRestartLevel}
              title="Restart Level"
              aria-label="Restart Level"
            >
              <RotateCcw size={18} />
            </button>
          )}

          {gameMode === 'levels' && onOpenLevelSelect && (
            <button
              className="hud-icon-btn grid-level-btn"
              onClick={onOpenLevelSelect}
              title="All 50 Levels"
              aria-label="Select Level"
            >
              <Grid size={18} />
            </button>
          )}

          {gameMode === 'levels' && currentLevel && (
            <button
              className={`hud-icon-btn hint-btn ${showHint ? 'hint-active' : ''}`}
              onClick={() => setShowHint(!showHint)}
              title="Puzzle Clue / Hint"
              aria-label="Hint"
            >
              <Lightbulb size={18} />
            </button>
          )}

          {onExportMoves && (
            <button
              className="hud-icon-btn export-moves-btn"
              onClick={onExportMoves}
              title="Export Game Moves (JSON Telemetry)"
              aria-label="Export Game Moves"
            >
              <Download size={18} />
            </button>
          )}

          <button
            className="hud-icon-btn mute-btn"
            onClick={handleToggleMute}
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
            aria-label="Sound Toggle"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button
            className="hud-icon-btn abandon-btn"
            onClick={() => setShowAbandonConfirm(true)}
            title="Exit / Abandon Match"
            aria-label="Exit Match"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Status Bar matching Mobile Mockup */}
      <div className="status-bar-row">
        {/* Room / Connection Badge */}
        <div className="room-badge">
          {gameMode === 'levels' && currentLevel && (
            <div className="room-static-pill campaign-pill">
              <Trophy size={15} className="campaign-icon" />
              <div className="room-info">
                <span className="room-title">Lvl {currentLevel.id}: {currentLevel.name}</span>
                <span className="conn-status campaign-sub">
                  Moves: <strong className="moves-counter-hud">{levelMovesTaken}</strong> / Par: {currentLevel.parMoves}
                </span>
              </div>
            </div>
          )}

          {gameMode === 'online' && roomCode && (
            <button
              className="room-copy-pill"
              onClick={handleCopyLink}
              title="Click to copy invite link"
            >
              <div className="room-info">
                <span className="room-title">
                  Room: <strong className="room-code-text">{roomCode}</strong>
                </span>
                <span className="conn-status">
                  <span className="status-dot connected" />
                  Peer-to-peer
                </span>
              </div>
              <div className="copy-icon-box">
                {copied ? <Check size={14} className="copied-check" /> : <Copy size={14} />}
              </div>
            </button>
          )}

          {gameMode === 'ai' && (
            <div className="room-static-pill">
              <Bot size={15} className="ai-icon" />
              <div className="room-info">
                <span className="room-title">
                  vs AI ({aiDifficulty === 'super_max' ? 'Super Max' : aiDifficulty === 'hard' ? 'Hard' : 'Easy'})
                </span>
                <span className="conn-status">Solo Match</span>
              </div>
            </div>
          )}

          {gameMode === 'pass-and-play' && (
            <div className="room-static-pill">
              <Users size={15} className="p2p-icon" />
              <div className="room-info">
                <span className="room-title">Pass & Play</span>
                <span className="conn-status">Same Device</span>
              </div>
            </div>
          )}
        </div>

        {/* Neon Turn Badge with dynamic motion indicator */}
        <div className={`turn-sign ${isMyTurn ? 'turn-mine' : 'turn-opponent'}`}>
          <div className="turn-neon-border">
            <span className="turn-pulse-beacon" />
            <span className="turn-text">
              {isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
            </span>
          </div>
        </div>

        {/* Captured Tally Pill */}
        <div className="captured-score-pill" title="Opponent ghosts you have captured">
          <span className="score-label">Captured</span>
          <span className="score-counts">
            <span className="good-count" title="Good ghosts captured (4 = You win!)">
              👻 <strong className="count-blue">{opponentGoodCaptured}</strong>/4
            </span>
            <span className="score-divider">|</span>
            <span className="bad-count" title="Bad ghosts captured (4 = You lose!)">
              😈 <strong className="count-red">{opponentBadCaptured}</strong>/4
            </span>
          </span>
        </div>
      </div>

      {/* Campaign Level Hint Banner */}
      {showHint && currentLevel && (
        <div className="campaign-hint-banner">
          <div className="hint-content">
            <Lightbulb size={16} className="hint-banner-bulb" />
            <span className="hint-text">
              <strong>Clue:</strong> {currentLevel.hint}
            </span>
          </div>
          <button className="hint-dismiss-btn" onClick={() => setShowHint(false)}>
            Dismiss
          </button>
        </div>
      )}

      {/* Abandon Match Confirmation Modal */}
      {showAbandonConfirm && (
        <div className="modal-backdrop" onClick={() => setShowAbandonConfirm(false)}>
          <div className="abandon-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="abandon-modal-icon">
              <AlertTriangle size={36} color="#ff1744" />
            </div>
            <h3 className="abandon-modal-title">Abandon Match?</h3>
            <p className="abandon-modal-desc">
              Are you sure you want to exit to the main menu? Your current game progress will be lost.
            </p>
            <div className="abandon-modal-actions">
              <button className="confirm-abandon-btn" onClick={handleConfirmAbandon}>
                <LogOut size={16} />
                <span>Yes, Abandon Match</span>
              </button>
              <button className="cancel-abandon-btn" onClick={() => setShowAbandonConfirm(false)}>
                <span>Keep Playing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
