/**
 * Tests for scoring logic across all game modes.
 */

import { describe, it, expect } from 'vitest';
import { calculateHandScore, dimeEnabled, setLimitEnabled } from './scoring';
import type { ScoringInput } from './scoring';

function makeInput(overrides: Partial<ScoringInput>): ScoringInput {
  return {
    team: 'NS',
    bid: 5,
    booksWon: 5,
    currentScore: 0,
    currentSetsCount: 0,
    handIndex: 0,
    mode: 'aceHigh',
    ...overrides,
  };
}

describe('Basic Scoring', () => {
  it('making bid exactly scores books * 10', () => {
    const result = calculateHandScore(makeInput({ bid: 6, booksWon: 6 }));
    expect(result.pointsEarned).toBe(60);
    expect(result.isSet).toBe(false);
    expect(result.isDime).toBe(false);
  });

  it('winning more books than bid still scores books * 10', () => {
    const result = calculateHandScore(makeInput({ bid: 4, booksWon: 6 }));
    expect(result.pointsEarned).toBe(60);
    expect(result.isSet).toBe(false);
  });

  it('underbidding results in Set', () => {
    const result = calculateHandScore(makeInput({ bid: 6, booksWon: 5 }));
    expect(result.isSet).toBe(true);
    expect(result.pointsEarned).toBe(-60);
  });

  it('bid of 0 with 0 books won', () => {
    const result = calculateHandScore(makeInput({ bid: 0, booksWon: 0 }));
    expect(result.pointsEarned).toBe(0);
    expect(result.isSet).toBe(false);
  });
});

describe('Overbooks Rules', () => {
  it('exactly 3 overbooks scores 0 points (not a Set)', () => {
    const result = calculateHandScore(makeInput({ bid: 5, booksWon: 8 }));
    expect(result.pointsEarned).toBe(0);
    expect(result.isSet).toBe(false);
  });

  it('4 or more overbooks results in Set', () => {
    const result = calculateHandScore(makeInput({ bid: 5, booksWon: 9 }));
    expect(result.isSet).toBe(true);
    expect(result.pointsEarned).toBe(-50);
  });

  it('5 overbooks is also a Set', () => {
    const result = calculateHandScore(makeInput({ bid: 5, booksWon: 10 }));
    expect(result.isSet).toBe(true);
    expect(result.pointsEarned).toBe(-50);
  });
});

describe('Dime Scoring', () => {
  it('exactly 10 books in Ace High mode = 110 points (Dime)', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 10,
      mode: 'aceHigh',
    }));
    expect(result.isDime).toBe(true);
    expect(result.pointsEarned).toBe(110);
    expect(result.isSet).toBe(false);
  });

  it('exactly 10 books in Three Jokers mode = 110 points (Dime)', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,  // +2 over, so Dime applies
      booksWon: 10,
      mode: 'threeJokers',
    }));
    expect(result.isDime).toBe(true);
    expect(result.pointsEarned).toBe(110);
  });

  it('exactly 10 books in Straight Struggle mode = 100 points (no Dime bonus)', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 10,
      mode: 'straightStruggle',
    }));
    expect(result.isDime).toBe(false);
    expect(result.pointsEarned).toBe(100);
  });

  it('10 books with bid 6 is Set (+4 over), not Dime', () => {
    const result = calculateHandScore(makeInput({
      bid: 6,
      booksWon: 10,
      mode: 'aceHigh',
    }));
    // Over = 10 - 6 = 4, which is >= 4, so Set
    expect(result.isSet).toBe(true);
    expect(result.isDime).toBe(false);
    expect(result.pointsEarned).toBe(-60);
  });

  it('10 books with bid 7 is +3 over (0 points), not Dime', () => {
    const result = calculateHandScore(makeInput({
      bid: 7,
      booksWon: 10,
      mode: 'aceHigh',
    }));
    // Over = 10 - 7 = 3, which triggers +3 rule (0 points)
    expect(result.isSet).toBe(false);
    expect(result.isDime).toBe(false);
    expect(result.pointsEarned).toBe(0);
  });

  it('Dime requires exactly 10 books', () => {
    const result = calculateHandScore(makeInput({
      bid: 9,
      booksWon: 11,
      mode: 'aceHigh',
    }));
    expect(result.isDime).toBe(false);
    expect(result.pointsEarned).toBe(110); // Regular scoring
  });
});

