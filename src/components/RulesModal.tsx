import React from 'react';
import { X, ShieldCheck, Skull, DoorOpen } from 'lucide-react';
import { GhostPiece } from './GhostPiece';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="rules-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">GHOSTS (Geister) 1982</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="rules-content">
          <p className="rules-intro">
            Designed by master game designer <strong>Alex Randolph</strong> in 1982,{' '}
            <em>Ghosts</em> is a legendary board game of bluffing, psychological warfare, and hidden information.
          </p>

          <div className="rules-section">
            <h3 className="section-title">👻 The Ghosts & Setup</h3>
            <div className="ghost-comparison-row">
              <div className="ghost-card good-card">
                <GhostPiece color="blue" size={48} />
                <div className="card-info">
                  <strong>4 Good Ghosts (Blue)</strong>
                  <span>Friendly spirits with cyan glowing auras. Protect them or sneak them out!</span>
                </div>
              </div>

              <div className="ghost-card bad-card">
                <GhostPiece color="red" size={48} />
                <div className="card-info">
                  <strong>4 Bad Ghosts (Red)</strong>
                  <span>Ruby-glowing mischievous spirits with red neon cores. Bait your opponent into capturing them!</span>
                </div>
              </div>

              <div className="ghost-card neutral-card">
                <GhostPiece color="unknown" isOpponent size={48} />
                <div className="card-info">
                  <strong>Opponent's View</strong>
                  <span>To your opponent, all your ghosts appear completely identical until captured!</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h3 className="section-title">🏆 3 Ways to Win</h3>
            <div className="win-conditions-grid">
              <div className="win-box win-hunt">
                <div className="win-icon-wrapper">
                  <ShieldCheck size={28} className="win-icon blue-icon" />
                </div>
                <h4>1. Heroic Capture</h4>
                <p>Capture all <strong>4 of your opponent's Good (Blue)</strong> ghosts.</p>
              </div>

              <div className="win-box win-poison">
                <div className="win-icon-wrapper">
                  <Skull size={28} className="win-icon red-icon" />
                </div>
                <h4>2. Poison Pill Trap</h4>
                <p>Force or trick your opponent into capturing all <strong>4 of your Bad (Red)</strong> ghosts! They lose immediately!</p>
              </div>

              <div className="win-box win-escape">
                <div className="win-icon-wrapper">
                  <DoorOpen size={28} className="win-icon green-icon" />
                </div>
                <h4>3. Corner Door Escape</h4>
                <p>Move one of your <strong>Good (Blue)</strong> ghosts onto either opponent corner gate and step out of the dungeon to win immediately!</p>
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h3 className="section-title">🕹️ Movement Rules</h3>
            <ul className="rules-list">
              <li>Each turn, you move 1 ghost exactly 1 square orthogonally (up, down, left, or right).</li>
              <li>No diagonal movement. No jumping over pieces.</li>
              <li>You cannot move onto a square occupied by your own ghost.</li>
              <li>Moving onto an opponent's ghost captures it, immediately revealing its true color!</li>
              <li><strong>Red Bad Ghosts CANNOT escape</strong> through the exit gateways—only Blue Good Ghosts can!</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-action-btn" onClick={onClose}>
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
