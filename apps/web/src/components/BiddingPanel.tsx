'use client';

import { useState } from 'react';
import type { PublicRoomState, Seat } from '@spades/shared';
import { getPartner } from '@spades/shared';

interface BiddingPanelProps {
  roomState: PublicRoomState;
  mySeat: Seat;
  isMyTurn: boolean;
  onSubmitBid: (bid: number) => void;
}

export function BiddingPanel({ roomState, mySeat, isMyTurn, onSubmitBid }: BiddingPanelProps) {
  const [bidValue, setBidValue] = useState(0);

  const hand = roomState.hand;
  if (!hand || roomState.phase !== 'BIDDING') return null;

  // Get partner's bid if they've already bid
  const partnerSeat = getPartner(mySeat);
  const partnerBid = hand.bids[partnerSeat];
  const myBid = hand.bids[mySeat];

  // Calculate minimum bid needed for Board (4)
  const minBidForBoard = Math.max(0, 4 - (partnerBid ?? 0));

  const handleSubmit = () => {
    onSubmitBid(bidValue);
  };

  if (myBid !== undefined) {
    return (
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="text-center">
          <div className="text-sm text-slate-400 mb-1">Your Bid</div>
          <div className="text-4xl font-bold text-white mb-2">{myBid}</div>
          <div className="text-sm text-slate-400">
            Waiting for other players...
          </div>
          {partnerBid !== undefined && (
            <div className="text-sm text-green-400 mt-2">
              Partner: {partnerBid} (Team: {myBid + partnerBid})
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="text-center mb-4">
        <div className="text-lg font-bold">
          {isMyTurn ? 'Your Turn to Bid' : `Waiting for ${hand.currentTurn}...`}
        </div>
        {partnerBid !== undefined && (
          <div className="text-sm text-green-400 mt-1">
            Partner bid: {partnerBid}
            {partnerBid < 4 && (
              <span className="text-yellow-400 ml-2">
                (Need {minBidForBoard}+ for Board)
              </span>
            )}
          </div>
        )}
      </div>

      {isMyTurn && (
        <>
          {/* Large bid display with +/- buttons */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={() => setBidValue(Math.max(0, bidValue - 1))}
              className="btn btn-secondary w-14 h-14 text-2xl font-bold rounded-full"
              disabled={bidValue <= 0}
            >
              -
            </button>
            <div className="text-5xl font-bold w-20 text-center">{bidValue}</div>
            <button
              onClick={() => setBidValue(Math.min(13, bidValue + 1))}
              className="btn btn-secondary w-14 h-14 text-2xl font-bold rounded-full"
              disabled={bidValue >= 13}
            >
              +
            </button>
          </div>

          {/* Quick select grid */}
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {Array.from({ length: 14 }, (_, i) => (
              <button
                key={i}
                onClick={() => setBidValue(i)}
                className={`btn btn-sm text-sm font-bold aspect-square p-0 ${
                  bidValue === i ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {i}
              </button>
            ))}
          </div>

          {partnerBid !== undefined && bidValue + partnerBid < 4 && (
            <div className="text-yellow-400 text-sm mb-3 text-center bg-yellow-400/10 rounded-lg p-2">
              Team bid would be {bidValue + partnerBid}, below Board minimum of 4
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="btn btn-success w-full text-lg font-bold"
          >
            Submit Bid ({bidValue})
          </button>
        </>
      )}

      {/* Show all submitted bids */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
        {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => (
          <div key={seat} className="text-center bg-slate-700/50 rounded-lg p-2">
            <div className="text-slate-400 text-xs">{seat}</div>
            <div className={`font-bold ${hand.bids[seat] !== undefined ? 'text-white' : 'text-slate-600'}`}>
              {hand.bids[seat] ?? '-'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
