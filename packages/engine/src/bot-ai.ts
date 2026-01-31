/**
 * Bot AI module for CPU players (Skill Level 7/10).
 * Provides sophisticated bidding strategy and card play decision-making.
 *
 * Features:
 * - Advanced hand evaluation with void/singleton cut potential
 * - Card memory tracking for intelligent play
 * - Position-aware decision making
 * - Strategic trump management
 * - Contract-aware aggression levels
 */

import type { Card, Suit, GameMode, Seat, PlayedCard, Book } from '@spades/shared';
import { getTeam, getPartner } from '@spades/shared';
import {
  getPlayableCards,
  isTrump,
  getTrumpValue,
  getSuitValue,
  compareCards,
} from '@spades/rules';

// ============================================
// Card Tracking Utilities
// ============================================

interface SuitAnalysis {
  cards: Card[];
  length: number;
  hasAce: boolean;
  hasKing: boolean;
  hasQueen: boolean;
  highCardCount: number; // A, K, Q
  isVoid: boolean;
  isSingleton: boolean;
  isDoubleton: boolean;
}

function analyzeSuit(hand: Card[], suit: Suit): SuitAnalysis {
  const cards = hand.filter(c => c.suit === suit);
  const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));

  return {
    cards: sorted,
    length: cards.length,
    hasAce: sorted.some(c => getSuitValue(c) === 14),
    hasKing: sorted.some(c => getSuitValue(c) === 13),
    hasQueen: sorted.some(c => getSuitValue(c) === 12),
    highCardCount: sorted.filter(c => getSuitValue(c) >= 12).length,
    isVoid: cards.length === 0,
    isSingleton: cards.length === 1,
    isDoubleton: cards.length === 2,
  };
}

function getPlayedCards(completedBooks: Book[]): Card[] {
  const played: Card[] = [];
  for (const book of completedBooks) {
    for (const play of book.plays) {
      played.push(play.card);
    }
  }
  return played;
}

function countRemainingTrump(
  myTrump: Card[],
  playedCards: Card[],
  currentBook: PlayedCard[],
  mode: GameMode
): number {
  // Total trump in deck: 13 spades (or 15 in threeJokers with jokers)
  const totalTrump = mode === 'threeJokers' ? 15 : 13;

  const playedTrump = playedCards.filter(c => isTrump(c, mode)).length;
  const currentBookTrump = currentBook.filter(p => isTrump(p.card, mode)).length;
  const myTrumpCount = myTrump.length;

  // Remaining = total - played - in current book - in my hand
  return totalTrump - playedTrump - currentBookTrump - myTrumpCount;
}

function getHigherCardsRemaining(
  card: Card,
  playedCards: Card[],
  myHand: Card[],
  mode: GameMode
): number {
  const cardValue = isTrump(card, mode) ? getTrumpValue(card, mode) : getSuitValue(card);
  let count = 0;

  // For trump cards
  if (isTrump(card, mode)) {
    // Check all possible higher trumps
    const allTrumpRanks = mode === 'threeJokers'
      ? ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'LittleJoker', 'BigJoker']
      : ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    for (const rank of allTrumpRanks) {
      const testCard: Card = rank === 'BigJoker' || rank === 'LittleJoker'
        ? { suit: null as unknown as Suit, rank: rank as Card['rank'] }
        : { suit: 'spades', rank: rank as Card['rank'] };

      const testValue = getTrumpValue(testCard, mode);
      if (testValue > cardValue) {
        const inMyHand = myHand.some(c =>
          (c.rank === testCard.rank && c.suit === testCard.suit) ||
          (c.rank === testCard.rank && (testCard.rank === 'BigJoker' || testCard.rank === 'LittleJoker'))
        );
        const wasPlayed = playedCards.some(c =>
          (c.rank === testCard.rank && c.suit === testCard.suit) ||
          (c.rank === testCard.rank && (testCard.rank === 'BigJoker' || testCard.rank === 'LittleJoker'))
        );
        if (!inMyHand && !wasPlayed) {
          count++;
        }
      }
    }
  } else {
    // For non-trump, check higher cards in same suit
    const allRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    for (const rank of allRanks) {
      const testCard: Card = { suit: card.suit, rank: rank as Card['rank'] };
      const testValue = getSuitValue(testCard);
      if (testValue > cardValue) {
        const inMyHand = myHand.some(c => c.suit === card.suit && c.rank === rank);
        const wasPlayed = playedCards.some(c => c.suit === card.suit && c.rank === rank);
        if (!inMyHand && !wasPlayed) {
          count++;
        }
      }
    }
  }

  return count;
}

