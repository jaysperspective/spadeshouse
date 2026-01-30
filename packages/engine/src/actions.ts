/**
 * Game action types for the state machine.
 */

import type { Card, Seat, GameMode, TargetScore } from '@spades/shared';

// Player identity for actions
export interface PlayerContext {
  playerId: string;
  seat: Seat | null;
}

// Action types
export type GameAction =
  | { type: 'CREATE_ROOM'; mode: GameMode; targetScore: TargetScore; hostPlayerId: string }
  | { type: 'ADD_PLAYER'; playerId: string; name: string; socketId: string; reconnectToken: string }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'PLAYER_DISCONNECT'; playerId: string }
  | { type: 'PLAYER_RECONNECT'; playerId: string; socketId: string }
  | { type: 'TAKE_SEAT'; playerId: string; seat: Seat }
  | { type: 'LEAVE_SEAT'; playerId: string }
  | { type: 'SET_READY'; playerId: string; ready: boolean }
  | { type: 'START_GAME' }
  | { type: 'DEAL_CARDS'; seed?: number }
  | { type: 'REQUEST_REDEAL'; playerId: string; accept: boolean }
  | { type: 'SUBMIT_BID'; playerId: string; bid: number }
  | { type: 'PLAY_CARD'; playerId: string; card: Card }
  | { type: 'NEXT_HAND' }
  | { type: 'RESET_GAME' };

// Action result
export interface ActionResult {
  success: boolean;
  error?: string;
  sideEffects?: SideEffect[];
}

// Side effects that the server should handle
export type SideEffect =
  | { type: 'BROADCAST_STATE' }
  | { type: 'SEND_PRIVATE_HANDS' }
  | { type: 'SEND_HAND_END_RESULTS' }
  | { type: 'GAME_OVER'; winner: 'NS' | 'EW'; reason: string };
