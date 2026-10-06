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
  className = '',
  size = 54,
}) => {
  const uniqueId = useId().replace(/:/g, '');

  // If opponent and not captured, color is strictly unknown (neutral white)
  const effectiveColor = isOpponent ? 'unknown' : color;

  const gradId = `body-white-grad-${uniqueId}`;

  // All ghosts share the same clean, solid, luminous white porcelain body
  const strokeColor =
    effectiveColor === 'blue'
      ? '#00e5ff'
      : effectiveColor === 'red'
      ? '#ff1744'
      : '#cbd5e1';

  const strokeWidth = effectiveColor === 'unknown' ? '2.2' : '3.6';

  const dropGlow =
    isSelected
      ? 'drop-shadow(0 0 12px #ffeb3b) drop-shadow(0 0 6px #ffffff)'
      : effectiveColor === 'blue'
      ? 'drop-shadow(0 0 8px rgba(0, 229, 255, 0.75)) drop-shadow(0 3px 6px rgba(0,0,0,0.5))'
      : effectiveColor === 'red'
      ? 'drop-shadow(0 0 8px rgba(255, 23, 68, 0.75)) drop-shadow(0 3px 6px rgba(0,0,0,0.5))'
      : 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.35)) drop-shadow(0 3px 6px rgba(0,0,0,0.6))';

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
      {/* Subtle outer aura indicator for owner */}
      {effectiveColor === 'blue' && <div className="ghost-aura ghost-aura-blue" />}
      {effectiveColor === 'red' && <div className="ghost-aura ghost-aura-red" />}

      <svg
        viewBox="0 0 100 115"
        width={size}
        height={Math.round(size * 1.15)}
        className={`ghost-svg ghost-type-${effectiveColor}`}
        style={{
          filter: dropGlow,
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* ================= SOLID BACKDROP (Guarantees ghost body is never hollow) ================= */}
        <path
          d="M 50 12 C 28 12 18 26 18 54 C 18 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 82 75 82 54 C 82 26 72 12 50 12 Z"
          fill="#f8fafc"
        />

        {/* ================= SILKY WHITE SHEET WITH CLEAN OUTLINE ================= */}
        <path
          d="M 50 12 C 28 12 18 26 18 54 C 18 75 14 88 15 98 C 17 101 22 101 26 96 C 31 90 38 92 42 98 C 46 102 54 102 58 98 C 62 92 69 90 74 96 C 78 101 83 101 85 98 C 86 88 82 75 82 54 C 82 26 72 12 50 12 Z"
          fill={`url(#${gradId})`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />

        {/* Shading drape folds */}
        <path
          d="M 28 50 C 32 68 34 85 32 94"
          fill="none"
          stroke={effectiveColor === 'blue' ? 'rgba(0, 229, 255, 0.4)' : effectiveColor === 'red' ? 'rgba(255, 23, 68, 0.4)' : 'rgba(148, 163, 184, 0.35)'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M 72 50 C 68 68 66 85 68 94"
          fill="none"
          stroke={effectiveColor === 'blue' ? 'rgba(0, 229, 255, 0.4)' : effectiveColor === 'red' ? 'rgba(255, 23, 68, 0.4)' : 'rgba(148, 163, 184, 0.35)'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Top highlight sheen */}
        <path
          d="M 32 18 C 44 14 56 14 68 18 C 72 20 75 24 75 30 C 60 23 40 23 25 30 C 25 24 28 20 32 18 Z"
          fill="#ffffff"
          opacity="0.6"
        />

        {/* ================= SECRET COLORED SPIRIT CORE (Owner Only) ================= */}
        {effectiveColor === 'blue' && (
          <g className="spirit-core-blue">

          </g>
        )}

        {effectiveColor === 'red' && (
          <g className="spirit-core-red">

          </g>
        )}

        {/* ================= FACES (Clean & Expressive, NO HORNS) ================= */}
        {/* 1. NEUTRAL / OPPONENT GHOST FACE */}
        {effectiveColor === 'unknown' && (
          <g className="neutral-face">
            <ellipse cx="37" cy="44" rx="5" ry="8" fill="#0f172a" />
            <circle cx="35.5" cy="41.5" r="1.6" fill="#ffffff" />
            <ellipse cx="63" cy="44" rx="5" ry="8" fill="#0f172a" />
            <circle cx="61.5" cy="41.5" r="1.6" fill="#ffffff" />
          </g>
        )}

        {/* 2. GOOD (BLUE) GHOST FACE */}
        {effectiveColor === 'blue' && (
          <g className="good-face">
            <ellipse cx="37" cy="42" rx="5.5" ry="7.5" fill="#003666" />
            <circle cx="35.5" cy="39.5" r="2.2" fill="#ffffff" />
            <circle cx="39" cy="45" r="1" fill="#00e5ff" />

            <ellipse cx="63" cy="42" rx="5.5" ry="7.5" fill="#003666" />
            <circle cx="61.5" cy="39.5" r="2.2" fill="#ffffff" />
            <circle cx="65" cy="45" r="1" fill="#00e5ff" />

            <path
              d="M 44 51 Q 50 56 56 51"
              fill="none"
              stroke="#003666"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 3. BAD (RED) GHOST FACE (Clean devious expression, NO horns) */}
        {effectiveColor === 'red' && (
          <g className="bad-face">
            <ellipse cx="37" cy="42" rx="5.5" ry="7.5" fill="#3f000b" />
            <circle cx="35.5" cy="39.5" r="2" fill="#ffffff" />
            <circle cx="39" cy="45" r="1" fill="#ff1744" />

            <ellipse cx="63" cy="42" rx="5.5" ry="7.5" fill="#3f000b" />
            <circle cx="61.5" cy="39.5" r="2" fill="#ffffff" />
            <circle cx="65" cy="45" r="1" fill="#ff1744" />

            {/* Subtle sly smirk */}
            <path
              d="M 44 53 Q 50 55 56 53"
              fill="none"
              stroke="#3f000b"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
};
