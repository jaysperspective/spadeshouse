'use client';

import type { BadgeId } from '@spades/shared';
import { BADGE_REGISTRY } from '@spades/shared';

interface BadgeIconProps {
  badgeId: BadgeId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-5 h-5 text-[10px]',
  md: 'w-6 h-6 text-xs',
  lg: 'w-8 h-8 text-sm',
};

/**
 * Small badge icon component.
 * Uses placeholder styling - replace with actual badge art later.
 */
export function BadgeIcon({ badgeId, size = 'sm', className = '' }: BadgeIconProps) {
  const badge = BADGE_REGISTRY[badgeId];

  if (!badge) {
    return null;
  }

  // Placeholder icon - a stylized badge shape
  // Replace this with actual badge artwork later
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${className}
        inline-flex items-center justify-center
        rounded-full
        bg-gradient-to-br from-amber-500 to-amber-700
        border border-amber-400/50
        shadow-sm
        flex-shrink-0
      `}
      title={badge.title}
    >
      {/* Placeholder: Kitchen table icon representation */}
      <span className="text-white font-bold">K</span>
    </div>
  );
}

/**
 * Badge icon with tooltip on hover.
 */
export function BadgeIconWithTooltip({ badgeId, size = 'sm', className = '' }: BadgeIconProps) {
  const badge = BADGE_REGISTRY[badgeId];

  if (!badge) {
    return null;
  }

  return (
    <div className="relative group">
      <BadgeIcon badgeId={badgeId} size={size} className={className} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {badge.title}
      </div>
    </div>
  );
}
