'use client';

import type { Card as CardType } from '@spades/shared';
import { formatCard, SUIT_COLORS } from '@spades/shared';

interface CardProps {
  card: CardType;
  clickable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function Card({ card, clickable, selected, onClick, size = 'md' }: CardProps) {
  const isJoker = card.rank === 'BigJoker' || card.rank === 'LittleJoker';
  const color = isJoker ? 'black' : card.suit ? SUIT_COLORS[card.suit] : 'black';

  return (
    <div
      className={`
        card card-${size}
        ${color === 'red' ? 'card-red' : 'card-black'}
        ${clickable ? 'cursor-pointer active:scale-95 transition-transform' : ''}
        ${selected ? 'ring-2 ring-yellow-400 -translate-y-2 shadow-lg shadow-yellow-400/30' : ''}
      `}
      onClick={clickable ? onClick : undefined}
    >
      {formatCard(card)}
    </div>
  );
}

export function CardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`card card-${size} card-back`}></div>;
}
