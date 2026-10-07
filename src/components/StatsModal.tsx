import React, { useState } from 'react';
import type { PlayerStats, Achievement, AchievementCategory } from '../types/stats';
import {
  X,
  Trophy,
  BarChart2,
  Award,
  DoorOpen,
  Skull,
  Zap,
  Crown,
  ShieldCheck,
  Footprints,
  Compass,
  Map,
  ShieldAlert,
  Medal,
  Star,
  Sparkles,
  Flame,
  Hourglass,
  Swords,
  Ghost,
  FlaskConical,
  Wifi,
  Lock,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  achievements: Achievement[];
  onResetStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  achievements,
  onResetStats,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'trophies'>('stats');
  const [trophyFilter, setTrophyFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isOpen) return null;

  const winRate =
    stats.totalGamesPlayed > 0
      ? Math.round((stats.totalWins / stats.totalGamesPlayed) * 100)
      : 0;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  // Filter achievements
  const filteredAchievements = achievements.filter((a) => {
    if (trophyFilter === 'unlocked' && !a.unlocked) return false;
    if (trophyFilter === 'locked' && a.unlocked) return false;
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    return true;
  });

  const renderIcon = (name: string, isUnlocked: boolean) => {
    const props = { size: 26, className: `badge-icon-svg ${isUnlocked ? 'unlocked' : 'locked'}` };
    switch (name) {
      case 'Award': return <Award {...props} />;
      case 'DoorOpen': return <DoorOpen {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Skull': return <Skull {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'ShieldCheck': return <ShieldCheck {...props} />;
      case 'Footprints': return <Footprints {...props} />;
      case 'Compass': return <Compass {...props} />;
      case 'Map': return <Map {...props} />;
      case 'ShieldAlert': return <ShieldAlert {...props} />;
      case 'Medal': return <Medal {...props} />;
      case 'Star': return <Star {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Flame': return <Flame {...props} />;
      case 'Hourglass': return <Hourglass {...props} />;
      case 'Swords': return <Swords {...props} />;
      case 'Ghost': return <Ghost {...props} />;
      case 'FlaskConical': return <FlaskConical {...props} />;
      case 'Wifi': return <Wifi {...props} />;
      default: return <Trophy {...props} />;
    }
  };

  const handleResetConfirm = () => {
    onResetStats();
    setIsConfirmingReset(false);
  };

  return (
    <div className="stats-modal-overlay" onClick={onClose}>
      <div className="stats-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="stats-modal-header">
          <div className="stats-header-titles">
            <h2 className="stats-main-title">
              <Trophy size={26} className="title-gold-icon" /> CAREER RECORDS & TROPHIES
            </h2>
            <p className="stats-sub-title">Dungeon statistics, spectral win rates, and arcade badges</p>
          </div>
          <button className="stats-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="stats-tab-bar">
          <button
            className={`stats-tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart2 size={18} /> CAREER STATS
          </button>
          <button
            className={`stats-tab-btn ${activeTab === 'trophies' ? 'active' : ''}`}
            onClick={() => setActiveTab('trophies')}
          >
            <Trophy size={18} /> TROPHY CABINET ({unlockedCount}/{totalCount})
          </button>
        </div>

        {/* Tab 1: Career Statistics */}
        {activeTab === 'stats' && (
          <div className="stats-tab-content">
            {/* Hero Summary Grid */}
            <div className="stats-hero-grid">
              <div className="stats-metric-card win-rate-card">
                <div className="metric-ring-label">WIN RATE</div>
                <div className="metric-large-value">{winRate}%</div>
                <div className="metric-subtitle">
                  {stats.totalWins} Wins / {stats.totalLosses} Defeats
                </div>
              </div>

              <div className="stats-metric-card">
                <div className="metric-ring-label">TOTAL MATCHES</div>
                <div className="metric-large-value">{stats.totalGamesPlayed}</div>
                <div className="metric-subtitle">Across all game modes</div>
              </div>

              <div className="stats-metric-card streak-card">
                <div className="metric-ring-label">WIN STREAK</div>
                <div className="metric-large-value">
                  <Flame size={24} className="streak-flame-icon" /> {stats.currentWinStreak}
                </div>
                <div className="metric-subtitle">Best: {stats.bestWinStreak} in a row</div>
              </div>

              <div className="stats-metric-card record-card">
                <div className="metric-ring-label">FEWEST MOVES TO WIN</div>
                <div className="metric-large-value">
                  {stats.fewestMovesToWin !== null ? `${stats.fewestMovesToWin} Moves` : '—'}
                </div>
                <div className="metric-subtitle">Fastest tactical victory</div>
              </div>
            </div>

            {/* Victory Reasons Distribution */}
            <div className="stats-section-box">
              <h3 className="section-title">VICTORY METHOD BREAKDOWN</h3>
              <div className="reasons-stat-grid">
                <div className="reason-stat-card escape-card">
                  <div className="reason-card-header">
                    <DoorOpen size={24} className="reason-icon door" />
                    <span className="reason-name">EXIT ESCAPE</span>
                  </div>
                  <div className="reason-count">{stats.byWinReason.escaped} Wins</div>
                  <div className="reason-percent">
                    {stats.totalWins > 0
                      ? `${Math.round((stats.byWinReason.escaped / stats.totalWins) * 100)}% of victories`
                      : '0%'}
                  </div>
                </div>

                <div className="reason-stat-card blue-card">
                  <div className="reason-card-header">
                    <Trophy size={24} className="reason-icon blue" />
                    <span className="reason-name">HEROIC EXORCISM</span>
                  </div>
                  <div className="reason-count">{stats.byWinReason.captured_all_blue} Wins</div>
                  <div className="reason-percent">
                    {stats.totalWins > 0
                      ? `${Math.round((stats.byWinReason.captured_all_blue / stats.totalWins) * 100)}% of victories`
                      : '0%'}
                  </div>
                </div>

                <div className="reason-stat-card red-card">
                  <div className="reason-card-header">
                    <Skull size={24} className="reason-icon red" />
                    <span className="reason-name">POISON PILL TRAP</span>
                  </div>
                  <div className="reason-count">{stats.byWinReason.captured_all_red} Wins</div>
                  <div className="reason-percent">
                    {stats.totalWins > 0
                      ? `${Math.round((stats.byWinReason.captured_all_red / stats.totalWins) * 100)}% of victories`
                      : '0%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Mode Breakdown */}
            <div className="stats-section-box">
              <h3 className="section-title">GAME MODE PERFORMANCE</h3>
              <div className="modes-table-container">
                <table className="modes-stat-table">
                  <thead>
                    <tr>
                      <th>MODE</th>
                      <th>PLAYED</th>
                      <th>WINS</th>
                      <th>DEFEATS</th>
                      <th>WIN %</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mode-name-cell">🤖 Single Player (AI)</td>
                      <td>{stats.byMode.ai.played}</td>
                      <td className="win-cell">{stats.byMode.ai.wins}</td>
                      <td className="loss-cell">{stats.byMode.ai.losses}</td>
                      <td>
                        {stats.byMode.ai.played > 0
                          ? `${Math.round((stats.byMode.ai.wins / stats.byMode.ai.played) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="mode-name-cell">📜 50-Level Campaign</td>
                      <td>{stats.byMode.levels.played}</td>
                      <td className="win-cell">{stats.byMode.levels.wins}</td>
                      <td className="loss-cell">{stats.byMode.levels.losses}</td>
                      <td>
                        {stats.byMode.levels.played > 0
                          ? `${Math.round((stats.byMode.levels.wins / stats.byMode.levels.played) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="mode-name-cell">👥 Pass & Play (Local)</td>
                      <td>{stats.byMode['pass-and-play'].played}</td>
                      <td className="win-cell">{stats.byMode['pass-and-play'].wins}</td>
                      <td className="loss-cell">{stats.byMode['pass-and-play'].losses}</td>
                      <td>
                        {stats.byMode['pass-and-play'].played > 0
                          ? `${Math.round((stats.byMode['pass-and-play'].wins / stats.byMode['pass-and-play'].played) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="mode-name-cell">🌐 Online P2P Multiplayer</td>
                      <td>{stats.byMode.online.played}</td>
                      <td className="win-cell">{stats.byMode.online.wins}</td>
                      <td className="loss-cell">{stats.byMode.online.losses}</td>
                      <td>
                        {stats.byMode.online.played > 0
                          ? `${Math.round((stats.byMode.online.wins / stats.byMode.online.played) * 100)}%`
                          : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Combat Totals */}
            <div className="stats-section-box">
              <h3 className="section-title">LIFETIME COMBAT RATIOS</h3>
              <div className="combat-stats-row">
                <div className="combat-stat-pill blue-pill">
                  <span className="combat-label">Good Ghosts Captured:</span>
                  <span className="combat-value">{stats.totalGhostsCaptured.blue}</span>
                </div>
                <div className="combat-stat-pill red-pill">
                  <span className="combat-label">Bad Ghosts Consumed:</span>
                  <span className="combat-value">{stats.totalGhostsCaptured.red}</span>
                </div>
                <div className="combat-stat-pill friendly-blue-pill">
                  <span className="combat-label">Friendly Blues Lost:</span>
                  <span className="combat-value">{stats.totalGhostsLost.blue}</span>
                </div>
                <div className="combat-stat-pill friendly-red-pill">
                  <span className="combat-label">Friendly Reds Baited:</span>
                  <span className="combat-value">{stats.totalGhostsLost.red}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Trophy Cabinet */}
        {activeTab === 'trophies' && (
          <div className="stats-tab-content">
            {/* Overall Trophy Progress */}
            <div className="trophy-progress-banner">
              <div className="progress-banner-text">
                <span className="progress-banner-title">TROPHY COLLECTION PROGRESS</span>
                <span className="progress-banner-ratio">
                  {unlockedCount} / {totalCount} Badges ({progressPercent}%)
                </span>
              </div>
              <div className="trophy-overall-bar">
                <div className="trophy-overall-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {/* Trophy Filters */}
            <div className="trophy-filter-controls">
              <div className="filter-button-group">
                <button
                  className={`trophy-filter-btn ${trophyFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTrophyFilter('all')}
                >
                  All ({totalCount})
                </button>
                <button
                  className={`trophy-filter-btn ${trophyFilter === 'unlocked' ? 'active' : ''}`}
                  onClick={() => setTrophyFilter('unlocked')}
                >
                  Unlocked ({unlockedCount})
                </button>
                <button
                  className={`trophy-filter-btn ${trophyFilter === 'locked' ? 'active' : ''}`}
                  onClick={() => setTrophyFilter('locked')}
                >
                  Locked ({totalCount - unlockedCount})
                </button>
              </div>

              <div className="category-pill-group">
                {(['all', 'combat', 'escape', 'deception', 'campaign', 'mastery'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat.toUpperCase()}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Achievement Grid */}
            <div className="trophy-cards-grid">
              {filteredAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`trophy-badge-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="badge-card-icon-container">
                    {renderIcon(ach.iconName, ach.unlocked)}
                    {ach.unlocked ? (
                      <CheckCircle2 size={16} className="status-indicator-icon check" />
                    ) : (
                      <Lock size={16} className="status-indicator-icon lock" />
                    )}
                  </div>

                  <div className="badge-card-details">
                    <div className="badge-title-row">
                      <span className="badge-title">{ach.title}</span>
                      <span className={`badge-category-tag cat-${ach.category}`}>
                        {ach.category}
                      </span>
                    </div>

                    <p className="badge-description">{ach.description}</p>

                    {/* Progress Bar for Cumulative Goals */}
                    {ach.progress && !ach.unlocked && (
                      <div className="badge-progress-container">
                        <div className="badge-progress-bar">
                          <div
                            className="badge-progress-fill"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round((ach.progress.current / ach.progress.target) * 100)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="badge-progress-text">
                          {ach.progress.current} / {ach.progress.target}
                        </span>
                      </div>
                    )}

                    {ach.unlocked && ach.unlockedAt && (
                      <span className="badge-unlocked-timestamp">
                        Unlocked on {new Date(ach.unlockedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="stats-modal-footer">
          {isConfirmingReset ? (
            <div className="confirm-reset-box">
              <span className="confirm-warn-text">
                <AlertTriangle size={16} /> Reset all career stats & unlocked achievements?
              </span>
              <button className="confirm-yes-btn" onClick={handleResetConfirm}>
                Yes, Clear All
              </button>
              <button className="confirm-no-btn" onClick={() => setIsConfirmingReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="reset-stats-trigger-btn"
              onClick={() => setIsConfirmingReset(true)}
              title="Reset all career stats"
            >
              <RotateCcw size={14} /> Reset Career Data
            </button>
          )}

          <button className="stats-modal-done-btn" onClick={onClose}>
            Back to Game
          </button>
        </div>
      </div>
    </div>
  );
};
