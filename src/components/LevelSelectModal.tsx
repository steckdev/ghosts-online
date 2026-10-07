import React, { useState } from 'react';
import type { PuzzleLevel } from '../types/game';
import { PUZZLE_LEVELS } from '../data/puzzleLevels';
import {
  getLevelProgress,
  getTotalStars,
  getCompletedCount,
  resetAllLevelProgress,
} from '../utils/levelStorage';
import { X, Star, Lock, Play, RotateCcw, Award, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface LevelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: PuzzleLevel) => void;
  currentLevelId?: number;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectLevel,
  currentLevelId,
}) => {
  const [activeTier, setActiveTier] = useState<1 | 2 | 3 | 4>(1);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [progress, setProgress] = useState(() => getLevelProgress());

  if (!isOpen) return null;

  const totalStars = getTotalStars(progress);
  const completedCount = getCompletedCount(progress);

  const tierMeta = [
    { tier: 1 as const, name: 'Crypt Initiate', range: 'Levels 1–10', icon: Sparkles, color: '#00e5ff' },
    { tier: 2 as const, name: 'Phantom Labyrinth', range: 'Levels 11–25', icon: Award, color: '#b388ff' },
    { tier: 3 as const, name: 'Poison Sanctum', range: 'Levels 26–40', icon: ShieldAlert, color: '#ff1744' },
    { tier: 4 as const, name: 'Grandmaster Dungeon', range: 'Levels 41–50', icon: Star, color: '#ffd700' },
  ];

  const currentTierLevels = PUZZLE_LEVELS.filter((lvl) => lvl.tier === activeTier);

  const handleSelect = (level: PuzzleLevel) => {
    const p = progress[level.id];
    if (!p || !p.unlocked) return;
    soundManager.playSelect();
    onSelectLevel(level);
    onClose();
  };

  const handleReset = () => {
    soundManager.playSelect();
    const defaults = resetAllLevelProgress();
    setProgress(defaults);
    setShowResetConfirm(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="level-select-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="level-select-header">
          <div className="header-text-block">
            <div className="campaign-tag">PUZZLE CAMPAIGN</div>
            <h2 className="level-modal-title">THE 50 DUNGEONS</h2>
            <div className="campaign-summary-stats">
              <span className="star-stat-pill">
                <Star size={16} fill="#ffd700" color="#ffd700" />
                <strong>{totalStars}</strong> / 150 Stars
              </span>
              <span className="levels-stat-pill">
                <strong>{completedCount}</strong> / 50 Conquered
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close Level Selection">
            <X size={22} />
          </button>
        </div>

        {/* Tier Tabs */}
        <div className="tier-nav-tabs">
          {tierMeta.map((t) => {
            const Icon = t.icon;
            const tierLevels = PUZZLE_LEVELS.filter((l) => l.tier === t.tier);
            const tierCompleted = tierLevels.filter((l) => progress[l.id]?.completed).length;

            return (
              <button
                key={t.tier}
                className={`tier-tab-btn ${activeTier === t.tier ? 'active' : ''}`}
                onClick={() => {
                  soundManager.playSelect();
                  setActiveTier(t.tier);
                }}
              >
                <Icon size={16} color={activeTier === t.tier ? t.color : 'rgba(255,255,255,0.6)'} />
                <div className="tier-tab-text">
                  <span className="tier-tab-name">Tier {t.tier}</span>
                  <span className="tier-tab-count">
                    {tierCompleted}/{tierLevels.length}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Tier Description Banner */}
        <div className="tier-banner">
          <div className="tier-banner-title">
            <strong>{tierMeta[activeTier - 1].name}</strong> ({tierMeta[activeTier - 1].range})
          </div>
          <div className="tier-banner-desc">
            {activeTier === 1 && 'Master the fundamentals: corner escape gates, baiting moves, and poison awareness.'}
            {activeTier === 2 && 'Maneuver through midgame boards with pins, sacrifices, and 3-Red poison traps.'}
            {activeTier === 3 && 'Lethal stakes! Deduce real Blue runners while dodging high-threat poison pills.'}
            {activeTier === 4 && 'The ultimate Alex Randolph test. Precise multi-step zugzwang and corner tempo races.'}
          </div>
        </div>

        {/* Level Grid */}
        <div className="levels-scroll-container">
          <div className="levels-card-grid">
            {currentTierLevels.map((lvl) => {
              const p = progress[lvl.id] || { unlocked: lvl.id === 1, completed: false, stars: 0, bestMoves: 0 };
              const isUnlocked = p.unlocked;
              const isCurrent = currentLevelId === lvl.id;

              return (
                <div
                  key={lvl.id}
                  className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${p.completed ? 'completed' : ''} ${
                    isCurrent ? 'current-active' : ''
                  }`}
                  onClick={() => isUnlocked && handleSelect(lvl)}
                >
                  <div className="level-card-top">
                    <span className="level-num">#{lvl.id}</span>
                    {isUnlocked ? (
                      <div className="level-stars-row">
                        {[1, 2, 3].map((starIdx) => (
                          <Star
                            key={starIdx}
                            size={14}
                            fill={p.stars >= starIdx ? '#ffd700' : 'none'}
                            color={p.stars >= starIdx ? '#ffd700' : 'rgba(255,255,255,0.2)'}
                          />
                        ))}
                      </div>
                    ) : (
                      <Lock size={15} className="lock-icon" />
                    )}
                  </div>

                  <div className="level-card-body">
                    <div className="level-name">{lvl.name}</div>
                    <div className="level-par">Par: {lvl.parMoves} {lvl.parMoves === 1 ? 'move' : 'moves'}</div>
                  </div>

                  <div className="level-card-footer">
                    {isUnlocked ? (
                      p.completed ? (
                        <div className="best-moves-tag">Best: {p.bestMoves} m</div>
                      ) : (
                        <div className="play-prompt">
                          <span>Play</span>
                          <ChevronRight size={14} />
                        </div>
                      )
                    ) : (
                      <div className="locked-tag">Locked</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="level-select-footer">
          {showResetConfirm ? (
            <div className="reset-confirm-box">
              <span>Reset all 50 levels and stars?</span>
              <button className="confirm-reset-btn" onClick={handleReset}>
                Yes, Reset All
              </button>
              <button className="cancel-reset-btn" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="reset-progress-btn" onClick={() => setShowResetConfirm(true)}>
              <RotateCcw size={14} />
              <span>Reset Campaign Progress</span>
            </button>
          )}

          <button className="start-resume-btn" onClick={onClose}>
            <Play size={16} />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
