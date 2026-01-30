/**
 * Bot AI module for CPU players.
 * Provides bidding strategy and card play decision-making.
 */

import type { Card, Suit, GameMode, Seat, PlayedCard, Book } from '@spades/shared';
import { getTeam, getPartner } from '@spades/shared';
import {
  getPlayableCards,
  isTrump,
  getTrumpValue,
  getSuitValue,
  compareCards,
  determineBookWinner,
} from '@spades/rules';

// ============================================
// Bidding Strategy
// ============================================

/**
 * Calculate a bid for a CPU player based on their hand.
 *
 * Strategy:
 * - Count high spades (A, K, Q) as probable winners
 * - Count Ace-high side suits as probable winners
 * - Consider partner's bid when adjusting for Board minimum
 * - Add slight variance for realism
 */
export function calculateBotBid(
  hand: Card[],
  partnerBid: number | null,
  mode: GameMode
): number {
  let expectedBooks = 0;

  // Count trump strength
  const trumpCards = hand.filter(c => isTrump(c, mode));
  const highTrumps = trumpCards.filter(c => {
    const value = getTrumpValue(c, mode);
    // In threeJokers: Jokers (100, 99), 2 of spades (98), A (14), K (13), Q (12)
    // In other modes: A (14), K (13), Q (12)
    if (mode === 'threeJokers') {
      return value >= 12 || value >= 98; // Q+ or special trump
    }
    return value >= 12; // Q or higher spade
  });

  // High trump cards are fairly reliable winners
  expectedBooks += highTrumps.length * 0.85;

  // Medium trump (J, 10, 9) are situational winners
  const mediumTrumps = trumpCards.filter(c => {
    const value = getTrumpValue(c, mode);
    return value >= 9 && value < 12;
  });
  expectedBooks += mediumTrumps.length * 0.3;

  // Count side suit strength
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs'];
  for (const suit of suits) {
    const suitCards = hand.filter(c => c.suit === suit);
    if (suitCards.length === 0) continue;

    // Sort by value descending
    const sorted = [...suitCards].sort((a, b) => getSuitValue(b) - getSuitValue(a));

    // Ace is usually a winner if we have it
    if (sorted[0] && getSuitValue(sorted[0]) === 14) {
      expectedBooks += 0.75;

      // K is likely a winner if we have A-K
      if (sorted[1] && getSuitValue(sorted[1]) === 13) {
        expectedBooks += 0.5;
      }
    }

    // Void or singleton in a suit means we can trump early
    if (suitCards.length <= 1 && trumpCards.length > 0) {
      expectedBooks += 0.3;
    }
  }

  // Round to nearest integer with slight random variance
  const variance = (Math.random() - 0.5) * 0.8; // -0.4 to +0.4
  let bid = Math.round(expectedBooks + variance);

  // Clamp to valid range
  bid = Math.max(0, Math.min(13, bid));

  // Adjust for Board minimum (4) if partner bid low
  if (partnerBid !== null) {
    const teamBid = bid + partnerBid;
    if (teamBid < 4 && bid < 3) {
      // Bump up to try to meet Board
      bid = Math.min(4 - partnerBid, 4);
    }
  }

  return bid;
}

// ============================================
// Card Play Strategy
// ============================================

interface PlayContext {
  hand: Card[];
  currentBook: PlayedCard[];
  completedBooks: Book[];
  bids: Partial<Record<Seat, number>>;
  teamBooksWon: number;
  opponentBooksWon: number;
  spadesBroken: boolean;
  mode: GameMode;
  mySeat: Seat;
}

/**
 * Choose the best card for a CPU player to play.
 */
export function chooseBotCard(context: PlayContext): Card {
  const {
    hand,
    currentBook,
    completedBooks,
    spadesBroken,
    mode,
    mySeat,
  } = context;

  const isLeading = currentBook.length === 0;
  const leadSuit = isLeading ? null : currentBook[0]?.card.suit ?? null;

  // Get legal plays
  const playable = getPlayableCards(hand, leadSuit, isLeading, spadesBroken, mode);

  if (playable.length === 0) {
    // Should never happen, but fallback
    return hand[0]!;
  }

  if (playable.length === 1) {
    return playable[0]!;
  }

  // Decision based on position
  if (isLeading) {
    return chooseLeadCard(playable, context);
  } else {
    return chooseFollowCard(playable, context);
  }
}

/**
 * Choose a card when leading a Book.
 */