// ============================================
// Bidding Strategy (Skill Level 7/10)
// ============================================

/**
 * Calculate a bid for a CPU player based on sophisticated hand evaluation.
 *
 * Strategy:
 * - Evaluate trump strength with length bonus
 * - Assess side suit winners with sequence analysis
 * - Calculate cut potential based on voids/singletons + trump count
 * - Consider partner's bid for team coordination
 * - Account for defensive potential
 */
export function calculateBotBid(
  hand: Card[],
  partnerBid: number | null,
  mode: GameMode
): number {
  let expectedBooks = 0;

  // Analyze trump holding
  const trumpCards = hand.filter(c => isTrump(c, mode));
  const trumpCount = trumpCards.length;
  const sortedTrump = [...trumpCards].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));

  // Evaluate each trump card based on rank and total trump length
  for (let i = 0; i < sortedTrump.length; i++) {
    const card = sortedTrump[i]!;
    const value = getTrumpValue(card, mode);

    if (mode === 'threeJokers') {
      // Big Joker: near certain winner
      if (value === 100) {
        expectedBooks += 0.98;
      }
      // Little Joker: very likely winner
      else if (value === 99) {
        expectedBooks += 0.95;
      }
      // 2 of spades: highly likely winner
      else if (value === 98) {
        expectedBooks += 0.92;
      }
      // Ace of spades
      else if (value === 14) {
        expectedBooks += 0.88;
      }
      // King of spades
      else if (value === 13) {
        expectedBooks += trumpCount >= 4 ? 0.80 : 0.65;
      }
      // Queen of spades
      else if (value === 12) {
        expectedBooks += trumpCount >= 5 ? 0.70 : 0.45;
      }
      // Jack of spades
      else if (value === 11) {
        expectedBooks += trumpCount >= 5 ? 0.55 : 0.25;
      }
      // 10 and below: only count if we have trump length
      else if (value >= 9) {
        expectedBooks += trumpCount >= 6 ? 0.40 : 0.15;
      }
      else {
        expectedBooks += trumpCount >= 7 ? 0.30 : 0.05;
      }
    } else {
      // Ace High / Straight Struggle modes
      if (value === 14) { // Ace
        expectedBooks += 0.95;
      } else if (value === 13) { // King
        expectedBooks += trumpCount >= 4 ? 0.85 : 0.70;
      } else if (value === 12) { // Queen
        expectedBooks += trumpCount >= 4 ? 0.70 : 0.50;
      } else if (value === 11) { // Jack
        expectedBooks += trumpCount >= 5 ? 0.55 : 0.30;
      } else if (value >= 9) { // 10, 9
        expectedBooks += trumpCount >= 5 ? 0.35 : 0.15;
      } else {
        expectedBooks += trumpCount >= 6 ? 0.25 : 0.05;
      }
    }
  }

  // Trump length bonus: extra trump beyond 4 provide control
  if (trumpCount > 4) {
    expectedBooks += (trumpCount - 4) * 0.25;
  }

  // Analyze side suits
  const sideSuits: Suit[] = ['hearts', 'diamonds', 'clubs'];
  let totalVoids = 0;
  let totalSingletons = 0;
  let totalDoubletons = 0;

  for (const suit of sideSuits) {
    const analysis = analyzeSuit(hand, suit);

    if (analysis.isVoid) {
      totalVoids++;
      continue;
    }

    if (analysis.isSingleton) {
      totalSingletons++;
    } else if (analysis.isDoubleton) {
      totalDoubletons++;
    }

    // Evaluate high cards in suit
    if (analysis.hasAce) {
      // Ace value depends on suit length
      if (analysis.length <= 3) {
        expectedBooks += 0.90; // Short suit Ace is very likely to cash
      } else if (analysis.length <= 5) {
        expectedBooks += 0.80;
      } else {
        expectedBooks += 0.70; // Long suit Ace may get ruffed
      }

      // A-K combination
      if (analysis.hasKing) {
        if (analysis.length <= 4) {
          expectedBooks += 0.80; // King behind Ace in short suit
        } else {
          expectedBooks += 0.60;
        }

        // A-K-Q combination
        if (analysis.hasQueen && analysis.length <= 5) {
          expectedBooks += 0.55;
        }
      }
    } else if (analysis.hasKing) {
      // Unprotected King: risky
      if (analysis.length === 1) {
        expectedBooks += 0.30; // Singleton K is often caught
      } else if (analysis.length === 2) {
        expectedBooks += 0.45; // Doubleton K has decent odds
      } else {
        expectedBooks += 0.55; // K in longer suit may win
      }

      // K-Q without Ace
      if (analysis.hasQueen && analysis.length >= 3) {
        expectedBooks += 0.35;
      }
    } else if (analysis.hasQueen && analysis.length >= 4) {
      // Long suit Queen can establish
      expectedBooks += 0.25;
    }

    // Long suit establishment: 5+ card suit can develop winners
    if (analysis.length >= 5 && analysis.highCardCount >= 1) {
      expectedBooks += 0.20 * (analysis.length - 4);
    }
  }

  // Cut book potential: voids and short suits with trump
  // This is crucial - cutting is a major source of books in Spades
  if (trumpCount >= 2) {
    // Void in a suit = guaranteed cut opportunity
    expectedBooks += totalVoids * Math.min(0.85, trumpCount * 0.25);

    // Singleton = likely cut after first round
    expectedBooks += totalSingletons * Math.min(0.65, trumpCount * 0.20);

    // Doubleton with low cards = potential cut on third round
    expectedBooks += totalDoubletons * Math.min(0.35, trumpCount * 0.12);
  }

  // Two voids with trump is very powerful
  if (totalVoids >= 2 && trumpCount >= 3) {
    expectedBooks += 0.5;
  }

  // Apply small variance for realism (reduced from original)
  const variance = (Math.random() - 0.5) * 0.5; // -0.25 to +0.25
  let bid = Math.round(expectedBooks + variance);

  // Clamp to valid range
  bid = Math.max(0, Math.min(13, bid));

  // Team coordination
  if (partnerBid !== null) {
    const teamBid = bid + partnerBid;

    // Board minimum (4) - if partner bid low, we may need to stretch
    if (teamBid < 4) {
      const needed = 4 - partnerBid;
      // Only stretch if our hand can reasonably support it
      if (bid >= needed - 1 && trumpCount >= 2) {
        bid = needed;
      } else if (expectedBooks >= needed - 0.5) {
        bid = needed;
      }
    }

    // Avoid severe overbidding: if partner bid high, be more conservative
    if (partnerBid >= 5 && bid >= 5) {
      // High combined bids are risky, trim slightly
      if (teamBid > 10 && expectedBooks < bid + 0.5) {
        bid = Math.max(0, bid - 1);
      }
    }
  }

  return Math.max(0, Math.min(13, bid));
}

