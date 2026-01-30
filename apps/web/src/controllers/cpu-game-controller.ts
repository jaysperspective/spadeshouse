/**
 * CPU Game Controller
 *
 * Orchestrates CPU games entirely client-side using the game engine.
 * Human player is always at seat S, CPUs at N/E/W.
 */

import type {
  Card,
  Seat,
  GameMode,
  TargetScore,
  RoomState,
  Player,
} from '@spades/shared';
import { SEATS, getTeam } from '@spades/shared';
import {
  gameReducer,
  createInitialRoomState,
  toPublicRoomState,
  calculateBotBid,
  chooseBotCard,
} from '@spades/engine';
import { calculateHandResults } from '@spades/rules';
import { useCPUGameStore } from '@/store/cpu-game-store';
import {
  sleepBidDelay,
  sleepPlayDelay,
  sleep,
  getBookCompleteDelay,
} from '@/utils/cpu-timing';

// Human player is always at seat S
const HUMAN_SEAT: Seat = 'S';

// CPU player names
const CPU_NAMES: Record<Seat, string> = {
  N: 'CPU North',
  E: 'CPU East',
  W: 'CPU West',
  S: 'You', // Human
};

// Generate unique player IDs
function generatePlayerId(seat: Seat): string {
  return seat === HUMAN_SEAT ? 'human-player' : `cpu-${seat.toLowerCase()}`;
}

/**
 * CPU Game Controller class
 */
export class CPUGameController {
  private state: RoomState;
  private mode: GameMode;
  private targetScore: TargetScore;
  private playerName: string;
  private aborted = false;
  private fastMode = false;

  constructor(mode: GameMode, targetScore: TargetScore, playerName: string) {
    this.mode = mode;
    this.targetScore = targetScore;
    this.playerName = playerName || 'You';

    // Create initial room state
    const humanPlayerId = generatePlayerId(HUMAN_SEAT);
    this.state = createInitialRoomState('CPU', mode, targetScore, humanPlayerId);

    // Add all players to seats
    for (const seat of SEATS) {
      const playerId = generatePlayerId(seat);
      const name = seat === HUMAN_SEAT ? this.playerName : CPU_NAMES[seat];

      const player: Player = {
        id: playerId,
        name,
        socketId: null,
        reconnectToken: '',
        ready: true,
        connected: true,
      };

      this.state.seats[seat].playerId = playerId;
      this.state.seats[seat].player = player;
    }
  }

  /**
   * Abort the game (stop CPU turns)
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Set fast mode for quicker CPU delays
   */
  setFastMode(fast: boolean): void {
    this.fastMode = fast;
    useCPUGameStore.getState().setFastMode(fast);
  }

  /**
   * Start the game
   */
  async startGame(): Promise<void> {
    this.aborted = false;

    // Start the game (this will auto-deal)
    const result = gameReducer(this.state, { type: 'START_GAME' });
    if (!result.result.success) {
      console.error('Failed to start game:', result.result.error);
      return;
    }
    this.state = result.state;

    // Update store
    this.syncStore();

    // Process any CPU turns
    await this.processCPUTurns();
  }

  /**
   * Submit a bid for the human player
   */
  async submitHumanBid(bid: number): Promise<boolean> {
    const humanPlayerId = generatePlayerId(HUMAN_SEAT);

    const result = gameReducer(this.state, {
      type: 'SUBMIT_BID',
      playerId: humanPlayerId,
      bid,
    });

    if (!result.result.success) {
      console.error('Failed to submit bid:', result.result.error);
      return false;
    }

    this.state = result.state;
    this.syncStore();

    // Process CPU turns
    await this.processCPUTurns();

    return true;
  }

  /**
   * Play a card for the human player
   */
  async playHumanCard(card: Card): Promise<boolean> {
    const humanPlayerId = generatePlayerId(HUMAN_SEAT);

    // Check if this play will complete a book (3 cards currently in book)
    const willCompleteBook = this.state.hand?.currentBook.length === 3;

    const result = gameReducer(this.state, {
      type: 'PLAY_CARD',
      playerId: humanPlayerId,
      card,
    });

    if (!result.result.success) {
      console.error('Failed to play card:', result.result.error);
      return false;
    }

    this.state = result.state;

    // If book was completed, show the complete book before clearing
    if (willCompleteBook && this.state.hand) {
      // Get the just-completed book to display
      const lastBook = this.state.hand.completedBooks[this.state.hand.completedBooks.length - 1];
      if (lastBook) {
        // Temporarily show the completed book
        this.syncStoreWithCompletedBook(lastBook.plays);
        await sleep(getBookCompleteDelay());
      }
    }

    // Now sync the real state (with cleared book)
    this.syncStore();

    // Check for hand end
    if (this.state.phase === 'HAND_END' || this.state.phase === 'GAME_END') {
      this.handleHandEnd();
      return true;
    }

    // Process CPU turns
    await this.processCPUTurns();

    return true;
  }

