'use client';

import type { Card as CardType } from '@spades/shared';
import { Card } from './Card';
import { useGameStore } from '@/store/game-store';

interface PlayerHandProps {
  cards: CardType[];
  isMyTurn: boolean;
  onPlayCard: (card: CardType) => void;
}

export function PlayerHand({
  cards,
  isMyTurn,
  onPlayCard,
}: PlayerHandProps) {
  const { selectedCard, setSelectedCard } = useGameStore();

  const handleClick = (card: CardType) => {
    if (!isMyTurn) return;

    if (selectedCard?.suit === card.suit && selectedCard?.rank === card.rank) {
      // Play the card - server will validate if it's legal
      onPlayCard(card);
      setSelectedCard(null);
    } else {
      // Select the card
      setSelectedCard(card);
    }
  };

  return (
    <div className="card-fan hide-scrollbar pb-3 pt-1">
      {cards.map((card, i) => (
        <Card
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          size="md"
          clickable={isMyTurn}
          selected={selectedCard?.suit === card.suit && selectedCard?.rank === card.rank}
          onClick={() => handleClick(card)}
        />
      ))}
    </div>
  );
}
