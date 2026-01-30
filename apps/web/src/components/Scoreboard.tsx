'use client';

import type { PublicRoomState } from '@spades/shared';

interface ScoreboardProps {
  roomState: PublicRoomState;
}

export function Scoreboard({ roomState }: ScoreboardProps) {
  const nsScore = roomState.teamGameStates.NS.score;
  const ewScore = roomState.teamGameStates.EW.score;
  const nsSets = roomState.teamGameStates.NS.setsCount;
  const ewSets = roomState.teamGameStates.EW.setsCount;

  const nsBooksWon = roomState.hand?.teamStates.NS.booksWon ?? 0;
  const ewBooksWon = roomState.hand?.teamStates.EW.booksWon ?? 0;
  const nsBid = roomState.hand?.teamStates.NS.bid ?? 0;
  const ewBid = roomState.hand?.teamStates.EW.bid ?? 0;

  const modeDisplay = roomState.mode === 'aceHigh'
    ? 'Ace High'
    : roomState.mode === 'threeJokers'
    ? 'Three Jokers'
    : 'Straight Struggle';

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="text-lg font-bold border-b border-slate-700 pb-3 mb-3 flex items-center justify-between">
        <span>Scoreboard</span>
        <span className="text-sm font-normal text-slate-400">
          To {roomState.targetScore}
        </span>
      </div>

      {/* Team scores - larger and more prominent */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-900/30 rounded-xl p-3 text-center border border-green-700">
          <div className="text-green-400 font-medium text-sm mb-1">North/South</div>
          <div className="text-3xl font-bold text-white">{nsScore}</div>
          {nsSets > 0 && (
            <div className="text-xs text-red-400 mt-1">
              Sets: {nsSets}/3
            </div>
          )}
        </div>
        <div className="bg-blue-900/30 rounded-xl p-3 text-center border border-blue-700">
          <div className="text-blue-400 font-medium text-sm mb-1">East/West</div>
          <div className="text-3xl font-bold text-white">{ewScore}</div>
          {ewSets > 0 && (
            <div className="text-xs text-red-400 mt-1">
              Sets: {ewSets}/3
            </div>
          )}
        </div>
      </div>

      {/* Current hand progress */}
      {roomState.hand && roomState.phase === 'PLAYING' && (
        <div className="bg-slate-700/50 rounded-lg p-3 mb-3">
          <div className="text-xs text-slate-400 mb-2 font-medium">This Hand</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-green-400">
              <span>NS:</span>
              <span className="font-bold">{nsBooksWon} / {nsBid}</span>
            </div>
            <div className="flex justify-between text-blue-400">
              <span>EW:</span>
              <span className="font-bold">{ewBooksWon} / {ewBid}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mode */}
      <div className="text-xs text-slate-500 text-center">
        Mode: {modeDisplay}
      </div>
    </div>
  );
}
