import React from 'react';
import type { Ghost, PlayerRole } from '../types/game';
import { GhostPiece } from './GhostPiece';
import { ExitGate } from './ExitGate';

interface GameBoardProps {
  ghosts: Ghost[];
  selectedGhostId: string | null;
  validMoves: { x: number; y: number; isExit?: boolean }[];
  activePlayer: PlayerRole; // The player currently taking their turn
  isMyTurn: boolean;
  isSetupPhase: boolean;
  flipPerspective?: boolean; // Invert display for Player 2 so they sit at bottom
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

const DEFAULT_COLS = ['a', 'b', 'c', 'd', 'e', 'f'];
const FLIPPED_COLS = ['f', 'e', 'd', 'c', 'b', 'a'];

export const GameBoard: React.FC<GameBoardProps> = ({
  ghosts,
  selectedGhostId,
  validMoves,
  activePlayer,
  isMyTurn,
  isSetupPhase,
  flipPerspective = false,
  lastMove,
  onSelectGhost,
  onTileClick,
  onEscapeClick,
}) => {
  const selectedGhost = ghosts.find((g) => g.id === selectedGhostId);
  const canEscapeNow = validMoves.some((m) => m.isExit);

  // Helper to translate display row/col to global grid coordinates
  const toGlobalX = (dispX: number) => (flipPerspective ? 5 - dispX : dispX);
  const toGlobalY = (dispY: number) => (flipPerspective ? 5 - dispY : dispY);

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (Boolean(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0));

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, ghost: Ghost) => {
    if (isTouchDevice) {
      e.preventDefault();
      return;
    }
    if (!isMyTurn && !isSetupPhase) {
      e.preventDefault();
      return;
    }
    if (ghost.owner !== activePlayer) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', ghost.id);
    onSelectGhost(ghost);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, globalX: number, globalY: number) => {
    e.preventDefault();
    onTileClick(globalX, globalY);
  };

  const cols = flipPerspective ? FLIPPED_COLS : DEFAULT_COLS;

  return (
    <div className="game-board-outer">
      {/* Exit Gateways at Top-Left and Top-Right */}
      <div className="exit-gates-row">
        <ExitGate
          side="left"
          canEscape={
            canEscapeNow &&
            selectedGhost !== undefined &&
            ((!flipPerspective && selectedGhost.x === 0 && selectedGhost.y === 5) ||
              (flipPerspective && selectedGhost.x === 5 && selectedGhost.y === 0))
          }
          onEscapeClick={onEscapeClick}
        />
        <div className="exit-gates-spacer">
          <div className="corridor-runes">⚡ CORNER ESCAPE GATES ⚡</div>
        </div>
        <ExitGate
          side="right"
          canEscape={
            canEscapeNow &&
            selectedGhost !== undefined &&
            ((!flipPerspective && selectedGhost.x === 5 && selectedGhost.y === 5) ||
              (flipPerspective && selectedGhost.x === 0 && selectedGhost.y === 0))
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

        {/* Board Tiles Grid (rendered from display y=5 down to y=0) */}
        <div className="stone-grid">
          {[5, 4, 3, 2, 1, 0].map((dispY) => {
            const globalY = toGlobalY(dispY);
            const rowLabel = flipPerspective ? 6 - dispY : dispY + 1;

            return (
              <div key={`row-${dispY}`} className="grid-row">
                {/* Row number label on left */}
                <div className="coord-label row-label">{rowLabel}</div>

                {[0, 1, 2, 3, 4, 5].map((dispX) => {
                  const globalX = toGlobalX(dispX);

                  // Exit tile is always the top corners of the displayed board!
                  const isExitTile = (dispX === 0 && dispY === 5) || (dispX === 5 && dispY === 5);

                  const isValidMove = validMoves.some(
                    (m) => m.x === globalX && m.y === globalY && !m.isExit
                  );
                  const isLastMovedFrom = lastMove?.from.x === globalX && lastMove?.from.y === globalY;
                  const isLastMovedTo = lastMove?.to.x === globalX && lastMove?.to.y === globalY;

                  const ghostOnTile = ghosts.find(
                    (g) => !g.isCaptured && !g.hasEscaped && g.x === globalX && g.y === globalY
                  );

                  return (
                    <div
                      key={`tile-${dispX}-${dispY}`}
                      className={`board-tile ${isExitTile ? 'exit-tile' : 'stone-tile'} ${
                        isValidMove ? 'valid-target' : ''
                      } ${isLastMovedFrom ? 'last-from' : ''} ${isLastMovedTo ? 'last-to' : ''}`}
                      onClick={() => onTileClick(globalX, globalY)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, globalX, globalY)}
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
                            ghostOnTile.owner === activePlayer ? 'own-ghost' : 'opponent-ghost'
                          } ${ghostOnTile.owner === activePlayer && isMyTurn ? 'is-my-turn-active' : ''}`}
                          draggable={!isTouchDevice && ghostOnTile.owner === activePlayer && (isMyTurn || isSetupPhase)}
                          onDragStart={(e) => handleDragStart(e, ghostOnTile)}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (ghostOnTile.owner === activePlayer) {
                              onSelectGhost(ghostOnTile);
                            } else if (isValidMove) {
                              onTileClick(globalX, globalY);
                            }
                          }}
                        >
                          <GhostPiece
                            color={ghostOnTile.color}
                            isOpponent={ghostOnTile.owner !== activePlayer}
                            isSelected={ghostOnTile.id === selectedGhostId}
                            isLastMoved={lastMove?.ghostId === ghostOnTile.id}
                            size={52}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Row number label on right */}
                <div className="coord-label row-label">{rowLabel}</div>
              </div>
            );
          })}

          {/* Column letters at bottom */}
          <div className="grid-col-labels">
            <div className="coord-spacer" />
            {cols.map((col) => (
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
