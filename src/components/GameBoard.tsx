import React from 'react';
import type { Ghost, PlayerRole } from '../types/game';
import { GhostPiece } from './GhostPiece';
import { ExitGate } from './ExitGate';

interface GameBoardProps {
  ghosts: Ghost[];
  selectedGhostId: string | null;
  validMoves: { x: number; y: number; isExit?: boolean }[];
  localPlayer: PlayerRole;
  isMyTurn: boolean;
  isSetupPhase: boolean;
  lastMove?: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    ghostId: string;
    isCapture?: boolean;
    capturedColor?: 'blue' | 'red';
  };
  onSelectGhost: (ghost: Ghost) => void;
  onTileClick: (x: number, y: number) => void;
  onEscapeClick: () => void;
}

const COLUMNS = ['a', 'b', 'c', 'd', 'e', 'f'];

export const GameBoard: React.FC<GameBoardProps> = ({
  ghosts,
  selectedGhostId,
  validMoves,
  localPlayer,
  isMyTurn,
  isSetupPhase,
  lastMove,
  onSelectGhost,
  onTileClick,
  onEscapeClick,
}) => {
  const selectedGhost = ghosts.find((g) => g.id === selectedGhostId);
  const canEscapeNow = validMoves.some((m) => m.isExit);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, ghost: Ghost) => {
    if (!isMyTurn && !isSetupPhase) {
      e.preventDefault();
      return;
    }
    if (ghost.owner !== localPlayer) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', ghost.id);
    onSelectGhost(ghost);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetX: number, targetY: number) => {
    e.preventDefault();
    onTileClick(targetX, targetY);
  };

  return (
    <div className="game-board-outer">
      {/* Exit Gateways at Top-Left and Top-Right */}
      <div className="exit-gates-row">
        <ExitGate
          side="left"
          canEscape={
            canEscapeNow &&
            selectedGhost?.x === 0 &&
            selectedGhost?.y === 5
          }
          onEscapeClick={onEscapeClick}
        />
        <div className="exit-gates-spacer">
          <div className="corridor-runes">⚡ ESCAPE CORRIDOR ⚡</div>
        </div>
        <ExitGate
          side="right"
          canEscape={
            canEscapeNow &&
            selectedGhost?.x === 5 &&
            selectedGhost?.y === 5
          }
          onEscapeClick={onEscapeClick}
        />
      </div>

      {/* Main 6x6 Board Container */}
      <div className="board-frame">
        {/* Corner Cobwebs */}
        <div className="corner-web top-left" />
        <div className="corner-web top-right" />
        <div className="corner-web bottom-left" />
        <div className="corner-web bottom-right" />

        {/* Board Tiles Grid (6 rows, rendered from top y=5 down to y=0) */}
        <div className="stone-grid">
          {[5, 4, 3, 2, 1, 0].map((y) => (
            <div key={`row-${y}`} className="grid-row">
              {/* Row number label on left */}
              <div className="coord-label row-label">{y + 1}</div>

              {[0, 1, 2, 3, 4, 5].map((x) => {
                const isExitTile = (x === 0 && y === 5) || (x === 5 && y === 5);
                const isValidMove = validMoves.some((m) => m.x === x && m.y === y && !m.isExit);
                const isLastMovedFrom = lastMove?.from.x === x && lastMove?.from.y === y;
                const isLastMovedTo = lastMove?.to.x === x && lastMove?.to.y === y;

                const ghostOnTile = ghosts.find(
                  (g) => !g.isCaptured && !g.hasEscaped && g.x === x && g.y === y
                );

                return (
                  <div
                    key={`tile-${x}-${y}`}
                    className={`board-tile ${isExitTile ? 'exit-tile' : 'stone-tile'} ${
                      isValidMove ? 'valid-target' : ''
                    } ${isLastMovedFrom ? 'last-from' : ''} ${isLastMovedTo ? 'last-to' : ''}`}
                    onClick={() => onTileClick(x, y)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, x, y)}
                  >
                    {/* Exit Tile Runes */}
                    {isExitTile && (
                      <div className="exit-tile-runes">
                        <span className="rune-arrow">↑</span>
                        <span className="rune-text">GATE</span>
                      </div>
                    )}

                    {/* Valid Move Target Highlight Reticle */}
                    {isValidMove && (
                      <div className="valid-move-reticle">
                        <span className="reticle-corner top-left" />
                        <span className="reticle-corner top-right" />
                        <span className="reticle-corner bottom-left" />
                        <span className="reticle-corner bottom-right" />
                        <div className="reticle-glow-core" />
                      </div>
                    )}

                    {/* Ghost Piece on Tile */}
                    {ghostOnTile && (
                      <div
                        className={`ghost-wrapper ${
                          ghostOnTile.owner === localPlayer ? 'own-ghost' : 'opponent-ghost'
                        }`}
                        draggable={ghostOnTile.owner === localPlayer && (isMyTurn || isSetupPhase)}
                        onDragStart={(e) => handleDragStart(e, ghostOnTile)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (ghostOnTile.owner === localPlayer) {
                            onSelectGhost(ghostOnTile);
                          } else if (isValidMove) {
                            // Capturing this opponent ghost!
                            onTileClick(x, y);
                          }
                        }}
                      >
                        <GhostPiece
                          color={ghostOnTile.color}
                          isOpponent={ghostOnTile.owner !== localPlayer}
                          isSelected={ghostOnTile.id === selectedGhostId}
                          isLastMoved={lastMove?.ghostId === ghostOnTile.id}
                          size={54}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Row number label on right */}
              <div className="coord-label row-label">{y + 1}</div>
            </div>
          ))}

          {/* Column letters at bottom */}
          <div className="grid-col-labels">
            <div className="coord-spacer" />
            {COLUMNS.map((col) => (
              <div key={`col-${col}`} className="coord-label col-label">
                {col}
              </div>
            ))}
            <div className="coord-spacer" />
          </div>
        </div>
      </div>
    </div>
  );
};
