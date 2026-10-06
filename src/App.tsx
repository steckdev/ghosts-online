import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Ghost,
  PlayerRole,
  GameMode,
  CapturedGhost,
  NetworkMessage,
  WinReason,
} from './types/game';
import { HeaderHud } from './components/HeaderHud';
import { GameBoard } from './components/GameBoard';
import { Graveyard } from './components/Graveyard';
import { EmoteBar } from './components/EmoteBar';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { LobbyScreen } from './components/LobbyScreen';
import { peerService } from './services/peerService';
import { getValidMovesForGhost, calculateAIMove } from './services/aiService';
import { soundManager } from './audio/soundEffects';
import './App.css';

// Default 8 ghosts for starting player (4 blue, 4 red)
function createInitialGhosts(owner: PlayerRole): Ghost[] {
  // Central 4 slots of back 2 rows: (x=1..4, y=0..1)
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
function createInitialOpponentGhosts(owner: PlayerRole): Ghost[] {
  // From player's perspective, opponent is at top (y=4 and y=5, columns 1..4)
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

export const App: React.FC = () => {
  // Game states
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [gameStatus, setGameStatus] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [localPlayer, setLocalPlayer] = useState<PlayerRole>('p1');
  const [turn, setTurn] = useState<PlayerRole>('p1');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [winner, setWinner] = useState<PlayerRole | undefined>(undefined);
  const [winReason, setWinReason] = useState<WinReason | undefined>(undefined);

  // Ghosts on the board
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  // Store true colors of local ghosts (anti-cheating: remote only knows upon capture)
  const [mySecretGhosts, setMySecretGhosts] = useState<Ghost[]>([]);
  // In AI mode, we keep AI's secret colors locally
  const aiSecretColorsRef = useRef<Record<string, 'blue' | 'red'>>({});

  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; isExit?: boolean }[]>([]);
  const [capturedGhosts, setCapturedGhosts] = useState<CapturedGhost[]>([]);

  const [lastMove, setLastMove] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    ghostId: string;
    isCapture?: boolean;
    capturedColor?: 'blue' | 'red';
  } | undefined>(undefined);

  // P2P Online state
  const [roomCode, setRoomCode] = useState<string>('');
  const [activeEmotes, setActiveEmotes] = useState<{ id: string; emoji: string; sender: 'me' | 'opponent' }[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Sound initialization
  useEffect(() => {
    soundManager.initFromStorage();

    // Check if room code was passed in URL query param: ?room=A7K9
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
    }
  }, []);

  // Check Win Conditions
  const checkWinConditions = useCallback(
    (currentCaptured: CapturedGhost[], currentGhosts: Ghost[]): boolean => {
      // 1. Check Blue captures (4 opponent good ghosts captured -> capturer wins)
      const p1BlueCaptured = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'blue').length;
      const p2BlueCaptured = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'blue').length;

      if (p1BlueCaptured >= 4) {
        setWinner('p1');
        setWinReason('captured_all_blue');
        setGameStatus('gameover');
        return true;
      }
      if (p2BlueCaptured >= 4) {
        setWinner('p2');
        setWinReason('captured_all_blue');
        setGameStatus('gameover');
        return true;
      }

      // 2. Check Red captures (4 bad ghosts captured -> capturer LOSES, owner WINS)
      const p1RedCaptured = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'red').length;
      const p2RedCaptured = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'red').length;

      if (p1RedCaptured >= 4) {
        // P1 captured 4 bad ghosts from P2 -> P2 wins!
        setWinner('p2');
        setWinReason('captured_all_red');
        setGameStatus('gameover');
        return true;
      }
      if (p2RedCaptured >= 4) {
        // P2 captured 4 bad ghosts from P1 -> P1 wins!
        setWinner('p1');
        setWinReason('captured_all_red');
        setGameStatus('gameover');
        return true;
      }

      // 3. Check Escaped ghost
      const escaped = currentGhosts.find((g) => g.hasEscaped);
      if (escaped) {
        setWinner(escaped.owner);
        setWinReason('escaped');
        setGameStatus('gameover');
        return true;
      }

      return false;
    },
    []
  );

  // Setup AI match
  const handleStartAI = (initialGhosts: Ghost[]) => {
    setGameMode('ai');
    setLocalPlayer('p1');
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);

    // Initialize player's chosen ghosts at bottom (y=0,1)
    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    setMySecretGhosts(p1Ghosts);

    // AI's 8 ghosts at top (y=4,5, x=1..4)
    // Secretly assign 4 blue and 4 red to AI
    const aiColors: ('blue' | 'red')[] = ['blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'red'];
    for (let i = aiColors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [aiColors[i], aiColors[j]] = [aiColors[j], aiColors[i]];
    }

    const aiGhosts: Ghost[] = [];
    const aiSecretDict: Record<string, 'blue' | 'red'> = {};
    const slots = [
      { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
    ];

    slots.forEach((slot, idx) => {
      const id = `p2-ghost-${idx}`;
      aiSecretDict[id] = aiColors[idx];
      aiGhosts.push({
        id,
        owner: 'p2',
        color: 'unknown', // Player does not know!
        x: slot.x,
        y: slot.y,
      });
    });

    aiSecretColorsRef.current = aiSecretDict;
    setGhosts([...p1Ghosts, ...aiGhosts]);
    setGameStatus('playing');
  };

  // Setup Pass & Play
  const handleStartPassAndPlay = (initialGhosts: Ghost[]) => {
    setGameMode('pass-and-play');
    setLocalPlayer('p1');
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);

    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    // P2 ghosts random setup
    const p2Colors: ('blue' | 'red')[] = ['blue', 'blue', 'blue', 'blue', 'red', 'red', 'red', 'red'];
    for (let i = p2Colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p2Colors[i], p2Colors[j]] = [p2Colors[j], p2Colors[i]];
    }

    const p2Ghosts: Ghost[] = [];
    const slots = [
      { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 },
      { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
    ];
    slots.forEach((slot, idx) => {
      p2Ghosts.push({
        id: `p2-ghost-${idx}`,
        owner: 'p2',
        color: p2Colors[idx],
        x: slot.x,
        y: slot.y,
      });
    });

    setGhosts([...p1Ghosts, ...p2Ghosts]);
    setGameStatus('playing');
  };

  // Online P2P Handlers
  const handleCreateOnlineRoom = async (initialGhosts: Ghost[]) => {
    setGameMode('online');
    setLocalPlayer('p1');
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);

    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    setMySecretGhosts(p1Ghosts);

    const code = await peerService.createRoom();
    setRoomCode(code);

    // Initial unknown opponent ghosts
    const p2Ghosts = createInitialOpponentGhosts('p2');
    setGhosts([...p1Ghosts, ...p2Ghosts]);

    peerService.onPeerJoined = () => {
      // Send setup synchronization (ghost IDs and positions only, NO colors!)
      peerService.sendMessage({
        type: 'SYNC_SETUP',
        ghosts: p1Ghosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
      });
      setGameStatus('playing');
    };

    peerService.onMessage = handleNetworkMessage;
  };

  const handleJoinOnlineRoom = async (code: string, initialGhosts: Ghost[]) => {
    setGameMode('online');
    setLocalPlayer('p2');
    setTurn('p1'); // P1 always moves first
    setTurnNumber(1);
    setCapturedGhosts([]);
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);

    const p2Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p2' as const }));
    setMySecretGhosts(p2Ghosts);

    await peerService.joinRoom(code);
    setRoomCode(code);

    const p1Ghosts = createInitialOpponentGhosts('p1');
    setGhosts([...p2Ghosts, ...p1Ghosts]);

    peerService.onPeerJoined = () => {
      // Send setup synchronization to host
      peerService.sendMessage({
        type: 'SYNC_SETUP',
        ghosts: p2Ghosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
      });
      setGameStatus('playing');
    };

    peerService.onMessage = handleNetworkMessage;
  };

  // Process incoming network message from peer
  const handleNetworkMessage = useCallback(
    (msg: NetworkMessage) => {
      if (msg.type === 'SYNC_SETUP') {
        // Update opponent ghost positions in local state
        setGhosts((prev) => {
          const myPieces = prev.filter((g) => g.owner === localPlayer);
          const opponentRole: PlayerRole = localPlayer === 'p1' ? 'p2' : 'p1';
          const oppPieces: Ghost[] = msg.ghosts.map((g) => ({
            id: g.id,
            owner: opponentRole,
            color: 'unknown',
            // Invert coordinates for symmetrical view
            x: 5 - g.x,
            y: 5 - g.y,
          }));
          return [...myPieces, ...oppPieces];
        });
        setGameStatus('playing');
      } else if (msg.type === 'MOVE') {
        // Opponent moved a ghost
        const invX = 5 - msg.toX;
        const invY = 5 - msg.toY;

        setGhosts((prev) => {
          const movedGhost = prev.find((g) => g.id === msg.ghostId);
          if (!movedGhost) return prev;

          const fromX = movedGhost.x;
          const fromY = movedGhost.y;

          setLastMove({
            from: { x: fromX, y: fromY },
            to: { x: invX, y: invY },
            ghostId: msg.ghostId,
          });

          return prev.map((g) => (g.id === msg.ghostId ? { ...g, x: invX, y: invY } : g));
        });

        soundManager.playMove();
        // Switch turn back to local player
        setTurn(localPlayer);
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();
      } else if (msg.type === 'CAPTURE_ATTEMPT') {
        // Opponent wants to capture one of my ghosts
        const targetGhost = mySecretGhosts.find((g) => g.id === msg.targetGhostId);
        const revealedColor = targetGhost ? targetGhost.color : ('blue' as const);

        // Send back true color of the captured ghost!
        peerService.sendMessage({
          type: 'CAPTURE_REVEAL',
          targetGhostId: msg.targetGhostId,
          revealedColor: revealedColor as 'blue' | 'red',
        });

        // Apply capture locally
        const invX = 5 - msg.toX;
        const invY = 5 - msg.toY;

        setGhosts((prev) => {
          const updated = prev.map((g) => {
            if (g.id === msg.targetGhostId) {
              return { ...g, isCaptured: true, color: revealedColor };
            }
            if (g.id === msg.ghostId) {
              return { ...g, x: invX, y: invY };
            }
            return g;
          });

          const newCaptured: CapturedGhost = {
            id: msg.targetGhostId,
            owner: localPlayer,
            color: revealedColor as 'blue' | 'red',
            turnNumber,
          };

          const nextCapturedList = [...capturedGhosts, newCaptured];
          setCapturedGhosts(nextCapturedList);
          checkWinConditions(nextCapturedList, updated);
          return updated;
        });

        if (revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        setTurn(localPlayer);
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();
      } else if (msg.type === 'CAPTURE_REVEAL') {
        // Opponent revealed the color of the ghost we just captured!
        setGhosts((prev) =>
          prev.map((g) =>
            g.id === msg.targetGhostId ? { ...g, isCaptured: true, color: msg.revealedColor } : g
          )
        );

        const oppRole: PlayerRole = localPlayer === 'p1' ? 'p2' : 'p1';
        const newCaptured: CapturedGhost = {
          id: msg.targetGhostId,
          owner: oppRole,
          color: msg.revealedColor,
          turnNumber,
        };

        const nextCapturedList = [...capturedGhosts, newCaptured];
        setCapturedGhosts(nextCapturedList);

        if (msg.revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        checkWinConditions(nextCapturedList, ghosts);
      } else if (msg.type === 'ESCAPE') {
        // Opponent escaped!
        setGhosts((prev) =>
          prev.map((g) => (g.id === msg.ghostId ? { ...g, hasEscaped: true, color: 'blue' } : g))
        );
        soundManager.playEscape();
        setWinner(localPlayer === 'p1' ? 'p2' : 'p1');
        setWinReason('escaped');
        setGameStatus('gameover');
      } else if (msg.type === 'EMOTE') {
        // Receive emote
        handleShowEmote(msg.emoji, 'opponent');
      }
    },
    [localPlayer, mySecretGhosts, turnNumber, capturedGhosts, ghosts, checkWinConditions]
  );

  const handleShowEmote = (emoji: string, sender: 'me' | 'opponent') => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveEmotes((prev) => [...prev, { id, emoji, sender }]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
  };

  const handleSendEmote = (emoji: string) => {
    handleShowEmote(emoji, 'me');
    if (gameMode === 'online') {
      peerService.sendMessage({
        type: 'EMOTE',
        emoji,
        sender: localPlayer,
      });
    }
  };

  // Player clicks on one of their own ghosts to select it
  const handleSelectGhost = (ghost: Ghost) => {
    if (turn !== localPlayer && gameMode !== 'pass-and-play') return;
    if (gameStatus !== 'playing') return;

    soundManager.playSelect();
    if (selectedGhostId === ghost.id) {
      setSelectedGhostId(null);
      setValidMoves([]);
      return;
    }

    setSelectedGhostId(ghost.id);
    const moves = getValidMovesForGhost(ghost, ghosts, ghost.owner);
    setValidMoves(moves);
  };

  // Execute a player move to (targetX, targetY)
  const handleTileClick = (targetX: number, targetY: number) => {
    if (!selectedGhostId) return;
    const movingGhost = ghosts.find((g) => g.id === selectedGhostId);
    if (!movingGhost) return;

    // Check if target is valid move
    const isValid = validMoves.some((m) => m.x === targetX && m.y === targetY && !m.isExit);
    if (!isValid) return;

    const fromPos = { x: movingGhost.x, y: movingGhost.y };
    const toPos = { x: targetX, y: targetY };

    // Check if target contains opponent ghost
    const targetGhost = ghosts.find(
      (g) => !g.isCaptured && !g.hasEscaped && g.x === targetX && g.y === targetY
    );

    let isCapture = false;
    let revealedColor: 'blue' | 'red' | undefined = undefined;

    if (targetGhost && targetGhost.owner !== movingGhost.owner) {
      isCapture = true;
      if (gameMode === 'ai') {
        // Look up AI secret color
        revealedColor = aiSecretColorsRef.current[targetGhost.id] || 'blue';
      } else if (gameMode === 'pass-and-play') {
        revealedColor = targetGhost.color as 'blue' | 'red';
      }
    }

    // Update ghosts state
    setGhosts((prev) => {
      const updated = prev.map((g) => {
        if (targetGhost && g.id === targetGhost.id) {
          return {
            ...g,
            isCaptured: true,
            color: revealedColor || g.color,
          };
        }
        if (g.id === movingGhost.id) {
          return { ...g, x: targetX, y: targetY };
        }
        return g;
      });

      // If capture occurred
      if (isCapture && targetGhost && revealedColor) {
        const newCaptured: CapturedGhost = {
          id: targetGhost.id,
          owner: targetGhost.owner,
          color: revealedColor,
          turnNumber,
        };
        const nextCapturedList = [...capturedGhosts, newCaptured];
        setCapturedGhosts(nextCapturedList);

        if (revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        checkWinConditions(nextCapturedList, updated);
      } else {
        soundManager.playMove();
      }

      return updated;
    });

    setLastMove({
      from: fromPos,
      to: toPos,
      ghostId: movingGhost.id,
      isCapture,
      capturedColor: revealedColor,
    });

    // Network notification in online mode
    if (gameMode === 'online') {
      if (isCapture && targetGhost) {
        peerService.sendMessage({
          type: 'CAPTURE_ATTEMPT',
          ghostId: movingGhost.id,
          toX: targetX,
          toY: targetY,
          targetGhostId: targetGhost.id,
        });
      } else {
        peerService.sendMessage({
          type: 'MOVE',
          ghostId: movingGhost.id,
          toX: targetX,
          toY: targetY,
        });
      }
    }

    setSelectedGhostId(null);
    setValidMoves([]);

    // Turn transition
    const nextTurn: PlayerRole = turn === 'p1' ? 'p2' : 'p1';
    setTurn(nextTurn);
    setTurnNumber((t) => t + 1);

    // If game mode is AI, trigger AI response after a short delay
    if (gameMode === 'ai' && nextTurn === 'p2' && gameStatus !== 'gameover') {
      triggerAITurn();
    }
  };

  // Escape handling: Good Blue ghost moves off the board through top exit
  const handleEscapeClick = () => {
    if (!selectedGhostId) return;
    const ghost = ghosts.find((g) => g.id === selectedGhostId);
    if (!ghost || ghost.color !== 'blue') return;

    // Must be on exit square (0, 5) or (5, 5)
    if (ghost.y !== 5 || (ghost.x !== 0 && ghost.x !== 5)) return;

    soundManager.playEscape();

    setGhosts((prev) =>
      prev.map((g) => (g.id === ghost.id ? { ...g, hasEscaped: true } : g))
    );

    if (gameMode === 'online') {
      peerService.sendMessage({
        type: 'ESCAPE',
        ghostId: ghost.id,
      });
    }

    setWinner(ghost.owner);
    setWinReason('escaped');
    setGameStatus('gameover');
  };

  // AI Turn Execution
  const triggerAITurn = () => {
    setTimeout(() => {
      setGhosts((currentGhosts) => {
        // Construct AI view with true colors for AI
        const aiGhosts = currentGhosts
          .filter((g) => g.owner === 'p2')
          .map((g) => ({
            ...g,
            color: aiSecretColorsRef.current[g.id] || 'blue',
            // Invert coordinates for AI calculation: AI sees board from its perspective!
            x: 5 - g.x,
            y: 5 - g.y,
          }));

        const playerGhosts = currentGhosts
          .filter((g) => g.owner === 'p1')
          .map((g) => ({
            ...g,
            x: 5 - g.x,
            y: 5 - g.y,
          }));

        const aiDecision = calculateAIMove(aiGhosts, playerGhosts);
        if (!aiDecision) return currentGhosts;

        // Invert back to global coordinates
        const targetX = 5 - aiDecision.to.x;
        const targetY = 5 - aiDecision.to.y;

        // Check if AI escapes
        if (aiDecision.isExit) {
          soundManager.playEscape();
          setWinner('p2');
          setWinReason('escaped');
          setGameStatus('gameover');
          return currentGhosts.map((g) =>
            g.id === aiDecision.ghostId ? { ...g, hasEscaped: true, color: 'blue' } : g
          );
        }

        // Check if AI captures a player ghost
        const capturedPlayerGhost = currentGhosts.find(
          (g) => !g.isCaptured && !g.hasEscaped && g.owner === 'p1' && g.x === targetX && g.y === targetY
        );

        let nextCaptured = capturedGhosts;
        if (capturedPlayerGhost) {
          const capObj: CapturedGhost = {
            id: capturedPlayerGhost.id,
            owner: 'p1',
            color: capturedPlayerGhost.color as 'blue' | 'red',
            turnNumber,
          };
          nextCaptured = [...capturedGhosts, capObj];
          setCapturedGhosts(nextCaptured);

          if (capturedPlayerGhost.color === 'blue') {
            soundManager.playCaptureGood();
          } else {
            soundManager.playCaptureBad();
          }
        } else {
          soundManager.playMove();
        }

        const updatedGhosts = currentGhosts.map((g) => {
          if (capturedPlayerGhost && g.id === capturedPlayerGhost.id) {
            return { ...g, isCaptured: true };
          }
          if (g.id === aiDecision.ghostId) {
            return { ...g, x: targetX, y: targetY };
          }
          return g;
        });

        setLastMove({
          from: { x: 5 - aiDecision.from.x, y: 5 - aiDecision.from.y },
          to: { x: targetX, y: targetY },
          ghostId: aiDecision.ghostId,
          isCapture: !!capturedPlayerGhost,
          capturedColor: capturedPlayerGhost ? (capturedPlayerGhost.color as 'blue' | 'red') : undefined,
        });

        checkWinConditions(nextCaptured, updatedGhosts);

        setTurn('p1');
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();

        return updatedGhosts;
      });
    }, 700);
  };

  // Rematch / Reset
  const handleResetGame = () => {
    peerService.disconnect();
    setGameStatus('lobby');
    setWinner(undefined);
    setWinReason(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
  };

  const handleRematch = () => {
    if (gameMode === 'ai') {
      handleStartAI(mySecretGhosts);
    } else if (gameMode === 'pass-and-play') {
      handleStartPassAndPlay(mySecretGhosts);
    } else {
      handleCreateOnlineRoom(mySecretGhosts);
    }
  };

  // Default ghost layout for initial preview
  const defaultGhosts = createInitialGhosts('p1');

  return (
    <div className="app-container">
      {/* Ambient background decoration particles */}
      <div className="ambient-background">
        <div className="candle-glow top-candle-1" />
        <div className="candle-glow top-candle-2" />
        <div className="candle-glow bottom-candle" />
      </div>

      {gameStatus === 'lobby' ? (
        <LobbyScreen
          onStartAI={handleStartAI}
          onStartPassAndPlay={handleStartPassAndPlay}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onJoinOnlineRoom={handleJoinOnlineRoom}
          defaultGhosts={defaultGhosts}
        />
      ) : (
        <main className="game-screen">
          <HeaderHud
            roomCode={roomCode}
            gameMode={gameMode}
            isMyTurn={turn === localPlayer}
            localPlayer={localPlayer}
            capturedGhosts={capturedGhosts}
            onOpenRules={() => setIsRulesOpen(true)}
            onResetGame={handleResetGame}
          />

          <div className="board-layout-container">
            {/* Desktop Left Graveyard: Opponent's Captured Ghosts */}
            <aside className="desktop-side-panel left-side">
              <Graveyard
                title="OPPONENT'S CEMETERY"
                capturedGhosts={capturedGhosts}
                targetOwner={localPlayer === 'p1' ? 'p2' : 'p1'}
                isOpponent
              />
            </aside>

            {/* Central 6x6 Board */}
            <div className="center-board-panel">
              <GameBoard
                ghosts={ghosts}
                selectedGhostId={selectedGhostId}
                validMoves={validMoves}
                localPlayer={localPlayer}
                isMyTurn={turn === localPlayer}
                isSetupPhase={false}
                lastMove={lastMove}
                onSelectGhost={handleSelectGhost}
                onTileClick={handleTileClick}
                onEscapeClick={handleEscapeClick}
              />

              {/* Emotes below board */}
              <EmoteBar onSendEmote={handleSendEmote} activeEmotes={activeEmotes} />
            </div>

            {/* Desktop Right Graveyard: Your Captured Ghosts */}
            <aside className="desktop-side-panel right-side">
              <Graveyard
                title="YOUR CEMETERY"
                capturedGhosts={capturedGhosts}
                targetOwner={localPlayer}
              />
            </aside>
          </div>
        </main>
      )}

      {/* Rules Modal */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Game Over Celebration Modal */}
      {winner && winReason && (
        <GameOverModal
          isOpen={gameStatus === 'gameover'}
          winner={winner}
          localPlayer={localPlayer}
          winReason={winReason}
          allGhosts={ghosts}
          onRematch={handleRematch}
          onHome={handleResetGame}
        />
      )}
    </div>
  );
};

export default App;
