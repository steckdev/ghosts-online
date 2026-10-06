import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Ghost,
  GhostColor,
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
import { WaitingRoom } from './components/WaitingRoom';
import { PassTurnOverlay } from './components/PassTurnOverlay';
import { DungeonDecorations } from './components/DungeonDecorations';
import { PassAndPlaySetupModal } from './components/PassAndPlaySetupModal';
import { peerService } from './services/peerService';
import { getValidMovesForGhost, calculateAIMove } from './services/aiService';
import { soundManager } from './audio/soundEffects';
import {
  createInitialGhosts,
  createInitialOpponentGhosts,
  shuffleGhostColors,
} from './utils/ghostUtils';
import './App.css';

export const App: React.FC = () => {
  // Game states
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [gameStatus, setGameStatus] = useState<'lobby' | 'waiting' | 'playing' | 'gameover'>('lobby');
  const [localPlayer, setLocalPlayer] = useState<PlayerRole>('p1');
  const [turn, setTurn] = useState<PlayerRole>('p1');
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [winner, setWinner] = useState<PlayerRole | undefined>(undefined);
  const [winReason, setWinReason] = useState<WinReason | undefined>(undefined);

  // Pass & Play Privacy Shield & Setup State
  const [isPassShieldActive, setIsPassShieldActive] = useState<boolean>(false);
  const [pendingNextPlayer, setPendingNextPlayer] = useState<PlayerRole>('p2');
  const [isP2SetupModalOpen, setIsP2SetupModalOpen] = useState(false);
  const [p2SetupInitialGhosts, setP2SetupInitialGhosts] = useState<Ghost[]>([]);
  const [passShieldCustomTitle, setPassShieldCustomTitle] = useState<string | undefined>(undefined);
  const [passShieldCustomSubtitle, setPassShieldCustomSubtitle] = useState<string | undefined>(undefined);
  const p1SavedGhostsRef = useRef<Ghost[]>([]);
  const onShieldUnlockedCallbackRef = useRef<(() => void) | null>(null);
  const [lastCapturedInfo, setLastCapturedInfo] = useState<{ color: 'blue' | 'red'; capturer: PlayerRole } | undefined>(undefined);

  // Ghosts on the board
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const ghostsRef = useRef<Ghost[]>([]);

  // Secret ghosts memory
  const [mySecretGhosts, setMySecretGhosts] = useState<Ghost[]>([]);
  const mySecretGhostsRef = useRef<Ghost[]>([]);

  // AI secret colors dictionary
  const aiSecretColorsRef = useRef<Record<string, 'blue' | 'red'>>({});

  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; isExit?: boolean }[]>([]);

  // Synchronous ref for captured ghosts
  const [capturedGhosts, setCapturedGhosts] = useState<CapturedGhost[]>([]);
  const capturedGhostsRef = useRef<CapturedGhost[]>([]);

  useEffect(() => {
    ghostsRef.current = ghosts;
  }, [ghosts]);

  useEffect(() => {
    mySecretGhostsRef.current = mySecretGhosts;
  }, [mySecretGhosts]);

  useEffect(() => {
    capturedGhostsRef.current = capturedGhosts;
  }, [capturedGhosts]);

  const [lastMove, setLastMove] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    ghostId: string;
    isCapture?: boolean;
    capturedColor?: 'blue' | 'red';
  } | undefined>(undefined);

  // P2P Online state
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
    }
    return '';
  });
  const [isHost, setIsHost] = useState<boolean>(true);
  const [waitingStatusText, setWaitingStatusText] = useState<string>('Connecting to signaling network...');
  const [activeEmotes, setActiveEmotes] = useState<{ id: string; emoji: string; sender: 'me' | 'opponent' }[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  useEffect(() => {
    soundManager.initFromStorage();
  }, []);

  // Check Win Conditions with exact evaluation
  const checkWinConditions = useCallback(
    (currentCaptured: CapturedGhost[], currentGhosts: Ghost[]): boolean => {
      // 1. Check Blue captures (4 opponent good ghosts captured -> capturer wins)
      const p1CapturedBlueFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'blue').length;
      const p2CapturedBlueFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'blue').length;

      if (p1CapturedBlueFromP2 >= 4) {
        setWinner('p1');
        setWinReason('captured_all_blue');
        setGameStatus('gameover');
        return true;
      }
      if (p2CapturedBlueFromP1 >= 4) {
        setWinner('p2');
        setWinReason('captured_all_blue');
        setGameStatus('gameover');
        return true;
      }

      // 2. Check Red captures (4 bad ghosts captured -> capturer loses, owner WINS)
      const p1CapturedRedFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'red').length;
      const p2CapturedRedFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'red').length;

      if (p1CapturedRedFromP2 >= 4) {
        setWinner('p2');
        setWinReason('captured_all_red');
        setGameStatus('gameover');
        return true;
      }
      if (p2CapturedRedFromP1 >= 4) {
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
    capturedGhostsRef.current = [];
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
    setIsPassShieldActive(false);

    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    setMySecretGhosts(p1Ghosts);
    mySecretGhostsRef.current = p1Ghosts;

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
        color: 'unknown',
        x: slot.x,
        y: slot.y,
      });
    });

    aiSecretColorsRef.current = aiSecretDict;
    const initialBoard = [...p1Ghosts, ...aiGhosts];
    setGhosts(initialBoard);
    ghostsRef.current = initialBoard;
    setGameStatus('playing');
  };

  // Setup Pass & Play (Battleship Hidden Screen Mode)
  const handleStartPassAndPlay = (initialGhosts: Ghost[]) => {
    setGameMode('pass-and-play');
    setLocalPlayer('p1');
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    capturedGhostsRef.current = [];
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);

    // Player 1's starting arrangement
    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    p1SavedGhostsRef.current = p1Ghosts;
    setMySecretGhosts(p1Ghosts);
    mySecretGhostsRef.current = p1Ghosts;

    // Player 2's starting ghosts layout (4 blue, 4 red)
    const defaultP2Ghosts: Ghost[] = [
      { id: 'p2-ghost-0', owner: 'p2', color: 'blue', x: 1, y: 5 },
      { id: 'p2-ghost-1', owner: 'p2', color: 'red', x: 2, y: 5 },
      { id: 'p2-ghost-2', owner: 'p2', color: 'red', x: 3, y: 5 },
      { id: 'p2-ghost-3', owner: 'p2', color: 'blue', x: 4, y: 5 },
      { id: 'p2-ghost-4', owner: 'p2', color: 'red', x: 1, y: 4 },
      { id: 'p2-ghost-5', owner: 'p2', color: 'blue', x: 2, y: 4 },
      { id: 'p2-ghost-6', owner: 'p2', color: 'blue', x: 3, y: 4 },
      { id: 'p2-ghost-7', owner: 'p2', color: 'red', x: 4, y: 4 },
    ];
    setP2SetupInitialGhosts(defaultP2Ghosts);

    const initialBoard = [...p1Ghosts, ...defaultP2Ghosts];
    setGhosts(initialBoard);
    ghostsRef.current = initialBoard;

    // Show privacy shield instructing to hand to Player 2
    setPendingNextPlayer('p2');
    setPassShieldCustomTitle('SETUP PHASE: PASS TO PLAYER 2');
    setPassShieldCustomSubtitle('Hand device to Player 2 to arrange their secret ghosts!');
    onShieldUnlockedCallbackRef.current = () => {
      setIsP2SetupModalOpen(true);
    };
    setIsPassShieldActive(true);
    setGameStatus('playing');
  };

  const handleConfirmP2Setup = (p2FinalGhosts: Ghost[]) => {
    setIsP2SetupModalOpen(false);
    const p1Ghosts = p1SavedGhostsRef.current;
    const initialBoard = [...p1Ghosts, ...p2FinalGhosts];
    setGhosts(initialBoard);
    ghostsRef.current = initialBoard;

    // Hand back to Player 1 for first move
    setPendingNextPlayer('p1');
    setPassShieldCustomTitle('READY TO PLAY! PASS TO PLAYER 1');
    setPassShieldCustomSubtitle('Player 1 takes the first move! Tap 3 times to reveal board.');
    onShieldUnlockedCallbackRef.current = null;
    setIsPassShieldActive(true);
  };

  const handleShuffleWaitingGhosts = () => {
    soundManager.playSelect();
    const shuffled = shuffleGhostColors(mySecretGhostsRef.current);
    setMySecretGhosts(shuffled);
    mySecretGhostsRef.current = shuffled;
    const oppPieces = createInitialOpponentGhosts('p2');
    const updatedBoard = [...shuffled, ...oppPieces];
    setGhosts(updatedBoard);
    ghostsRef.current = updatedBoard;
  };

  // Host Online Room
  const handleCreateOnlineRoom = async (initialGhosts: Ghost[]) => {
    setGameMode('online');
    setLocalPlayer('p1');
    setIsHost(true);
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    capturedGhostsRef.current = [];
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
    setIsPassShieldActive(false);
    setWaitingStatusText('Connecting to peer-to-peer signaling network...');

    const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
    setMySecretGhosts(p1Ghosts);
    mySecretGhostsRef.current = p1Ghosts;

    setGameStatus('waiting');

    try {
      peerService.onMessage = handleNetworkMessage;

      const code = await peerService.createRoom();
      setRoomCode(code);
      setWaitingStatusText('Room active! Waiting for Player 2 to enter code or join link...');

      const p2Ghosts = createInitialOpponentGhosts('p2');
      const initialBoard = [...p1Ghosts, ...p2Ghosts];
      setGhosts(initialBoard);
      ghostsRef.current = initialBoard;

      peerService.onPeerJoined = () => {
        soundManager.playTurnAlert();
        peerService.sendMessage({
          type: 'SYNC_SETUP',
          ghosts: p1Ghosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
        });
        setGameStatus('playing');
      };

      peerService.onError = (err) => {
        setWaitingStatusText(`Connection notice: ${err.message}`);
      };
    } catch (err) {
      console.error(err);
      setWaitingStatusText('Could not connect to signaling broker. Please check internet connection.');
    }
  };

  // Join Online Room
  const handleJoinOnlineRoom = async (code: string, initialGhosts: Ghost[]) => {
    setGameMode('online');
    setLocalPlayer('p2');
    setIsHost(false);
    setTurn('p1');
    setTurnNumber(1);
    setCapturedGhosts([]);
    capturedGhostsRef.current = [];
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
    setIsPassShieldActive(false);

    const p2Ghosts = initialGhosts.map((g, idx) => ({
      ...g,
      id: `p2-ghost-${idx}`,
      owner: 'p2' as const,
      x: g.x,
      y: g.y,
    }));
    setMySecretGhosts(p2Ghosts);
    mySecretGhostsRef.current = p2Ghosts;

    setRoomCode(code.toUpperCase());
    setWaitingStatusText(`Connecting to Room ${code.toUpperCase()}...`);
    setGameStatus('waiting');

    try {
      peerService.onMessage = handleNetworkMessage;

      const p1Ghosts = createInitialOpponentGhosts('p1');
      const initialBoard = [...p2Ghosts, ...p1Ghosts];
      setGhosts(initialBoard);
      ghostsRef.current = initialBoard;

      await peerService.joinRoom(code);
      setWaitingStatusText('Connected to Host! Synchronizing dungeon...');

      // Connection is open! Immediately send our setup and enter playing!
      soundManager.playTurnAlert();
      peerService.sendMessage({
        type: 'SYNC_SETUP',
        ghosts: p2Ghosts.map((g) => ({ id: g.id, x: g.x, y: g.y })),
      });
      setGameStatus('playing');
    } catch (err: unknown) {
      console.error(err);
      alert((err as Error).message || 'Failed to connect to room.');
      setGameStatus('lobby');
    }
  };

  const handleShowEmote = useCallback((emoji: string, sender: 'me' | 'opponent') => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveEmotes((prev) => [...prev, { id, emoji, sender }]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
  }, []);

  const handleResetForRematch = useCallback(() => {
    setWinner(undefined);
    setWinReason(undefined);
    setCapturedGhosts([]);
    capturedGhostsRef.current = [];
    setLastMove(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
    setIsPassShieldActive(false);
    setTurn('p1');
    setTurnNumber(1);

    const myRole = localPlayer;
    const oppRole: PlayerRole = myRole === 'p1' ? 'p2' : 'p1';
    const myPieces = mySecretGhostsRef.current;
    const oppPieces = createInitialOpponentGhosts(oppRole);
    const initialBoard = myRole === 'p1' ? [...myPieces, ...oppPieces] : [...oppPieces, ...myPieces];
    setGhosts(initialBoard);
    ghostsRef.current = initialBoard;

    setGameStatus('playing');
    soundManager.playTurnAlert();
  }, [localPlayer]);

  // Network messages
  const handleNetworkMessage = useCallback(
    (msg: NetworkMessage) => {
      if (msg.type === 'SYNC_SETUP') {
        const myPieces = mySecretGhostsRef.current;
        const opponentRole: PlayerRole = localPlayer === 'p1' ? 'p2' : 'p1';
        const oppPieces: Ghost[] = msg.ghosts.map((g) => ({
          id: g.id,
          owner: opponentRole,
          color: 'unknown',
          x: 5 - g.x,
          y: 5 - g.y,
        }));
        const syncedBoard = [...myPieces, ...oppPieces];
        setGhosts(syncedBoard);
        ghostsRef.current = syncedBoard;
        setGameStatus('playing');

        // If I am Host and I received SYNC_SETUP from Guest, ensure my setup is sent too
        if (localPlayer === 'p1') {
          peerService.sendMessage({
            type: 'SYNC_SETUP',
            ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
          });
        }
      } else if (msg.type === 'STATE_SYNC') {
        const myPieces = mySecretGhostsRef.current;
        const opponentRole: PlayerRole = localPlayer === 'p1' ? 'p2' : 'p1';

        const updatedOppPieces: Ghost[] = msg.ghosts
          .filter((g) => g.id.startsWith(opponentRole))
          .map((g) => ({
            id: g.id,
            owner: opponentRole,
            color: (g.color && g.color !== 'unknown' ? g.color : 'unknown') as GhostColor,
            x: 5 - g.x,
            y: 5 - g.y,
            isCaptured: g.isCaptured,
            hasEscaped: g.hasEscaped,
          }));

        const updatedMyPieces = myPieces.map((myG) => {
          const syncMatch = msg.ghosts.find((g) => g.id === myG.id);
          if (syncMatch) {
            return {
              ...myG,
              x: 5 - syncMatch.x,
              y: 5 - syncMatch.y,
              isCaptured: syncMatch.isCaptured,
              hasEscaped: syncMatch.hasEscaped,
            };
          }
          return myG;
        });

        const syncedBoard = [...updatedMyPieces, ...updatedOppPieces];
        setGhosts(syncedBoard);
        ghostsRef.current = syncedBoard;
        setTurn(msg.turn);
        setTurnNumber(msg.turnNumber);
        setCapturedGhosts(msg.capturedGhosts);
        capturedGhostsRef.current = msg.capturedGhosts;
        setGameStatus('playing');
        soundManager.playTurnAlert();
      } else if (msg.type === 'MOVE') {
        const invX = 5 - msg.toX;
        const invY = 5 - msg.toY;

        const movedGhost = ghostsRef.current.find((g) => g.id === msg.ghostId);
        if (movedGhost) {
          setLastMove({
            from: { x: movedGhost.x, y: movedGhost.y },
            to: { x: invX, y: invY },
            ghostId: msg.ghostId,
          });
        }

        const nextGhosts = ghostsRef.current.map((g) =>
          g.id === msg.ghostId ? { ...g, x: invX, y: invY } : g
        );
        setGhosts(nextGhosts);
        ghostsRef.current = nextGhosts;

        soundManager.playMove();
        setTurn(localPlayer);
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();
      } else if (msg.type === 'CAPTURE_ATTEMPT') {
        const targetGhost = mySecretGhostsRef.current.find((g) => g.id === msg.targetGhostId);
        const revealedColor = targetGhost ? targetGhost.color : ('blue' as const);

        peerService.sendMessage({
          type: 'CAPTURE_REVEAL',
          targetGhostId: msg.targetGhostId,
          revealedColor: revealedColor as 'blue' | 'red',
        });

        const invX = 5 - msg.toX;
        const invY = 5 - msg.toY;

        const nextGhosts = ghostsRef.current.map((g) => {
          if (g.id === msg.targetGhostId) {
            return { ...g, isCaptured: true, color: revealedColor };
          }
          if (g.id === msg.ghostId) {
            return { ...g, x: invX, y: invY };
          }
          return g;
        });
        setGhosts(nextGhosts);
        ghostsRef.current = nextGhosts;

        const newCaptured: CapturedGhost = {
          id: msg.targetGhostId,
          owner: localPlayer,
          color: revealedColor as 'blue' | 'red',
          turnNumber,
        };
        const nextCapturedList = [...capturedGhostsRef.current, newCaptured];
        setCapturedGhosts(nextCapturedList);
        capturedGhostsRef.current = nextCapturedList;

        if (revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        checkWinConditions(nextCapturedList, nextGhosts);

        setTurn(localPlayer);
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();
      } else if (msg.type === 'CAPTURE_REVEAL') {
        const nextGhosts = ghostsRef.current.map((g) =>
          g.id === msg.targetGhostId ? { ...g, isCaptured: true, color: msg.revealedColor } : g
        );
        setGhosts(nextGhosts);
        ghostsRef.current = nextGhosts;

        const oppRole: PlayerRole = localPlayer === 'p1' ? 'p2' : 'p1';
        const newCaptured: CapturedGhost = {
          id: msg.targetGhostId,
          owner: oppRole,
          color: msg.revealedColor,
          turnNumber,
        };
        const nextCapturedList = [...capturedGhostsRef.current, newCaptured];
        setCapturedGhosts(nextCapturedList);
        capturedGhostsRef.current = nextCapturedList;

        if (msg.revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        checkWinConditions(nextCapturedList, nextGhosts);
      } else if (msg.type === 'ESCAPE') {
        const nextGhosts: Ghost[] = ghostsRef.current.map((g) =>
          g.id === msg.ghostId ? { ...g, hasEscaped: true, color: 'blue' as const } : g
        );
        setGhosts(nextGhosts);
        ghostsRef.current = nextGhosts;
        soundManager.playEscape();
        setWinner(localPlayer === 'p1' ? 'p2' : 'p1');
        setWinReason('escaped');
        setGameStatus('gameover');
      } else if (msg.type === 'REMATCH_REQUEST') {
        handleResetForRematch();
        peerService.sendMessage({
          type: 'SYNC_SETUP',
          ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
        });
      } else if (msg.type === 'EMOTE') {
        handleShowEmote(msg.emoji, 'opponent');
      }
    },
    [localPlayer, turnNumber, checkWinConditions, handleShowEmote, handleResetForRematch]
  );

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

  // Active player in current turn (In Pass & Play, active player is the current turn player!)
  const activeTurnPlayer = gameMode === 'pass-and-play' ? turn : localPlayer;
  const isMyTurnNow = gameMode === 'pass-and-play' ? true : turn === localPlayer;

  // Player selection
  const handleSelectGhost = (ghost: Ghost) => {
    if (!isMyTurnNow) return;
    if (gameStatus !== 'playing') return;
    if (isPassShieldActive) return;

    soundManager.playSelect();
    if (selectedGhostId === ghost.id) {
      setSelectedGhostId(null);
      setValidMoves([]);
      return;
    }

    setSelectedGhostId(ghost.id);
    const moves = getValidMovesForGhost(ghost, ghostsRef.current, ghost.owner, true);
    setValidMoves(moves);
  };

  // Move execution
  const handleTileClick = (targetX: number, targetY: number) => {
    if (!selectedGhostId) return;
    if (isPassShieldActive) return;

    const movingGhost = ghostsRef.current.find((g) => g.id === selectedGhostId);
    if (!movingGhost) return;

    const isValid = validMoves.some((m) => m.x === targetX && m.y === targetY && !m.isExit);
    if (!isValid) return;

    const fromPos = { x: movingGhost.x, y: movingGhost.y };
    const toPos = { x: targetX, y: targetY };

    const targetGhost = ghostsRef.current.find(
      (g) => !g.isCaptured && !g.hasEscaped && g.x === targetX && g.y === targetY
    );

    let isCapture = false;
    let revealedColor: 'blue' | 'red' | undefined = undefined;

    if (targetGhost && targetGhost.owner !== movingGhost.owner) {
      isCapture = true;
      if (gameMode === 'ai') {
        revealedColor = aiSecretColorsRef.current[targetGhost.id] || 'blue';
      } else {
        revealedColor = targetGhost.color as 'blue' | 'red';
      }
    }

    const updatedGhosts = ghostsRef.current.map((g) => {
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

    setGhosts(updatedGhosts);
    ghostsRef.current = updatedGhosts;

    let nextCapturedList = capturedGhostsRef.current;
    if (isCapture && targetGhost && revealedColor) {
      const newCaptured: CapturedGhost = {
        id: targetGhost.id,
        owner: targetGhost.owner,
        color: revealedColor,
        turnNumber,
      };
      nextCapturedList = [...capturedGhostsRef.current, newCaptured];
      setCapturedGhosts(nextCapturedList);
      capturedGhostsRef.current = nextCapturedList;

      if (revealedColor === 'blue') {
        soundManager.playCaptureGood();
      } else {
        soundManager.playCaptureBad();
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([25, 40, 25]);
      }

      setLastCapturedInfo({
        color: revealedColor,
        capturer: movingGhost.owner,
      });
    } else {
      soundManager.playMove();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.(12);
      }
      setLastCapturedInfo(undefined);
    }

    setLastMove({
      from: fromPos,
      to: toPos,
      ghostId: movingGhost.id,
      isCapture,
      capturedColor: revealedColor,
    });

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

    const hasWon = checkWinConditions(nextCapturedList, updatedGhosts);
    if (hasWon) return;

    const nextTurn: PlayerRole = turn === 'p1' ? 'p2' : 'p1';

    // In Pass & Play: Activate Battleship Privacy Shield before handing over!
    if (gameMode === 'pass-and-play') {
      setPendingNextPlayer(nextTurn);
      setIsPassShieldActive(true);
    } else {
      setTurn(nextTurn);
      setTurnNumber((t) => t + 1);

      if (gameMode === 'ai' && nextTurn === 'p2') {
        triggerAITurn();
      }
    }
  };

  // Unlock callback when next player taps 3 times
  const handlePassShieldUnlocked = () => {
    setIsPassShieldActive(false);
    setPassShieldCustomTitle(undefined);
    setPassShieldCustomSubtitle(undefined);

    if (onShieldUnlockedCallbackRef.current) {
      const cb = onShieldUnlockedCallbackRef.current;
      onShieldUnlockedCallbackRef.current = null;
      cb();
      return;
    }

    setTurn(pendingNextPlayer);
    setLocalPlayer(pendingNextPlayer);
    setTurnNumber((t) => t + 1);
  };

  // Escape handling
  const handleEscapeClick = () => {
    if (!selectedGhostId) return;
    const ghost = ghostsRef.current.find((g) => g.id === selectedGhostId);
    if (!ghost || ghost.color !== 'blue') return;

    // Check exit requirements (p1 exits at y=5, p2 exits at y=0)
    const isP1Exit = ghost.owner === 'p1' && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5);
    const isP2Exit = ghost.owner === 'p2' && ghost.y === 0 && (ghost.x === 0 || ghost.x === 5);

    if (!isP1Exit && !isP2Exit) return;

    soundManager.playEscape();

    const nextGhosts = ghostsRef.current.map((g) =>
      g.id === ghost.id ? { ...g, hasEscaped: true } : g
    );
    setGhosts(nextGhosts);
    ghostsRef.current = nextGhosts;

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
      const current = ghostsRef.current;
      const aiGhosts = current
        .filter((g) => g.owner === 'p2')
        .map((g) => ({
          ...g,
          color: aiSecretColorsRef.current[g.id] || 'blue',
          x: 5 - g.x,
          y: 5 - g.y,
        }));

      const playerGhosts = current
        .filter((g) => g.owner === 'p1')
        .map((g) => ({
          ...g,
          x: 5 - g.x,
          y: 5 - g.y,
        }));

      const aiDecision = calculateAIMove(aiGhosts, playerGhosts);
      if (!aiDecision) return;

      const targetX = 5 - aiDecision.to.x;
      const targetY = 5 - aiDecision.to.y;

      if (aiDecision.isExit) {
        soundManager.playEscape();
        setWinner('p2');
        setWinReason('escaped');
        setGameStatus('gameover');
        const escapedList = current.map((g) =>
          g.id === aiDecision.ghostId ? { ...g, hasEscaped: true, color: 'blue' as const } : g
        );
        setGhosts(escapedList);
        ghostsRef.current = escapedList;
        return;
      }

      const capturedPlayerGhost = current.find(
        (g) => !g.isCaptured && !g.hasEscaped && g.owner === 'p1' && g.x === targetX && g.y === targetY
      );

      let nextCaptured = capturedGhostsRef.current;
      if (capturedPlayerGhost) {
        const capObj: CapturedGhost = {
          id: capturedPlayerGhost.id,
          owner: 'p1',
          color: capturedPlayerGhost.color as 'blue' | 'red',
          turnNumber,
        };
        nextCaptured = [...capturedGhostsRef.current, capObj];
        setCapturedGhosts(nextCaptured);
        capturedGhostsRef.current = nextCaptured;

        if (capturedPlayerGhost.color === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }
      } else {
        soundManager.playMove();
      }

      const updatedGhosts = current.map((g) => {
        if (capturedPlayerGhost && g.id === capturedPlayerGhost.id) {
          return { ...g, isCaptured: true };
        }
        if (g.id === aiDecision.ghostId) {
          return { ...g, x: targetX, y: targetY };
        }
        return g;
      });

      setGhosts(updatedGhosts);
      ghostsRef.current = updatedGhosts;

      setLastMove({
        from: { x: 5 - aiDecision.from.x, y: 5 - aiDecision.from.y },
        to: { x: targetX, y: targetY },
        ghostId: aiDecision.ghostId,
        isCapture: !!capturedPlayerGhost,
        capturedColor: capturedPlayerGhost ? (capturedPlayerGhost.color as 'blue' | 'red') : undefined,
      });

      const hasWon = checkWinConditions(nextCaptured, updatedGhosts);
      if (!hasWon) {
        setTurn('p1');
        setTurnNumber((t) => t + 1);
        soundManager.playTurnAlert();
      }
    }, 700);
  };

  const handleResetGame = () => {
    peerService.disconnect();
    setGameStatus('lobby');
    setWinner(undefined);
    setWinReason(undefined);
    setSelectedGhostId(null);
    setValidMoves([]);
    setIsPassShieldActive(false);
    setIsP2SetupModalOpen(false);
    setPassShieldCustomTitle(undefined);
    setPassShieldCustomSubtitle(undefined);
    onShieldUnlockedCallbackRef.current = null;
  };

  const handleRematch = () => {
    if (gameMode === 'ai') {
      const nextP1 = shuffleGhostColors(mySecretGhostsRef.current);
      handleStartAI(nextP1);
    } else if (gameMode === 'pass-and-play') {
      const nextP1 = shuffleGhostColors(
        p1SavedGhostsRef.current.length > 0 ? p1SavedGhostsRef.current : mySecretGhostsRef.current
      );
      handleStartPassAndPlay(nextP1);
    } else if (gameMode === 'online' && peerService.isConnected()) {
      handleResetForRematch();
      peerService.sendMessage({ type: 'REMATCH_REQUEST' });
      peerService.sendMessage({
        type: 'SYNC_SETUP',
        ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
      });
    } else {
      handleCreateOnlineRoom(mySecretGhostsRef.current);
    }
  };

  const defaultGhosts = createInitialGhosts('p1');

  // Should board perspective flip? In Pass & Play when Player 2 is taking turn, flip so Player 2 sits at bottom!
  const shouldFlipPerspective = gameMode === 'pass-and-play' && turn === 'p2';

  return (
    <div className="app-container">
      <div className="ambient-background">
        <div className="candle-glow top-candle-1" />
        <div className="candle-glow top-candle-2" />
        <div className="candle-glow bottom-candle" />
      </div>

      {gameStatus === 'lobby' && (
        <LobbyScreen
          key={roomCode}
          onStartAI={handleStartAI}
          onStartPassAndPlay={handleStartPassAndPlay}
          onCreateOnlineRoom={handleCreateOnlineRoom}
          onJoinOnlineRoom={handleJoinOnlineRoom}
          defaultGhosts={defaultGhosts}
          prefilledRoomCode={roomCode}
        />
      )}

      {gameStatus === 'waiting' && (
        <WaitingRoom
          roomCode={roomCode}
          isHost={isHost}
          myGhosts={mySecretGhosts}
          statusText={waitingStatusText}
          onShuffle={isHost ? handleShuffleWaitingGhosts : undefined}
          onCancel={handleResetGame}
        />
      )}

      {(gameStatus === 'playing' || gameStatus === 'gameover') && (
        <main className="game-screen">
          <HeaderHud
            roomCode={roomCode}
            gameMode={gameMode}
            isMyTurn={isMyTurnNow}
            localPlayer={activeTurnPlayer}
            capturedGhosts={capturedGhosts}
            onOpenRules={() => setIsRulesOpen(true)}
            onResetGame={handleResetGame}
          />

          <div className="board-layout-container">
            <aside className="desktop-side-panel left-side">
              <Graveyard
                title="OPPONENT'S CEMETERY"
                capturedGhosts={capturedGhosts}
                targetOwner={activeTurnPlayer === 'p1' ? 'p2' : 'p1'}
                isOpponent
              />
            </aside>

            <div className="center-board-panel">
              <GameBoard
                ghosts={ghosts}
                selectedGhostId={selectedGhostId}
                validMoves={validMoves}
                activePlayer={activeTurnPlayer}
                isMyTurn={isMyTurnNow}
                isSetupPhase={false}
                flipPerspective={shouldFlipPerspective}
                lastMove={lastMove}
                onSelectGhost={handleSelectGhost}
                onTileClick={handleTileClick}
                onEscapeClick={handleEscapeClick}
              />

              <DungeonDecorations />

              <EmoteBar onSendEmote={handleSendEmote} activeEmotes={activeEmotes} />
            </div>

            <aside className="desktop-side-panel right-side">
              <Graveyard
                title="YOUR CEMETERY"
                capturedGhosts={capturedGhosts}
                targetOwner={activeTurnPlayer}
              />
            </aside>
          </div>
        </main>
      )}

      {/* Battleship Privacy Shield Overlay for Pass & Play */}
      {isPassShieldActive && (
        <PassTurnOverlay
          key={`pass-${pendingNextPlayer}-${turnNumber}`}
          nextPlayer={pendingNextPlayer}
          customTitle={passShieldCustomTitle}
          customSubtitle={passShieldCustomSubtitle}
          lastCapturedInfo={lastCapturedInfo}
          onUnlocked={handlePassShieldUnlocked}
        />
      )}

      {/* Player 2 Secret Setup Modal for Pass & Play */}
      {isP2SetupModalOpen && (
        <PassAndPlaySetupModal
          initialGhosts={p2SetupInitialGhosts}
          onConfirm={handleConfirmP2Setup}
        />
      )}

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {winner && winReason && (
        <GameOverModal
          isOpen={gameStatus === 'gameover'}
          winner={winner}
          localPlayer={activeTurnPlayer}
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
