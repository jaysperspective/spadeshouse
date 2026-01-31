'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PublicRoomState,
  Card,
  Seat,
  ChatMessage,
  HandEndResult,
} from '@spades/shared';

interface GameState {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // Player identity
  playerId: string | null;
  reconnectToken: string | null;

  // Room state (public)
  roomState: PublicRoomState | null;

  // Private hand
  hand: Card[] | null;

  // Chat messages
  chatMessages: ChatMessage[];

  // Hand end results
  handEndResults: HandEndResult[] | null;

  // UI state
  selectedCard: Card | null;
  bidValue: number;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setError: (error: string | null) => void;
  setPlayerId: (playerId: string | null) => void;
  setReconnectToken: (token: string | null) => void;
  setRoomState: (state: PublicRoomState | null) => void;
  setHand: (hand: Card[] | null) => void;
  addChatMessage: (message: ChatMessage) => void;
  setHandEndResults: (results: HandEndResult[] | null) => void;
  setSelectedCard: (card: Card | null) => void;
  setBidValue: (value: number) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  connecting: false,
  error: null,
  playerId: null,
  reconnectToken: null,
  roomState: null,
  hand: null,
  chatMessages: [],
  handEndResults: null,
  selectedCard: null,
  bidValue: 0,
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,

      setConnected: (connected) => set({ connected, connecting: false }),
      setConnecting: (connecting) => set({ connecting }),
      setError: (error) => set({ error }),
      setPlayerId: (playerId) => set({ playerId }),
      setReconnectToken: (reconnectToken) => set({ reconnectToken }),
      setRoomState: (roomState) => set({ roomState, handEndResults: null }),
      setHand: (hand) => set({ hand, selectedCard: null }),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages.slice(-99), message],
        })),
      setHandEndResults: (handEndResults) => set({ handEndResults }),
      setSelectedCard: (selectedCard) => set({ selectedCard }),
      setBidValue: (bidValue) => set({ bidValue }),
      reset: () => set({ ...initialState, reconnectToken: null }),
    }),
    {
      name: 'spades-game-storage',
      partialize: (state) => ({
        playerId: state.playerId,
        reconnectToken: state.reconnectToken,
      }),
    }
  )
);

// Computed selectors
export function useMySeat(): Seat | null {
  const { playerId, roomState } = useGameStore();
  if (!playerId || !roomState) return null;

  for (const seat of ['N', 'E', 'S', 'W'] as Seat[]) {
    if (roomState.seats[seat].playerId === playerId) {
      return seat;
    }
  }
  return null;
}

export function useIsMyTurn(): boolean {
  const { roomState } = useGameStore();
  const mySeat = useMySeat();
  if (!roomState?.hand || !mySeat) return false;
  return roomState.hand.currentTurn === mySeat;
}

export function useMyTeam(): 'NS' | 'EW' | null {
  const mySeat = useMySeat();
  if (!mySeat) return null;
  return mySeat === 'N' || mySeat === 'S' ? 'NS' : 'EW';
}

export function useIsHost(): boolean {
  const { playerId, roomState } = useGameStore();
  if (!playerId || !roomState) return false;
  return roomState.hostPlayerId === playerId;
}
