/**
 * Convert internal state to public state (safe to broadcast to all players).
 * This ensures no private information (other players' hands) is leaked.
 */

import type {
  RoomState,
  PublicRoomState,
  PublicHandState,
  Seat,
  Card,
} from '@spades/shared';
import { SEATS } from '@spades/shared';

/**
 * Convert room state to public state (no private card info).
 */
export function toPublicRoomState(state: RoomState): PublicRoomState {
  const publicSeats: PublicRoomState['seats'] = {} as PublicRoomState['seats'];

  for (const seat of SEATS) {
    const seatState = state.seats[seat];
    publicSeats[seat] = {
      seat,
      playerId: seatState.playerId,
      playerName: seatState.player?.name ?? null,
      ready: seatState.player?.ready ?? false,
      connected: seatState.player?.connected ?? false,
      isCPU: seatState.player?.isCPU ?? false,
    };
  }

  return {
    code: state.code,
    mode: state.mode,
    targetScore: state.targetScore,
    phase: state.phase,
    hostPlayerId: state.hostPlayerId,
    seats: publicSeats,
    teamGameStates: state.teamGameStates,
    hand: state.hand ? toPublicHandState(state.hand) : null,
    winner: state.winner,
    winReason: state.winReason,
    gameRedealUsed: state.gameRedealUsed,
  };
}

/**
 * Convert hand state to public hand state.
 */
function toPublicHandState(hand: NonNullable<RoomState['hand']>): PublicHandState {
  const handSizes: Record<Seat, number> = {
    N: hand.hands.N.length,
    E: hand.hands.E.length,
    S: hand.hands.S.length,
    W: hand.hands.W.length,
  };

  return {
    handIndex: hand.handIndex,
    phase: hand.phase,
    dealerSeat: hand.dealerSeat,
    currentTurn: hand.currentTurn,
    bids: hand.bids,
    currentBook: hand.currentBook,
    leadSuit: hand.leadSuit,
    completedBooks: hand.completedBooks,
    teamStates: hand.teamStates,
    spadesBroken: hand.spadesBroken,
    redealUsed: hand.redealUsed,
    redealOfferedTo: hand.redealOfferedTo,
    handSizes,
  };
}

/**
 * Get a player's private hand from state.
 */
export function getPrivateHand(state: RoomState, seat: Seat): { hand: Card[] } | null {
  if (!state.hand) return null;
  return { hand: state.hand.hands[seat] };
}