// ============================================
// Card Play Strategy (Skill Level 7/10)
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

interface ContractStatus {
  myBid: number;
  partnerBid: number;
  teamBid: number;
  teamBooks: number;
  opponentBooks: number;
  booksNeeded: number;
  booksRemaining: number;
  isAhead: boolean;
  isBehind: boolean;
  isSafe: boolean; // Can afford to lose some books
}

function getContractStatus(context: PlayContext): ContractStatus {
  const { bids, teamBooksWon, opponentBooksWon, mySeat, completedBooks } = context;

  const partnerSeat = getPartner(mySeat);
  const myBid = bids[mySeat] ?? 0;
  const partnerBid = bids[partnerSeat] ?? 0;
  const teamBid = myBid + partnerBid;
  const booksPlayed = completedBooks.length;
  const booksRemaining = 13 - booksPlayed;
  const booksNeeded = Math.max(0, teamBid - teamBooksWon);

  return {
    myBid,
    partnerBid,
    teamBid,
    teamBooks: teamBooksWon,
    opponentBooks: opponentBooksWon,
    booksNeeded,
    booksRemaining,
    isAhead: teamBooksWon >= teamBid,
    isBehind: booksNeeded > booksRemaining,
    isSafe: teamBooksWon >= teamBid - 1 && booksRemaining >= 2,
  };
}

