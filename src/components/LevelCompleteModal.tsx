import React from 'react';
import type { PuzzleLevel } from '../types/game';
import { Star, ArrowRight, RotateCcw, Grid, Home, Trophy, Download } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface LevelCompleteModalProps {
  isOpen: boolean;
  level: PuzzleLevel;
  movesTaken: number;
  starsEarned: number;
  isNewBest: boolean;
  bestMoves: number;
  onNextLevel?: () => void;
  onReplayLevel: () => void;
  onOpenLevelSelect: () => void;
  onBackToMenu: () => void;
  onExportMoves?: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  isOpen,
  level,
  movesTaken,
  starsEarned,
  isNewBest,
  bestMoves,
  onNextLevel,
  onReplayLevel,
  onOpenLevelSelect,
  onBackToMenu,
  onExportMoves,
}) => {
  if (!isOpen) return null;

  const hasNextLevel = level.id < 50;

  let starFeedback = 'CLEARED! Try again for 3 Stars.';
  if (starsEarned === 3) {
    starFeedback = 'MASTERFUL! Solved within Par!';
  } else if (starsEarned === 2) {
    starFeedback = 'WELL DONE! Close to Par.';
  }

  return (
    <div className="modal-backdrop">
      <div className="level-complete-card">
        {/* Glowing Trophy Header */}
        <div className="level-complete-trophy-wrap">
          <Trophy size={48} className="complete-trophy-icon" />
        </div>

        <div className="level-complete-tag">DUNGEON CLEARED</div>
        <h2 className="level-complete-title">Level {level.id}: {level.name}</h2>
        <p className="level-complete-subtitle">{starFeedback}</p>

        {/* Big Animated Stars */}
        <div className="stars-earned-display">
          {[1, 2, 3].map((starIdx) => (
            <div
              key={starIdx}
              className={`big-star-box ${starsEarned >= starIdx ? 'earned' : 'empty'}`}
              style={{ animationDelay: `${starIdx * 0.15}s` }}
            >
              <Star
                size={42}
                fill={starsEarned >= starIdx ? '#ffd700' : 'none'}
                color={starsEarned >= starIdx ? '#ffd700' : 'rgba(255,255,255,0.2)'}
              />
            </div>
          ))}
        </div>

        {/* Moves & Par Stats */}
        <div className="complete-stats-box">
          <div className="complete-stat-item">
            <span className="stat-label">Moves Taken</span>
            <span className="stat-value moves-value">{movesTaken}</span>
          </div>
          <div className="complete-stat-divider" />
          <div className="complete-stat-item">
            <span className="stat-label">Par Moves</span>
            <span className="stat-value par-value">{level.parMoves}</span>
          </div>
          <div className="complete-stat-divider" />
          <div className="complete-stat-item">
            <span className="stat-label">Best Record</span>
            <span className="stat-value best-value">
              {bestMoves}
              {isNewBest && <span className="new-badge">NEW!</span>}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="level-complete-actions">
          {hasNextLevel && onNextLevel && (
            <button
              className="primary-action-btn next-level-btn"
              onClick={() => {
                soundManager.playMove();
                onNextLevel();
              }}
            >
              <span>Next Level ({level.id + 1})</span>
              <ArrowRight size={18} />
            </button>
          )}

          <div className="secondary-actions-row">
            <button
              className="secondary-action-btn replay-btn"
              onClick={() => {
                soundManager.playMove();
                onReplayLevel();
              }}
            >
              <RotateCcw size={16} />
              <span>Retry</span>
            </button>

            <button
              className="secondary-action-btn grid-btn"
              onClick={() => {
                soundManager.playSelect();
                onOpenLevelSelect();
              }}
            >
              <Grid size={16} />
              <span>All Levels</span>
            </button>

            <button
              className="secondary-action-btn menu-btn"
              onClick={() => {
                soundManager.playSelect();
                onBackToMenu();
              }}
            >
              <Home size={16} />
              <span>Menu</span>
            </button>
          </div>

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
