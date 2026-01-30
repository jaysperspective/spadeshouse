/**
 * Card comparison and Book winner determination logic.
 * Handles all three game modes with their specific trump rules.
 */

import type { Card, Suit, Rank, GameMode, PlayedCard, Seat } from '@spades/shared';

/**
 * Standard rank values (Ace high).
 */
const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  LittleJoker: 0, // Handled specially
  BigJoker: 0,    // Handled specially
};

/**
 * Check if a card is a trump card based on game mode.
 *
 * Ace High / Straight Struggle: All spades are trump.
 * Three Jokers: Big Joker, Little Joker, 2♠, and all other spades are trump.
 */
export function isTrump(card: Card, mode: GameMode): boolean {
  // Jokers are always trump (only exist in Three Jokers mode)
  if (card.rank === 'BigJoker' || card.rank === 'LittleJoker') {
    return true;
  }
  // All spades are trump
  return card.suit === 'spades';
}

/**
 * Get the trump value of a card for comparison within trump cards.
 * Higher value wins.
 *
 * Three Jokers trump order (highest to lowest):
 * 1. Big Joker
 * 2. Little Joker
 * 3. 2♠
 * 4. A♠, K♠, Q♠, J♠, 10♠, ... 3♠ (standard high-to-low)
 *
 * Ace High / Straight Struggle trump order:
 * Standard spade order: A♠ > K♠ > Q♠ > ... > 2♠
 */
export function getTrumpValue(card: Card, mode: GameMode): number {
  if (mode === 'threeJokers') {
    if (card.rank === 'BigJoker') return 100;
    if (card.rank === 'LittleJoker') return 99;
    if (card.suit === 'spades' && card.rank === '2') return 98;
    // Other spades: A=14 down to 3=3 (2 is special)
    if (card.suit === 'spades') {
      return RANK_VALUES[card.rank];
    }
    return 0; // Not a trump
  }

  // Ace High and Straight Struggle: standard spade order
  if (card.suit === 'spades') {
    return RANK_VALUES[card.rank];
  }
  return 0; // Not a trump
}

/**
 * Get the value of a card within its suit (for following suit).
 */
export function getSuitValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

/**
 * Determine the winner of a Book.
 *
 * Rules:
 * - If any trump was played, highest trump wins
 * - Otherwise, highest card of the lead suit wins
 *
 * @param plays The cards played in order (first is lead)
 * @param mode The game mode determining trump rules
 * @returns The seat that won the Book
 */
export function determineBookWinner(plays: PlayedCard[], mode: GameMode): Seat {
  if (plays.length === 0) {
    throw new Error('Cannot determine winner of empty Book');
  }
  if (plays.length !== 4) {
    throw new Error(`Expected 4 plays, got ${plays.length}`);
  }

  const leadPlay = plays[0]!;
  const leadSuit = getEffectiveSuit(leadPlay.card, mode);

  let winningPlay = leadPlay;
  let winningIsTrump = isTrump(leadPlay.card, mode);
  let winningValue = winningIsTrump
    ? getTrumpValue(leadPlay.card, mode)
    : getSuitValue(leadPlay.card);

  for (let i = 1; i < plays.length; i++) {
    const play = plays[i]!;
    const playIsTrump = isTrump(play.card, mode);
    const playValue = playIsTrump
      ? getTrumpValue(play.card, mode)
      : getSuitValue(play.card);
    const playSuit = getEffectiveSuit(play.card, mode);

    // Trump beats non-trump
    if (playIsTrump && !winningIsTrump) {
      winningPlay = play;
      winningIsTrump = true;
      winningValue = playValue;
      continue;
    }

    // Non-trump cannot beat trump
    if (!playIsTrump && winningIsTrump) {
      continue;
    }

    // Both trump: higher trump wins
    if (playIsTrump && winningIsTrump) {
      if (playValue > winningValue) {
        winningPlay = play;
        winningValue = playValue;
      }
      continue;
    }

    // Neither is trump: must follow lead suit, higher of lead suit wins
    if (playSuit === leadSuit && playValue > winningValue) {
      winningPlay = play;
      winningValue = playValue;
    }
    // Cards not following suit and not trump cannot win
  }

  return winningPlay.seat;
}

/**
 * Get the effective suit of a card.
 * Jokers have no suit (null).
 */
export function getEffectiveSuit(card: Card, _mode: GameMode): Suit | null {
  return card.suit;
}

/**
 * Compare two cards to determine which is higher in a given context.
 * Returns positive if a > b, negative if a < b, zero if equal.
 */
export function compareCards(
  a: Card,
  b: Card,
  leadSuit: Suit | null,
  mode: GameMode
): number {
  const aIsTrump = isTrump(a, mode);
  const bIsTrump = isTrump(b, mode);

  // Trump beats non-trump
  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  // Both trump
  if (aIsTrump && bIsTrump) {
    return getTrumpValue(a, mode) - getTrumpValue(b, mode);
  }

  // Neither trump: only lead suit matters
  const aSuit = getEffectiveSuit(a, mode);
  const bSuit = getEffectiveSuit(b, mode);

  const aFollows = aSuit === leadSuit;
  const bFollows = bSuit === leadSuit;

  if (aFollows && !bFollows) return 1;
  if (!aFollows && bFollows) return -1;
  if (aFollows && bFollows) {
    return getSuitValue(a) - getSuitValue(b);
  }

  // Neither follows lead and neither is trump: effectively worthless
  return 0;
}
