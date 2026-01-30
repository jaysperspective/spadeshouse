/**
 * Card play validation logic.
 * Enforces follow-suit rules and spades-leading restrictions.
 */

import type { Card, Suit, GameMode } from '@spades/shared';
import { isTrump } from './comparison.js';

/**
 * Check if a card matches a suit for following purposes.
 * Jokers are considered spades in Three Jokers mode.
 */
function cardMatchesSuit(card: Card, suit: Suit, mode: GameMode): boolean {
  if (card.suit === suit) return true;

  // In Three Jokers mode, jokers are considered spades for following suit
  if (mode === 'threeJokers' && suit === 'spades') {
    if (card.rank === 'BigJoker' || card.rank === 'LittleJoker') {
      return true;
    }
  }

  return false;
}

/**
 * Check if a player has any cards of a specific suit in their hand.
 */
export function hasSuit(hand: Card[], suit: Suit): boolean {
  return hand.some(card => card.suit === suit);
}

/**
 * Check if a player has any non-trump cards in their hand.
 */
export function hasNonTrump(hand: Card[], mode: GameMode): boolean {
  return hand.some(card => !isTrump(card, mode));
}

/**
 * Get all cards that can legally be played.
 *
 * Rules:
 * - If leading: check spades-leading restriction
 * - If following: must follow suit if possible (jokers count as spades)
 * - If cannot follow suit: can play anything
 */
export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null,
  isLeading: boolean,
  spadesBroken: boolean,
  mode: GameMode
): Card[] {
  if (hand.length === 0) {
    return [];
  }

  // If leading
  if (isLeading) {
    return getLeadingOptions(hand, spadesBroken, mode);
  }

  // If following
  if (leadSuit === null) {
    // Lead was a joker (no suit to follow) - can play anything
    return hand;
  }

  // Check if player has any cards that match the lead suit
  // (jokers match spades in Three Jokers mode)
  const followingCards = hand.filter(card => cardMatchesSuit(card, leadSuit, mode));
  if (followingCards.length > 0) {
    // Must follow suit
    return followingCards;
  }

  // Cannot follow suit: can play anything
  return hand;
}

/**
 * Get cards that can be led.
 *
 * Spades-leading restriction:
 * - Ace High / Three Jokers: Cannot lead spades (or jokers) until spades are broken
 * - Straight Struggle: Spades may be led at any time
 *
 * Exception: If hand contains ONLY spades/trump, player may lead them.
 */
function getLeadingOptions(
  hand: Card[],
  spadesBroken: boolean,
  mode: GameMode
): Card[] {
  // Straight Struggle: no restriction
  if (mode === 'straightStruggle') {
    return hand;
  }

  // Spades broken: no restriction
  if (spadesBroken) {
    return hand;
  }

  // Spades not broken: prefer non-spades
  const nonTrump = hand.filter(card => !isTrump(card, mode));
  if (nonTrump.length > 0) {
    return nonTrump;
  }

  // Only trump in hand: must lead it
  return hand;
}

/**
 * Validate that a card play is legal.
 *
 * @returns null if legal, error message if illegal
 */
export function validatePlay(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
  isLeading: boolean,
  spadesBroken: boolean,
  mode: GameMode
): string | null {
  // Check if card is in hand
  const inHand = hand.some(c => c.suit === card.suit && c.rank === card.rank);
  if (!inHand) {
    return 'Card not in hand';
  }

  const playable = getPlayableCards(hand, leadSuit, isLeading, spadesBroken, mode);
  const canPlay = playable.some(c => c.suit === card.suit && c.rank === card.rank);

  if (!canPlay) {
    if (isLeading && !spadesBroken && isTrump(card, mode)) {
      return 'Cannot lead spades until broken';
    }
    if (!isLeading && leadSuit !== null) {
      return `Must follow suit (${leadSuit})`;
    }
    return 'Illegal play';
  }

  return null;
}

/**
 * Check if playing a card would break spades.
 *
 * Spades are broken when:
 * - Any spade (or joker in Three Jokers mode) is played
 *
 * In Straight Struggle mode, this concept doesn't apply (spades always allowed).
 */
export function wouldBreakSpades(card: Card, mode: GameMode): boolean {
  if (mode === 'straightStruggle') {
    return false; // Concept doesn't apply
  }
  return isTrump(card, mode);
}
