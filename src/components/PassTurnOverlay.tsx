import React, { useState } from 'react';
import { ShieldAlert, EyeOff, Lock, Unlock, Flame } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface PassTurnOverlayProps {
  nextPlayer: 'p1' | 'p2';
  lastCapturedInfo?: {
    color: 'blue' | 'red';
    capturer: 'p1' | 'p2';
  };
  onUnlocked: () => void;
}

export const PassTurnOverlay: React.FC<PassTurnOverlayProps> = ({
  nextPlayer,
  lastCapturedInfo,
  onUnlocked,
}) => {
  const [tapCount, setTapCount] = useState(0);

  const handleTap = () => {
    const next = tapCount + 1;
    soundManager.playSelect();

    if (next >= 3) {
      soundManager.playTurnAlert();
      setTapCount(3);
      setTimeout(() => {
        onUnlocked();
      }, 250);
    } else {
      setTapCount(next);
    }
  };

  const playerName = nextPlayer === 'p1' ? 'PLAYER 1' : 'PLAYER 2';
  const playerColorClass = nextPlayer === 'p1' ? 'p1-turn' : 'p2-turn';

  return (
    <div className="pass-turn-backdrop" onClick={handleTap}>
      <div className={`pass-turn-card ${playerColorClass}`} onClick={(e) => { e.stopPropagation(); handleTap(); }}>
        {/* Top Security Badge */}
        <div className="pass-security-badge">
          <EyeOff size={16} />
          <span>BATTLESHIP PRIVACY SHIELD</span>
        </div>

        {/* Big Alert Header */}
        <div className="pass-header">
          <ShieldAlert size={36} className="pass-shield-icon" />
          <h2 className="pass-title">PASS THE DEVICE</h2>
          <div className="next-player-badge">
            HAND TO <strong>{playerName}</strong>
          </div>
        </div>

        {/* Capture Announcement if a capture just took place */}
        {lastCapturedInfo && (
          <div className={`capture-banner ${lastCapturedInfo.color}`}>
            <span>
              Last Move Capture:{' '}
              <strong>
                {lastCapturedInfo.color === 'blue' ? '🔵 GOOD GHOST' : '🔴 BAD POISON GHOST'}
              </strong>
            </span>
          </div>
        )}

        <p className="pass-instruction">
          Ghost identities and placements are classified! Keep this screen hidden from opponent.
        </p>

        {/* 3-Tap Security Unlock Area */}
        <div className="tap-unlock-container">
          <span className="tap-counter-label">
            {tapCount === 0 && '👉 TAP 3 TIMES TO REVEAL BOARD 👈'}
            {tapCount === 1 && '🔥 TAP 2 MORE TIMES...'}
            {tapCount === 2 && '⚡ 1 MORE TAP TO UNLOCK!'}
            {tapCount >= 3 && '✨ UNLOCKED! REVEALING...'}
          </span>

          <div className="tap-indicators">
            {[1, 2, 3].map((step) => {
              const isFilled = tapCount >= step;
              return (
                <div
                  key={`tap-step-${step}`}
                  className={`tap-step-orb ${isFilled ? 'filled' : 'locked'}`}
                >
                  {isFilled ? (
                    <Flame size={20} className="flame-icon pulse-fast" />
                  ) : (
                    <Lock size={18} className="lock-icon" />
                  )}
                  <span className="step-num">Step {step}</span>
                </div>
              );
            })}
          </div>

          <button className="tap-reveal-btn" onClick={handleTap}>
            {tapCount >= 3 ? <Unlock size={20} /> : <Lock size={20} />}
            <span>
              {tapCount === 0 && `I Am ${playerName} - Tap to Unlock (1/3)`}
              {tapCount === 1 && 'Opponent is Looking Away (2/3)'}
              {tapCount === 2 && 'Final Tap: Reveal My Ghosts! (3/3)'}
              {tapCount >= 3 && 'Unlocking...'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