/**
 * Choose the best card for a CPU player to play.
 * Uses card memory, position awareness, and contract status.
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

  // Get card memory - what's been played
  const playedCards = getPlayedCards(completedBooks);

  // Decision based on position
  if (isLeading) {
    return chooseLeadCard(playable, context, playedCards);
  } else {
    return chooseFollowCard(playable, context, playedCards);
  }
}

/**
 * Choose a card when leading a Book.
 * Uses sophisticated strategy based on:
 * - Card memory (what's been played)
 * - Contract status (ahead/behind)
 * - Trump control
 * - Suit establishment
 */
function chooseLeadCard(playable: Card[], context: PlayContext, playedCards: Card[]): Card {
  const { mode, completedBooks, hand, currentBook } = context;
  const status = getContractStatus(context);

  // Separate trump and non-trump
  const nonTrump = playable.filter(c => !isTrump(c, mode));
  const trump = playable.filter(c => isTrump(c, mode));
  const allTrumpInHand = hand.filter(c => isTrump(c, mode));

  // Count remaining trump in the game (not in our hand, not played)
  const remainingTrumpOut = countRemainingTrump(allTrumpInHand, playedCards, currentBook, mode);

  // === STRATEGY 1: Pull trump when we have control ===
  // If we have 4+ trump and high trump, consider leading trump to pull them
  if (trump.length >= 4 && remainingTrumpOut > 0) {
    const sortedTrump = [...trump].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));
    const highestTrump = sortedTrump[0]!;

    // Check if our highest trump is likely a winner
    const higherOut = getHigherCardsRemaining(highestTrump, playedCards, hand, mode);
    if (higherOut === 0) {
      // We have the highest remaining trump - lead it to pull
      return highestTrump;
    }

    // If we have the 2nd highest and only 1 higher is out, still lead high
    if (higherOut === 1 && trump.length >= 5) {
      return highestTrump;
    }
  }

  // === STRATEGY 2: Cash side suit winners ===
  if (nonTrump.length > 0) {
    const suitCounts = new Map<Suit, Card[]>();
    for (const card of nonTrump) {
      if (card.suit) {
        const existing = suitCounts.get(card.suit) || [];
        existing.push(card);
        suitCounts.set(card.suit, existing);
      }
    }

    // Priority 1: Lead Aces - they're guaranteed winners in their suit
    for (const [suit, cards] of suitCounts) {
      const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
      const highest = sorted[0];
      if (highest && getSuitValue(highest) === 14) {
        // Lead Ace - it's a winner unless trumped
        // But be careful: if opponents likely void, Ace might get cut
        const suitPlayedCount = playedCards.filter(c => c.suit === suit).length;
        const cardsOutInSuit = 13 - suitPlayedCount - cards.length;

        // If early in game and many cards still out, cash the Ace now
        if (completedBooks.length <= 5 || cardsOutInSuit >= 3) {
          return highest;
        }
      }
    }

    // Priority 2: Lead Kings when Ace is played
    for (const [suit, cards] of suitCounts) {
      const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
      const highest = sorted[0];
      if (highest && getSuitValue(highest) === 13) {
        // Check if Ace of this suit has been played
        const acePlayedOrInHand = playedCards.some(c => c.suit === suit && getSuitValue(c) === 14) ||
          hand.some(c => c.suit === suit && getSuitValue(c) === 14);
        if (acePlayedOrInHand) {
          return highest; // King is now high
        }
      }
    }

    // Priority 3: If ahead on contract, lead conservatively to avoid bags
    if (status.isAhead && status.isSafe) {
      // Lead low from short suit to give partner a chance
      let shortestSuit: { suit: Suit; cards: Card[] } | null = null;
      for (const [suit, cards] of suitCounts) {
        if (!shortestSuit || cards.length < shortestSuit.cards.length) {
          shortestSuit = { suit, cards };
        }
      }
      if (shortestSuit && shortestSuit.cards.length <= 2) {
        const sorted = [...shortestSuit.cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!; // Lead low from short suit
      }
    }

    // Priority 4: Lead high from longest suit to establish it
    if (status.booksNeeded > 0 || !status.isAhead) {
      let longestSuit: { suit: Suit; cards: Card[] } | null = null;
      for (const [suit, cards] of suitCounts) {
        if (!longestSuit || cards.length > longestSuit.cards.length) {
          longestSuit = { suit, cards };
        }
      }

      if (longestSuit && longestSuit.cards.length >= 3) {
        const sorted = [...longestSuit.cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
        // Lead high to try to win or force out Ace
        if (getSuitValue(sorted[0]!) >= 12) {
          return sorted[0]!;
        }
      }
    }

    // Priority 5: Lead low from longest suit (default)
    let longestSuit: Card[] = [];
    for (const [, cards] of suitCounts) {
      if (cards.length > longestSuit.length) {
        longestSuit = cards;
      }
    }

    if (longestSuit.length > 0) {
      const sorted = [...longestSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }
  }

  // === STRATEGY 3: Trump leads (only trump in hand) ===
  if (trump.length > 0) {
    const sortedTrump = [...trump].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));
    const booksPlayed = completedBooks.length;

    // Late game or strong trump: lead high to pull
    if (booksPlayed >= 8 || trump.length >= 4) {
      // Check if we have the master trump
      const higherOut = getHigherCardsRemaining(sortedTrump[0]!, playedCards, hand, mode);
      if (higherOut === 0) {
        return sortedTrump[0]!; // Lead the boss
      }
    }

    // If behind on contract and have good trump, lead high
    if (status.booksNeeded > trump.length && status.isBehind) {
      return sortedTrump[0]!;
    }

    // Default: lead low trump to preserve high trump for later
    return sortedTrump[sortedTrump.length - 1]!;
  }

  // Fallback to first playable
  return playable[0]!;
}

