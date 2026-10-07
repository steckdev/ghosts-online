import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerRole, WinReason, Ghost } from '../types/game';
import { Trophy, Skull, DoorOpen, RefreshCw, Home, Download } from 'lucide-react';
import { soundManager } from '../audio/soundEffects';

interface GameOverModalProps {
  isOpen: boolean;
  winner: PlayerRole;
  localPlayer: PlayerRole;
  winReason: WinReason;
  allGhosts: Ghost[];
  onRematch: () => void;
  onHome: () => void;
  onExportMoves?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  localPlayer,
  winReason,
  onRematch,
  onHome,
  onExportMoves,
}) => {
  const isWinner = winner === localPlayer;

  const [randomIdx] = React.useState(() => Math.floor(Math.random() * 4));

  useEffect(() => {
    if (isOpen) {
      if (isWinner) {
        soundManager.playVictory();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00e5ff', '#39ff14', '#ffeb3b', '#ff1744'],
        });
      } else {
        soundManager.playDefeat();
      }
    }
  }, [isOpen, isWinner]);

  if (!isOpen) return null;

  const getReasonDetails = () => {
    switch (winReason) {
      case 'captured_all_blue': {
        const winnerOptions = [
          {
            title: 'Heroic Exorcism!',
            description: 'You successfully hunted down all 4 of your opponent’s Good (Blue) Ghosts!',
          },
          {
            title: 'Ghost Buster Supreme!',
            description: 'Spectral purification! Not a single enemy Good Ghost survived your hunt!',
          },
          {
            title: 'Clean Sweep!',
            description: 'Every last Good Ghost captured and returned to the netherworld!',
          },
          {
            title: 'Surgical Strike!',
            description: 'You saw right through their bluffs and eradicated all 4 Blue phantoms!',
          },
        ];
        const loserOptions = [
          {
            title: 'All Spirits Lost!',
            description: 'Your opponent captured all 4 of your Good (Blue) Ghosts!',
          },
          {
            title: 'Exorcised!',
            description: 'The enemy wiped out your entire roster of Good Ghosts!',
          },
          {
            title: 'Crypt Cleansed!',
            description: 'None of your Blue phantoms made it through the dungeon alive!',
          },
          {
            title: 'Vanquished Spirits!',
            description: 'Your opponent systematically hunted down all your Good Ghosts!',
          },
        ];
        const selected = isWinner ? winnerOptions[randomIdx % winnerOptions.length] : loserOptions[randomIdx % loserOptions.length];
        return {
          title: selected.title,
          description: selected.description,
          icon: <Trophy size={36} className="reason-icon trophy-icon" />,
        };
      }
      case 'captured_all_red': {
        const winnerOptions = [
          {
            title: 'Poison Pill Mastermind!',
            description: 'Your opponent greedily swallowed all 4 of your Bad (Red) Ghosts! Lethal mistake!',
          },
          {
            title: 'Devious Deception!',
            description: 'You baited them into consuming every single poisonous spirit! They lose!',
          },
          {
            title: 'The Trojan Phantoms!',
            description: 'They could not resist the bait—and devoured 4 evil traps to their demise!',
          },
          {
            title: 'Toxic Nemesis!',
            description: 'Your evil decoys completely overwhelmed their judgment!',
          },
        ];
        const loserOptions = [
          {
            title: 'Poisoned Greed!',
            description: 'You fell right into the trap and captured all 4 Bad (Red) Ghosts! Poisoned!',
          },
          {
            title: 'Fatal Feast!',
            description: 'You swallowed 4 toxic phantoms! Overcome by dark spirit poison!',
          },
          {
            title: 'Bait Taken!',
            description: 'They tricked you into devouring their evil vanguard! Instant defeat!',
          },
          {
            title: 'Corrupted Crypt!',
            description: '4 Red Ghosts consumed! The demonic backlash seals your doom!',
          },
        ];
        const selected = isWinner ? winnerOptions[randomIdx % winnerOptions.length] : loserOptions[randomIdx % loserOptions.length];
        return {
          title: selected.title,
          description: selected.description,
          icon: <Skull size={36} className="reason-icon skull-icon" />,
        };
      }
      case 'escaped': {
        const winnerOptions = [
          {
            title: 'The Great Escape!',
            description: 'Your Good (Blue) Ghost slipped past the dungeon guards into freedom!',
          },
          {
            title: 'Midnight Phantom Run!',
            description: 'Spectral dash! Your Blue Ghost vanished clean through the exit gate!',
          },
          {
            title: 'Spectral Breakthrough!',
            description: 'Outmaneuvered! Your runner broke the perimeter and escaped into the night!',
          },
          {
            title: 'Ghost in the Shadows!',
            description: 'Flawless evasion! Slipping right out of the crypt under their noses!',
          },
        ];
        const loserOptions = [
          {
            title: 'Breached Perimeter!',
            description: 'An enemy Good (Blue) Ghost slipped through your defenses and escaped!',
          },
          {
            title: 'Dungeon Breach!',
            description: 'They slipped past your sentries right out of the corner exit gate!',
          },
          {
            title: 'The One That Got Away!',
            description: 'Their Blue runner crossed the gate threshold before you could catch them!',
          },
          {
            title: 'Broken Citadel!',
            description: 'Your exit defenses crumbled—the phantom has escaped!',
          },
        ];
        const selected = isWinner ? winnerOptions[randomIdx % winnerOptions.length] : loserOptions[randomIdx % loserOptions.length];
        return {
          title: selected.title,
          description: selected.description,
          icon: <DoorOpen size={36} className="reason-icon door-icon" />,
        };
      }
      default:
        return {
          title: 'Game Finished',
          description: '',
          icon: <Trophy size={36} />,
        };
    }
  };

  const details = getReasonDetails();

  return (
    <div className="modal-backdrop">
      <div className={`gameover-card ${isWinner ? 'victory-card' : 'defeat-card'}`}>
        <div className="gameover-banner">
          <h2 className="gameover-title-glow">
            {isWinner ? '🎉 VICTORY! 🎉' : '💀 DEFEAT 💀'}
          </h2>
        </div>

        <div className="gameover-body">
          <div className="gameover-icon-box">{details.icon}</div>
          <h3 className="gameover-reason-title">{details.title}</h3>
          <p className="gameover-reason-desc">{details.description}</p>
        </div>

        <div className="gameover-actions">
          <button className="primary-action-btn rematch-btn" onClick={onRematch}>
            <RefreshCw size={18} />
            <span>Play Again / Rematch</span>
          </button>
          <button className="secondary-action-btn home-btn" onClick={onHome}>
            <Home size={18} />
            <span>Main Menu</span>
          </button>
          {onExportMoves && (
            <button
              className="telemetry-export-btn"
              onClick={onExportMoves}
              title="Export match telemetry JSON for AI analysis"
            >
              <Download size={15} />
              <span>Export Moves (JSON Telemetry)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
