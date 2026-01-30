/**
 * Shared helper utilities.
 */

import type { Card, Suit, Rank } from './types.js';

// Card display symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  spades: 'black',
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
};

/**
 * Format a card for display (e.g., "A♠", "10♥", "BigJoker")
 */
export function formatCard(card: Card): string {
  if (card.rank === 'BigJoker') return '🃏 Big';
  if (card.rank === 'LittleJoker') return '🃏 Little';
  if (!card.suit) return card.rank;
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Format a card with HTML-safe output
 */
export function formatCardPlain(card: Card): string {
  if (card.rank === 'BigJoker') return 'Big Joker';
  if (card.rank === 'LittleJoker') return 'Little Joker';
  if (!card.suit) return card.rank;
  return `${card.rank} of ${card.suit}`;
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Generate a unique card key for React lists
 */
export function cardKey(card: Card): string {
  if (!card.suit) return card.rank;
  return `${card.rank}-${card.suit}`;
}

/**
 * Parse a card from string format (e.g., "AS" -> Ace of Spades)
 */
export function parseCard(str: string): Card | null {
  if (str === 'BJ') return { suit: null, rank: 'BigJoker' };
  if (str === 'LJ') return { suit: null, rank: 'LittleJoker' };

  const suitMap: Record<string, Suit> = {
    S: 'spades',
    H: 'hearts',
    D: 'diamonds',
    C: 'clubs',
  };

  const rankMatch = str.match(/^(10|[2-9JQKA])([SHDC])$/);
  if (!rankMatch) return null;

  const rank = rankMatch[1] as Rank;
  const suit = suitMap[rankMatch[2]!];
  if (!suit) return null;

  return { suit, rank };
}

/**
 * Serialize a card to string format
 */
export function serializeCard(card: Card): string {
  if (card.rank === 'BigJoker') return 'BJ';
  if (card.rank === 'LittleJoker') return 'LJ';
  if (!card.suit) return card.rank;

  const suitMap: Record<Suit, string> = {
    spades: 'S',
    hearts: 'H',
    diamonds: 'D',
    clubs: 'C',
  };

  return `${card.rank}${suitMap[card.suit]}`;
}

/**
 * Generate a random room code (6 uppercase letters)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a random token for reconnection
 */
export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
