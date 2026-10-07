import React, { useState } from 'react';
import type { GameMode, Ghost, AIDifficulty } from '../types/game';
import {
  Users,
  Bot,
  Smartphone,
  Shuffle,
  Play,
  ArrowRight,
  Sparkles,
  PlusCircle,
  LogIn,
  Trophy,
  Star,
  Zap,
  Shield,
  Eye,
} from 'lucide-react';
import { GhostPiece } from './GhostPiece';
import { soundManager } from '../audio/soundEffects';
import { shuffleGhostColors } from '../utils/ghostUtils';

interface LobbyScreenProps {
  onStartAI: (initialGhosts: Ghost[], difficulty: AIDifficulty) => void;
  onStartPassAndPlay: (initialGhosts: Ghost[]) => void;
  onCreateOnlineRoom: (initialGhosts: Ghost[]) => void;
  onJoinOnlineRoom: (code: string, initialGhosts: Ghost[]) => void;
  onOpenLevelSelect: () => void;
  totalStars?: number;
  completedLevelsCount?: number;
  defaultGhosts: Ghost[];
  prefilledRoomCode?: string;
  initialDifficulty?: AIDifficulty;
  onOpenStats?: () => void;
  unlockedAchievementsCount?: number;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartAI,
  onStartPassAndPlay,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onOpenLevelSelect,
  totalStars = 0,
  completedLevelsCount = 0,
  defaultGhosts,
  prefilledRoomCode = '',
  initialDifficulty = 'hard',
  onOpenStats,
  unlockedAchievementsCount = 0,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(prefilledRoomCode ? 'online' : 'levels');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(initialDifficulty);
  const [onlineAction, setOnlineAction] = useState<'create' | 'join'>(prefilledRoomCode ? 'join' : 'create');
  const [joinCode, setJoinCode] = useState(prefilledRoomCode);
  const [ghosts, setGhosts] = useState<Ghost[]>(defaultGhosts);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);

  // Quick shuffle player's 4 blue and 4 red ghost positions
  const handleShuffle = () => {
    soundManager.playSelect();
    const shuffled = shuffleGhostColors(ghosts);
    setGhosts(shuffled);
  };

  // Swap two ghosts in setup arrangement
  const handleGhostClick = (ghost: Ghost) => {
    soundManager.playSelect();
    if (!selectedSwapId) {
      setSelectedSwapId(ghost.id);
    } else if (selectedSwapId === ghost.id) {
      setSelectedSwapId(null);
    } else {
      const g1 = ghosts.find((g) => g.id === selectedSwapId);
      const g2 = ghost;
      if (g1 && g2) {
        const nextGhosts = ghosts.map((g) => {
          if (g.id === g1.id) return { ...g, x: g2.x, y: g2.y };
          if (g.id === g2.id) return { ...g, x: g1.x, y: g1.y };
          return g;
        });
        setGhosts(nextGhosts);
      }
      setSelectedSwapId(null);
    }
  };

  const handleStartGame = () => {
    soundManager.playMove();
    if (selectedMode === 'levels') {
      onOpenLevelSelect();
    } else if (selectedMode === 'ai') {
      onStartAI(ghosts, aiDifficulty);
    } else if (selectedMode === 'pass-and-play') {
      onStartPassAndPlay(ghosts);
    } else if (selectedMode === 'online') {
      if (onlineAction === 'join') {
        if (!joinCode.trim()) {
          alert('Please enter a 4-letter room code to join!');
          return;
        }
        onJoinOnlineRoom(joinCode.trim(), ghosts);
      } else {
        onCreateOnlineRoom(ghosts);
      }
    }
  };

  return (
    <div className="lobby-container">
      {/* Arcade Neon Spooky Title */}
      <div className="lobby-header">
        <div className="lobby-top-bar">
          <div className="arcade-badge">1982 ALEX RANDOLPH CLASSIC</div>
          {onOpenStats && (
            <button
              className="lobby-trophy-btn"
              onClick={onOpenStats}
              title="View Career Statistics & Trophy Cabinet"
            >
              <Trophy size={15} />
              <span>Records & Trophies</span>
              {unlockedAchievementsCount !== undefined && (
                <span className="trophy-pill-badge">{unlockedAchievementsCount}/21</span>
              )}
            </button>
          )}
        </div>
        <h1 className="lobby-title-glow">GHOSTS</h1>
        <p className="lobby-subtitle">
          The Classic Game of Bluffing & Asymmetric Deduction
        </p>
      </div>

      <div className="lobby-content-grid">
        {/* Step 1: Secret Setup Arrangement */}
        <div className="lobby-card setup-card">
          <div className="card-header-row">
            <h2 className="card-title">
              <Sparkles size={18} className="sparkle-icon" />
              1. Your Secret Starting Layout
            </h2>
            <button className="shuffle-btn" onClick={handleShuffle} title="Randomize Positions">
              <Shuffle size={15} />
              <span>Shuffle</span>
            </button>
          </div>
          <p className="setup-help-text">
            Tap any two ghosts to swap their positions. Only you will know who is Good (Blue) or Bad (Red)!
          </p>

          <div className="mini-setup-board">
            <div className="mini-board-grid">
              {/* Row 1 (y=1) */}
              <div className="mini-row">
                {[1, 2, 3, 4].map((colX) => {
                  const ghost = ghosts.find((g) => g.x === colX && g.y === 1);
                  return (
                    <div
                      key={`slot-${colX}-1`}
                      className={`mini-slot ${ghost?.id === selectedSwapId ? 'swap-selected' : ''}`}
                      onClick={() => ghost && handleGhostClick(ghost)}
                    >
                      {ghost && <GhostPiece color={ghost.color} size={44} />}
                    </div>
                  );
                })}
              </div>

              {/* Row 0 (y=0) */}
              <div className="mini-row">
                {[1, 2, 3, 4].map((colX) => {
                  const ghost = ghosts.find((g) => g.x === colX && g.y === 0);
                  return (
                    <div
                      key={`slot-${colX}-0`}
                      className={`mini-slot ${ghost?.id === selectedSwapId ? 'swap-selected' : ''}`}
                      onClick={() => ghost && handleGhostClick(ghost)}
                    >
                      {ghost && <GhostPiece color={ghost.color} size={44} />}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mini-legend">
              <span className="legend-tag blue-tag">🔵 4 Good (Win if 1 escapes or 4 captured)</span>
              <span className="legend-tag red-tag">🔴 4 Bad (Poison Pill trap)</span>
            </div>
          </div>
        </div>

        {/* Step 2: Game Mode Selection */}
        <div className="lobby-card modes-card">
          <h2 className="card-title">2. Select Game Mode</h2>

          <div className="mode-options-list">
            {/* 50 Dungeon Puzzle Levels */}
            <div
              className={`mode-card ${selectedMode === 'levels' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('levels')}
            >
              <div className="mode-icon-box campaign-box">
                <Trophy size={24} />
              </div>
              <div className="mode-details">
                <div className="mode-title-row">
                  <h3>50 Dungeon Levels</h3>
                  <span className="campaign-stars-badge">
                    <Star size={13} fill="#ffd700" color="#ffd700" />
                    <strong>{totalStars}</strong>/150
                  </span>
                </div>
                <p>Puzzles with par moves, star ratings, and browser saving ({completedLevelsCount}/50 solved).</p>
              </div>
              <div className="mode-radio" />
            </div>

            {/* Campaign Sub-actions */}
            {selectedMode === 'levels' && (
              <div className="levels-quick-action-panel">
                <button
                  type="button"
                  className="open-level-grid-btn"
                  onClick={onOpenLevelSelect}
                >
                  <Star size={15} fill="#ffd700" color="#ffd700" />
                  <span>Browse All 50 Levels Grid →</span>
                </button>
              </div>
            )}

            {/* Solo vs AI */}
            <div
              className={`mode-card ${selectedMode === 'ai' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('ai')}
            >
              <div className="mode-icon-box bot-box">
                <Bot size={24} />
              </div>
              <div className="mode-details">
                <h3>Single Player vs AI</h3>
                <p>Play against a computer ghost AI with customizable intellect.</p>
              </div>
              <div className="mode-radio" />
            </div>

            {/* AI Difficulty Selector */}
            {selectedMode === 'ai' && (
              <div className="difficulty-picker-panel">
                <div className="difficulty-label">Select AI Intellect:</div>
                <div className="difficulty-buttons-row">
                  <button
                    type="button"
                    className={`difficulty-pill ${aiDifficulty === 'easy' ? 'active easy' : ''}`}
                    onClick={() => {
                      soundManager.playSelect();
                      setAiDifficulty('easy');
                    }}
                  >
                    <Shield size={14} />
                    <span>Easy</span>
                  </button>

                  <button
                    type="button"
                    className={`difficulty-pill ${aiDifficulty === 'hard' ? 'active hard' : ''}`}
                    onClick={() => {
                      soundManager.playSelect();
                      setAiDifficulty('hard');
                    }}
                  >
                    <Zap size={14} />
                    <span>Hard</span>
                  </button>

                  <button
                    type="button"
                    className={`difficulty-pill ${aiDifficulty === 'super_max' ? 'active super-max' : ''}`}
                    onClick={() => {
                      soundManager.playSelect();
                      setAiDifficulty('super_max');
                    }}
                  >
                    <Eye size={14} />
                    <span>Super Max</span>
                  </button>
                </div>
                <div className="difficulty-description">
                  {aiDifficulty === 'easy' && 'Casual: Wanders casually, falls for bluffs, randomized tie-breaks.'}
                  {aiDifficulty === 'hard' && 'Tactical: Evaluates exit danger, uses Red bluffs, breaks ties dynamically.'}
                  {aiDifficulty === 'super_max' && 'Omniscient: Sees your secret colors! Hunts Blue ghosts, avoids Red poison.'}
                </div>
              </div>
            )}

            {/* PeerJS Online Multiplayer */}
            <div
              className={`mode-card ${selectedMode === 'online' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('online')}
            >
              <div className="mode-icon-box p2p-box">
                <Users size={24} />
              </div>
              <div className="mode-details">
                <h3>Online P2P Multiplayer</h3>
                <p>Direct WebRTC peer connection between two phones or browsers.</p>
              </div>
              <div className="mode-radio" />
            </div>

            {/* Online Options sub-panel */}
            {selectedMode === 'online' && (
              <div className="online-options-panel">
                <div className="online-tabs">
                  <button
                    type="button"
                    className={`online-tab-btn ${onlineAction === 'create' ? 'active' : ''}`}
                    onClick={() => setOnlineAction('create')}
                  >
                    <PlusCircle size={15} />
                    <span>Host a Room</span>
                  </button>
                  <button
                    type="button"
                    className={`online-tab-btn ${onlineAction === 'join' ? 'active' : ''}`}
                    onClick={() => setOnlineAction('join')}
                  >
                    <LogIn size={15} />
                    <span>Join with Code</span>
                  </button>
                </div>

                {onlineAction === 'create' ? (
                  <div className="create-room-info">
                    <p className="online-info-text">
                      Click below to generate a unique 4-letter Room Code. A link will be ready to copy and share with Player 2!
                    </p>
                  </div>
                ) : (
                  <div className="join-room-info">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="ENTER 4-LETTER CODE"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="room-input"
                    />
                    <p className="online-info-text">
                      Enter the 4-letter code provided by the Host player.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pass & Play */}
            <div
              className={`mode-card ${selectedMode === 'pass-and-play' ? 'selected' : ''}`}
              onClick={() => setSelectedMode('pass-and-play')}
            >
              <div className="mode-icon-box local-box">
                <Smartphone size={24} />
              </div>
              <div className="mode-details">
                <h3>Pass & Play (Same Device)</h3>
                <p>Two players share one phone/tablet with turn privacy shield.</p>
              </div>
              <div className="mode-radio" />
            </div>
          </div>

          {/* Big Start Button */}
          <button className="primary-action-btn start-game-btn" onClick={handleStartGame}>
            <Play size={20} />
            <span>
              {selectedMode === 'levels'
                ? 'Play Dungeon Levels →'
                : selectedMode === 'online'
                ? onlineAction === 'create'
                  ? 'Generate Room & Host →'
                  : 'Connect & Join Room →'
                : 'Enter the Dungeon!'}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
