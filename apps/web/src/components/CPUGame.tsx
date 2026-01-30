'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card as CardType, GameMode, TargetScore, Seat } from '@spades/shared';
import { CPU_GAMES_REQUIRED } from '@spades/shared';
import { getModeConfig } from '@spades/rules';
import {
  useCPUGameStore,
  useCPUGamePhase,
  useCPUGameRoomState,
  useHumanHand,
  useIsHumanTurn,
  useCPUThinking,
  useFastMode,
} from '@/store/cpu-game-store';
import { useBadgeStore } from '@/store/badge-store';
import { CPUGameController, startCPUGame } from '@/controllers/cpu-game-controller';
import { Card } from './Card';
import { Scoreboard } from './Scoreboard';
import { HandEndSummary } from './HandEndSummary';
import { RulesScreen } from './RulesScreen';
import { BadgeUnlockModal } from './badges';

// ============================================
// CPU Game Table (Modified for CPU games)
// ============================================

interface CPUGameTableProps {
  thinking: boolean;
  thinkingSeat: Seat | null;
}

function CPUGameTable({ thinking, thinkingSeat }: CPUGameTableProps) {
  const roomState = useCPUGameRoomState();

  if (!roomState) return null;

  const currentBook = roomState.hand?.currentBook ?? [];

  const getCardPosition = (seat: Seat): string => {
    switch (seat) {
      case 'N': return '-translate-y-6 sm:-translate-y-8';
      case 'S': return 'translate-y-6 sm:translate-y-8';
      case 'E': return 'translate-x-8 sm:translate-x-12';
      case 'W': return '-translate-x-8 sm:-translate-x-12';
    }
  };

  const getSeatLabel = (seat: Seat): string => {
    const labels: Record<Seat, string> = {
      N: 'CPU North',
      E: 'CPU East',
      S: 'You',
      W: 'CPU West',
    };
    return labels[seat];
  };

  const getTeamLabel = (seat: Seat): string => {
    return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
  };

  return (
    <div className="relative w-full aspect-[4/3] max-h-[35vh] sm:max-h-[40vh] bg-felt rounded-xl border-4 border-felt-dark mx-auto">
      {/* Seat displays */}
      {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => {
        const seatState = roomState.seats[seat];
        const isCurrentTurn = roomState.hand?.currentTurn === seat;
        const isMySeat = seat === 'S';
        const bid = roomState.hand?.bids[seat];
        const isThinking = thinking && thinkingSeat === seat;

        const positionClass = {
          N: 'absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 z-10',
          S: 'absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-10',
          W: 'absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10',
          E: 'absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10',
        }[seat];

        return (
          <div key={seat} className={positionClass}>
            <div
              className={`
                px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm text-center
                min-w-[60px] sm:min-w-[80px]
                ${isCurrentTurn ? 'current-turn border-2 border-yellow-400' : 'border border-slate-600'}
                ${isMySeat ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              <div className="font-semibold text-white text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px]">
                {seatState.playerName || getSeatLabel(seat)}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400">
                {getTeamLabel(seat)}
              </div>

              {/* Show bid if submitted */}
              {bid !== undefined && (
                <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm">
                  <span className="text-slate-400">Bid: </span>
                  <span className="font-bold text-white">{bid}</span>
                </div>
              )}

              {/* Thinking indicator */}
              {isThinking && (
                <div className="text-[10px] sm:text-xs text-yellow-400 mt-1 animate-pulse">
                  Thinking...
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Center area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-32 h-24 sm:w-40 sm:h-32">
          {/* Status text during bidding */}
          {roomState.phase === 'BIDDING' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-center">
              <div className="bg-slate-900/80 px-4 py-2 rounded-xl">
                <div className="text-base sm:text-lg font-bold">Bidding</div>
                {thinking && thinkingSeat ? (
                  <div className="text-sm sm:text-base text-yellow-400 animate-pulse font-medium">
                    {getSeatLabel(thinkingSeat)} bidding...
                  </div>
                ) : roomState.hand?.currentTurn === 'S' ? (
                  <div className="text-sm sm:text-base text-green-400 font-medium">
                    Your turn to bid
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs">
                    Waiting for {roomState.hand?.currentTurn}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spades broken indicator */}
          {roomState.hand?.spadesBroken && roomState.phase === 'PLAYING' && currentBook.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-yellow-400 text-xs sm:text-sm">Spades Broken</span>
            </div>
          )}

          {/* Lead suit indicator */}
          {roomState.phase === 'PLAYING' && currentBook.length > 0 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 sm:-translate-y-6 text-[10px] sm:text-xs text-slate-400">
              Lead: {roomState.hand?.leadSuit || 'Joker'}
            </div>
          )}

          {/* Played cards */}
          {currentBook.map((play) => (
            <div
              key={`${play.seat}-${play.card.rank}-${play.card.suit}`}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${getCardPosition(play.seat)} transition-transform`}
            >
              <Card card={play.card} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* CPU Game indicator */}
      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-slate-800/90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs z-20">
        <div className="text-slate-400">Mode</div>
        <div className="font-bold text-yellow-400">vs CPU</div>
      </div>

      {/* Books won indicator */}
      {roomState.phase === 'PLAYING' && roomState.hand && (
        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-slate-800/90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs z-20">
          <div className="text-green-400">NS: {roomState.hand.teamStates.NS.booksWon}/{roomState.hand.teamStates.NS.bid}</div>
          <div className="text-blue-400">EW: {roomState.hand.teamStates.EW.booksWon}/{roomState.hand.teamStates.EW.bid}</div>
        </div>
      )}
    </div>
  );
}

// ============================================
// CPU Player Hand Component
// ============================================

interface CPUPlayerHandProps {
  cards: CardType[];
  isMyTurn: boolean;
  onPlayCard: (card: CardType) => void;
}

function CPUPlayerHand({ cards, isMyTurn, onPlayCard }: CPUPlayerHandProps) {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  const handleClick = (card: CardType) => {
    if (!isMyTurn) return;

    if (selectedCard?.suit === card.suit && selectedCard?.rank === card.rank) {
      onPlayCard(card);
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  // Clear selection when turn changes
  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCard(null);
    }
  }, [isMyTurn]);

  return (
    <div className="card-fan hide-scrollbar pb-3 pt-1">
      {cards.map((card, i) => (
        <Card
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          size="md"
          clickable={isMyTurn}
          selected={selectedCard?.suit === card.suit && selectedCard?.rank === card.rank}
          onClick={() => handleClick(card)}
        />
      ))}
    </div>
  );
}

// ============================================
// CPU Bidding Panel
// ============================================

interface CPUBiddingPanelProps {
  isMyTurn: boolean;
  onSubmitBid: (bid: number) => void;
}

function CPUBiddingPanel({ isMyTurn, onSubmitBid }: CPUBiddingPanelProps) {
  const [bidValue, setBidValue] = useState(0);
  const roomState = useCPUGameRoomState();

  const hand = roomState?.hand;
  if (!hand || roomState?.phase !== 'BIDDING') return null;

  const bids = hand.bids;
  const partnerBid = bids['N']; // Human's partner is North
  const myBid = bids['S'];
  const minBidForBoard = Math.max(0, 4 - (partnerBid ?? 0));

  // Bid order for display
  const bidOrder: Seat[] = ['E', 'S', 'W', 'N'];
  const bidLabels: Record<Seat, string> = {
    N: 'CPU North',
    E: 'CPU East',
    W: 'CPU West',
    S: 'You',
  };

  const handleSubmit = () => {
    onSubmitBid(bidValue);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3">
      {/* Bid summary - always visible */}
      <div className="flex items-center justify-center gap-4 mb-3 pb-2 border-b border-slate-700">
        {bidOrder.map((seat) => {
          const bid = bids[seat];
          const isCurrentTurn = hand.currentTurn === seat;
          const isMySeat = seat === 'S';
          const teamColor = seat === 'N' || seat === 'S' ? 'text-green-400' : 'text-blue-400';

          return (
            <div
              key={seat}
              className={`text-center px-3 py-1 rounded-lg ${isCurrentTurn ? 'bg-yellow-600/20 ring-1 ring-yellow-400' : ''}`}
            >
              <div className={`text-xs ${isMySeat ? 'text-white font-bold' : 'text-slate-400'}`}>
                {bidLabels[seat]}
              </div>
              {bid !== undefined ? (
                <div className={`text-xl font-bold ${teamColor}`}>{bid}</div>
              ) : isCurrentTurn ? (
                <div className="text-lg text-yellow-400 animate-pulse">...</div>
              ) : (
                <div className="text-lg text-slate-600">-</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team totals if both partners have bid */}
      {bids['N'] !== undefined && bids['S'] !== undefined && (
        <div className="flex justify-center gap-6 mb-3 text-sm">
          <div className="text-green-400">
            NS Total: <span className="font-bold">{(bids['N'] ?? 0) + (bids['S'] ?? 0)}</span>
          </div>
          {bids['E'] !== undefined && bids['W'] !== undefined && (
            <div className="text-blue-400">
              EW Total: <span className="font-bold">{(bids['E'] ?? 0) + (bids['W'] ?? 0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Human's bidding controls */}
      {myBid === undefined && isMyTurn && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-green-400">Your Turn to Bid</div>
            {partnerBid !== undefined && partnerBid < 4 && (
              <div className="text-sm text-yellow-400">
                Partner bid {partnerBid} (Need {minBidForBoard}+ for Board)
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Compact +/- control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBidValue(Math.max(0, bidValue - 1))}
                className="btn btn-secondary w-10 h-10 text-xl font-bold rounded-full p-0"
                disabled={bidValue <= 0}
              >
                -
              </button>
              <div className="text-3xl font-bold w-12 text-center">{bidValue}</div>
              <button
                onClick={() => setBidValue(Math.min(13, bidValue + 1))}
                className="btn btn-secondary w-10 h-10 text-xl font-bold rounded-full p-0"
                disabled={bidValue >= 13}
              >
                +
              </button>
            </div>

            {/* Compact bid quick-select */}
            <div className="flex gap-1 flex-wrap flex-1">
              {Array.from({ length: 14 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setBidValue(i)}
                  className={`w-8 h-8 text-xs font-bold rounded ${
                    bidValue === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              className="btn btn-success px-4 py-2 font-bold whitespace-nowrap"
            >
              Bid {bidValue}
            </button>
          </div>

          {partnerBid !== undefined && bidValue + partnerBid < 4 && (
            <div className="text-yellow-400 text-xs mt-2 text-center">
              Warning: Team bid {bidValue + partnerBid} is below Board minimum of 4
            </div>
          )}
        </>
      )}

      {/* Waiting message after human has bid */}
      {myBid !== undefined && hand.currentTurn !== 'S' && (
        <div className="text-center text-slate-400">
          Waiting for remaining bids...
        </div>
      )}
    </div>
  );
}

// ============================================
// CPU Game Setup Screen
// ============================================

interface CPUGameSetupProps {
  playerName: string;
  onStart: (mode: GameMode, targetScore: TargetScore, playerName: string) => void;
  onBack: () => void;
}

function CPUGameSetup({ playerName: defaultPlayerName, onStart, onBack }: CPUGameSetupProps) {
  const [mode, setMode] = useState<GameMode>('aceHigh');
  const [targetScore, setTargetScore] = useState<TargetScore>(250);
  const [playerName, setPlayerName] = useState(defaultPlayerName);

  const { learningProgress } = useBadgeStore();
  const cpuGamesCompleted = learningProgress.cpuGamesCompleted;
  const gamesRemaining = Math.max(0, CPU_GAMES_REQUIRED - cpuGamesCompleted);

  const modes: GameMode[] = ['aceHigh', 'threeJokers', 'straightStruggle'];

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Play vs CPU</h1>
            <p className="text-slate-400 text-sm">Practice against bots</p>
          </div>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm"
          >
            Back
          </button>
        </div>

        {/* Progress indicator */}
        <div className="mb-6 p-3 bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Badge Progress</span>
            <span className="text-sm font-bold text-yellow-400">
              {cpuGamesCompleted}/{CPU_GAMES_REQUIRED} games
            </span>
          </div>
          <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${Math.min(100, (cpuGamesCompleted / CPU_GAMES_REQUIRED) * 100)}%` }}
            />
          </div>
          {gamesRemaining > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Complete {gamesRemaining} more game{gamesRemaining !== 1 ? 's' : ''} for the Kitchen Table Badge
            </p>
          )}
        </div>

        {/* Player Name */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1.5">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="input w-full"
            maxLength={20}
          />
        </div>

        {/* Game Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">Game Mode</label>
          <div className="space-y-2">
            {modes.map((m) => {
              const config = getModeConfig(m);
              return (
                <label
                  key={m}
                  className={`flex items-start p-3 rounded-xl cursor-pointer border-2 transition-all ${
                    mode === m
                      ? 'border-blue-500 bg-blue-900/30'
                      : 'border-slate-600 active:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="mt-1 mr-3 w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-sm sm:text-base">{config.name}</div>
                    <div className="text-xs sm:text-sm text-slate-400">{config.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Target Score */}
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">Target Score</label>
          <div className="flex gap-3">
            {([250, 500] as TargetScore[]).map((score) => (
              <label
                key={score}
                className={`flex-1 p-3 rounded-xl cursor-pointer text-center border-2 transition-all ${
                  targetScore === score
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-slate-600 active:border-slate-500'
                }`}
              >
                <input
                  type="radio"
                  name="targetScore"
                  value={score}
                  checked={targetScore === score}
                  onChange={() => setTargetScore(score)}
                  className="sr-only"
                />
                <span className="font-bold text-lg">{score}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(mode, targetScore, playerName || 'You')}
          className="btn btn-primary w-full text-lg"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}

// ============================================
// Main CPU Game Component
// ============================================

interface CPUGameProps {
  onExit: () => void;
  initialPlayerName?: string;
}

export function CPUGame({ onExit, initialPlayerName = 'You' }: CPUGameProps) {
  const controllerRef = useRef<CPUGameController | null>(null);
  const phase = useCPUGamePhase();
  const roomState = useCPUGameRoomState();
  const humanHand = useHumanHand();
  const isHumanTurn = useIsHumanTurn();
  const { thinking, seat: thinkingSeat } = useCPUThinking();
  const fastMode = useFastMode();
  const handEndResults = useCPUGameStore((s) => s.handEndResults);

  const [showRules, setShowRules] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showHandEnd, setShowHandEnd] = useState(false);

  const { incrementCPUGamesCompleted } = useBadgeStore();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      useCPUGameStore.getState().reset();
    };
  }, []);

  // Show hand end modal when results arrive
  useEffect(() => {
    if (handEndResults && handEndResults.length > 0) {
      setShowHandEnd(true);
    }
  }, [handEndResults]);

  const handleStartGame = useCallback(async (mode: GameMode, targetScore: TargetScore, playerName: string) => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = await startCPUGame(mode, targetScore, playerName);
    controllerRef.current = controller;
  }, []);

  const handleSubmitBid = useCallback(async (bid: number) => {
    if (controllerRef.current) {
      await controllerRef.current.submitHumanBid(bid);
    }
  }, []);

  const handlePlayCard = useCallback(async (card: CardType) => {
    if (controllerRef.current) {
      await controllerRef.current.playHumanCard(card);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    setShowHandEnd(false);

    if (!controllerRef.current) return;

    if (controllerRef.current.isGameComplete()) {
      // Game is complete - increment CPU games counter
      incrementCPUGamesCompleted();

      // Reset for a new game
      controllerRef.current.abort();
      controllerRef.current = null;
      useCPUGameStore.getState().reset();
    } else {
      // Continue to next hand
      await controllerRef.current.nextHand();
    }
  }, [incrementCPUGamesCompleted]);

  const handleExit = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    useCPUGameStore.getState().reset();
    onExit();
  }, [onExit]);

  const toggleFastMode = useCallback(() => {
    const newFast = !fastMode;
    useCPUGameStore.getState().setFastMode(newFast);
    if (controllerRef.current) {
      controllerRef.current.setFastMode(newFast);
    }
  }, [fastMode]);

  // Setup phase
  if (phase === 'setup') {
    return <CPUGameSetup playerName={initialPlayerName} onStart={handleStartGame} onBack={handleExit} />;
  }

  // Game phase
  if (!roomState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const isPlaying = roomState.phase === 'PLAYING';
  const isBidding = roomState.phase === 'BIDDING';

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col no-select">
      {/* Header */}
      <header className="flex-shrink-0 flex justify-between items-center px-3 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Spades</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-600">
            vs CPU
          </span>
        </div>

        {/* Persistent Score Display */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-medium">NS:</span>
            <span className="font-bold">{roomState.teamGameStates.NS.score}</span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-medium">EW:</span>
            <span className="font-bold">{roomState.teamGameStates.EW.score}</span>
          </div>
          <div className="text-slate-500 text-xs">/ {roomState.targetScore}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFastMode}
            className={`btn btn-sm ${fastMode ? 'btn-primary' : 'btn-secondary'}`}
            title="Toggle fast CPU mode"
          >
            {fastMode ? 'Fast' : 'Normal'}
          </button>
          <button
            onClick={() => setShowScore(true)}
            className="btn btn-sm btn-secondary"
          >
            Details
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="btn btn-sm btn-secondary"
          >
            Rules
          </button>
          <button
            onClick={handleExit}
            className="btn btn-sm btn-danger"
          >
            Exit
          </button>
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Game table */}
        <div className="flex-shrink-0">
          <CPUGameTable thinking={thinking} thinkingSeat={thinkingSeat} />
        </div>

        {/* Bidding panel */}
        {isBidding && (
          <div className="flex-shrink-0 px-3 py-2">
            <CPUBiddingPanel
              isMyTurn={isHumanTurn}
              onSubmitBid={handleSubmitBid}
            />
          </div>
        )}

        {/* Player's hand - during bidding (view only) */}
        {isBidding && humanHand && (
          <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
            <div className="px-3 py-1 text-xs text-slate-400">
              Your Hand ({humanHand.length})
            </div>
            <div className="card-fan hide-scrollbar pb-2">
              {humanHand.map((card, i) => (
                <Card
                  key={`${card.rank}-${card.suit}-${i}`}
                  card={card}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Player's hand - during play */}
        {humanHand && isPlaying && (
          <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
            <div className="px-3 py-1 flex justify-between items-center">
              <span className="text-xs text-slate-400">Your Hand ({humanHand.length})</span>
              {isHumanTurn && (
                <span className="text-xs text-yellow-400 animate-pulse font-medium">
                  Tap card twice to play
                </span>
              )}
            </div>
            <CPUPlayerHand
              cards={humanHand}
              isMyTurn={isHumanTurn}
              onPlayCard={handlePlayCard}
            />
          </div>
        )}
      </main>

      {/* Score modal */}
      {showScore && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowScore(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Scoreboard roomState={roomState} />
            <button
              onClick={() => setShowScore(false)}
              className="btn btn-secondary w-full mt-3"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hand end / Game end summary */}
      {showHandEnd && handEndResults && (
        <HandEndSummary
          results={handEndResults}
          winner={roomState.winner}
          winReason={roomState.winReason}
          onContinue={handleContinue}
        />
      )}

      {/* Rules modal */}
      {showRules && (
        <RulesScreen mode={roomState.mode} onClose={() => setShowRules(false)} />
      )}

      {/* Badge unlock modal */}
      <BadgeUnlockModal />
    </div>
  );
}
