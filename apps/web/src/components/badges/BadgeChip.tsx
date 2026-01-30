'use client';

import type { BadgeId } from '@spades/shared';
import { BADGE_REGISTRY } from '@spades/shared';
import { BadgeIcon } from './BadgeIcon';

interface BadgeChipProps {
  badgeId: BadgeId;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Badge chip component - icon with optional short label.
 * Used in player panels, lobby nameplates, etc.
 */
export function BadgeChip({ badgeId, showLabel = true, size = 'sm', className = '' }: BadgeChipProps) {
  const badge = BADGE_REGISTRY[badgeId];

  if (!badge) {
    return null;
  }

  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const iconSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <div
      className={`
        inline-flex items-center gap-1
        ${padding}
        bg-amber-900/30 border border-amber-600/30
        rounded-full
        ${className}
      `}
      title={badge.shortDescription}
    >
      <BadgeIcon badgeId={badgeId} size={iconSize} />
      {showLabel && (
        <span className={`${textSize} text-amber-300 font-medium truncate max-w-[60px]`}>
          {badge.subtitle}
        </span>
      )}
    </div>
  );
}
