'use client';

import type { GameMode } from '@spades/shared';
import { getModeConfig } from '@spades/rules';

interface RulesScreenProps {
  mode: GameMode;
  onClose: () => void;
}

export function RulesScreen({ mode, onClose }: RulesScreenProps) {
  const config = getModeConfig(mode);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] max-h-[90dvh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold">{config.name} Rules</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 mobile-scroll">
          <p className="text-slate-300 mb-4 text-sm sm:text-base">{config.description}</p>

          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 text-yellow-400">Trump Order</h3>
            <div className="bg-slate-700 p-3 rounded-xl text-xs sm:text-sm font-mono overflow-x-auto">
              {config.trumpOrder.join(' > ')}
            </div>
          </div>

          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 text-yellow-400">Mode Rules</h3>
            <ul className="space-y-2">
              {config.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 text-yellow-400">General Rules</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>Book</strong> - What other games call a "trick"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>Board</strong> - Minimum team bid of 4 Books</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>Dime</strong> - Winning exactly 10 Books (bonus points)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span><strong>Set</strong> - Failing to make your bid OR winning 4+ over bid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>Winning exactly 3 Books over bid = 0 points (not a Set)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>Teams: North-South (NS) vs East-West (EW)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">•</span>
                <span>Must follow suit if possible</span>
              </li>
            </ul>
          </div>

          <div className="mb-5">
            <h3 className="text-base font-semibold mb-2 text-yellow-400">Scoring</h3>
            <div className="bg-slate-700 p-3 rounded-xl text-sm space-y-1">
              <div>• Make bid: Books Won × 10 points</div>
              <div>• Dime (10 Books): 110 points</div>
              <div>• +3 Overbooks: 0 points</div>
              <div>• Set: -(Bid × 10) points</div>
              <div>• First-hand Dime: Instant win!</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="btn btn-primary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