function chooseLeadCard(playable: Card[], context: PlayContext): Card {
  const { mode, completedBooks } = context;

  // Separate trump and non-trump
  const nonTrump = playable.filter(c => !isTrump(c, mode));
  const trump = playable.filter(c => isTrump(c, mode));

  // Prefer leading non-trump if available
  if (nonTrump.length > 0) {
    // Lead from longest suit with high cards
    const suitCounts = new Map<Suit, Card[]>();
    for (const card of nonTrump) {
      if (card.suit) {
        const existing = suitCounts.get(card.suit) || [];
        existing.push(card);
        suitCounts.set(card.suit, existing);
      }
    }

    // Find suit with an Ace or King to lead
    for (const [, cards] of suitCounts) {
      const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
      const highest = sorted[0];
      if (highest && getSuitValue(highest) >= 13) {
        // Lead Ace or King
        return highest;
      }
    }

    // Otherwise lead low from longest suit
    let longestSuit: Card[] = [];
    for (const [, cards] of suitCounts) {
      if (cards.length > longestSuit.length) {
        longestSuit = cards;
      }
    }

    if (longestSuit.length > 0) {
      // Lead lowest from longest suit
      const sorted = [...longestSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }
  }

  // Only trump available - lead high if strong, low if weak
  if (trump.length > 0) {
    const sortedTrump = [...trump].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));

    // Count remaining trump in hand
    const trumpCount = trump.length;
    const booksPlayed = completedBooks.length;

    // If we have lots of trump late in hand, lead high
    if (trumpCount >= 3 || booksPlayed >= 8) {
      return sortedTrump[0]!;
    }

    // Otherwise lead low trump
    return sortedTrump[sortedTrump.length - 1]!;
  }

  // Fallback to first playable
  return playable[0]!;
}

/**
 * Choose a card when following in a Book.
 */
function chooseFollowCard(playable: Card[], context: PlayContext): Card {
  const { currentBook, mode, mySeat } = context;

  const leadCard = currentBook[0]!.card;
  const leadSuit = leadCard.suit;
  const partnerSeat = getPartner(mySeat);

  // Determine who's currently winning
  const currentWinner = determineCurrentWinner(currentBook, mode);
  const partnerWinning = currentWinner?.seat === partnerSeat;
  const myTeam = getTeam(mySeat);
  const teamWinning = currentWinner ? getTeam(currentWinner.seat) === myTeam : false;

  // Separate cards by whether they follow suit
  const followsSuit = playable.filter(c => c.suit === leadSuit);
  const trumpCards = playable.filter(c => isTrump(c, mode) && c.suit !== leadSuit);
  const offSuit = playable.filter(c => !isTrump(c, mode) && c.suit !== leadSuit);

  // Case 1: Can follow suit
  if (followsSuit.length > 0) {
    const sorted = [...followsSuit].sort((a, b) => getSuitValue(b) - getSuitValue(a));

    if (partnerWinning) {
      // Partner winning - play low to save resources
      return sorted[sorted.length - 1]!;
    }

    // Try to win with lowest winning card
    const winningCards = findWinningCards(sorted, currentBook, mode);
    if (winningCards.length > 0) {
      // Play lowest winner
      return winningCards[winningCards.length - 1]!;
    }

    // Can't win - play lowest
    return sorted[sorted.length - 1]!;
  }

  // Case 2: Can't follow suit
  if (partnerWinning || teamWinning) {
    // Partner/team winning - discard low
    if (offSuit.length > 0) {
      const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }
    // Only have trump - play lowest
    if (trumpCards.length > 0) {
      const sorted = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
      return sorted[0]!;
    }
  }

  // Team not winning - try to trump
  if (trumpCards.length > 0) {
    const currentWinnerCard = currentWinner?.card;
    const winnerIsTrump = currentWinnerCard ? isTrump(currentWinnerCard, mode) : false;

    if (winnerIsTrump && currentWinnerCard) {
      // Need to over-trump
      const canOverTrump = trumpCards.filter(c =>
        getTrumpValue(c, mode) > getTrumpValue(currentWinnerCard, mode)
      );
      if (canOverTrump.length > 0) {
        // Play lowest over-trump
        const sorted = [...canOverTrump].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
        return sorted[0]!;
      }
      // Can't over-trump - discard
    } else {
      // No trump played yet - play lowest trump to win
      const sorted = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
      return sorted[0]!;
    }
  }

  // Can't win - discard lowest off-suit card
  if (offSuit.length > 0) {
    const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
    return sorted[0]!;
  }

  // Fallback
  const sorted = [...playable].sort((a, b) => getSuitValue(a) - getSuitValue(b));
  return sorted[0]!;
}

/**
 * Determine who is currently winning the book in progress.
 */
function determineCurrentWinner(
  currentBook: PlayedCard[],
  mode: GameMode
): PlayedCard | null {
  if (currentBook.length === 0) return null;

  const leadPlay = currentBook[0]!;
  let winningPlay = leadPlay;

  for (let i = 1; i < currentBook.length; i++) {
    const play = currentBook[i]!;
    if (compareCards(play.card, winningPlay.card, leadPlay.card.suit, mode) > 0) {
      winningPlay = play;
    }
  }

  return winningPlay;
}

/**
 * Find cards that would win against the current book.
 */
function findWinningCards(
  candidates: Card[],
  currentBook: PlayedCard[],
  mode: GameMode
): Card[] {
  const currentWinner = determineCurrentWinner(currentBook, mode);
  if (!currentWinner) return candidates;

  const leadSuit = currentBook[0]?.card.suit ?? null;

  return candidates.filter(c =>
    compareCards(c, currentWinner.card, leadSuit, mode) > 0
  );
}
