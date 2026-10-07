import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Ghost,
  GhostColor,
  PlayerRole,
  GameMode,
  CapturedGhost,
  NetworkMessage,
  PuzzleLevel,
  AIDifficulty,
} from './types/game';
import { PUZZLE_LEVELS } from './data/puzzleLevels';
import { getTotalStars, getCompletedCount } from './utils/levelStorage';
import { useCampaign } from './hooks/useCampaign';
import { useGameState } from './hooks/useGameState';
import { moveLogger } from './utils/moveLogger';
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
import { LevelSelectModal } from './components/LevelSelectModal';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { StatsModal } from './components/StatsModal';
import { AchievementToast } from './components/AchievementToast';
import { usePlayerStats } from './hooks/usePlayerStats';
import { peerService } from './services/peerService';
import { soundManager } from './audio/soundEffects';
import {
  createInitialGhosts,
  createInitialOpponentGhosts,
  shuffleGhostColors,
} from './utils/ghostUtils';
import {
  saveActiveSession,
  loadActiveSession,
  clearActiveSession,
  type SavedGameSession,
} from './utils/sessionStorage';
import './App.css';

export const App: React.FC = () => {
  const [initialSession] = useState<SavedGameSession | null>(() => {
    const paramCode =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('room')?.toUpperCase() || undefined
        : undefined;
    const saved = loadActiveSession(paramCode);
    return saved && saved.ghosts.length > 0 && saved.status === 'playing' ? saved : null;
  });

  // Top-level mode and role state
  const [gameMode, setGameMode] = useState<GameMode>(() => initialSession?.gameMode || 'ai');
  const [localPlayer, setLocalPlayer] = useState<PlayerRole>(() => initialSession?.localPlayer || 'p1');
  const localPlayerRef = useRef<PlayerRole>(initialSession?.localPlayer || 'p1');

  // Campaign State Hook
  const campaign = useCampaign();

  // Player Career Statistics & Arcade Achievements Hook
  const {
    stats: playerStats,
    achievements,
    unlockedCount,
    isStatsModalOpen,
    setIsStatsModalOpen,
    recentToast,
    clearToast,
    recordMatch,
    resetCareerStats,
  } = usePlayerStats();
  const hasRecordedMatchStatsRef = useRef<boolean>(false);

  // Pass & Play Privacy Shield & Setup State
  const [isPassShieldActive, setIsPassShieldActive] = useState<boolean>(false);
  const [pendingNextPlayer, setPendingNextPlayer] = useState<PlayerRole>('p2');
  const [isP2SetupModalOpen, setIsP2SetupModalOpen] = useState(false);
  const [p2SetupInitialGhosts, setP2SetupInitialGhosts] = useState<Ghost[]>([]);
  const [passShieldCustomTitle, setPassShieldCustomTitle] = useState<string | undefined>(undefined);
  const [passShieldCustomSubtitle, setPassShieldCustomSubtitle] = useState<string | undefined>(undefined);
  const p1SavedGhostsRef = useRef<Ghost[]>([]);
  const onShieldUnlockedCallbackRef = useRef<(() => void) | null>(null);

  // Online P2P & Emote state
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (initialSession?.roomCode) return initialSession.roomCode;
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
    }
    return '';
  });
  const [isHost, setIsHost] = useState<boolean>(() => initialSession?.isHost ?? true);
  const [waitingStatusText, setWaitingStatusText] = useState<string>('Connecting to signaling network...');
  const [activeEmotes, setActiveEmotes] = useState<{ id: string; emoji: string; sender: 'me' | 'opponent' }[]>([]);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const latestNetworkHandlerRef = useRef<(msg: NetworkMessage) => void>(() => {});

  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);

  // Core Game State Hook
  const {
    ghosts,
    ghostsRef,
    setGhosts,
    mySecretGhosts,
    mySecretGhostsRef,
    setMySecretGhosts,
    aiTimeoutRef,
    capturedGhosts,
    capturedGhostsRef,
    setCapturedGhosts,
    selectedGhostId,
    validMoves,
    turn,
    turnRef,
    setTurn,
    turnNumber,
    turnNumberRef,
    setTurnNumber,
    gameStatus,
    setGameStatus,
    winner,
    setWinner,
    winReason,
    setWinReason,
    lastMove,
    setLastMove,
    lastCapturedInfo,
    aiDifficulty,
    checkWinConditions,
    handleSelectGhost,
    handleTileClick,
    handleEscapeClick,
    resetGameCleanly,
    loadLevel,
    startAIGame,
    startPassAndPlay,
    resetForOnlineRematch,
  } = useGameState({
    gameMode,
    localPlayer,
    currentLevel: campaign.currentLevel,
    isPassShieldActive,
    initialSession,
    onLevelWon: (moves) => {
      campaign.recordLevelWin(moves);
    },
    onIncrementLevelMove: () => {
      campaign.incrementMoves();
    },
    onPassTurnToPlayer: (nextPlayer) => {
      setPendingNextPlayer(nextPlayer);
      setIsPassShieldActive(true);
    },
    onSendNetworkMove: (data) => {
      if (data.isCapture && data.targetGhostId) {
        peerService.sendMessage({
          type: 'CAPTURE_ATTEMPT',
          ghostId: data.ghostId,
          toX: data.toX,
          toY: data.toY,
          targetGhostId: data.targetGhostId,
          nextTurn: data.nextTurn,
          turnNumber: data.nextTurnNumber,
        });
      } else {
        peerService.sendMessage({
          type: 'MOVE',
          ghostId: data.ghostId,
          toX: data.toX,
          toY: data.toY,
          nextTurn: data.nextTurn,
          turnNumber: data.nextTurnNumber,
        });
      }
    },
    onSendNetworkEscape: (ghostId) => {
      peerService.sendMessage({
        type: 'ESCAPE',
        ghostId,
      });
    },
  });

  // Reconnect WebRTC session upon page reload if mid-match
  useEffect(() => {
    soundManager.initFromStorage();

    if (initialSession && initialSession.gameMode === 'online') {
      if (initialSession.isHost) {
        peerService
          .createRoom(initialSession.roomCode)
          .then(() => {
            peerService.onPeerJoined = () => {
              peerService.sendMessage({
                type: 'STATE_SYNC',
                ghosts: ghostsRef.current.map((g) => ({
                  id: g.id,
                  x: g.x,
                  y: g.y,
                  isCaptured: g.isCaptured,
                  hasEscaped: g.hasEscaped,
                  color: g.isCaptured || g.hasEscaped ? g.color : 'unknown',
                })),
                turn: turnRef.current,
                turnNumber: turnNumberRef.current,
                capturedGhosts: capturedGhostsRef.current,
              });
            };
          })
          .catch(console.error);
      } else {
        peerService
          .joinRoom(initialSession.roomCode)
          .then(() => {
            peerService.sendMessage({
              type: 'STATE_SYNC_REQUEST',
              fromRole: 'p2',
            });
          })
          .catch(console.error);
      }
    }
  }, [initialSession, ghostsRef, turnRef, turnNumberRef, capturedGhostsRef]);

  // Continuously persist active match state to survive future refreshes
  useEffect(() => {
    if (gameStatus === 'playing') {
      saveActiveSession({
        roomCode,
        gameMode,
        localPlayer,
        isHost,
        turn,
        turnNumber,
        ghosts,
        mySecretGhosts,
        capturedGhosts,
        status: gameStatus,
      });
    }
  }, [
    gameStatus,
    roomCode,
    gameMode,
    localPlayer,
    isHost,
    turn,
    turnNumber,
    ghosts,
    mySecretGhosts,
    capturedGhosts,
  ]);

  // Record match results for player statistics and achievements
  useEffect(() => {
    if (gameStatus === 'playing') {
      hasRecordedMatchStatsRef.current = false;
    } else if (gameStatus === 'gameover' && winner && winReason && !hasRecordedMatchStatsRef.current) {
      hasRecordedMatchStatsRef.current = true;
      const opponentRole = localPlayer === 'p1' ? 'p2' : 'p1';
      const isWinner = gameMode === 'pass-and-play' ? true : winner === localPlayer;

      const myCaptured = capturedGhosts.filter((c) => c.owner === opponentRole);
      const myLost = capturedGhosts.filter((c) => c.owner === localPlayer);

      const capturedBlues = myCaptured.filter((c) => c.color === 'blue').length;
      const capturedReds = myCaptured.filter((c) => c.color === 'red').length;
      const lostBlues = myLost.filter((c) => c.color === 'blue').length;
      const lostReds = myLost.filter((c) => c.color === 'red').length;

      const movesTaken = gameMode === 'levels' ? campaign.levelMovesTaken : turnNumber;

      recordMatch({
        gameMode,
        aiDifficulty: gameMode === 'ai' ? aiDifficulty : undefined,
        levelId: gameMode === 'levels' ? campaign.currentLevel?.id : undefined,
        isWinner,
        winReason,
        movesTaken,
        capturedBlues,
        capturedReds,
        lostBlues,
        lostReds,
        starsEarned:
          gameMode === 'levels' && campaign.levelCompleteModalData
            ? campaign.levelCompleteModalData.starsEarned
            : undefined,
      });
    }
  }, [
    gameStatus,
    winner,
    winReason,
    gameMode,
    localPlayer,
    capturedGhosts,
    turnNumber,
    aiDifficulty,
    campaign.levelMovesTaken,
    campaign.currentLevel,
    campaign.levelCompleteModalData,
    recordMatch,
  ]);

  // Campaign Actions
  const handleSelectLevel = useCallback(
    (level: PuzzleLevel) => {
      setGameMode('levels');
      campaign.setLevel(level);
      setLocalPlayer('p1');
      loadLevel(level);
    },
    [campaign, loadLevel]
  );

  const handleRestartCurrentLevel = useCallback(() => {
    if (campaign.currentLevel) {
      handleSelectLevel(campaign.currentLevel);
    }
  }, [campaign.currentLevel, handleSelectLevel]);

  const handleNextLevel = useCallback(() => {
    if (campaign.currentLevel && campaign.currentLevel.id < 50) {
      const nextLvl = PUZZLE_LEVELS[campaign.currentLevel.id];
      if (nextLvl) {
        handleSelectLevel(nextLvl);
      }
    }
  }, [campaign.currentLevel, handleSelectLevel]);

  // AI Actions
  const handleStartAI = useCallback(
    (initialGhosts: Ghost[], difficulty: AIDifficulty = 'hard') => {
      setGameMode('ai');
      campaign.setLevel(null);
      setLocalPlayer('p1');
      startAIGame(initialGhosts, difficulty);
    },
    [campaign, startAIGame]
  );

  // Pass & Play Actions
  const handleStartPassAndPlay = useCallback(
    (initialGhosts: Ghost[]) => {
      setGameMode('pass-and-play');
      campaign.setLevel(null);
      setLocalPlayer('p1');

      const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
      p1SavedGhostsRef.current = p1Ghosts;

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

      startPassAndPlay(p1Ghosts, defaultP2Ghosts);

      // Instruct to pass to Player 2 for setup
      setPendingNextPlayer('p2');
      setPassShieldCustomTitle('SETUP PHASE: PASS TO PLAYER 2');
      setPassShieldCustomSubtitle('Hand device to Player 2 to arrange their secret ghosts!');
      onShieldUnlockedCallbackRef.current = () => {
        setIsP2SetupModalOpen(true);
      };
      setIsPassShieldActive(true);
    },
    [campaign, startPassAndPlay]
  );

  const handleConfirmP2Setup = useCallback(
    (p2FinalGhosts: Ghost[]) => {
      setIsP2SetupModalOpen(false);
      const p1Ghosts = p1SavedGhostsRef.current;
      const initialBoard = [...p1Ghosts, ...p2FinalGhosts];
      setGhosts(initialBoard);
      ghostsRef.current = initialBoard;

      setPendingNextPlayer('p1');
      setPassShieldCustomTitle('READY TO PLAY! PASS TO PLAYER 1');
      setPassShieldCustomSubtitle('Player 1 takes the first move! Tap 3 times to reveal board.');
      onShieldUnlockedCallbackRef.current = null;
      setIsPassShieldActive(true);
    },
    [setGhosts, ghostsRef]
  );

  const handlePassShieldUnlocked = useCallback(() => {
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
    localPlayerRef.current = pendingNextPlayer;
    setTurnNumber((t) => t + 1);
  }, [pendingNextPlayer, setTurn, setTurnNumber]);

  // Online Room Hosting & Joining
  const handleShuffleWaitingGhosts = useCallback(() => {
    soundManager.playSelect();
    const shuffled = shuffleGhostColors(mySecretGhostsRef.current);
    setMySecretGhosts(shuffled);
    mySecretGhostsRef.current = shuffled;
    const oppPieces = createInitialOpponentGhosts('p2');
    const updatedBoard = [...shuffled, ...oppPieces];
    setGhosts(updatedBoard);
    ghostsRef.current = updatedBoard;
  }, [setMySecretGhosts, mySecretGhostsRef, setGhosts, ghostsRef]);

  const handleCreateOnlineRoom = useCallback(
    async (initialGhosts: Ghost[]) => {
      setGameMode('online');
      campaign.setLevel(null);
      setLocalPlayer('p1');
      setIsHost(true);
      resetGameCleanly('waiting');
      setWaitingStatusText('Connecting to peer-to-peer signaling network...');

      const p1Ghosts = initialGhosts.map((g) => ({ ...g, owner: 'p1' as const }));
      setMySecretGhosts(p1Ghosts);
      mySecretGhostsRef.current = p1Ghosts;

      moveLogger.startNewSession({
        gameMode: 'online',
      });

      try {
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
    },
    [campaign, resetGameCleanly, setMySecretGhosts, mySecretGhostsRef, setGhosts, ghostsRef, setGameStatus]
  );

  const handleJoinOnlineRoom = useCallback(
    async (code: string, initialGhosts: Ghost[]) => {
      setGameMode('online');
      campaign.setLevel(null);
      setLocalPlayer('p2');
      setIsHost(false);
      resetGameCleanly('waiting');

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

      moveLogger.startNewSession({
        gameMode: 'online',
      });

      try {
        const p1Ghosts = createInitialOpponentGhosts('p1');
        const initialBoard = [...p2Ghosts, ...p1Ghosts];
        setGhosts(initialBoard);
        ghostsRef.current = initialBoard;

        await peerService.joinRoom(code);
        setWaitingStatusText('Connected to Host! Synchronizing dungeon...');

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
    },
    [campaign, resetGameCleanly, setMySecretGhosts, mySecretGhostsRef, setGhosts, ghostsRef, setGameStatus]
  );

  // Emotes
  const handleShowEmote = useCallback((emoji: string, sender: 'me' | 'opponent') => {
    const id = `${Date.now()}-${Math.random()}`;
    setActiveEmotes((prev) => [...prev, { id, emoji, sender }]);
    setTimeout(() => {
      setActiveEmotes((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
  }, []);

  const handleSendEmote = useCallback(
    (emoji: string) => {
      handleShowEmote(emoji, 'me');
      if (gameMode === 'online') {
        peerService.sendMessage({
          type: 'EMOTE',
          emoji,
          sender: localPlayerRef.current,
        });
      }
    },
    [handleShowEmote, gameMode]
  );

  // Network messages listener
  const handleNetworkMessage = useCallback(
    (msg: NetworkMessage) => {
      const myRole = localPlayerRef.current;
      const opponentRole: PlayerRole = myRole === 'p1' ? 'p2' : 'p1';

      if (msg.type === 'SYNC_SETUP') {
        const myPieces = mySecretGhostsRef.current;
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

        if (myRole === 'p1') {
          peerService.sendMessage({
            type: 'SYNC_SETUP',
            ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
          });
        }
      } else if (msg.type === 'STATE_SYNC') {
        const myPieces = mySecretGhostsRef.current;
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
        setMySecretGhosts(updatedMyPieces);
        mySecretGhostsRef.current = updatedMyPieces;
        setTurn(msg.turn);
        setTurnNumber(msg.turnNumber);
        setCapturedGhosts(msg.capturedGhosts);
        capturedGhostsRef.current = msg.capturedGhosts;
        setGameStatus('playing');
        soundManager.playTurnAlert();
      } else if (msg.type === 'STATE_SYNC_REQUEST') {
        peerService.sendMessage({
          type: 'STATE_SYNC',
          ghosts: ghostsRef.current.map((g) => ({
            id: g.id,
            x: g.x,
            y: g.y,
            isCaptured: g.isCaptured,
            hasEscaped: g.hasEscaped,
            color: g.isCaptured || g.hasEscaped ? g.color : 'unknown',
          })),
          turn: turnRef.current,
          turnNumber: turnNumberRef.current,
          capturedGhosts: capturedGhostsRef.current,
        });
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
        const nextTurn = msg.nextTurn || myRole;
        setTurn(nextTurn);
        setTurnNumber((t) => msg.turnNumber ?? (t + 1));
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

        setMySecretGhosts((prev) =>
          prev.map((g) => (g.id === msg.targetGhostId ? { ...g, isCaptured: true } : g))
        );
        mySecretGhostsRef.current = mySecretGhostsRef.current.map((g) =>
          g.id === msg.targetGhostId ? { ...g, isCaptured: true } : g
        );

        const newCaptured: CapturedGhost = {
          id: msg.targetGhostId,
          owner: myRole,
          color: revealedColor as 'blue' | 'red',
          turnNumber: msg.turnNumber ?? turnNumberRef.current,
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

        const nextTurn = msg.nextTurn || myRole;
        setTurn(nextTurn);
        setTurnNumber((t) => msg.turnNumber ?? (t + 1));
        soundManager.playTurnAlert();
      } else if (msg.type === 'CAPTURE_REVEAL') {
        const nextGhosts = ghostsRef.current.map((g) =>
          g.id === msg.targetGhostId ? { ...g, isCaptured: true, color: msg.revealedColor } : g
        );
        setGhosts(nextGhosts);
        ghostsRef.current = nextGhosts;

        const newCaptured: CapturedGhost = {
          id: msg.targetGhostId,
          owner: opponentRole,
          color: msg.revealedColor,
          turnNumber: turnNumberRef.current,
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
        setWinner(localPlayerRef.current === 'p1' ? 'p2' : 'p1');
        setWinReason('escaped');
        setGameStatus('gameover');
      } else if (msg.type === 'REMATCH_REQUEST') {
        resetForOnlineRematch();
        peerService.sendMessage({
          type: 'SYNC_SETUP',
          ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
        });
      } else if (msg.type === 'EMOTE') {
        handleShowEmote(msg.emoji, 'opponent');
      }
    },
    [
      checkWinConditions,
      handleShowEmote,
      resetForOnlineRematch,
      setGhosts,
      ghostsRef,
      setGameStatus,
      setMySecretGhosts,
      mySecretGhostsRef,
      setTurn,
      setTurnNumber,
      setCapturedGhosts,
      capturedGhostsRef,
      setLastMove,
      setWinner,
      setWinReason,
      turnRef,
      turnNumberRef,
    ]
  );

  useEffect(() => {
    latestNetworkHandlerRef.current = handleNetworkMessage;
  });

  useEffect(() => {
    peerService.onMessage = (msg: NetworkMessage) => {
      latestNetworkHandlerRef.current(msg);
    };
  }, []);

  // Forfeit / Exit Game to Main Menu
  const handleResetGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
    peerService.disconnect();
    clearActiveSession();
    resetGameCleanly('lobby');
    campaign.setLevel(null);
    campaign.setLevelCompleteModalData(null);
    campaign.setIsLevelSelectOpen(false);
    setIsPassShieldActive(false);
    setIsP2SetupModalOpen(false);
    setPassShieldCustomTitle(undefined);
    setPassShieldCustomSubtitle(undefined);
    onShieldUnlockedCallbackRef.current = null;
  }, [aiTimeoutRef, resetGameCleanly, campaign]);

  // Rematch / Play Again
  const handleRematch = useCallback(() => {
    if (gameMode === 'levels') {
      if (campaign.currentLevel) {
        handleSelectLevel(campaign.currentLevel);
      }
    } else if (gameMode === 'ai') {
      const freshP1 = createInitialGhosts('p1');
      const nextP1 = shuffleGhostColors(freshP1);
      handleStartAI(nextP1, aiDifficulty);
    } else if (gameMode === 'pass-and-play') {
      const freshP1 = createInitialGhosts('p1');
      const nextP1 = shuffleGhostColors(freshP1);
      handleStartPassAndPlay(nextP1);
    } else if (gameMode === 'online' && peerService.isConnected()) {
      resetForOnlineRematch();
      peerService.sendMessage({ type: 'REMATCH_REQUEST' });
      peerService.sendMessage({
        type: 'SYNC_SETUP',
        ghosts: mySecretGhostsRef.current.map((g) => ({ id: g.id, x: g.x, y: g.y })),
      });
    } else {
      handleCreateOnlineRoom(mySecretGhostsRef.current);
    }
  }, [
    gameMode,
    campaign.currentLevel,
    handleSelectLevel,
    handleStartAI,
    mySecretGhostsRef,
    aiDifficulty,
    handleStartPassAndPlay,
    resetForOnlineRematch,
    handleCreateOnlineRoom,
  ]);

  // Export Match Telemetry JSON
  const handleExportMoves = useCallback(() => {
    soundManager.playSelect();
    moveLogger.downloadSessionJSON();
  }, []);

  // Active player in current turn
  const activeTurnPlayer = gameMode === 'pass-and-play' ? turn : localPlayer;
  const isMyTurnNow = gameMode === 'pass-and-play' ? true : turn === localPlayer;
  const shouldFlipPerspective = gameMode === 'pass-and-play' && turn === 'p2';
  const defaultGhosts = createInitialGhosts('p1');

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
          onOpenLevelSelect={() => campaign.setIsLevelSelectOpen(true)}
          totalStars={getTotalStars(campaign.levelProgress)}
          completedLevelsCount={getCompletedCount(campaign.levelProgress)}
          defaultGhosts={defaultGhosts}
          prefilledRoomCode={roomCode}
          initialDifficulty={aiDifficulty}
          onOpenStats={() => setIsStatsModalOpen(true)}
          unlockedAchievementsCount={unlockedCount}
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
            allGhosts={ghosts}
            currentLevel={campaign.currentLevel || undefined}
            levelMovesTaken={campaign.levelMovesTaken}
            aiDifficulty={aiDifficulty}
            onOpenRules={() => setIsRulesOpen(true)}
            onResetGame={handleResetGame}
            onRestartLevel={handleRestartCurrentLevel}
            onOpenLevelSelect={() => campaign.setIsLevelSelectOpen(true)}
            onExportMoves={handleExportMoves}
            onOpenStats={() => setIsStatsModalOpen(true)}
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

      {/* 50-Level Campaign Level Select Modal */}
      <LevelSelectModal
        isOpen={campaign.isLevelSelectOpen}
        onClose={() => campaign.setIsLevelSelectOpen(false)}
        onSelectLevel={handleSelectLevel}
        currentLevelId={campaign.currentLevel?.id}
      />

      {/* Campaign Level Victory Modal */}
      {campaign.levelCompleteModalData && (
        <LevelCompleteModal
          isOpen={campaign.levelCompleteModalData.isOpen}
          level={campaign.levelCompleteModalData.level}
          movesTaken={campaign.levelCompleteModalData.movesTaken}
          starsEarned={campaign.levelCompleteModalData.starsEarned}
          isNewBest={campaign.levelCompleteModalData.isNewBest}
          bestMoves={campaign.levelCompleteModalData.bestMoves}
          onNextLevel={handleNextLevel}
          onReplayLevel={handleRestartCurrentLevel}
          onOpenLevelSelect={() => {
            campaign.setLevelCompleteModalData(null);
            campaign.setIsLevelSelectOpen(true);
          }}
          onBackToMenu={handleResetGame}
          onExportMoves={handleExportMoves}
        />
      )}

      {/* Standard Game Over Modal - never shown for Campaign level victories */}
      {winner &&
        winReason &&
        gameStatus === 'gameover' &&
        (gameMode !== 'levels' || winner === 'p2') &&
        !campaign.levelCompleteModalData?.isOpen && (
          <GameOverModal
            isOpen={gameStatus === 'gameover'}
            winner={winner}
            localPlayer={activeTurnPlayer}
            winReason={winReason}
            allGhosts={ghosts}
            onRematch={handleRematch}
            onHome={handleResetGame}
            onExportMoves={handleExportMoves}
          />
        )}

      {/* Achievement Unlocked Retro Toast */}
      {recentToast && (
        <AchievementToast
          achievement={recentToast}
          onClose={clearToast}
        />
      )}

      {/* Career Statistics & Retro Trophy Cabinet Modal */}
      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        stats={playerStats}
        achievements={achievements}
        onResetStats={resetCareerStats}
      />
    </div>
  );
};

export default App;
