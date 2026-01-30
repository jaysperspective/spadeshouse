'use client';

import { BADGE_REGISTRY } from '@spades/shared';
import { useBadgeStore } from '@/store/badge-store';
import { BadgeIcon } from './BadgeIcon';

/**
 * Modal shown when a badge is unlocked for the first time.
 * Follows existing modal patterns in the codebase.
 */
export function BadgeUnlockModal() {
  const { showUnlockModal, pendingUnlockBadgeId, hideBadgeUnlockModal, equipBadge } = useBadgeStore();

  if (!showUnlockModal || !pendingUnlockBadgeId) {
    return null;
  }

  const badge = BADGE_REGISTRY[pendingUnlockBadgeId];
  if (!badge) {
    return null;
  }

  const handleEquip = () => {
    equipBadge(pendingUnlockBadgeId);
    hideBadgeUnlockModal();
  };

  const handleContinue = () => {
    hideBadgeUnlockModal();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 text-center border-b border-slate-700">
          <div className="text-sm text-slate-400 mb-2 uppercase tracking-wide">
            Learning Complete
          </div>
          <h2 className="text-xl font-bold text-white">
            Badge Unlocked
          </h2>
        </div>

        {/* Badge Display */}
        <div className="p-6 flex flex-col items-center">
          {/* Large badge icon */}
          <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30">
            <BadgeIcon badgeId={pendingUnlockBadgeId} size="lg" />
          </div>

          {/* Badge info */}
          <div className="text-center">
            <h3 className="text-lg font-bold text-amber-400 mb-1">
              {badge.title}
            </h3>
            <div className="text-sm text-amber-300/80 mb-3">
              {badge.subtitle}
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {badge.shortDescription}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={handleContinue}
            className="btn btn-secondary flex-1"
          >
            Continue
          </button>
          <button
            onClick={handleEquip}
            className="btn btn-primary flex-1"
          >
            Equip Badge
          </button>
        </div>
      </div>
    </div>
  );
}
