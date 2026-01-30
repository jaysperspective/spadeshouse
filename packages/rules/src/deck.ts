/**
 * Deck creation and shuffling utilities.
 */

import type { Card, Suit, Rank, GameMode } from '@spades/shared';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Create a standard 52-card deck.
 */
export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/**
 * Create a Three Jokers deck:
 * - Standard 52 cards
 * - Remove 2♦ and 2♥
 * - Add Big Joker and Little Joker
 * Total: 52 - 2 + 2 = 52 cards
 */
export function createThreeJokersDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      // Remove 2♦ and 2♥
      if (rank === '2' && (suit === 'diamonds' || suit === 'hearts')) {
        continue;
      }
      deck.push({ suit, rank });
    }
  }
  // Add jokers
  deck.push({ suit: null, rank: 'BigJoker' });
  deck.push({ suit: null, rank: 'LittleJoker' });
  return deck;
}

/**
 * Create a deck for the specified game mode.
 */
export function createDeck(mode: GameMode): Card[] {
  if (mode === 'threeJokers') {
    return createThreeJokersDeck();
  }
  return createStandardDeck();
}

/**
 * Seeded random number generator (Mulberry32).
 * Used for deterministic shuffling in tests.
 */
export function createSeededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with optional seed for deterministic results.
 */
export function shuffleDeck(deck: Card[], seed?: number): Card[] {
  const shuffled = [...deck];
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

/**
 * Deal cards to 4 players (13 cards each).
 */
export function dealCards(deck: Card[]): [Card[], Card[], Card[], Card[]] {
  if (deck.length !== 52) {
    throw new Error(`Expected 52 cards, got ${deck.length}`);
  }
  return [
    deck.slice(0, 13),
    deck.slice(13, 26),
    deck.slice(26, 39),
    deck.slice(39, 52),
  ];
}

/**
 * Sort a hand by suit (spades first) then by rank (high to low).
 */
export function sortHand(hand: Card[], mode: GameMode): Card[] {
  const suitOrder: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    clubs: 2,
    diamonds: 3,
  };

  const rankOrder: Record<Rank, number> = {
    BigJoker: 16,
    LittleJoker: 15,
    A: 14,
    K: 13,
    Q: 12,
    J: 11,
    '10': 10,
    '9': 9,
    '8': 8,
    '7': 7,
    '6': 6,
    '5': 5,
    '4': 4,
    '3': 3,
    '2': 2,
  };

  return [...hand].sort((a, b) => {
    // Jokers first (for Three Jokers mode)
    if (!a.suit && b.suit) return -1;
    if (a.suit && !b.suit) return 1;
    if (!a.suit && !b.suit) {
      return rankOrder[b.rank] - rankOrder[a.rank];
    }

    // Sort by suit, then by rank
    const suitDiff = suitOrder[a.suit!] - suitOrder[b.suit!];
    if (suitDiff !== 0) return suitDiff;
    return rankOrder[b.rank] - rankOrder[a.rank];
  });
}

/**
 * Check if a hand has zero spades (for redeal eligibility).
 */
export function hasNoSpades(hand: Card[]): boolean {
  return !hand.some(card => card.suit === 'spades');
}
