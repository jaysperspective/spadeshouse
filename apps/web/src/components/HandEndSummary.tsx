'use client';

import type { HandEndResult, Team } from '@spades/shared';

interface HandEndSummaryProps {
  results: HandEndResult[];
  winner: Team | null;
  winReason: string | null;
  onContinue: () => void;
}

export function HandEndSummary({ results, winner, winReason, onContinue }: HandEndSummaryProps) {
  const isGameOver = winner !== null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] max-h-[90dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 text-center border-b border-slate-700">
          <h2 className="text-2xl font-bold">
            {isGameOver ? 'Game Over!' : 'Hand Complete'}
          </h2>

          {isGameOver && (
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-yellow-400">
                {winner === 'NS' ? 'North-South Wins!' : 'East-West Wins!'}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {winReason === 'score' && 'Reached target score'}
                {winReason === 'firstHandDime' && 'First-hand Dime!'}
                {winReason === 'threeSetLoss' && 'Opponent reached 3 Sets'}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 mobile-scroll">
          {results.map((result) => (
            <div
              key={result.team}
              className={`p-4 rounded-xl ${
                result.team === 'NS' ? 'bg-green-900/30 border border-green-700' : 'bg-blue-900/30 border border-blue-700'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg">
                  {result.team === 'NS' ? 'North-South' : 'East-West'}
                </span>
                <span
                  className={`text-2xl font-bold ${
                    result.pointsEarned >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {result.pointsEarned >= 0 ? '+' : ''}
                  {result.pointsEarned}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bid:</span>
                  <span>{result.bid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Won:</span>
                  <span>{result.booksWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Over:</span>
                  <span>{result.overbooks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total:</span>
                  <span className="font-bold">{result.newScore}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                {result.isSet && (
                  <span className="px-2 py-1 bg-red-600 rounded-lg text-xs font-bold">SET</span>
                )}
                {result.isDime && (
                  <span className="px-2 py-1 bg-yellow-600 rounded-lg text-xs font-bold">DIME!</span>
                )}
                {result.overbooks === 3 && !result.isSet && (
                  <span className="px-2 py-1 bg-orange-600 rounded-lg text-xs font-bold">+3 (0 pts)</span>
                )}
                {result.setsCount > 0 && (
                  <span className="px-2 py-1 bg-red-900 rounded-lg text-xs">
                    Sets: {result.setsCount}/3
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onContinue}
            className="btn btn-primary w-full text-lg font-bold"
          >
            {isGameOver ? 'Return to Lobby' : 'Next Hand'}
          </button>
        </div>
      </div>
    </div>
  );
}