  /**
   * Handle redeal decision (auto-decline for CPU games or accept if human)
   */
  async handleRedeal(accept: boolean): Promise<void> {
    if (this.state.phase !== 'REDEAL_OFFER' || !this.state.hand) return;

    const offeredTo = this.state.hand.redealOfferedTo;
    if (!offeredTo) return;

    const playerId = generatePlayerId(offeredTo);

    const result = gameReducer(this.state, {
      type: 'REQUEST_REDEAL',
      playerId,
      accept,
    });

    if (result.result.success) {
      this.state = result.state;
      this.syncStore();

      // Continue processing if needed
      await this.processCPUTurns();
    }
  }

  /**
   * Move to the next hand
   */
  async nextHand(): Promise<void> {
    if (this.state.phase !== 'HAND_END') return;

    const result = gameReducer(this.state, { type: 'NEXT_HAND' });
    if (result.result.success) {
      this.state = result.state;
      this.syncStore();

      // Process CPU turns for the new hand
      await this.processCPUTurns();
    }
  }

  /**
   * Process all CPU turns until it's the human's turn or game state changes
   */
  private async processCPUTurns(): Promise<void> {
    while (!this.aborted) {
      // Handle redeal offers for CPUs (auto-decline)
      if (this.state.phase === 'REDEAL_OFFER' && this.state.hand?.redealOfferedTo) {
        const offeredTo = this.state.hand.redealOfferedTo;
        if (offeredTo !== HUMAN_SEAT) {
          // CPU auto-declines redeal
          useCPUGameStore.getState().setCPUThinking(true, offeredTo);
          await sleepBidDelay(this.fastMode);
          await this.handleRedeal(false);
          useCPUGameStore.getState().setCPUThinking(false);
          continue;
        }
        // Human's redeal offer - wait for input
        break;
      }

      // Check if it's a CPU's turn
      const currentTurn = this.state.hand?.currentTurn;
      if (!currentTurn || currentTurn === HUMAN_SEAT) {
        break;
      }

      // It's a CPU's turn
      const phase = this.state.phase;
      if (phase === 'BIDDING') {
        await this.processCPUBid(currentTurn);
      } else if (phase === 'PLAYING') {
        await this.processCPUPlay(currentTurn);
      } else {
        break;
      }

      // Check for hand/game end (phase may have changed after bid/play)
      // Note: Using string comparison to avoid TypeScript narrowing issues
      const newPhase = this.state.phase as string;
      if (newPhase === 'HAND_END' || newPhase === 'GAME_END') {
        this.handleHandEnd();
        break;
      }
    }
  }

  /**
   * Process a CPU bid
   */
  private async processCPUBid(seat: Seat): Promise<void> {
    if (!this.state.hand) return;

    const cpuHand = this.state.hand.hands[seat];
    const partnerSeat = seat === 'N' ? 'S' : seat === 'S' ? 'N' : seat === 'E' ? 'W' : 'E';
    const partnerBid = this.state.hand.bids[partnerSeat] ?? null;

    // Show thinking indicator
    useCPUGameStore.getState().setCPUThinking(true, seat);

    // Add delay for realism
    await sleepBidDelay(this.fastMode);

    if (this.aborted) return;

    // Calculate bid
    const bid = calculateBotBid(cpuHand, partnerBid, this.mode);

    // Submit bid
    const playerId = generatePlayerId(seat);
    const result = gameReducer(this.state, {
      type: 'SUBMIT_BID',
      playerId,
      bid,
    });

    if (result.result.success) {
      this.state = result.state;
      this.syncStore();
    }

    useCPUGameStore.getState().setCPUThinking(false);
  }

