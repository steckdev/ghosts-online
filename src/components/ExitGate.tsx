import React from 'react';

interface ExitGateProps {
  side: 'left' | 'right';
  hasGoodGhost?: boolean;
  canEscape?: boolean;
  onEscapeClick?: () => void;
}

export const ExitGate: React.FC<ExitGateProps> = ({
  side,
  canEscape = false,
  onEscapeClick,
}) => {
  return (
    <div
      className={`exit-gate-wrapper ${side} ${canEscape ? 'can-escape' : ''}`}
      onClick={canEscape ? onEscapeClick : undefined}
      title={canEscape ? 'Click to ESCAPE and WIN!' : 'Exit Gateway'}
    >
      <div className="exit-sign-neon">
        <span className="exit-arrow-indicator">{side === 'left' ? '‹' : ''}</span>
        <span className="exit-sign-text">EXIT</span>
        <span className="exit-arrow-indicator">{side === 'right' ? '›' : '‹'}</span>
      </div>

      <svg
        viewBox="0 0 100 80"
        className="exit-gate-svg"
        style={{
          width: '100%',
          height: '100%',
          filter: canEscape
            ? 'drop-shadow(0 0 12px #39ff14) drop-shadow(0 0 20px #00e676)'
            : 'drop-shadow(0 0 6px rgba(57, 255, 20, 0.4))',
        }}
      >
        <defs>
          <linearGradient id="stonePillar" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="ironBar" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          <filter id="gateNeonGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left Stone Pillar */}
        <rect x="2" y="16" width="14" height="60" rx="2" fill="url(#stonePillar)" stroke="#475569" strokeWidth="1" />
        <polygon points="1,16 9,6 17,16" fill="#334155" stroke="#475569" strokeWidth="1" />
        {/* Pillar base */}
        <rect x="0" y="70" width="18" height="8" rx="1" fill="#0f172a" />

        {/* Right Stone Pillar */}
        <rect x="84" y="16" width="14" height="60" rx="2" fill="url(#stonePillar)" stroke="#475569" strokeWidth="1" />
        <polygon points="83,16 91,6 99,16" fill="#334155" stroke="#475569" strokeWidth="1" />
        {/* Pillar base */}
        <rect x="82" y="70" width="18" height="8" rx="1" fill="#0f172a" />

        {/* Iron Gates (slightly open in 2.5D perspective) */}
        {/* Left Gate Wing */}
        <g className="gate-wing left-wing">
          <rect x="16" y="24" width="4" height="52" fill="url(#ironBar)" />
          <line x1="24" y1="28" x2="24" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="32" y1="32" x2="32" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="40" y1="36" x2="40" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="16" y1="36" x2="44" y2="40" stroke="#334155" strokeWidth="3" />
          <line x1="16" y1="62" x2="44" y2="64" stroke="#334155" strokeWidth="3" />
          {/* Spikes on top */}
          <polygon points="24,24 22,28 26,28" fill="#94a3b8" />
          <polygon points="32,28 30,32 34,32" fill="#94a3b8" />
          <polygon points="40,32 38,36 42,36" fill="#94a3b8" />
        </g>

        {/* Right Gate Wing */}
        <g className="gate-wing right-wing">
          <rect x="80" y="24" width="4" height="52" fill="url(#ironBar)" />
          <line x1="76" y1="28" x2="76" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="68" y1="32" x2="68" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="60" y1="36" x2="60" y2="76" stroke="#475569" strokeWidth="2.5" />
          <line x1="56" y1="40" x2="84" y2="36" stroke="#334155" strokeWidth="3" />
          <line x1="56" y1="64" x2="84" y2="62" stroke="#334155" strokeWidth="3" />
          {/* Spikes on top */}
          <polygon points="76,24 74,28 78,28" fill="#94a3b8" />
          <polygon points="68,28 66,32 70,32" fill="#94a3b8" />
          <polygon points="60,32 58,36 62,36" fill="#94a3b8" />
        </g>

        {/* Ethereal Green Glow Portal in Center */}
        <ellipse
          cx="50"
          cy="52"
          rx="22"
          ry="26"
          fill="none"
          stroke="#00e676"
          strokeWidth="1.5"
          opacity={canEscape ? 0.9 : 0.4}
          filter="url(#gateNeonGlow)"
        />
        {canEscape && (
          <path
            d="M 50 36 L 50 64 M 43 45 L 50 36 L 57 45"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {canEscape && <div className="escape-pulse-badge">TAP TO ESCAPE!</div>}
    </div>
  );
};
