import { useState, useRef, useCallback, useEffect } from 'react';
import type {
  Ghost,
  PlayerRole,
  GameMode,
  CapturedGhost,
  WinReason,
  AIDifficulty,
  PuzzleLevel,
} from '../types/game';
import { getValidMovesForGhost, calculateAIMove } from '../services/aiService';
import { soundManager } from '../audio/soundEffects';
import { moveLogger } from '../utils/moveLogger';
import { createInitialOpponentGhosts } from '../utils/ghostUtils';
import type { SavedGameSession } from '../utils/sessionStorage';

interface UseGameStateProps {
  gameMode: GameMode;
  localPlayer: PlayerRole;
  currentLevel: PuzzleLevel | null;
  isPassShieldActive?: boolean;
  initialSession?: SavedGameSession | null;
  onLevelWon?: (finalMoves: number) => void;
  onIncrementLevelMove?: () => void;
  onPassTurnToPlayer?: (nextPlayer: PlayerRole) => void;
  onSendNetworkMove?: (data: {
    ghostId: string;
    toX: number;
    toY: number;
    isCapture: boolean;
    targetGhostId?: string;
    nextTurn: PlayerRole;
    nextTurnNumber: number;
  }) => void;
  onSendNetworkEscape?: (ghostId: string) => void;
}