describe('First-Hand Dime Instant Win', () => {
  it('first-hand Dime triggers instant win in Ace High', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 10,
      handIndex: 0,
      mode: 'aceHigh',
    }));
    expect(result.isInstantWin).toBe(true);
    expect(result.winReason).toBe('firstHandDime');
  });

  it('first-hand Dime triggers instant win in Three Jokers', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,  // +2 over, so Dime applies
      booksWon: 10,
      handIndex: 0,
      mode: 'threeJokers',
    }));
    expect(result.isInstantWin).toBe(true);
    expect(result.winReason).toBe('firstHandDime');
  });

  it('first-hand Dime does NOT trigger instant win in Straight Struggle', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 10,
      handIndex: 0,
      mode: 'straightStruggle',
    }));
    expect(result.isInstantWin).toBe(false);
    expect(result.isDime).toBe(false); // No dime in straight struggle
  });

  it('second-hand Dime does not trigger instant win', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 10,
      handIndex: 1,
      mode: 'aceHigh',
    }));
    expect(result.isDime).toBe(true);
    expect(result.isInstantWin).toBe(false);
  });
});

describe('Set Limit (3 Sets Auto-Loss)', () => {
  it('third Set triggers auto-loss in Ace High', () => {
    const result = calculateHandScore(makeInput({
      bid: 6,
      booksWon: 3, // Under bid = Set
      currentSetsCount: 2,
      mode: 'aceHigh',
    }));
    expect(result.isSet).toBe(true);
    expect(result.newSetsCount).toBe(3);
    expect(result.isInstantLoss).toBe(true);
    expect(result.winReason).toBe('threeSetLoss');
  });

  it('third Set triggers auto-loss in Three Jokers', () => {
    const result = calculateHandScore(makeInput({
      bid: 5,
      booksWon: 9, // +4 over = Set
      currentSetsCount: 2,
      mode: 'threeJokers',
    }));
    expect(result.isSet).toBe(true);
    expect(result.newSetsCount).toBe(3);
    expect(result.isInstantLoss).toBe(true);
  });

  it('third Set does NOT trigger auto-loss in Straight Struggle', () => {
    const result = calculateHandScore(makeInput({
      bid: 6,
      booksWon: 3,
      currentSetsCount: 2,
      mode: 'straightStruggle',
    }));
    expect(result.isSet).toBe(true);
    expect(result.newSetsCount).toBe(3);
    expect(result.isInstantLoss).toBe(false);
  });

  it('Sets count increments correctly', () => {
    const result = calculateHandScore(makeInput({
      bid: 6,
      booksWon: 3,
      currentSetsCount: 0,
      mode: 'aceHigh',
    }));
    expect(result.newSetsCount).toBe(1);
    expect(result.isInstantLoss).toBe(false);
  });
});

describe('Mode Feature Flags', () => {
  it('dimeEnabled returns correct values', () => {
    expect(dimeEnabled('aceHigh')).toBe(true);
    expect(dimeEnabled('threeJokers')).toBe(true);
    expect(dimeEnabled('straightStruggle')).toBe(false);
  });

  it('setLimitEnabled returns correct values', () => {
    expect(setLimitEnabled('aceHigh')).toBe(true);
    expect(setLimitEnabled('threeJokers')).toBe(true);
    expect(setLimitEnabled('straightStruggle')).toBe(false);
  });
});

describe('Score Accumulation', () => {
  it('new score is calculated correctly', () => {
    const result = calculateHandScore(makeInput({
      bid: 5,
      booksWon: 5,
      currentScore: 100,
    }));
    expect(result.newScore).toBe(150);
  });

  it('negative points reduce score', () => {
    const result = calculateHandScore(makeInput({
      bid: 6,
      booksWon: 3,
      currentScore: 100,
    }));
    expect(result.pointsEarned).toBe(-60);
    expect(result.newScore).toBe(40);
  });

  it('score can go negative', () => {
    const result = calculateHandScore(makeInput({
      bid: 8,
      booksWon: 4,
      currentScore: 50,
    }));
    expect(result.newScore).toBe(-30);
  });
});
