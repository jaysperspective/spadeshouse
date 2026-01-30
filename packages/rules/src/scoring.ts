/**
 * Scoring logic for Spades House Rules.
 *
 * Scoring rules:
 * - Each Book is worth 10 points
 * - Making bid: score = booksWon × 10
 * - Dime: exactly 10 books = 110 points (10 point bonus), only in Ace High/Three Jokers
 * - Overbooks:
 *   - Exactly +3 over bid: score = 0 (not a Set)
 *   - +4 or more over bid: Set
 * - Set (underbid or +4 over): score = -(bid × 10)
 * - First-hand Dime: instant win
 * - 3 Sets in Ace High/Three Jokers: auto-loss
 */

import type { GameMode, Team, HandEndResult, TeamHandState, TeamGameState } from '@spades/shared';

export interface ScoringInput {
  team: Team;
  bid: number;
  booksWon: number;
  currentScore: number;
  currentSetsCount: number;
  handIndex: number;
  mode: GameMode;
}

export interface ScoringResult {
  pointsEarned: number;
  isSet: boolean;
  isDime: boolean;
  newScore: number;
  newSetsCount: number;
  isInstantWin: boolean;
  isInstantLoss: boolean;
  winReason: 'firstHandDime' | 'threeSetLoss' | null;
}

/**
 * Check if Dime bonus applies in this mode.
 */
export function dimeEnabled(mode: GameMode): boolean {
  return mode !== 'straightStruggle';
}

/**
 * Check if Set limit applies in this mode.
 */
export function setLimitEnabled(mode: GameMode): boolean {
  return mode !== 'straightStruggle';
}

/**
 * Calculate the score for a team at the end of a hand.
 */
export function calculateHandScore(input: ScoringInput): ScoringResult {
  const { team, bid, booksWon, currentScore, currentSetsCount, handIndex, mode } = input;

  let pointsEarned = 0;
  let isSet = false;
  let isDime = false;
  let isInstantWin = false;
  let isInstantLoss = false;
  let winReason: 'firstHandDime' | 'threeSetLoss' | null = null;

  const over = booksWon - bid;

  // Check for Set conditions (evaluated first, takes precedence)
  if (booksWon < bid) {
    // Failed to make bid
    isSet = true;
    pointsEarned = -(bid * 10);
  } else if (over >= 4) {
    // Won 4+ books over bid
    isSet = true;
    pointsEarned = -(bid * 10);
  } else if (over === 3) {
    // Exactly 3 over: score is 0, but NOT a Set
    pointsEarned = 0;
  } else {
    // Made bid within acceptable range
    // Check for Dime (exactly 10 books, mode allows, and not violating overbook rules)
    if (booksWon === 10 && dimeEnabled(mode)) {
      isDime = true;
      pointsEarned = 110; // 100 + 10 bonus

      // First-hand Dime is instant win
      if (handIndex === 0) {
        isInstantWin = true;
        winReason = 'firstHandDime';
      }
    } else {
      // Normal scoring
      pointsEarned = booksWon * 10;
    }
  }

  const newScore = currentScore + pointsEarned;
  let newSetsCount = currentSetsCount;

  if (isSet) {
    newSetsCount = currentSetsCount + 1;

    // Check for 3 Sets auto-loss (only in Ace High / Three Jokers)
    if (setLimitEnabled(mode) && newSetsCount >= 3) {
      isInstantLoss = true;
      winReason = 'threeSetLoss';
    }
  }

  return {
    pointsEarned,
    isSet,
    isDime,
    newScore,
    newSetsCount,
    isInstantWin,
    isInstantLoss,
    winReason,
  };
}

/**
 * Calculate end-of-hand results for both teams.
 */
export function calculateHandResults(
  teamStates: Record<Team, TeamHandState>,
  teamGameStates: Record<Team, TeamGameState>,
  handIndex: number,
  mode: GameMode
): { results: HandEndResult[]; winner: Team | null; winReason: 'firstHandDime' | 'threeSetLoss' | null } {
  const teams: Team[] = ['NS', 'EW'];
  const results: HandEndResult[] = [];
  let winner: Team | null = null;
  let winReason: 'firstHandDime' | 'threeSetLoss' | null = null;

  for (const team of teams) {
    const handState = teamStates[team];
    const gameState = teamGameStates[team];

    const scoringResult = calculateHandScore({
      team,
      bid: handState.bid,
      booksWon: handState.booksWon,
      currentScore: gameState.score,
      currentSetsCount: gameState.setsCount,
      handIndex,
      mode,
    });

    results.push({
      team,
      bid: handState.bid,
      booksWon: handState.booksWon,
      overbooks: Math.max(0, handState.booksWon - handState.bid),
      isSet: scoringResult.isSet,
      isDime: scoringResult.isDime,
      pointsEarned: scoringResult.pointsEarned,
      newScore: scoringResult.newScore,
      setsCount: scoringResult.newSetsCount,
    });

    if (scoringResult.isInstantWin) {
      winner = team;
      winReason = scoringResult.winReason;
    }

    // Instant loss means other team wins
    if (scoringResult.isInstantLoss) {
      winner = team === 'NS' ? 'EW' : 'NS';
      winReason = scoringResult.winReason;
    }
  }

  return { results, winner, winReason };
}

/**
 * Check if a team has reached the target score.
 */
export function hasReachedTargetScore(score: number, targetScore: number): boolean {
  return score >= targetScore;
}

/**
 * Determine game winner after applying hand results.
 */
export function determineGameWinner(
  results: HandEndResult[],
  targetScore: number
): Team | null {
  // Check for score-based win
  for (const result of results) {
    if (result.newScore >= targetScore) {
      return result.team;
    }
  }
  return null;
}

/**
 * Validate that a team bid is at least the "Board" minimum (4 books).
 */
export function validateTeamBid(teamBid: number): string | null {
  if (teamBid < 4) {
    return 'Team bid must be at least 4 (Board)';
  }
  return null;
}

/**
 * Calculate combined team bid from individual bids.
 */
export function calculateTeamBid(bid1: number, bid2: number): number {
  return bid1 + bid2;
}
