'use client';

import { useBadgeStore, useEarnedBadges } from '@/store/badge-store';
import { BadgeIcon } from './BadgeIcon';

interface BadgeShelfProps {
  className?: string;
}

/**
 * Badge shelf component for profile view.
 * Shows all earned badges with equipped state.
 * Allows equip/unequip of badges.
 */
export function BadgeShelf({ className = '' }: BadgeShelfProps) {
  const earnedBadges = useEarnedBadges();
  const { userBadges, equipBadge } = useBadgeStore();

  if (earnedBadges.length === 0) {
    return (
      <div className={`bg-slate-800 rounded-xl p-4 ${className}`}>
        <h3 className="text-sm font-semibold text-slate-400 mb-3">Badges</h3>
        <div className="text-center py-6 text-slate-500 text-sm">
          <div className="mb-2">No badges earned yet</div>
          <div className="text-xs text-slate-600">
            Complete Learning Mode to earn your first badge
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-800 rounded-xl p-4 ${className}`}>
      <h3 className="text-sm font-semibold text-slate-400 mb-3">Badges</h3>
      <div className="space-y-3">
        {earnedBadges.map((badge) => {
          const isEquipped = userBadges.equippedBadgeId === badge.badgeId;
          const definition = badge.definition;

          if (!definition) return null;

          return (
            <div
              key={badge.badgeId}
              className={`
                p-3 rounded-xl border transition-all
                ${isEquipped
                  ? 'bg-amber-900/20 border-amber-500/50'
                  : 'bg-slate-700/50 border-slate-600/50 hover:border-slate-500'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Badge icon */}
                <div className={`
                  p-2 rounded-lg flex-shrink-0
                  ${isEquipped ? 'bg-amber-500/20' : 'bg-slate-600/50'}
                `}>
                  <BadgeIcon badgeId={badge.badgeId} size="md" />
                </div>

                {/* Badge info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm truncate">
                      {definition.title}
                    </span>
                    {isEquipped && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/30 text-amber-300 rounded-full">
                        Equipped
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mb-2">
                    {definition.subtitle}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-2">
                    {definition.shortDescription}
                  </div>
                </div>
              </div>

              {/* Equip/Unequip button */}
              <div className="mt-3 flex justify-end">
                {isEquipped ? (
                  <button
                    onClick={() => equipBadge(null)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-300 transition-colors"
                  >
                    Unequip
                  </button>
                ) : (
                  <button
                    onClick={() => equipBadge(badge.badgeId)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    Equip
                  </button>
                )}
              </div>

              {/* Earned date */}
              <div className="mt-2 text-[10px] text-slate-600">
                Earned {new Date(badge.earnedAt).toLocaleDateString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact badge display for inline use.
 * Shows just the equipped badge icon or nothing.
 */
export function EquippedBadgeDisplay({ className = '' }: { className?: string }) {
  const { userBadges } = useBadgeStore();

  if (!userBadges.equippedBadgeId) {
    return null;
  }

  return (
    <BadgeIcon
      badgeId={userBadges.equippedBadgeId}
      size="xs"
      className={className}
    />
  );
}
