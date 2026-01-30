'use client';

import type { PublicRoomState, Seat } from '@spades/shared';
import { Card } from './Card';
import { SeatDisplay } from './SeatDisplay';

interface GameTableProps {
  roomState: PublicRoomState;
  mySeat: Seat | null;
  onTakeSeat: (seat: Seat) => void;
  onLeaveSeat: () => void;
  onReady: (ready: boolean) => void;
}

export function GameTable({ roomState, mySeat, onTakeSeat, onLeaveSeat, onReady }: GameTableProps) {
  const currentBook = roomState.hand?.currentBook ?? [];

  // Position cards in center based on which seat played them
  const getCardPosition = (seat: Seat): string => {
    switch (seat) {
      case 'N': return '-translate-y-6 sm:-translate-y-8';
      case 'S': return 'translate-y-6 sm:translate-y-8';
      case 'E': return 'translate-x-8 sm:translate-x-12';
      case 'W': return '-translate-x-8 sm:-translate-x-12';
    }
  };

  return (
    <div className="relative w-full aspect-[4/3] max-h-[45vh] sm:max-h-[50vh] bg-felt rounded-xl border-4 border-felt-dark mx-auto">
      {/* North seat */}
      <div className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 z-10">
        <SeatDisplay
          seat="N"
          roomState={roomState}
          isCurrentTurn={roomState.hand?.currentTurn === 'N'}
          isMySeat={mySeat === 'N'}
          onTakeSeat={!mySeat && roomState.phase === 'LOBBY' ? () => onTakeSeat('N') : undefined}
          onLeaveSeat={mySeat === 'N' && roomState.phase === 'LOBBY' ? onLeaveSeat : undefined}
          onReady={mySeat === 'N' ? onReady : undefined}
        />
      </div>

      {/* South seat */}
      <div className="absolute bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-10">
        <SeatDisplay
          seat="S"
          roomState={roomState}
          isCurrentTurn={roomState.hand?.currentTurn === 'S'}
          isMySeat={mySeat === 'S'}
          onTakeSeat={!mySeat && roomState.phase === 'LOBBY' ? () => onTakeSeat('S') : undefined}
          onLeaveSeat={mySeat === 'S' && roomState.phase === 'LOBBY' ? onLeaveSeat : undefined}
          onReady={mySeat === 'S' ? onReady : undefined}
        />
      </div>

      {/* West seat */}
      <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10">
        <SeatDisplay
          seat="W"
          roomState={roomState}
          isCurrentTurn={roomState.hand?.currentTurn === 'W'}
          isMySeat={mySeat === 'W'}
          onTakeSeat={!mySeat && roomState.phase === 'LOBBY' ? () => onTakeSeat('W') : undefined}
          onLeaveSeat={mySeat === 'W' && roomState.phase === 'LOBBY' ? onLeaveSeat : undefined}
          onReady={mySeat === 'W' ? onReady : undefined}
        />
      </div>

      {/* East seat */}
      <div className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10">
        <SeatDisplay
          seat="E"
          roomState={roomState}
          isCurrentTurn={roomState.hand?.currentTurn === 'E'}
          isMySeat={mySeat === 'E'}
          onTakeSeat={!mySeat && roomState.phase === 'LOBBY' ? () => onTakeSeat('E') : undefined}
          onLeaveSeat={mySeat === 'E' && roomState.phase === 'LOBBY' ? onLeaveSeat : undefined}
          onReady={mySeat === 'E' ? onReady : undefined}
        />
      </div>

      {/* Center area - played cards */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-32 h-24 sm:w-40 sm:h-32">
          {/* Status text */}
          {roomState.phase === 'LOBBY' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-center">
              <div>
                <div className="text-base sm:text-lg font-bold">Waiting...</div>
                <div className="text-[10px] sm:text-xs">All players must be ready</div>
              </div>
            </div>
          )}

          {roomState.phase === 'BIDDING' && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-center">
              <div>
                <div className="text-base sm:text-lg font-bold">Bidding</div>
                <div className="text-[10px] sm:text-xs">Turn: {roomState.hand?.currentTurn}</div>
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

          {/* Played cards in current book */}
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

      {/* Room code - top left */}
      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-slate-800/90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs z-20">
        <div className="text-slate-400">Room</div>
        <div className="font-mono font-bold text-white">{roomState.code}</div>
      </div>

      {/* Books won indicator during play */}
      {roomState.phase === 'PLAYING' && roomState.hand && (
        <div className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-slate-800/90 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs z-20">
          <div className="text-green-400">NS: {roomState.hand.teamStates.NS.booksWon}/{roomState.hand.teamStates.NS.bid}</div>
          <div className="text-blue-400">EW: {roomState.hand.teamStates.EW.booksWon}/{roomState.hand.teamStates.EW.bid}</div>
        </div>
      )}
    </div>
  );
}
