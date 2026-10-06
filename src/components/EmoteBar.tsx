import React from 'react';
import { soundManager } from '../audio/soundEffects';

interface EmoteBarProps {
  onSendEmote: (emoji: string) => void;
  activeEmotes: { id: string; emoji: string; sender: 'me' | 'opponent' }[];
}

const EMOTES = ['👻', '🎃', '😈', '💀', '😱', '🕯️'];

export const EmoteBar: React.FC<EmoteBarProps> = ({
  onSendEmote,
  activeEmotes,
}) => {
  const handleClick = (emoji: string) => {
    soundManager.playEmote();
    onSendEmote(emoji);
  };

  return (
    <div className="emote-container">
      {/* Floating Active Emotes over board */}
      <div className="active-emotes-overlay">
        {activeEmotes.map((e) => (
          <div
            key={e.id}
            className={`floating-emote-bubble ${e.sender === 'me' ? 'from-me' : 'from-opponent'}`}
          >
            <span className="emote-character">{e.emoji}</span>
          </div>
        ))}
      </div>

      {/* Emote Selector Buttons */}
      <div className="emote-bar">
        <span className="emote-label">Spooky Taunts:</span>
        <div className="emote-buttons">
          {EMOTES.map((emoji) => (
            <button
              key={emoji}
              className="emote-btn"
              onClick={() => handleClick(emoji)}
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
