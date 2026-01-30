/**
 * Persistence interface for game state.
 * This is a stub that can be replaced with a real database later.
 */

import type { RoomState } from '@spades/shared';

/**
 * Persistence interface for storing and retrieving game state.
 */
export interface PersistenceAdapter {
  /**
   * Save room state.
   */
  saveRoom(code: string, state: RoomState): Promise<void>;

  /**
   * Load room state by code.
   */
  loadRoom(code: string): Promise<RoomState | null>;

  /**
   * Delete room state.
   */
  deleteRoom(code: string): Promise<void>;

  /**
   * List all active room codes.
   */
  listRooms(): Promise<string[]>;
}

/**
 * In-memory persistence adapter for MVP.
 * All data is lost on server restart.
 */
export class InMemoryPersistence implements PersistenceAdapter {
  private rooms: Map<string, RoomState> = new Map();

  async saveRoom(code: string, state: RoomState): Promise<void> {
    this.rooms.set(code, state);
  }

  async loadRoom(code: string): Promise<RoomState | null> {
    return this.rooms.get(code) ?? null;
  }

  async deleteRoom(code: string): Promise<void> {
    this.rooms.delete(code);
  }

  async listRooms(): Promise<string[]> {
    return Array.from(this.rooms.keys());
  }

  /**
   * Get room count (for monitoring).
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Clear all rooms (for testing).
   */
  clear(): void {
    this.rooms.clear();
  }
}

/**
 * Create the default persistence adapter.
 * Can be swapped out for a real database implementation later.
 */
export function createPersistence(): PersistenceAdapter {
  return new InMemoryPersistence();
}
