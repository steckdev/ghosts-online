import React from 'react';

export const DungeonDecorations: React.FC = () => {
  return (
    <div className="dungeon-decorations-bar">
      {/* Left Jack-o'-Lantern */}
      <div className="pumpkin-wrapper left-pumpkin">
        <svg viewBox="0 0 100 85" className="pumpkin-svg">
          <defs>
            <radialGradient id="pumpkinBody" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9800" />
              <stop offset="70%" stopColor="#f57c00" />
              <stop offset="100%" stopColor="#e65100" />
            </radialGradient>
            <linearGradient id="stemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4caf50" />
              <stop offset="100%" stopColor="#2e7d32" />
            </linearGradient>
            <filter id="flameGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Stem */}
          <path d="M 48 18 Q 45 4 58 6 Q 52 14 52 18 Z" fill="url(#stemGrad)" />

          {/* Pumpkin Lobes */}
          <ellipse cx="28" cy="50" rx="22" ry="30" fill="url(#pumpkinBody)" />
          <ellipse cx="72" cy="50" rx="22" ry="30" fill="url(#pumpkinBody)" />
          <ellipse cx="38" cy="50" rx="22" ry="32" fill="url(#pumpkinBody)" />
          <ellipse cx="62" cy="50" rx="22" ry="32" fill="url(#pumpkinBody)" />
          <ellipse cx="50" cy="50" rx="24" ry="33" fill="url(#pumpkinBody)" />

          {/* Carved Glowing Eyes (Flickering) */}
          <polygon points="32,40 44,46 36,49" fill="#ffeb3b" filter="url(#flameGlow)" className="flicker-flame" />
          <polygon points="68,40 56,46 64,49" fill="#ffeb3b" filter="url(#flameGlow)" className="flicker-flame" />

          {/* Carved Glowing Nose */}
          <polygon points="50,48 46,55 54,55" fill="#ffeb3b" filter="url(#flameGlow)" className="flicker-flame" />

          {/* Tooth grinning mouth */}
          <path
            d="M 28 62 Q 50 78 72 62 Q 62 70 50 70 Q 38 70 28 62 Z"
            fill="#ffeb3b"
            filter="url(#flameGlow)"
            className="flicker-flame"
          />
        </svg>
      </div>

      {/* Lit Candle Cluster in Center */}
      <div className="candle-cluster">
        {/* Candle 1 */}
        <div className="wax-candle candle-1">
          <div className="candle-flame pulse-flame" />
          <div className="candle-body" />
        </div>
        {/* Candle 2 */}
        <div className="wax-candle candle-2">
          <div className="candle-flame pulse-flame-alt" />
          <div className="candle-body" />
        </div>
        {/* Candle 3 */}
        <div className="wax-candle candle-3">
          <div className="candle-flame pulse-flame" />
          <div className="candle-body" />
        </div>
      </div>

      {/* Right Jack-o'-Lantern */}
      <div className="pumpkin-wrapper right-pumpkin">
        <svg viewBox="0 0 100 85" className="pumpkin-svg">
          <defs>
            <radialGradient id="pumpkinBody2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffa726" />
              <stop offset="70%" stopColor="#fb8c00" />
              <stop offset="100%" stopColor="#ef6c00" />
            </radialGradient>
          </defs>

          {/* Stem */}
          <path d="M 52 18 Q 58 5 46 6 Q 48 14 48 18 Z" fill="url(#stemGrad)" />

          {/* Pumpkin Lobes */}
          <ellipse cx="28" cy="50" rx="22" ry="30" fill="url(#pumpkinBody2)" />
          <ellipse cx="72" cy="50" rx="22" ry="30" fill="url(#pumpkinBody2)" />
          <ellipse cx="38" cy="50" rx="22" ry="32" fill="url(#pumpkinBody2)" />
          <ellipse cx="62" cy="50" rx="22" ry="32" fill="url(#pumpkinBody2)" />
          <ellipse cx="50" cy="50" rx="24" ry="33" fill="url(#pumpkinBody2)" />

          {/* Carved Glowing Eyes */}
          <polygon points="34,42 45,45 38,51" fill="#fff59d" filter="url(#flameGlow)" className="flicker-flame" />
          <polygon points="66,42 55,45 62,51" fill="#fff59d" filter="url(#flameGlow)" className="flicker-flame" />

          {/* Tooth smile */}
          <path
            d="M 30 64 Q 50 80 70 64 L 66 69 Q 50 76 34 69 Z"
            fill="#fff59d"
            filter="url(#flameGlow)"
            className="flicker-flame"
          />
        </svg>
      </div>
    </div>
  );
};
