/**
 * Tests for card play validation and redeal eligibility.
 */

import { describe, it, expect } from 'vitest';
import {
  validatePlay,
  getPlayableCards,
  hasSuit,
  hasNonTrump,
  wouldBreakSpades,
} from './validation';
import { hasNoSpades } from './deck';
import { validateTeamBid } from './scoring';
import type { Card } from '@spades/shared';

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

describe('Follow Suit', () => {
  const hand: Card[] = [
    card('A', 'hearts'),
    card('K', 'hearts'),
    card('5', 'clubs'),
    card('2', 'spades'),
  ];

  it('must follow suit when able', () => {
    const playable = getPlayableCards(hand, 'hearts', false, true, 'aceHigh');
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit === 'hearts')).toBe(true);
  });

  it('can play anything when cannot follow suit', () => {
    const playable = getPlayableCards(hand, 'diamonds', false, true, 'aceHigh');
    expect(playable).toHaveLength(4); // All cards playable
  });

  it('validates following suit correctly', () => {
    const error = validatePlay(
      card('5', 'clubs'),
      hand,
      'hearts',
      false,
      true,
      'aceHigh'
    );
    expect(error).toBe('Must follow suit (hearts)');
  });

  it('allows trump when cannot follow suit', () => {
    const error = validatePlay(
      card('2', 'spades'),
      hand,
      'diamonds',
      false,
      true,
      'aceHigh'
    );
    expect(error).toBeNull();
  });
});

describe('Spades Leading Restriction', () => {
  const handWithSpades: Card[] = [
    card('A', 'hearts'),
    card('K', 'spades'),
    card('5', 'clubs'),
  ];

  const onlySpades: Card[] = [
    card('A', 'spades'),
    card('K', 'spades'),
    card('2', 'spades'),
  ];

  it('cannot lead spades before broken in Ace High', () => {
    const playable = getPlayableCards(handWithSpades, null, true, false, 'aceHigh');
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.suit !== 'spades')).toBe(true);
  });

  it('can lead spades after broken in Ace High', () => {
    const playable = getPlayableCards(handWithSpades, null, true, true, 'aceHigh');
    expect(playable).toHaveLength(3);
  });

  it('can lead spades anytime in Straight Struggle', () => {
    const playable = getPlayableCards(handWithSpades, null, true, false, 'straightStruggle');
    expect(playable).toHaveLength(3);
  });

  it('can lead spades if only trump in hand (forced)', () => {
    const playable = getPlayableCards(onlySpades, null, true, false, 'aceHigh');
    expect(playable).toHaveLength(3);
  });

  it('validates spades lead restriction', () => {
    const error = validatePlay(
      card('K', 'spades'),
      handWithSpades,
      null,
      true,
      false,
      'aceHigh'
    );
    expect(error).toBe('Cannot lead spades until broken');
  });
});

describe('Three Jokers Mode Specifics', () => {
  const handWithJoker: Card[] = [
    card('BigJoker', null),
    card('A', 'hearts'),
    card('K', 'clubs'),
  ];

  it('cannot lead joker before spades broken', () => {
    const playable = getPlayableCards(handWithJoker, null, true, false, 'threeJokers');
    expect(playable).toHaveLength(2);
    expect(playable.every(c => c.rank !== 'BigJoker')).toBe(true);
  });

  it('can lead joker after spades broken', () => {
    const playable = getPlayableCards(handWithJoker, null, true, true, 'threeJokers');
    expect(playable).toHaveLength(3);
  });

  it('joker breaks spades', () => {
    expect(wouldBreakSpades(card('BigJoker', null), 'threeJokers')).toBe(true);
    expect(wouldBreakSpades(card('LittleJoker', null), 'threeJokers')).toBe(true);
  });
});

describe('Spades Breaking', () => {
  it('playing any spade breaks spades', () => {
    expect(wouldBreakSpades(card('2', 'spades'), 'aceHigh')).toBe(true);
    expect(wouldBreakSpades(card('A', 'spades'), 'aceHigh')).toBe(true);
  });

  it('non-spades do not break spades', () => {
    expect(wouldBreakSpades(card('A', 'hearts'), 'aceHigh')).toBe(false);
    expect(wouldBreakSpades(card('K', 'clubs'), 'aceHigh')).toBe(false);
  });

  it('breaking is ignored in Straight Struggle', () => {
    expect(wouldBreakSpades(card('A', 'spades'), 'straightStruggle')).toBe(false);
  });
});

describe('Redeal Eligibility', () => {
  it('hand with zero spades is eligible for redeal', () => {
    const hand: Card[] = [
      card('A', 'hearts'),
      card('K', 'clubs'),
      card('Q', 'diamonds'),
    ];
    expect(hasNoSpades(hand)).toBe(true);
  });

  it('hand with any spades is not eligible for redeal', () => {
    const hand: Card[] = [
      card('2', 'spades'),
      card('A', 'hearts'),
      card('K', 'clubs'),
    ];
    expect(hasNoSpades(hand)).toBe(false);
  });

  it('hand with only spades has spades', () => {
    const hand: Card[] = [
      card('A', 'spades'),
      card('K', 'spades'),
    ];
    expect(hasNoSpades(hand)).toBe(false);
  });
});

describe('Team Bid Validation (Board)', () => {
  it('team bid of 4 or more is valid', () => {
    expect(validateTeamBid(4)).toBeNull();
    expect(validateTeamBid(5)).toBeNull();
    expect(validateTeamBid(13)).toBeNull();
  });

  it('team bid less than 4 is invalid', () => {
    expect(validateTeamBid(3)).toBe('Team bid must be at least 4 (Board)');
    expect(validateTeamBid(0)).toBe('Team bid must be at least 4 (Board)');
  });
});

describe('Helper Functions', () => {
  const hand: Card[] = [
    card('A', 'hearts'),
    card('K', 'clubs'),
    card('2', 'spades'),
  ];

  it('hasSuit detects suit presence', () => {
    expect(hasSuit(hand, 'hearts')).toBe(true);
    expect(hasSuit(hand, 'diamonds')).toBe(false);
  });

  it('hasNonTrump detects non-trump cards', () => {
    expect(hasNonTrump(hand, 'aceHigh')).toBe(true);

    const onlyTrump: Card[] = [card('A', 'spades'), card('K', 'spades')];
    expect(hasNonTrump(onlyTrump, 'aceHigh')).toBe(false);
  });
});

describe('Card Not In Hand', () => {
  const hand: Card[] = [
    card('A', 'hearts'),
    card('K', 'clubs'),
  ];

  it('rejects playing a card not in hand', () => {
    const error = validatePlay(
      card('Q', 'diamonds'),
      hand,
      null,
      true,
      true,
      'aceHigh'
    );
    expect(error).toBe('Card not in hand');
  });
});
