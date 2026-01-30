/**
 * CPU timing utilities for realistic bot play delays.
 */

/**
 * Delay ranges in milliseconds
 */
export const CPU_DELAYS = {
  // Bidding delay (thinking about what to bid)
  BID_MIN: 800,
  BID_MAX: 1500,

  // Card play delay (choosing which card to play)
  PLAY_MIN: 400,
  PLAY_MAX: 1000,

  // Fast mode for subsequent games (optional)
  FAST_BID_MIN: 300,
  FAST_BID_MAX: 600,
  FAST_PLAY_MIN: 150,
  FAST_PLAY_MAX: 400,

  // Delay between book completion and next turn
  BOOK_COMPLETE: 800,

  // Delay after hand ends before showing results
  HAND_END: 500,
} as const;

/**
 * Generate a random delay within the specified range.
 */
export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get a random bid delay.
 */
export function getBidDelay(fastMode = false): number {
  if (fastMode) {
    return randomDelay(CPU_DELAYS.FAST_BID_MIN, CPU_DELAYS.FAST_BID_MAX);
  }
  return randomDelay(CPU_DELAYS.BID_MIN, CPU_DELAYS.BID_MAX);
}

/**
 * Get a random play delay.
 */
export function getPlayDelay(fastMode = false): number {
  if (fastMode) {
    return randomDelay(CPU_DELAYS.FAST_PLAY_MIN, CPU_DELAYS.FAST_PLAY_MAX);
  }
  return randomDelay(CPU_DELAYS.PLAY_MIN, CPU_DELAYS.PLAY_MAX);
}

/**
 * Get the book completion delay.
 */
export function getBookCompleteDelay(): number {
  return CPU_DELAYS.BOOK_COMPLETE;
}

/**
 * Get the hand end delay.
 */
export function getHandEndDelay(): number {
  return CPU_DELAYS.HAND_END;
}

/**
 * Sleep for a specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sleep for a random bid delay.
 */
export async function sleepBidDelay(fastMode = false): Promise<void> {
  await sleep(getBidDelay(fastMode));
}

/**
 * Sleep for a random play delay.
 */
export async function sleepPlayDelay(fastMode = false): Promise<void> {
  await sleep(getPlayDelay(fastMode));
}
