import React, { useEffect } from 'react';
import type { Achievement } from '../types/stats';
import {
  Trophy,
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
  X,
} from 'lucide-react';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement, onClose }) => {
  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5500);
    return () => clearTimeout(timer);
  }, [achievement, onClose]);

  if (!achievement) return null;

  const renderIcon = (name: string) => {
    const props = { size: 28, className: 'toast-icon-svg' };
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

  return (
    <div className="achievement-toast-container" onClick={onClose} role="alert">
      <div className="achievement-toast-card">
        <div className="toast-glow-backdrop" />
        <div className="toast-icon-box">{renderIcon(achievement.iconName)}</div>
        <div className="toast-content">
          <div className="toast-badge-label">🏆 ACHIEVEMENT UNLOCKED!</div>
          <div className="toast-title">{achievement.title}</div>
          <div className="toast-description">{achievement.description}</div>
        </div>
        <button
          className="toast-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
        <div className="toast-progress-bar" />
      </div>
    </div>
  );
};