/**
 * Choose a card when following in a Book.
 * Uses position-aware strategy:
 * - 2nd seat: Be cautious, play low unless can cheaply win
 * - 3rd seat: Consider partner's lead, support or win
 * - 4th seat: Win economically or duck
 *
 * Also considers:
 * - Contract status (need books vs avoiding bags)
 * - Trump preservation
 * - Strategic cutting decisions
 */
function chooseFollowCard(playable: Card[], context: PlayContext, playedCards: Card[]): Card {
  const { currentBook, mode, mySeat, hand } = context;
  const status = getContractStatus(context);

  const position = currentBook.length + 1; // 2nd, 3rd, or 4th seat
  const leadCard = currentBook[0]!.card;
  const leadSuit = leadCard.suit;
  const leadSeat = currentBook[0]!.seat;
  const partnerSeat = getPartner(mySeat);

  // Determine who's currently winning
  const currentWinner = determineCurrentWinner(currentBook, mode);
  const partnerWinning = currentWinner?.seat === partnerSeat;
  const partnerLed = leadSeat === partnerSeat;
  const myTeam = getTeam(mySeat);
  const teamWinning = currentWinner ? getTeam(currentWinner.seat) === myTeam : false;

  // Separate cards by type
  const followsSuit = playable.filter(c => c.suit === leadSuit);
  const trumpCards = playable.filter(c => isTrump(c, mode) && c.suit !== leadSuit);
  const offSuit = playable.filter(c => !isTrump(c, mode) && c.suit !== leadSuit);
  const allTrumpInHand = hand.filter(c => isTrump(c, mode));

  // ========================================
  // CASE 1: Can follow suit
  // ========================================
  if (followsSuit.length > 0) {
    const sorted = [...followsSuit].sort((a, b) => getSuitValue(b) - getSuitValue(a));
    const highest = sorted[0]!;
    const lowest = sorted[sorted.length - 1]!;

    // Partner winning - almost always play low
    if (partnerWinning) {
      // Exception: if we have the Ace and partner played King, cash it
      if (getSuitValue(highest) === 14 && currentWinner?.card && getSuitValue(currentWinner.card) === 13) {
        // Only do this early in the game when it's safe
        if (status.isAhead || context.completedBooks.length <= 4) {
          return highest;
        }
      }
      return lowest;
    }

    // Position-based play when team not winning
    if (position === 2) {
      // 2nd seat: Be cautious - two more players to act
      // Only commit high cards if we have a guaranteed winner
      const higherOut = getHigherCardsRemaining(highest, playedCards, hand, mode);
      if (higherOut === 0) {
        // We have the master - play it
        return highest;
      }
      // Otherwise play low and let partner handle it
      if (status.isAhead) {
        return lowest; // Conserve when ahead
      }
      // If we need books, try to win with lowest winner
      const winningCards = findWinningCards(sorted, currentBook, mode);
      if (winningCards.length > 0 && status.booksNeeded > 0) {
        return winningCards[winningCards.length - 1]!;
      }
      return lowest;
    }

    if (position === 3) {
      // 3rd seat: Partner has played, consider their position
      if (partnerLed) {
        // Partner led this suit - they want us to win if possible
        const winningCards = findWinningCards(sorted, currentBook, mode);
        if (winningCards.length > 0) {
          return winningCards[winningCards.length - 1]!; // Lowest winner
        }
        // Can't beat opponent - play low
        return lowest;
      } else {
        // Opponent led, partner followed
        // Try to win but be economical
        const winningCards = findWinningCards(sorted, currentBook, mode);
        if (winningCards.length > 0) {
          return winningCards[winningCards.length - 1]!;
        }
        return lowest;
      }
    }

    // 4th seat: Last to play - be precise
    if (position === 4) {
      if (teamWinning) {
        return lowest; // Don't overtake partner
      }
      // Need to win - find lowest winning card
      const winningCards = findWinningCards(sorted, currentBook, mode);
      if (winningCards.length > 0) {
        return winningCards[winningCards.length - 1]!;
      }
      // Can't win - discard lowest
      return lowest;
    }

    // Default: try to win with lowest winner, else play low
    const winningCards = findWinningCards(sorted, currentBook, mode);
    if (winningCards.length > 0) {
      return winningCards[winningCards.length - 1]!;
    }
    return lowest;
  }

  // ========================================
  // CASE 2: Can't follow suit (void in led suit)
  // ========================================

  // Partner/team winning - usually discard
  if (partnerWinning || teamWinning) {
    // If team is winning, save our trump for later
    if (offSuit.length > 0) {
      // Discard from shortest side suit to create future cut opportunities
      const suitGroups = new Map<Suit, Card[]>();
      for (const card of offSuit) {
        if (card.suit) {
          const existing = suitGroups.get(card.suit) || [];
          existing.push(card);
          suitGroups.set(card.suit, existing);
        }
      }

      // Find shortest suit to discard from
      let bestDiscard: Card | null = null;
      let shortestLength = Infinity;
      for (const [, cards] of suitGroups) {
        if (cards.length < shortestLength) {
          shortestLength = cards.length;
          // Discard lowest from this suit
          const sorted = [...cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
          bestDiscard = sorted[0]!;
        }
      }

      if (bestDiscard) return bestDiscard;

      // Fallback: just play lowest off-suit
      const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }

    // Only have trump - play lowest (forced to follow with trump)
    if (trumpCards.length > 0) {
      const sorted = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
      return sorted[0]!;
    }
  }

  // ========================================
  // Team not winning - consider cutting (trumping)
  // ========================================
  if (trumpCards.length > 0) {
    const currentWinnerCard = currentWinner?.card;
    const winnerIsTrump = currentWinnerCard ? isTrump(currentWinnerCard, mode) : false;
    const sortedTrump = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));

    // Calculate if cutting is worth it
    const shouldCut = evaluateCutDecision(context, status, allTrumpInHand, playedCards);

    if (winnerIsTrump && currentWinnerCard) {
      // Opponent already trumped - need to over-trump
      const canOverTrump = trumpCards.filter(c =>
        getTrumpValue(c, mode) > getTrumpValue(currentWinnerCard, mode)
      );

      if (canOverTrump.length > 0) {
        // Can we afford to over-trump?
        if (shouldCut || status.booksNeeded > 0 || position === 4) {
          const sorted = [...canOverTrump].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
          return sorted[0]!; // Lowest over-trump
        }
      }

      // Can't or shouldn't over-trump - discard
      if (offSuit.length > 0) {
        const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!;
      }
      // Only have trump that can't win - play lowest
      return sortedTrump[0]!;

    } else {
      // No trump played yet by opponents - we can cut
      if (shouldCut) {
        // Cut with lowest trump
        return sortedTrump[0]!;
      }

      // Not cutting - discard
      if (offSuit.length > 0) {
        const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!;
      }

      // Forced to trump (no off-suit available)
      return sortedTrump[0]!;
    }
  }

  // ========================================
  // Can't win and can't trump - discard
  // ========================================
  if (offSuit.length > 0) {
    // Strategic discard: shortest suit first to create future voids
    const suitGroups = new Map<Suit, Card[]>();
    for (const card of offSuit) {
      if (card.suit) {
        const existing = suitGroups.get(card.suit) || [];
        existing.push(card);
        suitGroups.set(card.suit, existing);
      }
    }

    let bestDiscard: Card | null = null;
    let shortestLength = Infinity;
    for (const [, cards] of suitGroups) {
      if (cards.length < shortestLength) {
        shortestLength = cards.length;
        const sorted = [...cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        bestDiscard = sorted[0]!;
      }
    }

    if (bestDiscard) return bestDiscard;

    const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
    return sorted[0]!;
  }

  // Absolute fallback
  const sorted = [...playable].sort((a, b) => getSuitValue(a) - getSuitValue(b));
  return sorted[0]!;
}

