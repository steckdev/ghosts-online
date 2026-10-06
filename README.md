# 👻 Ghosts 80s (Geister) - Alex Randolph 1982

A virtual recreation of master game designer **Alex Randolph's 1982 classic board game *Ghosts*** (also known as *Geister* or *Good & Bad Ghosts*), styled in a retro 80s spooky arcade aesthetic.

![Ghosts 80s Preview](/board-reference.jpg)

## 🎮 The Game

*Ghosts* is a masterpiece of bluffing, asymmetric information, and psychological warfare. It plays like a simplified, high-stakes mind game where you don't know the identity of the opponent's pieces.

### 📐 Rules & Mechanics
- **Board:** 6x6 stone tile dungeon grid with escape exit gateways in the opponent's back corners.
- **Pieces:** Each player controls 8 ghosts (4 Good Blue spirits, 4 Bad Red poison pills).
- **Hidden Identity:** To you, your ghosts show their true color (Blue or Red). To your opponent, all your ghosts look like identical neutral white spirits until captured!
- **Movement:** Move 1 ghost exactly 1 square orthogonally (Up, Down, Left, Right). No diagonal moves.
- **Capture:** Step onto an opponent's ghost to capture it and reveal its true color.

### 🏆 3 Ways to Win
1. **Heroic Exorcism:** Capture all 4 of your opponent's Good (Blue) ghosts.
2. **Poison Pill Trap:** Force or trick your opponent into capturing all 4 of your Bad (Red) ghosts! (The capturer loses immediately).
3. **The Great Escape:** Move one of your Good (Blue) ghosts onto an opponent's corner exit gateway, and step off the board on the next turn! (Red ghosts cannot escape).

---

## 🕹️ Game Modes

- 👥 **Online P2P Multiplayer (WebRTC):** Direct peer-to-peer connection via PeerJS. No middleman game server!
  - Generate a 4-letter room code (e.g. `A7K9`) or share direct link (`?room=A7K9`).
  - **Zero-knowledge anti-cheat state:** Your browser never transmits true ghost colors to the opponent until a capture actually happens.
- 🤖 **Single Player vs Phantom AI:** An AI that bluffs with Red ghosts, shields Blue ghosts, and rushes exit gateways.
- 📱 **Pass & Play:** Two players playing on a single shared device or tablet.

---

## 🛠️ Technology Stack

- **Framework:** React 19 + TypeScript + Vite 8
- **Audio:** Web Audio API procedural synthesizer (80s arcade chimes, theremin whoosh, tritone buzz, and fanfare with zero audio asset latency)
- **Multiplayer:** WebRTC DataChannels powered by PeerJS
- **Visuals:** Custom SVG sprite system with 80s neon glows, gothic stone cobblestone grid, and particle effects
- **Hosting:** Netlify PWA with offline manifest support

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Build for production
npm run build
```

---

## 📜 License & Credits

Original game design by **Alex Randolph (1982)**.
Created with ❤️ for web and mobile.
