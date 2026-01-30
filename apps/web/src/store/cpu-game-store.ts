'use client';

import { create } from 'zustand';
import type {
  Card,
  Seat,
  GameMode,
  TargetScore,
  PublicRoomState,
  HandEndResult,
} from '@spades/shared';

// ============================================
// CPU Game Store Interface
// ============================================

export type CPUGamePhase = 'setup' | 'playing' | 'ended';

interface CPUGameState {
  // Game setup
  phase: CPUGamePhase;
  mode: GameMode | null;
  targetScore: TargetScore | null;
  playerName: string;

  // Game state (using PublicRoomState for compatibility with UI components)
  roomState: PublicRoomState | null;

  // Human player's private hand
  humanHand: Card[] | null;

  // All hands (CPU game has access to all hands for AI)
  allHands: Record<Seat, Card[]> | null;

  // Hand end results
  handEndResults: HandEndResult[] | null;

  // UI state
  cpuThinking: boolean;
  thinkingSeat: Seat | null;
  fastMode: boolean;

  // Actions
  setPhase: (phase: CPUGamePhase) => void;
  setMode: (mode: GameMode) => void;
  setTargetScore: (score: TargetScore) => void;
  setPlayerName: (name: string) => void;
  setRoomState: (state: PublicRoomState | null) => void;
  setHumanHand: (hand: Card[] | null) => void;
  setAllHands: (hands: Record<Seat, Card[]> | null) => void;
  setHandEndResults: (results: HandEndResult[] | null) => void;
  setCPUThinking: (thinking: boolean, seat?: Seat | null) => void;
  setFastMode: (fast: boolean) => void;
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialState = {
  phase: 'setup' as CPUGamePhase,
  mode: null as GameMode | null,
  targetScore: null as TargetScore | null,
  playerName: 'You',
  roomState: null as PublicRoomState | null,
  humanHand: null as Card[] | null,
  allHands: null as Record<Seat, Card[]> | null,
  handEndResults: null as HandEndResult[] | null,
  cpuThinking: false,
  thinkingSeat: null as Seat | null,
  fastMode: false,
};

// ============================================
// Store Implementation
// ============================================

export const useCPUGameStore = create<CPUGameState>()((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),
  setTargetScore: (targetScore) => set({ targetScore }),
  setPlayerName: (playerName) => set({ playerName }),
  setRoomState: (roomState) => set({ roomState, handEndResults: null }),
  setHumanHand: (humanHand) => set({ humanHand }),
  setAllHands: (allHands) => set({ allHands }),
  setHandEndResults: (handEndResults) => set({ handEndResults }),
  setCPUThinking: (cpuThinking, seat = null) => set({ cpuThinking, thinkingSeat: seat }),
  setFastMode: (fastMode) => set({ fastMode }),
  reset: () => set(initialState),
}));

// ============================================
// Selector Hooks
// ============================================

export function useCPUGamePhase() {
  return useCPUGameStore((state) => state.phase);
}

export function useCPUGameRoomState() {
  return useCPUGameStore((state) => state.roomState);
}

export function useHumanHand() {
  return useCPUGameStore((state) => state.humanHand);
}

export function useIsHumanTurn(): boolean {
  const roomState = useCPUGameStore((state) => state.roomState);
  if (!roomState?.hand) return false;
  // Human is always at seat S
  return roomState.hand.currentTurn === 'S';
}

export function useCPUThinking() {
  return useCPUGameStore((state) => ({
    thinking: state.cpuThinking,
    seat: state.thinkingSeat,
  }));
}

export function useFastMode() {
  return useCPUGameStore((state) => state.fastMode);
}