  /**
   * Process a CPU card play
   */
  private async processCPUPlay(seat: Seat): Promise<void> {
    if (!this.state.hand) return;

    // Show thinking indicator
    useCPUGameStore.getState().setCPUThinking(true, seat);

    // Add delay for realism
    await sleepPlayDelay(this.fastMode);

    if (this.aborted) return;

    // Choose card to play
    const cpuHand = this.state.hand.hands[seat];
    const myTeam = getTeam(seat);
    const opponentTeam = myTeam === 'NS' ? 'EW' : 'NS';

    const card = chooseBotCard({
      hand: cpuHand,
      currentBook: this.state.hand.currentBook,
      completedBooks: this.state.hand.completedBooks,
      bids: this.state.hand.bids,
      teamBooksWon: this.state.hand.teamStates[myTeam].booksWon,
      opponentBooksWon: this.state.hand.teamStates[opponentTeam].booksWon,
      spadesBroken: this.state.hand.spadesBroken,
      mode: this.mode,
      mySeat: seat,
    });

    // Check if this play will complete a book
    const willCompleteBook = this.state.hand.currentBook.length === 3;

    // Play card
    const playerId = generatePlayerId(seat);
    const result = gameReducer(this.state, {
      type: 'PLAY_CARD',
      playerId,
      card,
    });

    if (result.result.success) {
      this.state = result.state;

      // If book was completed, show the complete book before clearing
      if (willCompleteBook && this.state.hand) {
        const lastBook = this.state.hand.completedBooks[this.state.hand.completedBooks.length - 1];
        if (lastBook) {
          this.syncStoreWithCompletedBook(lastBook.plays);
          useCPUGameStore.getState().setCPUThinking(false);
          await sleep(getBookCompleteDelay());
        }
      }

      // Now sync the real state
      this.syncStore();
    }

    useCPUGameStore.getState().setCPUThinking(false);
  }

  /**
   * Handle hand end - calculate and display results
   */
  private handleHandEnd(): void {
    if (!this.state.hand) return;

    // Calculate hand results
    const { results } = calculateHandResults(
      this.state.hand.teamStates,
      this.state.teamGameStates,
      this.state.hand.handIndex,
      this.mode
    );

    // Update store with results
    useCPUGameStore.getState().setHandEndResults(results);
  }

  /**
   * Get the human player's hand
   */
  getHumanHand(): Card[] {
    if (!this.state.hand) return [];
    return this.state.hand.hands[HUMAN_SEAT];
  }

  /**
   * Check if the game is complete
   */
  isGameComplete(): boolean {
    return this.state.phase === 'GAME_END';
  }

  /**
   * Get the winning team
   */
  getWinner(): 'NS' | 'EW' | null {
    return this.state.winner;
  }

  /**
   * Sync internal state to the store
   */
  private syncStore(): void {
    const store = useCPUGameStore.getState();

    // Convert to public state for UI
    const publicState = toPublicRoomState(this.state);
    store.setRoomState(publicState);

    // Set human's hand
    store.setHumanHand(this.getHumanHand());

    // Set all hands (for debugging or AI visualization)
    if (this.state.hand) {
      store.setAllHands(this.state.hand.hands);
    }

    // Update phase
    if (this.state.phase === 'GAME_END') {
      store.setPhase('ended');
    } else if (this.state.phase !== 'LOBBY') {
      store.setPhase('playing');
    }
  }

  /**
   * Sync state but show a completed book's cards in the currentBook display.
   * This allows the UI to show all 4 cards before the book clears.
   */
  private syncStoreWithCompletedBook(plays: { seat: Seat; card: Card }[]): void {
    const store = useCPUGameStore.getState();

    // Convert to public state
    const publicState = toPublicRoomState(this.state);

    // Override currentBook to show the completed book's cards
    if (publicState.hand) {
      publicState.hand.currentBook = plays;
      publicState.hand.leadSuit = plays[0]?.card.suit ?? null;
    }

    store.setRoomState(publicState);
    store.setHumanHand(this.getHumanHand());

    if (this.state.hand) {
      store.setAllHands(this.state.hand.hands);
    }
  }
}

/**
 * Create and start a new CPU game
 */
export async function startCPUGame(
  mode: GameMode,
  targetScore: TargetScore,
  playerName: string
): Promise<CPUGameController> {
  const controller = new CPUGameController(mode, targetScore, playerName);

  // Initialize store
  const store = useCPUGameStore.getState();
  store.setMode(mode);
  store.setTargetScore(targetScore);
  store.setPlayerName(playerName);
  store.setPhase('playing');

  // Start the game
  await controller.startGame();

  return controller;
}
