import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ArrowLeft, Loader2, Radio } from 'lucide-react';
import { GhostPiece } from './GhostPiece';
import type { Ghost } from '../types/game';

interface WaitingRoomProps {
  roomCode: string;
  isHost: boolean;
  myGhosts: Ghost[];
  statusText?: string;
  onCancel: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomCode,
  isHost,
  myGhosts,
  statusText = 'Waiting for Player 2 to connect...',
  onCancel,
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleOpenSecondTab = () => {
    window.open(inviteUrl, '_blank');
  };

  return (
    <div className="waiting-room-container">
      <div className="waiting-room-card">
        {/* Top badge */}
        <div className="waiting-badge">
          <Radio size={14} className="radar-icon pulse-fast" />
          <span>{isHost ? 'ROOM CREATED & ACTIVE' : 'CONNECTING TO ROOM'}</span>
        </div>

        <h2 className="waiting-title">
          {isHost ? 'Waiting for Opponent' : 'Joining Dungeon...'}
        </h2>

        {/* Big Glowing Room Code */}
        <div className="big-room-code-box">
          <span className="code-label">ROOM CODE</span>
          <div className="code-value-glow">{roomCode || '....'}</div>
        </div>

        {/* Action Buttons */}
        <div className="waiting-actions">
          <button className="primary-action-btn copy-large-btn" onClick={handleCopyLink}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Invite Link'}</span>
          </button>

          {isHost && (
            <button className="secondary-action-btn test-tab-btn" onClick={handleOpenSecondTab}>
              <ExternalLink size={18} />
              <span>Test P2P: Open Player 2 in New Tab</span>
            </button>
          )}
        </div>

        {/* Connection status with spinner */}
        <div className="waiting-status-indicator">
          <Loader2 size={16} className="spinner-icon" />
          <span className="status-message">{statusText}</span>
        </div>

        {/* Preview of your secret layout */}
        <div className="waiting-layout-preview">
          <span className="preview-label">Your Secret Starting Setup:</span>
          <div className="mini-preview-row">
            {myGhosts.slice(0, 4).map((g) => (
              <GhostPiece key={g.id} color={g.color} size={36} />
            ))}
          </div>
          <div className="mini-preview-row">
            {myGhosts.slice(4, 8).map((g) => (
              <GhostPiece key={g.id} color={g.color} size={36} />
            ))}
          </div>
        </div>

        {/* Cancel Button */}
        <button className="cancel-waiting-btn" onClick={onCancel}>
          <ArrowLeft size={16} />
          <span>Cancel & Back to Menu</span>
        </button>
      </div>
    </div>
  );
};
