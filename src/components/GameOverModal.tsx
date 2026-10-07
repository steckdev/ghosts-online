import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerRole, WinReason, Ghost } from '../types/game';
import { Trophy, Skull, DoorOpen, RefreshCw, Home, Download } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface GameOverModalProps {
  isOpen: boolean;
  winner: PlayerRole;
  localPlayer: PlayerRole;
  winReason: WinReason;
  allGhosts: Ghost[];
  onRematch: () => void;
  onHome: () => void;
  onExportMoves?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  localPlayer,
  winReason,
  onRematch,
  onHome,
  onExportMoves,
}) => {
  const isWinner = winner === localPlayer;

  useEffect(() => {
    if (isOpen) {
      if (isWinner) {
        soundManager.playVictory();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00e5ff', '#39ff14', '#ffeb3b', '#ff1744'],
        });
      } else {
        soundManager.playDefeat();
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const getReasonDetails = () => {
    switch (winReason) {
      case 'captured_all_blue':
        return {
          title: 'Heroic Exorcism!',
          description: isWinner
            ? 'You successfully hunted down all 4 of your opponent’s Good (Blue) Ghosts!'
            : 'Your opponent captured all 4 of your Good (Blue) Ghosts!',
          icon: <Trophy size={36} className="reason-icon trophy-icon" />,
        };
      case 'captured_all_red':
        return {
          title: 'Poison Pill Trap!',
          description: isWinner
            ? 'Your opponent greedily swallowed all 4 of your Bad (Red) Ghosts! They lose!'
            : 'You fell into the trap and captured all 4 Bad (Red) Ghosts! Poisoned!',
          icon: <Skull size={36} className="reason-icon skull-icon" />,
        };
      case 'escaped':
        return {
          title: 'The Great Escape!',
          description: isWinner
            ? 'Your Good (Blue) Ghost successfully escaped through the Exit Gateway!'
            : 'Your opponent escaped a Good (Blue) Ghost through the Exit Gateway!',
          icon: <DoorOpen size={36} className="reason-icon door-icon" />,
        };
      default:
        return {
          title: 'Game Finished',
          description: '',
          icon: <Trophy size={36} />,
        };
    }
  };

  const details = getReasonDetails();

  return (
    <div className="modal-backdrop">
      <div className={`gameover-card ${isWinner ? 'victory-card' : 'defeat-card'}`}>
        <div className="gameover-banner">
          <h2 className="gameover-title-glow">
            {isWinner ? '🎉 VICTORY! 🎉' : '💀 DEFEAT 💀'}
          </h2>
        </div>

        <div className="gameover-body">
          <div className="gameover-icon-box">{details.icon}</div>
          <h3 className="gameover-reason-title">{details.title}</h3>
          <p className="gameover-reason-desc">{details.description}</p>
        </div>

        <div className="gameover-actions">
          <button className="primary-action-btn rematch-btn" onClick={onRematch}>
            <RefreshCw size={18} />
            <span>Play Again / Rematch</span>
          </button>
          <button className="secondary-action-btn home-btn" onClick={onHome}>
            <Home size={18} />
            <span>Main Menu</span>
          </button>
          {onExportMoves && (
            <button
              className="telemetry-export-btn"
              onClick={onExportMoves}
              title="Export match telemetry JSON for AI analysis"
            >
              <Download size={15} />
              <span>Export Moves (JSON Telemetry)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