/**
 * Evaluate whether cutting (trumping) is the right decision.
 * Considers:
 * - Contract status (need books vs avoiding bags)
 * - Trump preservation for later
 * - Value of the current book
 */
function evaluateCutDecision(
  context: PlayContext,
  status: ContractStatus,
  myTrump: Card[],
  playedCards: Card[]
): boolean {
  const { currentBook, mode, completedBooks } = context;

  // Always cut if we need books and are behind
  if (status.isBehind) {
    return true;
  }

  // Always cut if we still need books to make contract
  if (status.booksNeeded > 0) {
    return true;
  }

  // If we're already ahead, be more selective about cutting
  if (status.isAhead) {
    // Only cut if we have many trump (can afford it)
    if (myTrump.length >= 4) {
      return true;
    }
    // Or if it's late in the hand (trump less valuable)
    if (completedBooks.length >= 9) {
      return true;
    }
    // Otherwise, consider the book value
    // Check if there's an Ace or King in the book worth fighting for
    const highValueInBook = currentBook.some(p =>
      !isTrump(p.card, mode) && getSuitValue(p.card) >= 13
    );
    if (highValueInBook && myTrump.length >= 2) {
      return true;
    }

    // Don't cut - save trump for defense
    return false;
  }

  // Default: cut if we have trump to spare
  return myTrump.length >= 2;
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
