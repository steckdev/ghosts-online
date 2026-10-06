import React from 'react';
import type { CapturedGhost } from '../types/game';
import { GhostPiece } from './GhostPiece';

interface GraveyardProps {
  title: string;
  capturedGhosts: CapturedGhost[];
  targetOwner: 'p1' | 'p2'; // which owner's pieces were captured
  isOpponent?: boolean;
}

export const Graveyard: React.FC<GraveyardProps> = ({
  title,
  capturedGhosts,
  targetOwner,
}) => {
  const blueCaptured = capturedGhosts.filter(
    (g) => g.owner === targetOwner && g.color === 'blue'
  );
  const redCaptured = capturedGhosts.filter(
    (g) => g.owner === targetOwner && g.color === 'red'
  );

  return (
    <div className="graveyard-container">
      <div className="graveyard-header">
        <span className="graveyard-title">{title}</span>
        <div className="graveyard-tallies">
          <span className="tally-pill tally-blue" title="Captured Good Ghosts (4 = Win)">
            🔵 {blueCaptured.length}/4
          </span>
          <span className="tally-pill tally-red" title="Captured Bad Ghosts (4 = Loss for capturer)">
            🔴 {redCaptured.length}/4
          </span>
        </div>
      </div>

      <div className="graveyard-fence">
        {/* Render blue captured slots */}
        <div className="graveyard-slots">
          {[0, 1, 2, 3].map((idx) => {
            const hasGhost = blueCaptured[idx];
            return (
              <div key={`blue-${idx}`} className={`grave-slot ${hasGhost ? 'filled' : 'empty'}`}>
                {hasGhost ? (
                  <GhostPiece color="blue" size={32} />
                ) : (
                  <div className="empty-ghost-silhouette blue" />
                )}
              </div>
            );
          })}
        </div>

        {/* Render red captured slots */}
        <div className="graveyard-slots">
          {[0, 1, 2, 3].map((idx) => {
            const hasGhost = redCaptured[idx];
            return (
              <div key={`red-${idx}`} className={`grave-slot ${hasGhost ? 'filled' : 'empty'}`}>
                {hasGhost ? (
                  <GhostPiece color="red" size={32} />
                ) : (
                  <div className="empty-ghost-silhouette red" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
