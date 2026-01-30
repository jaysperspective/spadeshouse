/**
 * Tests for book winner determination across all game modes.
 */

import { describe, it, expect } from 'vitest';
import { determineBookWinner, isTrump, getTrumpValue } from './comparison';
import type { PlayedCard, Card, Seat } from '@spades/shared';

// Helper to create a card
function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

// Helper to create a played card
function play(seat: Seat, rank: Card['rank'], suit: Card['suit']): PlayedCard {
  return { seat, card: card(rank, suit) };
}

describe('Ace High Mode', () => {
  const mode = 'aceHigh' as const;

  it('highest card of lead suit wins when no trump played', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'hearts'),
      play('E', 'Q', 'hearts'),
      play('S', 'K', 'hearts'),
      play('W', '3', 'hearts'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('S');
  });

  it('Ace beats all other cards of same suit', () => {
    const plays: PlayedCard[] = [
      play('N', '2', 'clubs'),
      play('E', 'A', 'clubs'),
      play('S', 'K', 'clubs'),
      play('W', 'Q', 'clubs'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('spade trump beats non-trump cards', () => {
    const plays: PlayedCard[] = [
      play('N', 'A', 'hearts'),
      play('E', '2', 'spades'),
      play('S', 'K', 'hearts'),
      play('W', 'Q', 'hearts'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('highest spade wins when multiple spades played', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'hearts'),
      play('E', '10', 'spades'),
      play('S', 'K', 'spades'),
      play('W', '3', 'spades'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('S');
  });

  it('off-suit non-trump cards cannot win', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'hearts'),
      play('E', 'A', 'clubs'), // Off-suit
      play('S', '6', 'hearts'),
      play('W', '7', 'hearts'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('W');
  });
});

describe('Three Jokers Mode', () => {
  const mode = 'threeJokers' as const;

  it('Big Joker beats everything', () => {
    const plays: PlayedCard[] = [
      play('N', 'A', 'spades'),
      play('E', 'BigJoker', null),
      play('S', 'K', 'spades'),
      play('W', '2', 'spades'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('Little Joker beats all spades', () => {
    const plays: PlayedCard[] = [
      play('N', 'A', 'spades'),
      play('E', '2', 'spades'),
      play('S', 'LittleJoker', null),
      play('W', 'K', 'spades'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('S');
  });

  it('Big Joker beats Little Joker', () => {
    const plays: PlayedCard[] = [
      play('N', 'LittleJoker', null),
      play('E', 'BigJoker', null),
      play('S', 'A', 'spades'),
      play('W', 'K', 'hearts'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('2 of spades beats Ace of spades', () => {
    const plays: PlayedCard[] = [
      play('N', 'A', 'spades'),
      play('E', '2', 'spades'),
      play('S', 'K', 'spades'),
      play('W', 'Q', 'spades'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('trump order: BigJoker > LittleJoker > 2S > AS > KS...', () => {
    expect(getTrumpValue(card('BigJoker', null), mode)).toBe(100);
    expect(getTrumpValue(card('LittleJoker', null), mode)).toBe(99);
    expect(getTrumpValue(card('2', 'spades'), mode)).toBe(98);
    expect(getTrumpValue(card('A', 'spades'), mode)).toBe(14);
    expect(getTrumpValue(card('K', 'spades'), mode)).toBe(13);
    expect(getTrumpValue(card('3', 'spades'), mode)).toBe(3);
  });

  it('jokers are trump', () => {
    expect(isTrump(card('BigJoker', null), mode)).toBe(true);
    expect(isTrump(card('LittleJoker', null), mode)).toBe(true);
  });
});

describe('Straight Struggle Mode', () => {
  const mode = 'straightStruggle' as const;

  it('highest card of lead suit wins when no trump', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'diamonds'),
      play('E', 'Q', 'diamonds'),
      play('S', 'A', 'diamonds'),
      play('W', '3', 'diamonds'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('S');
  });

  it('spades are still trump', () => {
    const plays: PlayedCard[] = [
      play('N', 'A', 'hearts'),
      play('E', '2', 'spades'),
      play('S', 'K', 'hearts'),
      play('W', 'Q', 'hearts'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('E');
  });

  it('Ace of spades is highest spade (no jokers)', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'clubs'),
      play('E', 'K', 'spades'),
      play('S', 'A', 'spades'),
      play('W', '2', 'spades'),
    ];
    expect(determineBookWinner(plays, mode)).toBe('S');
  });
});

describe('Edge Cases', () => {
  it('throws error for empty plays', () => {
    expect(() => determineBookWinner([], 'aceHigh')).toThrow();
  });

  it('throws error for incomplete book', () => {
    const plays: PlayedCard[] = [
      play('N', '5', 'hearts'),
      play('E', '6', 'hearts'),
    ];
    expect(() => determineBookWinner(plays, 'aceHigh')).toThrow();
  });

  it('first player wins tie (all same rank different suits - lead wins)', () => {
    // This shouldn't happen in real play but tests the logic
    const plays: PlayedCard[] = [
      play('N', '5', 'hearts'),
      play('E', '5', 'clubs'),
      play('S', '5', 'diamonds'),
      play('W', '4', 'hearts'),
    ];
    // N leads with 5H, W plays 4H (following suit but lower)
    // N wins with 5H as highest of lead suit
    expect(determineBookWinner(plays, 'aceHigh')).toBe('N');
  });
});