export function useGameState({
  gameMode,
  localPlayer,
  currentLevel,
  isPassShieldActive = false,
  initialSession,
  onLevelWon,
  onIncrementLevelMove,
  onPassTurnToPlayer,
  onSendNetworkMove,
  onSendNetworkEscape,
}: UseGameStateProps) {
  const [ghosts, setGhosts] = useState<Ghost[]>(() => initialSession?.ghosts || []);
  const ghostsRef = useRef<Ghost[]>(initialSession?.ghosts || []);

  const [mySecretGhosts, setMySecretGhosts] = useState<Ghost[]>(() => initialSession?.mySecretGhosts || []);
  const mySecretGhostsRef = useRef<Ghost[]>(initialSession?.mySecretGhosts || []);

  const aiSecretColorsRef = useRef<Record<string, 'blue' | 'red'>>({});
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAIMoveRef = useRef<{
    ghostId: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
  } | null>(null);

  const [capturedGhosts, setCapturedGhosts] = useState<CapturedGhost[]>(() => initialSession?.capturedGhosts || []);
  const capturedGhostsRef = useRef<CapturedGhost[]>(initialSession?.capturedGhosts || []);
  const currentLevelRef = useRef<PuzzleLevel | null>(currentLevel || null);

  const [selectedGhostId, setSelectedGhostId] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<{ x: number; y: number; isExit?: boolean }[]>([]);

  const [turn, setTurn] = useState<PlayerRole>(() => initialSession?.turn || 'p1');
  const turnRef = useRef<PlayerRole>(initialSession?.turn || 'p1');
  const [turnNumber, setTurnNumber] = useState<number>(() => initialSession?.turnNumber || 1);
  const turnNumberRef = useRef<number>(initialSession?.turnNumber || 1);

  const [gameStatus, setGameStatus] = useState<'lobby' | 'waiting' | 'playing' | 'gameover'>(
    () => initialSession?.status || 'lobby'
  );
  const [winner, setWinner] = useState<PlayerRole | undefined>(undefined);
  const [winReason, setWinReason] = useState<WinReason | undefined>(undefined);

  const [lastMove, setLastMove] = useState<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    ghostId: string;
    isCapture?: boolean;
    capturedColor?: 'blue' | 'red';
  } | undefined>(undefined);

  const [lastCapturedInfo, setLastCapturedInfo] = useState<
    { color: 'blue' | 'red'; capturer: PlayerRole } | undefined
  >(undefined);

  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('hard');

  // Keep refs in sync
  useEffect(() => {
    ghostsRef.current = ghosts;
  }, [ghosts]);

  useEffect(() => {
    mySecretGhostsRef.current = mySecretGhosts;
  }, [mySecretGhosts]);

  useEffect(() => {
    capturedGhostsRef.current = capturedGhosts;
  }, [capturedGhosts]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    turnNumberRef.current = turnNumber;
  }, [turnNumber]);

  useEffect(() => {
    currentLevelRef.current = currentLevel || null;
  }, [currentLevel]);

  // Clean up any pending AI timeouts on unmount
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, []);

  // Universal Win Condition Evaluator
  const checkWinConditions = useCallback(
    (currentCaptured: CapturedGhost[], currentGhosts: Ghost[]): boolean => {
      let winningPlayer: PlayerRole | null = null;
      let winReasonDetermined: WinReason | null = null;

      // 1. Escaped ghost check (immediate victory)
      const escaped = currentGhosts.find((g) => g.hasEscaped);
      if (escaped) {
        winningPlayer = escaped.owner;
        winReasonDetermined = 'escaped';
      }

      // 2. 4 Blue Ghosts captured
      if (!winningPlayer) {
        const p1CapturedBlueFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'blue').length;
        const p2CapturedBlueFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'blue').length;

        if (p1CapturedBlueFromP2 >= 4) {
          winningPlayer = 'p1';
          winReasonDetermined = 'captured_all_blue';
        } else if (p2CapturedBlueFromP1 >= 4) {
          winningPlayer = 'p2';
          winReasonDetermined = 'captured_all_blue';
        }
      }

      // 3. 4 Red Ghosts captured (Poison Pill trap -> opponent wins)
      if (!winningPlayer) {
        const p1CapturedRedFromP2 = currentCaptured.filter((g) => g.owner === 'p2' && g.color === 'red').length;
        const p2CapturedRedFromP1 = currentCaptured.filter((g) => g.owner === 'p1' && g.color === 'red').length;

        if (p1CapturedRedFromP2 >= 4) {
          winningPlayer = 'p2';
          winReasonDetermined = 'captured_all_red';
        } else if (p2CapturedRedFromP1 >= 4) {
          winningPlayer = 'p1';
          winReasonDetermined = 'captured_all_red';
        }
      }

      // 4. Board Elimination Check for custom levels & puzzle scenarios:
      if (!winningPlayer) {
        const activeAiGhosts = currentGhosts.filter((g) => g.owner === 'p2' && !g.isCaptured && !g.hasEscaped);
        const activeP1Ghosts = currentGhosts.filter((g) => g.owner === 'p1' && !g.isCaptured && !g.hasEscaped);

        const activeAiBlueGhosts = activeAiGhosts.filter(
          (g) => g.color === 'blue' || aiSecretColorsRef.current[g.id] === 'blue'
        );
        const activeP1BlueGhosts = activeP1Ghosts.filter((g) => g.color === 'blue');

        const currentLvl = currentLevelRef.current;
        const p1StartedWithBlue =
          gameMode === 'levels'
            ? (currentLvl ? currentLvl.playerGhosts.some((g) => g.color === 'blue') : false)
            : true;
        const aiStartedWithBlue =
          gameMode === 'levels'
            ? (currentLvl ? currentLvl.aiGhosts.some((g) => g.color === 'blue') : false)
            : true;

        // Player 1 defeated: 0 active ghosts left, or all player blue ghosts captured
        if (activeP1Ghosts.length === 0 || (p1StartedWithBlue && activeP1BlueGhosts.length === 0)) {
          winningPlayer = 'p2';
          winReasonDetermined = 'captured_all_blue';
        }
        // AI defeated: 0 active ghosts left, or all AI blue ghosts captured (only if AI started with blue)
        else if (activeAiGhosts.length === 0 || (aiStartedWithBlue && activeAiBlueGhosts.length === 0)) {
          winningPlayer = 'p1';
          winReasonDetermined = 'captured_all_blue';
        }
      }

      if (winningPlayer && winReasonDetermined) {
        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
          aiTimeoutRef.current = null;
        }

        setWinner(winningPlayer);
        setWinReason(winReasonDetermined);
        setGameStatus('gameover');

        moveLogger.finishSession(winningPlayer, winReasonDetermined);

        if (gameMode === 'levels' && winningPlayer === 'p1' && onLevelWon) {
          onLevelWon(turnNumberRef.current);
        }
        return true;
      }

      return false;
    },
    [gameMode, onLevelWon]
  );

  // Trigger AI Turn with safe timeout ref
  const triggerAITurn = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }

    aiTimeoutRef.current = setTimeout(() => {
      aiTimeoutRef.current = null;
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

      // If AI has no monsters left on the board, check win condition immediately
      const activeAi = aiGhosts.filter((g) => !g.isCaptured && !g.hasEscaped);
      if (activeAi.length === 0) {
        checkWinConditions(capturedGhostsRef.current, current);
        return;
      }

      const aiDecision = calculateAIMove(aiGhosts, playerGhosts, {
        difficulty: aiDifficulty,
        puzzleBehavior: gameMode === 'levels' ? currentLevel?.aiBehavior : undefined,
        playerSecretGhosts: mySecretGhostsRef.current,
        capturedGhosts: capturedGhostsRef.current,
        lastAIMove: lastAIMoveRef.current,
      });

      if (!aiDecision) {
        checkWinConditions(capturedGhostsRef.current, current);
        return;
      }

      const targetX = 5 - aiDecision.to.x;
      const targetY = 5 - aiDecision.to.y;

      // Escape
      if (aiDecision.isExit) {
        soundManager.playEscape();
        moveLogger.recordMove({
          turn: 'p2',
          turnNumber: turnNumberRef.current,
          ghostId: aiDecision.ghostId,
          from: { x: 5 - aiDecision.from.x, y: 5 - aiDecision.from.y },
          to: { x: targetX, y: targetY },
          isCapture: false,
          isExit: true,
        });

        const escapedList = current.map((g) =>
          g.id === aiDecision.ghostId ? { ...g, hasEscaped: true, color: 'blue' as const } : g
        );
        setGhosts(escapedList);
        ghostsRef.current = escapedList;

        setWinner('p2');
        setWinReason('escaped');
        setGameStatus('gameover');
        moveLogger.finishSession('p2', 'escaped');
        return;
      }

      // Check capture of player ghost
      const capturedPlayerGhost = current.find(
        (g) => !g.isCaptured && !g.hasEscaped && g.owner === 'p1' && g.x === targetX && g.y === targetY
      );

      let nextCaptured = capturedGhostsRef.current;
      if (capturedPlayerGhost) {
        const capObj: CapturedGhost = {
          id: capturedPlayerGhost.id,
          owner: 'p1',
          color: capturedPlayerGhost.color as 'blue' | 'red',
          turnNumber: turnNumberRef.current,
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

      moveLogger.recordMove({
        turn: 'p2',
        turnNumber: turnNumberRef.current,
        ghostId: aiDecision.ghostId,
        from: { x: 5 - aiDecision.from.x, y: 5 - aiDecision.from.y },
        to: { x: targetX, y: targetY },
        isCapture: !!capturedPlayerGhost,
        capturedGhostId: capturedPlayerGhost?.id,
        capturedColor: capturedPlayerGhost ? (capturedPlayerGhost.color as 'blue' | 'red') : undefined,
        isExit: false,
      });

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

      lastAIMoveRef.current = {
        ghostId: aiDecision.ghostId,
        from: aiDecision.from,
        to: aiDecision.to,
      };

      const hasWon = checkWinConditions(nextCaptured, updatedGhosts);
      if (!hasWon) {
        setTurn('p1');
        turnRef.current = 'p1';
        setTurnNumber((t) => t + 1);
        turnNumberRef.current += 1;
        soundManager.playTurnAlert();
      }
    }, 700);
  }, [aiDifficulty, currentLevel, gameMode, checkWinConditions]);

  // Select ghost on board
  const handleSelectGhost = useCallback(
    (ghost: Ghost) => {
      if (gameStatus !== 'playing') return;
      if (isPassShieldActive) return;

      const activeRole = gameMode === 'pass-and-play' ? turnRef.current : localPlayer;
      if (ghost.owner !== activeRole) return;
      if (gameMode !== 'pass-and-play' && turnRef.current !== localPlayer) return;

      soundManager.playSelect();

      if (selectedGhostId === ghost.id) {
        setSelectedGhostId(null);
        setValidMoves([]);
        return;
      }

      setSelectedGhostId(ghost.id);
      const moves = getValidMovesForGhost(
        ghost,
        ghostsRef.current,
        ghost.owner,
        true,
        gameMode === 'online'
      );
      setValidMoves(moves);
    },
    [gameStatus, isPassShieldActive, gameMode, localPlayer, selectedGhostId]
  );

  // Move ghost to tile
  const handleTileClick = useCallback(
    (targetX: number, targetY: number) => {
      if (isPassShieldActive) return;
      if (!selectedGhostId) return;

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
        if (gameMode === 'ai' || gameMode === 'levels') {
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

      if (movingGhost.owner === localPlayer) {
        setMySecretGhosts((prev) =>
          prev.map((g) => (g.id === movingGhost.id ? { ...g, x: targetX, y: targetY } : g))
        );
        mySecretGhostsRef.current = mySecretGhostsRef.current.map((g) =>
          g.id === movingGhost.id ? { ...g, x: targetX, y: targetY } : g
        );
      }

      let nextCapturedList = capturedGhostsRef.current;
      if (isCapture && targetGhost && revealedColor) {
        const newCaptured: CapturedGhost = {
          id: targetGhost.id,
          owner: targetGhost.owner,
          color: revealedColor,
          turnNumber: turnNumberRef.current,
        };
        nextCapturedList = [...capturedGhostsRef.current, newCaptured];
        setCapturedGhosts(nextCapturedList);
        capturedGhostsRef.current = nextCapturedList;

        if (revealedColor === 'blue') {
          soundManager.playCaptureGood();
        } else {
          soundManager.playCaptureBad();
        }

        setLastCapturedInfo({
          color: revealedColor,
          capturer: movingGhost.owner,
        });
      } else {
        soundManager.playMove();
        setLastCapturedInfo(undefined);
      }

      moveLogger.recordMove({
        turn: turnRef.current,
        turnNumber: turnNumberRef.current,
        ghostId: movingGhost.id,
        from: fromPos,
        to: toPos,
        isCapture,
        capturedGhostId: targetGhost?.id,
        capturedColor: revealedColor,
        isExit: false,
      });

      if (gameMode === 'levels' && turnRef.current === 'p1' && onIncrementLevelMove) {
        onIncrementLevelMove();
      }

      setLastMove({
        from: fromPos,
        to: toPos,
        ghostId: movingGhost.id,
        isCapture,
        capturedColor: revealedColor,
      });

      const nextTurn: PlayerRole = turnRef.current === 'p1' ? 'p2' : 'p1';
      const nextTurnNumber = turnNumberRef.current + 1;

      if (gameMode === 'online' && onSendNetworkMove) {
        onSendNetworkMove({
          ghostId: movingGhost.id,
          toX: targetX,
          toY: targetY,
          isCapture,
          targetGhostId: targetGhost?.id,
          nextTurn,
          nextTurnNumber,
        });
      }

      setSelectedGhostId(null);
      setValidMoves([]);

      const hasWon = checkWinConditions(nextCapturedList, updatedGhosts);
      if (hasWon) return;

      if (gameMode === 'pass-and-play' && onPassTurnToPlayer) {
        onPassTurnToPlayer(nextTurn);
      } else {
        setTurn(nextTurn);
        turnRef.current = nextTurn;
        setTurnNumber((t) => t + 1);
        turnNumberRef.current += 1;

        if ((gameMode === 'ai' || gameMode === 'levels') && nextTurn === 'p2') {
          triggerAITurn();
        }
      }
    },
    [
      selectedGhostId,
      validMoves,
      gameMode,
      localPlayer,
      isPassShieldActive,
      onIncrementLevelMove,
      onSendNetworkMove,
      checkWinConditions,
      onPassTurnToPlayer,
      triggerAITurn,
    ]
  );

  // Escape click
  const handleEscapeClick = useCallback(() => {
    if (isPassShieldActive) return;
    if (!selectedGhostId) return;
    const ghost = ghostsRef.current.find((g) => g.id === selectedGhostId);
    if (!ghost || ghost.color !== 'blue') return;

    // Check exit requirements (in online/AI/levels mode, player advances to y=5; in pass & play, p1 to y=5, p2 to y=0)
    const isP1Exit = ghost.owner === 'p1' && ghost.y === 5 && (ghost.x === 0 || ghost.x === 5);
    const isP2Exit = ghost.owner === 'p2' && ghost.y === 0 && (ghost.x === 0 || ghost.x === 5);
    if (!isP1Exit && !isP2Exit) return;

    soundManager.playEscape();

    const nextGhosts = ghostsRef.current.map((g) =>
      g.id === ghost.id ? { ...g, hasEscaped: true } : g
    );
    setGhosts(nextGhosts);
    ghostsRef.current = nextGhosts;

    moveLogger.recordMove({
      turn: ghost.owner,
      turnNumber: turnNumberRef.current,
      ghostId: ghost.id,
      from: { x: ghost.x, y: ghost.y },
      to: { x: ghost.x, y: ghost.owner === 'p1' ? ghost.y + 1 : ghost.y - 1 },
      isCapture: false,
      isExit: true,
    });

    if (gameMode === 'online' && onSendNetworkEscape) {
      onSendNetworkEscape(ghost.id);
    }

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    setWinner(ghost.owner);
    setWinReason('escaped');
    setGameStatus('gameover');
    moveLogger.finishSession(ghost.owner, 'escaped');

    if (gameMode === 'levels' && ghost.owner === 'p1' && onLevelWon) {
      onLevelWon(turnNumberRef.current);
    }
  }, [selectedGhostId, isPassShieldActive, gameMode, onSendNetworkEscape, onLevelWon]);

  // Clean Reset for New Game / Rematch
  const resetGameCleanly = useCallback(
    (newStatus: 'lobby' | 'waiting' | 'playing' = 'lobby') => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
      lastAIMoveRef.current = null;
      setWinner(undefined);
      setWinReason(undefined);
      setSelectedGhostId(null);
      setValidMoves([]);
      setLastMove(undefined);
      setLastCapturedInfo(undefined);
      setTurn('p1');
      turnRef.current = 'p1';
      setTurnNumber(1);
      turnNumberRef.current = 1;
      setCapturedGhosts([]);
      capturedGhostsRef.current = [];
      setGameStatus(newStatus);
    },
    []
  );

  // Setup Campaign Puzzle Level atomically
  const loadLevel = useCallback(
    (level: PuzzleLevel) => {
      resetGameCleanly('playing');
      currentLevelRef.current = level;

      const initCaptured = level.initialCaptured || [];
      setCapturedGhosts(initCaptured);
      capturedGhostsRef.current = initCaptured;

      const p1Ghosts: Ghost[] = level.playerGhosts.map((g) => ({
        ...g,
        owner: 'p1' as const,
        isCaptured: false,
        hasEscaped: false,
      }));
      setMySecretGhosts(p1Ghosts);
      mySecretGhostsRef.current = p1Ghosts;

      const aiSecretDict: Record<string, 'blue' | 'red'> = {};
      const aiGhosts: Ghost[] = level.aiGhosts.map((g) => {
        aiSecretDict[g.id] = g.color;
        return {
          id: g.id,
          owner: 'p2' as const,
          color: 'unknown' as const,
          x: g.x,
          y: g.y,
          isCaptured: false,
          hasEscaped: false,
        };
      });

      aiSecretColorsRef.current = aiSecretDict;
      const initialBoard = [...p1Ghosts, ...aiGhosts];
      setGhosts(initialBoard);
      ghostsRef.current = initialBoard;

      moveLogger.startNewSession({
        gameMode: 'levels',
        aiDifficulty: 'hard',
        levelId: level.id,
        levelName: level.name,
        parMoves: level.parMoves,
      });
    },
    [resetGameCleanly]
  );

  // Start AI Match atomically
  const startAIGame = useCallback(
    (initialGhosts: Ghost[], difficulty: AIDifficulty = 'hard') => {
      resetGameCleanly('playing');
      setAiDifficulty(difficulty);

      const p1Slots = [
        { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      ];

      const p1Ghosts = initialGhosts.map((g, idx) => ({
        ...g,
        owner: 'p1' as const,
        x: p1Slots[idx]?.x ?? g.x,
        y: p1Slots[idx]?.y ?? g.y,
        isCaptured: false,
        hasEscaped: false,
      }));
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

      moveLogger.startNewSession({
        gameMode: 'ai',
        aiDifficulty: difficulty,
      });
    },
    [resetGameCleanly]
  );

  // Start Pass & Play atomically
  const startPassAndPlay = useCallback(
    (p1Ghosts: Ghost[], p2Ghosts: Ghost[]) => {
      resetGameCleanly('playing');
      const p1Slots = [
        { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
      ];
      const normalizedP1 = p1Ghosts.map((g, idx) => ({
        ...g,
        owner: 'p1' as const,
        x: p1Slots[idx]?.x ?? g.x,
        y: p1Slots[idx]?.y ?? g.y,
        isCaptured: false,
        hasEscaped: false,
      }));
      setMySecretGhosts(normalizedP1);
      mySecretGhostsRef.current = normalizedP1;
      const initialBoard = [...normalizedP1, ...p2Ghosts];
      setGhosts(initialBoard);
      ghostsRef.current = initialBoard;

      moveLogger.startNewSession({
        gameMode: 'pass-and-play',
      });
    },
    [resetGameCleanly]
  );

  // Online Rematch reset atomically
  const resetForOnlineRematch = useCallback(() => {
    resetGameCleanly('playing');
    const myRole = localPlayer;
    const oppRole: PlayerRole = myRole === 'p1' ? 'p2' : 'p1';
    const slots = [
      { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 },
    ];
    const myPieces = mySecretGhostsRef.current.map((g, idx) => ({
      ...g,
      x: slots[idx].x,
      y: slots[idx].y,
      isCaptured: false,
      hasEscaped: false,
    }));
    setMySecretGhosts(myPieces);
    mySecretGhostsRef.current = myPieces;

    const oppPieces = createInitialOpponentGhosts(oppRole);
    const initialBoard = myRole === 'p1' ? [...myPieces, ...oppPieces] : [...oppPieces, ...myPieces];
    setGhosts(initialBoard);
    ghostsRef.current = initialBoard;

    moveLogger.startNewSession({
      gameMode: 'online',
    });
  }, [resetGameCleanly, localPlayer]);

  return {
    ghosts,
    ghostsRef,
    setGhosts,
    mySecretGhosts,
    mySecretGhostsRef,
    setMySecretGhosts,
    aiSecretColorsRef,
    aiTimeoutRef,
    capturedGhosts,
    capturedGhostsRef,
    setCapturedGhosts,
    selectedGhostId,
    setSelectedGhostId,
    validMoves,
    setValidMoves,
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
    setLastCapturedInfo,
    aiDifficulty,
    setAiDifficulty,
    checkWinConditions,
    triggerAITurn,
    handleSelectGhost,
    handleTileClick,
    handleEscapeClick,
    resetGameCleanly,
    loadLevel,
    startAIGame,
    startPassAndPlay,
    resetForOnlineRematch,
  };
}
