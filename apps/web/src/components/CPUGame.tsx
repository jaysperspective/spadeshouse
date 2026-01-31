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

  return (
    <div className="relative w-full aspect-[4/3] max-h-[40vh] sm:max-h-[45vh] bg-felt rounded-xl border-4 border-felt-dark mx-auto">
      {/* Seat displays - more compact on mobile */}
      {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => {
        const seatState = roomState.seats[seat];
        const isCurrentTurn = roomState.hand?.currentTurn === seat;
        const isMySeat = seat === 'S';
        const bid = roomState.hand?.bids[seat];
        const isThinking = thinking && thinkingSeat === seat;

        const positionClass = {
          N: 'absolute top-0.5 sm:top-2 left-1/2 -translate-x-1/2 z-10',
          S: 'absolute bottom-0.5 sm:bottom-2 left-1/2 -translate-x-1/2 z-10',
          W: 'absolute left-0.5 sm:left-2 top-1/2 -translate-y-1/2 z-10',
          E: 'absolute right-0.5 sm:right-2 top-1/2 -translate-y-1/2 z-10',
        }[seat];

        return (
          <div key={seat} className={positionClass}>
            <div
              className={`
                px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm text-center
                min-w-[50px] sm:min-w-[80px]
                ${isCurrentTurn ? 'current-turn border-2 border-yellow-400' : 'border border-slate-600'}
                ${isMySeat ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              <div className="font-semibold text-white text-[10px] sm:text-sm truncate max-w-[50px] sm:max-w-[80px]">
                {isMySeat ? 'You' : (seatState.playerName || getSeatLabel(seat).replace('CPU ', ''))}
              </div>

              {/* Show bid inline with name on mobile */}
              {bid !== undefined ? (
                <div className="text-[10px] sm:text-xs">
                  <span className={seat === 'N' || seat === 'S' ? 'text-green-400' : 'text-blue-400'}>
                    {bid}
                  </span>
                </div>
              ) : isThinking ? (
                <div className="text-[10px] sm:text-xs text-yellow-400 animate-pulse">...</div>
              ) : (
                <div className="text-[10px] sm:text-xs text-slate-500">
                  {seat === 'N' || seat === 'S' ? 'NS' : 'EW'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Center area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-28 h-20 sm:w-40 sm:h-32">
          {/* Status text during bidding */}
          {roomState.phase === 'BIDDING' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-center">
              <div className="bg-slate-900/80 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl">
                <div className="text-sm sm:text-lg font-bold">Bidding</div>
                {thinking && thinkingSeat ? (
                  <div className="text-xs sm:text-base text-yellow-400 animate-pulse font-medium">
                    {getSeatLabel(thinkingSeat).replace('CPU ', '')}...
                  </div>
                ) : roomState.hand?.currentTurn === 'S' ? (
                  <div className="text-xs sm:text-base text-green-400 font-medium">
                    Your turn
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs text-slate-400">
                    Waiting...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spades broken indicator */}
          {roomState.hand?.spadesBroken && roomState.phase === 'PLAYING' && currentBook.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-yellow-400 text-[10px] sm:text-sm bg-slate-900/60 px-2 py-0.5 rounded">Spades Broken</span>
            </div>
          )}

          {/* Lead suit indicator */}
          {roomState.phase === 'PLAYING' && currentBook.length > 0 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 sm:-translate-y-6 text-[9px] sm:text-xs text-slate-400">
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

      {/* Books won indicator - only during play */}
      {roomState.phase === 'PLAYING' && roomState.hand && (
        <div className="absolute bottom-0.5 right-0.5 sm:bottom-2 sm:right-2 bg-slate-800/90 px-1 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-xs z-20">
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
// Game Chat (CPU Bots have personality!)
// ============================================

interface CPUGameLogProps {
  completedBooks: Array<{
    plays: Array<{ seat: Seat; card: CardType }>;
    winner: Seat;
  }>;
  currentBook: Array<{ seat: Seat; card: CardType }>;
  teamStates: {
    NS: { bid: number; booksWon: number };
    EW: { bid: number; booksWon: number };
  };
}

// Fun bot reactions based on game events
function getBotReaction(event: string, _seat: Seat): string | null {
  const reactions: Record<string, string[]> = {
    won_book: [
      "Nice! 💪",
      "Got it!",
      "Easy money",
      "That's mine!",
      "📚",
    ],
    lost_book: [
      "Dang...",
      "Next time",
      "😤",
      "Ugh",
      "Lucky...",
    ],
    cut_book: [
      "CUT! ✂️",
      "Ruff! 🐕",
      "No spades? No problem!",
      "Trump card!",
    ],
    got_cut: [
      "Nooo my ace!",
      "Brutal...",
      "😭",
      "That hurts",
    ],
    big_play: [
      "Boom! 💥",
      "Take that!",
      "Big spade energy",
      "👀",
    ],
  };

  const options = reactions[event];
  if (!options) return null;
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

interface ChatMessage {
  id: number;
  seat: Seat;
  text: string;
  isSystem?: boolean;
}

function CPUGameLog({ completedBooks, currentBook: _currentBook, teamStates }: CPUGameLogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastBookCountRef = useRef(0);
  const messageIdRef = useRef(0);

  const getSeatName = (seat: Seat): string => {
    const names: Record<Seat, string> = { N: 'CPU North', E: 'CPU East', S: 'You', W: 'CPU West' };
    return names[seat];
  };

  const getTeamColor = (seat: Seat): string => {
    return seat === 'N' || seat === 'S' ? 'text-green-400' : 'text-blue-400';
  };

  // Generate bot reactions when books complete
  useEffect(() => {
    if (completedBooks.length > lastBookCountRef.current) {
      const newBook = completedBooks[completedBooks.length - 1];
      if (newBook) {
        const winner = newBook.winner;
        const winnerIsBot = winner !== 'S';

        // Bot who won might comment
        if (winnerIsBot) {
          const reaction = getBotReaction('won_book', winner);
          if (reaction && Math.random() > 0.4) {
            const newMsg: ChatMessage = {
              id: ++messageIdRef.current,
              seat: winner,
              text: reaction,
            };
            setMessages(prev => [...prev.slice(-10), newMsg]);
          }
        }

        // Check for cuts (spade played when lead was different suit)
        const leadSuit = newBook.plays[0]?.card.suit;
        const winningPlay = newBook.plays.find(p => p.seat === winner);
        if (winningPlay && winningPlay.card.suit === 'spades' && leadSuit !== 'spades') {
          // Someone cut!
          if (winnerIsBot) {
            const reaction = getBotReaction('cut_book', winner);
            if (reaction && Math.random() > 0.5) {
              setTimeout(() => {
                setMessages(prev => [...prev.slice(-10), {
                  id: ++messageIdRef.current,
                  seat: winner,
                  text: reaction!,
                }]);
              }, 500);
            }
          }
        }
      }
      lastBookCountRef.current = completedBooks.length;
    }
  }, [completedBooks]);

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-t border-slate-700">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-slate-700/50 flex justify-between items-center">
        <span className="text-[10px] sm:text-xs text-slate-400 font-medium">💬 Game Chat</span>
        <div className="flex gap-3 text-[10px] sm:text-xs">
          <span className="text-green-400">NS: {teamStates.NS.booksWon}/{teamStates.NS.bid}</span>
          <span className="text-blue-400">EW: {teamStates.EW.booksWon}/{teamStates.EW.bid}</span>
        </div>
      </div>

      {/* Chat messages */}
      <div
        className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-600 text-[10px] sm:text-xs py-2">
            Bots will react as the game progresses...
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-1.5">
              <span className={`text-[10px] sm:text-xs font-medium ${getTeamColor(msg.seat)}`}>
                {getSeatName(msg.seat).replace('CPU ', '')}:
              </span>
              <span className="text-[10px] sm:text-xs text-slate-300">{msg.text}</span>
            </div>
          ))
        )}

        {/* Book progress summary */}
        <div className="pt-2 mt-2 border-t border-slate-700/50">
          <div className="text-[10px] sm:text-xs text-slate-500">
            Books played: {completedBooks.length}/13
          </div>
        </div>
      </div>
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
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-8 max-w-md w-full">
        <div className="flex items-center justify-between mb-3 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold">Play vs CPU</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Practice against bots</p>
          </div>
          <button
            onClick={onBack}
            className="btn btn-secondary btn-sm text-xs sm:text-sm"
          >
            Back
          </button>
        </div>

        {/* Progress indicator - compact on mobile */}
        <div className="mb-3 sm:mb-6 p-2 sm:p-3 bg-slate-700/50 rounded-xl">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs sm:text-sm text-slate-400">Badge Progress</span>
            <span className="text-xs sm:text-sm font-bold text-yellow-400">
              {cpuGamesCompleted}/{CPU_GAMES_REQUIRED} games
            </span>
          </div>
          <div className="h-1.5 sm:h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-400 transition-all"
              style={{ width: `${Math.min(100, (cpuGamesCompleted / CPU_GAMES_REQUIRED) * 100)}%` }}
            />
          </div>
          {gamesRemaining > 0 && (
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5">
              {gamesRemaining} more for Kitchen Table Badge
            </p>
          )}
        </div>

        {/* Player Name */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm text-slate-400 mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="input w-full text-sm sm:text-base py-2 sm:py-2.5"
            maxLength={20}
          />
        </div>

        {/* Game Mode Selection - Compact horizontal buttons */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Game Mode</label>
          <div className="flex gap-1.5 sm:gap-2">
            {modes.map((m) => {
              const config = getModeConfig(m);
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                    mode === m
                      ? 'border-blue-500 bg-blue-900/30 text-white'
                      : 'border-slate-600 text-slate-300 active:border-slate-500'
                  }`}
                >
                  {config.name}
                </button>
              );
            })}
          </div>
          {/* Show selected mode description */}
          <p className="text-xs text-slate-500 mt-1.5 text-center">
            {getModeConfig(mode).description}
          </p>
        </div>

        {/* Target Score */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Target Score</label>
          <div className="flex gap-2 sm:gap-3">
            {([250, 500] as TargetScore[]).map((score) => (
              <button
                key={score}
                onClick={() => setTargetScore(score)}
                className={`flex-1 py-2 sm:py-3 rounded-xl text-center border-2 transition-all ${
                  targetScore === score
                    ? 'border-blue-500 bg-blue-900/30'
                    : 'border-slate-600 active:border-slate-500'
                }`}
              >
                <span className="font-bold text-base sm:text-lg">{score}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(mode, targetScore, playerName || 'You')}
          className="btn btn-primary w-full text-base sm:text-lg py-2.5 sm:py-3"
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
    <div className="min-h-screen min-h-[100dvh] flex flex-col no-select bg-slate-900">
      {/* Header - Compact for mobile */}
      <header className="flex-shrink-0 flex justify-between items-center px-2 py-1.5 sm:px-3 sm:py-2 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
        {/* Left: Score display */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="text-green-400 font-bold">{roomState.teamGameStates.NS.score}</span>
          <span className="text-slate-500">-</span>
          <span className="text-blue-400 font-bold">{roomState.teamGameStates.EW.score}</span>
          <span className="text-slate-500 text-[10px] sm:text-xs">/ {roomState.targetScore}</span>
        </div>

        {/* Center: Speed toggle */}
        <button
          onClick={toggleFastMode}
          className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${fastMode ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          title="Toggle speed"
        >
          {fastMode ? '⚡ Fast' : '🐢 Normal'}
        </button>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowScore(true)}
            className="text-[10px] sm:text-xs px-2 py-1 rounded bg-slate-700 text-slate-300"
          >
            📊
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="text-[10px] sm:text-xs px-2 py-1 rounded bg-slate-700 text-slate-300"
          >
            📖
          </button>
          <button
            onClick={handleExit}
            className="text-[10px] sm:text-xs px-2 py-1 rounded bg-red-600/80 text-white"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main game area - fills remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Game table - centered with padding */}
        <div className="flex-shrink-0 px-2 pt-2 sm:px-4 sm:pt-3">
          <CPUGameTable thinking={thinking} thinkingSeat={thinkingSeat} />
        </div>

        {/* Bidding panel */}
        {isBidding && (
          <div className="flex-shrink-0 px-2 py-1.5 sm:px-3 sm:py-2">
            <CPUBiddingPanel
              isMyTurn={isHumanTurn}
              onSubmitBid={handleSubmitBid}
            />
          </div>
        )}

        {/* Player's hand - during bidding (view only) */}
        {isBidding && humanHand && (
          <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700">
            <div className="px-2 py-0.5 text-[10px] sm:text-xs text-slate-400 flex justify-between">
              <span>Your Hand ({humanHand.length})</span>
            </div>
            <div className="card-fan hide-scrollbar pb-2 sm:pb-3">
              {humanHand.map((card, i) => (
                <Card
                  key={`${card.rank}-${card.suit}-${i}`}
                  card={card}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {/* Player's hand - during play (directly under table) */}
        {humanHand && isPlaying && (
          <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700">
            <div className="px-2 py-0.5 flex justify-between items-center">
              <span className="text-[10px] sm:text-xs text-slate-400">Your Hand ({humanHand.length})</span>
              {isHumanTurn && (
                <span className="text-[10px] sm:text-xs text-yellow-400 animate-pulse font-medium">
                  Tap twice to play
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

        {/* Game Activity Log - fills remaining space during play */}
        {isPlaying && roomState.hand && (
          <div className="flex-1 flex flex-col min-h-0">
            <CPUGameLog
              completedBooks={roomState.hand.completedBooks}
              currentBook={roomState.hand.currentBook}
              teamStates={roomState.hand.teamStates}
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
