/**
 * Core types for the Spades House Rules game.
 * Uses "Book" terminology throughout (never "trick").
 */

// Card suits
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Card ranks - standard plus jokers for Three Jokers mode
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A'
  | 'LittleJoker' | 'BigJoker';

// A playing card
export interface Card {
  suit: Suit | null; // null for jokers
  rank: Rank;
}

// Seat positions (fixed order for turn rotation)
export type Seat = 'N' | 'E' | 'S' | 'W';
export const SEATS: readonly Seat[] = ['N', 'E', 'S', 'W'] as const;
export const SEAT_ORDER: Record<Seat, number> = { N: 0, E: 1, S: 2, W: 3 };

// Teams: NS (North-South) vs EW (East-West)
export type Team = 'NS' | 'EW';

// Get team for a seat
export function getTeam(seat: Seat): Team {
  return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
}

// Get partner seat
export function getPartner(seat: Seat): Seat {
  const partners: Record<Seat, Seat> = { N: 'S', S: 'N', E: 'W', W: 'E' };
  return partners[seat];
}

// Get next seat in turn order
export function getNextSeat(seat: Seat): Seat {
  const order: Seat[] = ['N', 'E', 'S', 'W'];
  return order[(SEAT_ORDER[seat] + 1) % 4]!;
}

// Game modes with different rules
export type GameMode = 'aceHigh' | 'threeJokers' | 'straightStruggle';

// Target score options
export type TargetScore = 250 | 500;

// Game phases
export type GamePhase =
  | 'LOBBY'      // Waiting for players
  | 'DEAL'       // Cards being dealt
  | 'REDEAL_OFFER' // Offering redeal to eligible player
  | 'BIDDING'    // Players submitting bids
  | 'PLAYING'    // Playing books
  | 'HAND_END'   // Hand finished, showing results
  | 'GAME_END';  // Game over

// Player state within a room
export interface Player {
  id: string;
  name: string;
  socketId: string | null;
  reconnectToken: string;
  ready: boolean;
  connected: boolean;
}

// Seat state
export interface SeatState {
  seat: Seat;
  playerId: string | null;
  player: Player | null;
}

// A single played card in a book
export interface PlayedCard {
  seat: Seat;
  card: Card;
}

// A completed book
export interface Book {
  plays: PlayedCard[];
  leadSuit: Suit | null; // null if led with joker
  winner: Seat;
}

// Per-team state for current hand
export interface TeamHandState {
  bid: number;           // Combined team bid
  booksWon: number;      // Books won this hand
}

// Per-team state for entire game
export interface TeamGameState {
  score: number;
  setsCount: number;     // Number of times set this game
}

// Full game state (hand-level)
export interface HandState {
  handIndex: number;     // 0-indexed hand number
  phase: GamePhase;
  dealerSeat: Seat;
  currentTurn: Seat | null;

  // Cards in each player's hand (only sent to that player)
  hands: Record<Seat, Card[]>;

  // Bids submitted
  bids: Partial<Record<Seat, number>>;

  // Current book being played
  currentBook: PlayedCard[];
  leadSuit: Suit | null;

  // Completed books this hand
  completedBooks: Book[];

  // Team states
  teamStates: Record<Team, TeamHandState>;

  // Spades broken flag (for Ace High and Three Jokers modes)
  spadesBroken: boolean;

  // Redeal tracking
  redealUsed: boolean;
  redealOfferedTo: Seat | null;
}

// Full room/game state
export interface RoomState {
  code: string;
  mode: GameMode;
  targetScore: TargetScore;
  hostPlayerId: string;

  // Seats
  seats: Record<Seat, SeatState>;

  // Game-level team states
  teamGameStates: Record<Team, TeamGameState>;

  // Current hand state (null if in LOBBY phase)
  hand: HandState | null;

  // Overall game phase
  phase: GamePhase;

  // Redeal used for entire game (only one allowed)
  gameRedealUsed: boolean;

  // Winner (set when game ends)
  winner: Team | null;
  winReason: 'score' | 'firstHandDime' | 'threeSetLoss' | null;
}

// Public room state (safe to send to all players)
export interface PublicRoomState {
  code: string;
  mode: GameMode;
  targetScore: TargetScore;
  phase: GamePhase;
  seats: Record<Seat, {
    seat: Seat;
    playerId: string | null;
    playerName: string | null;
    ready: boolean;
    connected: boolean;
  }>;
  teamGameStates: Record<Team, TeamGameState>;
  hand: PublicHandState | null;
  winner: Team | null;
  winReason: 'score' | 'firstHandDime' | 'threeSetLoss' | null;
  gameRedealUsed: boolean;
}

// Public hand state (no private cards)
export interface PublicHandState {
  handIndex: number;
  phase: GamePhase;
  dealerSeat: Seat;
  currentTurn: Seat | null;
  bids: Partial<Record<Seat, number>>;
  currentBook: PlayedCard[];
  leadSuit: Suit | null;
  completedBooks: Book[];
  teamStates: Record<Team, TeamHandState>;
  spadesBroken: boolean;
  redealUsed: boolean;
  redealOfferedTo: Seat | null;
  handSizes: Record<Seat, number>; // Number of cards in each hand
}

// Chat message
export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  seat: Seat | null;
  message: string;
  timestamp: number;
}

// Hand end results for display
export interface HandEndResult {
  team: Team;
  bid: number;
  booksWon: number;
  overbooks: number;
  isSet: boolean;
  isDime: boolean;
  pointsEarned: number;
  newScore: number;
  setsCount: number;
}

// ============================================
// Badge System Types
// ============================================

// Badge identifiers
export type BadgeId = 'kitchen_table_culture_certified';

// Badge definition (static, defined in registry)
export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  subtitle: string;
  shortDescription: string;
  longDescription: string;
  icon: string; // Placeholder icon identifier
}

// Earned badge instance (per user)
export interface EarnedBadge {
  badgeId: BadgeId;
  earnedAt: number; // timestamp
}

// User's badge state
export interface UserBadges {
  earned: EarnedBadge[];
  equippedBadgeId: BadgeId | null;
}

// ============================================
// Learning Mode Types
// ============================================

// Learning lesson identifiers
export type LessonId =
  | 'fundamentals'      // Books, following suit, trump
  | 'bidding_basics'    // How to bid
  | 'nil_blind_nil'     // Nil and Blind Nil understanding
  | 'light_strategy';   // Basic strategy awareness

export const ALL_LESSON_IDS: readonly LessonId[] = [
  'fundamentals',
  'bidding_basics',
  'nil_blind_nil',
  'light_strategy',
] as const;

// Learning progress state
export interface LearningProgress {
  completedLessons: LessonId[];
  cpuGamesCompleted: number;  // Number of CPU games completed (need 3 for badge)
  currentLesson: LessonId | null;
  isComplete: boolean;
  completedAt: number | null; // timestamp when all lessons completed
}

// Number of CPU games required for badge
export const CPU_GAMES_REQUIRED = 3;

// ============================================
// Badge Registry (Static Definitions)
// ============================================

export const BADGE_REGISTRY: Record<BadgeId, BadgeDefinition> = {
  kitchen_table_culture_certified: {
    id: 'kitchen_table_culture_certified',
    title: 'The Kitchen Table Badge',
    subtitle: 'Culture Certified',
    shortDescription: 'Awarded for completing Learning Mode and 3 CPU games.',
    longDescription: 'The kitchen table is where the rules, rhythm, and respect are learned. This badge recognizes players who completed the guided learning path and practiced their skills against CPU opponents.',
    icon: 'kitchen_table', // Placeholder
  },
};
