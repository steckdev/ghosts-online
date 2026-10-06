import React, { useId } from 'react';
import type { GhostColor } from '../types/game';

interface GhostPieceProps {
  color: GhostColor;
  isSelected?: boolean;
  isLastMoved?: boolean;
  isOpponent?: boolean;
  showBackView?: boolean;
  className?: string;
  size?: number;
}

export const GhostPiece: React.FC<GhostPieceProps> = ({
  color,
  isSelected = false,
  isLastMoved = false,
  isOpponent = false,
  showBackView = false,
  className = '',
  size = 56,
}) => {
  // Unique ID per piece so SVG gradients never collide or get unmounted by sibling changes!
  const uniqueId = useId().replace(/:/g, '');

  // If opponent and not captured, color is strictly unknown (neutral white)
  const effectiveColor = isOpponent ? 'unknown' : color;

  const gradId = `body-grad-${effectiveColor}-${uniqueId}`;
  const hornGradId = `horn-grad-${uniqueId}`;

  // Guaranteed solid base fill color so the ghost can NEVER become hollow or transparent
  const baseSolidColor =
    effectiveColor === 'blue'
      ? '#00b0ff'
      : effectiveColor === 'red'
      ? '#d50000'
      : '#f8fafc';

  const strokeColor =
    effectiveColor === 'blue'
      ? '#b2ebf2'
      : effectiveColor === 'red'
      ? '#ff8a80'
      : '#ffffff';

  return (
    <div
      className={`ghost-piece-container ${isSelected ? 'selected' : ''} ${isLastMoved ? 'last-moved' : ''} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Outer ambient glow */}
      {effectiveColor === 'blue' && <div className="ghost-aura ghost-aura-blue" />}
      {effectiveColor === 'red' && <div className="ghost-aura ghost-aura-red" />}

      <svg
        viewBox="0 0 100 115"
        width={size}
        height={Math.round(size * 1.15)}
        className={`ghost-svg ghost-type-${effectiveColor}`}
        style={{
          filter: isSelected
            ? 'drop-shadow(0 0 14px #00ffff) drop-shadow(0 0 6px #ffffff)'
            : effectiveColor === 'blue'
            ? 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.85)) drop-shadow(0 4px 6px rgba(0,0,0,0.6))'
            : effectiveColor === 'red'
            ? 'drop-shadow(0 0 10px rgba(255, 23, 68, 0.9)) drop-shadow(0 4px 6px rgba(0,0,0,0.6))'
            : 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6)) drop-shadow(0 4px 6px rgba(0,0,0,0.7))',
          transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease',
        }}
      >
        <defs>
          {/* Unique Per-Instance Gradients */}
          {effectiveColor === 'unknown' && (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          )}

          {effectiveColor === 'blue' && (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b2ebf2" />
              <stop offset="30%" stopColor="#26c6da" />
              <stop offset="80%" stopColor="#00b0ff" />
              <stop offset="100%" stopColor="#0091ea" />
            </linearGradient>
          )}

          {effectiveColor === 'red' && (
            <>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffcdd2" />
                <stop offset="30%" stopColor="#ff5252" />
                <stop offset="85%" stopColor="#d50000" />
                <stop offset="100%" stopColor="#b71c1c" />
              </linearGradient>
              <linearGradient id={hornGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff8a80" />
                <stop offset="60%" stopColor="#d50000" />
                <stop offset="100%" stopColor="#880e4f" />
              </linearGradient>
            </>
          )}
        </defs>

        {/* ================= RED DEVIL HORNS ================= */}
        {effectiveColor === 'red' && (
          <g className="ghost-horns">
            <path
              d="M 27 34 C 20 25 15 12 18 6 C 24 9 31 18 34 26 Z"
              fill={`url(#${hornGradId})`}
              stroke="#ffebee"
              strokeWidth="1.2"
            />
            <path
              d="M 73 34 C 80 25 85 12 82 6 C 76 9 69 18 66 26 Z"
              fill={`url(#${hornGradId})`}
              stroke="#ffebee"
              strokeWidth="1.2"
            />
          </g>
        )}

        {/* ================= SOLID BACKDROP (Guarantees ghost body is NEVER hollow) ================= */}
        <path
          d={
            effectiveColor === 'red'
              ? 'M 50 16 C 30 16 20 28 18 55 C 16 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 84 75 82 55 C 80 28 70 16 50 16 Z'
              : 'M 50 12 C 28 12 18 26 18 54 C 18 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 82 75 82 54 C 82 26 72 12 50 12 Z'
          }
          fill={baseSolidColor}
        />

        {/* Gradient Sheet Layer */}
        <path
          d={
            effectiveColor === 'red'
              ? 'M 50 16 C 30 16 20 28 18 55 C 16 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 84 75 82 55 C 80 28 70 16 50 16 Z'
              : 'M 50 12 C 28 12 18 26 18 54 C 18 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 82 75 82 54 C 82 26 72 12 50 12 Z'
          }
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth="1.6"
        />

        {/* Shading drape folds */}
        <path
          d="M 28 50 C 32 68 34 85 32 94"
          fill="none"
          stroke={effectiveColor === 'blue' ? '#00838f' : effectiveColor === 'red' ? '#880e4f' : '#94a3b8'}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          d="M 72 50 C 68 68 66 85 68 94"
          fill="none"
          stroke={effectiveColor === 'blue' ? '#00838f' : effectiveColor === 'red' ? '#880e4f' : '#94a3b8'}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />

        {/* Highlight sheen curve */}
        <path
          d="M 32 20 C 44 16 56 16 68 20 C 72 22 75 26 75 32 C 60 25 40 25 25 32 C 25 26 28 22 32 20 Z"
          fill="#ffffff"
          opacity={effectiveColor === 'unknown' ? '0.45' : '0.35'}
        />

        {/* ================= BACK VIEW DOTS ================= */}
        {showBackView && (
          <g className="ghost-back-indicator">
            {effectiveColor === 'blue' && (
              <circle cx="50" cy="54" r="11" fill="#00e5ff" stroke="#ffffff" strokeWidth="2.5" />
            )}
            {effectiveColor === 'red' && (
              <circle cx="50" cy="54" r="11" fill="#ff1744" stroke="#ffffff" strokeWidth="2.5" />
            )}
          </g>
        )}

        {/* ================= FACES ================= */}
        {!showBackView && (
          <>
            {/* 1. NEUTRAL OPPONENT GHOST FACE */}
            {effectiveColor === 'unknown' && (
              <g className="neutral-face">
                <ellipse cx="37" cy="46" rx="5.5" ry="9" fill="#1e293b" />
                <circle cx="35" cy="43" r="1.5" fill="#ffffff" opacity="0.9" />
                <ellipse cx="63" cy="46" rx="5.5" ry="9" fill="#1e293b" />
                <circle cx="61" cy="43" r="1.5" fill="#ffffff" opacity="0.9" />
              </g>
            )}

            {/* 2. GOOD (BLUE) GHOST FACE */}
            {effectiveColor === 'blue' && (
              <g className="good-face">
                <ellipse cx="37" cy="44" rx="5.5" ry="8" fill="#003666" />
                <circle cx="35.5" cy="41" r="2.2" fill="#ffffff" />
                <circle cx="39" cy="47" r="1" fill="#ffffff" />

                <ellipse cx="63" cy="44" rx="5.5" ry="8" fill="#003666" />
                <circle cx="61.5" cy="41" r="2.2" fill="#ffffff" />
                <circle cx="65" cy="47" r="1" fill="#ffffff" />

                <path
                  d="M 43 57 Q 50 64 57 57"
                  fill="none"
                  stroke="#003666"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />

                <ellipse cx="28" cy="53" rx="4" ry="2" fill="#80deea" opacity="0.8" />
                <ellipse cx="72" cy="53" rx="4" ry="2" fill="#80deea" opacity="0.8" />

                <circle cx="10" cy="30" r="3" fill="#80deea" opacity="0.8" />
                <circle cx="90" cy="38" r="2.5" fill="#80deea" opacity="0.8" />
                <circle cx="86" cy="18" r="2" fill="#00e5ff" opacity="0.7" />
              </g>
            )}

            {/* 3. BAD (RED) GHOST FACE */}
            {effectiveColor === 'red' && (
              <g className="bad-face">
                <path
                  d="M 28 35 L 43 41"
                  fill="none"
                  stroke="#5c0011"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M 72 35 L 57 41"
                  fill="none"
                  stroke="#5c0011"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                <ellipse cx="36" cy="47" rx="5.5" ry="7" fill="#4a000d" />
                <circle cx="35" cy="45" r="1.8" fill="#ffeb3b" />

                <ellipse cx="64" cy="47" rx="5.5" ry="7" fill="#4a000d" />
                <circle cx="63" cy="45" r="1.8" fill="#ffeb3b" />

                <path
                  d="M 43 62 Q 50 56 57 62"
                  fill="none"
                  stroke="#5c0011"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                <circle cx="12" cy="22" r="2.5" fill="#ff5252" opacity="0.85" />
                <circle cx="88" cy="28" r="3" fill="#ff1744" opacity="0.8" />
                <circle cx="10" cy="50" r="2" fill="#ffab00" opacity="0.7" />
              </g>
            )}
          </>
        )}
      </svg>
    </div>
  );
};
