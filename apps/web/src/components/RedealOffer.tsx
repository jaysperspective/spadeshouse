'use client';

import type { Seat } from '@spades/shared';

interface RedealOfferProps {
  offeredTo: Seat;
  mySeat: Seat | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function RedealOffer({ offeredTo, mySeat, onAccept, onDecline }: RedealOfferProps) {
  const isForMe = offeredTo === mySeat;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4 text-center">Redeal Offer</h2>

        {isForMe ? (
          <>
            <p className="text-slate-300 mb-4 text-center">
              You were dealt zero spades! You may request a redeal.
            </p>
            <p className="text-sm text-yellow-400 mb-6 text-center bg-yellow-400/10 rounded-xl p-3">
              Note: Only one redeal is allowed per game for all players.
            </p>
            <div className="flex gap-3">
              <button onClick={onAccept} className="btn btn-success flex-1">
                Accept Redeal
              </button>
              <button onClick={onDecline} className="btn btn-secondary flex-1">
                Decline
              </button>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="text-slate-300 mb-4">
              Player at seat <span className="font-bold text-white">{offeredTo}</span> was dealt zero spades.
            </div>
            <div className="text-slate-400 text-sm animate-pulse">
              Waiting for their decision...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
