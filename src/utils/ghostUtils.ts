import type { Ghost, PlayerRole } from '../types/game';

// 8 Ghosts for starting player: 4 Blue (Good) and 4 Red (Bad)
export function createInitialGhosts(owner: PlayerRole): Ghost[] {
  const defaultLayout: { x: number; y: number; color: 'blue' | 'red' }[] = [
    { x: 1, y: 0, color: 'blue' },
    { x: 2, y: 0, color: 'red' },
    { x: 3, y: 0, color: 'red' },
    { x: 4, y: 0, color: 'blue' },
    { x: 1, y: 1, color: 'red' },
    { x: 2, y: 1, color: 'blue' },
    { x: 3, y: 1, color: 'blue' },
    { x: 4, y: 1, color: 'red' },
  ];

  return defaultLayout.map((slot, idx) => ({
    id: `${owner}-ghost-${idx}`,
    owner,
    color: slot.color,
    x: slot.x,
    y: slot.y,
  }));
}

// Create initial opponent ghosts with hidden color
export function createInitialOpponentGhosts(owner: PlayerRole): Ghost[] {
  const slots = [
    { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 },
    { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
  ];

  return slots.map((slot, idx) => ({
    id: `${owner}-ghost-${idx}`,
    owner,
    color: 'unknown' as const,
    x: slot.x,
    y: slot.y,
  }));
}

// Randomize exactly 4 Blue and 4 Red ghost colors for any 8-ghost set
export function shuffleGhostColors(ghosts: Ghost[]): Ghost[] {
  const colors: ('blue' | 'red')[] = [
    'blue', 'blue', 'blue', 'blue',
    'red', 'red', 'red', 'red',
  ];

  // Fisher-Yates shuffle
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = colors[i];
    colors[i] = colors[j];
    colors[j] = temp;
  }

  return ghosts.map((g, idx) => ({
    ...g,
    color: colors[idx],
  }));
}
