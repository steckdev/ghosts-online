import React, { useState } from 'react';
import { Shuffle, Sparkles, CheckCircle2 } from 'lucide-react';
import type { Ghost } from '../types/game';
import { GhostPiece } from './GhostPiece';
import { soundManager } from '../audio/soundEffects';
import { shuffleGhostColors } from '../utils/ghostUtils';

interface PassAndPlaySetupModalProps {
  initialGhosts: Ghost[];
  onConfirm: (finalGhosts: Ghost[]) => void;
}

export const PassAndPlaySetupModal: React.FC<PassAndPlaySetupModalProps> = ({
  initialGhosts,
  onConfirm,
}) => {
  const [ghosts, setGhosts] = useState<Ghost[]>(initialGhosts);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);

  const handleShuffle = () => {
    soundManager.playSelect();
    const shuffled = shuffleGhostColors(ghosts);
    setGhosts(shuffled);
  };

  const handleGhostClick = (ghost: Ghost) => {
    soundManager.playSelect();
    if (!selectedSwapId) {
      setSelectedSwapId(ghost.id);
    } else if (selectedSwapId === ghost.id) {
      setSelectedSwapId(null);
    } else {
      const g1 = ghosts.find((g) => g.id === selectedSwapId);
      const g2 = ghost;
      if (g1 && g2) {
        const nextGhosts = ghosts.map((g) => {
          if (g.id === g1.id) return { ...g, x: g2.x, y: g2.y };
          if (g.id === g2.id) return { ...g, x: g1.x, y: g1.y };
          return g;
        });
        setGhosts(nextGhosts);
      }
      setSelectedSwapId(null);
    }
  };

  const handleFinish = () => {
    soundManager.playMove();
    onConfirm(ghosts);
  };

  return (
    <div className="modal-backdrop setup-modal-backdrop">
      <div className="setup-modal-card">
        <div className="card-header-row">
          <div className="player-badge p2-badge">PLAYER 2 SETUP</div>
          <button className="shuffle-btn" onClick={handleShuffle} title="Randomize Positions">
            <Shuffle size={16} />
            <span>Shuffle</span>
          </button>
        </div>

        <h2 className="setup-modal-title">
          <Sparkles size={20} className="sparkle-icon" />
          Choose Your Secret Starting Layout
        </h2>

        <p className="setup-help-text">
          Tap any two ghosts to swap them, or hit Shuffle. Only you will know which ghosts are Good (Blue) or Bad (Red)!
        </p>

        <div className="mini-setup-board">
          <div className="mini-board-grid">
            {/* Front row (facing opponent): y=4 for Player 2 */}
            <div className="mini-row">
              {[1, 2, 3, 4].map((colX) => {
                const ghost = ghosts.find((g) => g.x === colX && g.y === 4);
                return (
                  <div
                    key={`p2-slot-${colX}-4`}
                    className={`mini-slot ${ghost?.id === selectedSwapId ? 'swap-selected' : ''}`}
                    onClick={() => ghost && handleGhostClick(ghost)}
                  >
                    {ghost && <GhostPiece color={ghost.color} size={44} />}
                  </div>
                );
              })}
            </div>

            {/* Back row: y=5 for Player 2 */}
            <div className="mini-row">
              {[1, 2, 3, 4].map((colX) => {
                const ghost = ghosts.find((g) => g.x === colX && g.y === 5);
                return (
                  <div
                    key={`p2-slot-${colX}-5`}
                    className={`mini-slot ${ghost?.id === selectedSwapId ? 'swap-selected' : ''}`}
                    onClick={() => ghost && handleGhostClick(ghost)}
                  >
                    {ghost && <GhostPiece color={ghost.color} size={44} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mini-legend">
            <span className="legend-tag blue-tag">🔵 4 Good Ghosts • 🔴 4 Bad Poison Ghosts</span>
          </div>
        </div>

        <button className="primary-action-btn start-match-btn" onClick={handleFinish}>
          <CheckCircle2 size={18} />
          <span>Lock In Layout & Hand to Player 1</span>
        </button>
      </div>
    </div>
  );
};
