/**
 * Tests for Badge Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBadgeStore } from './badge-store';

// Reset store before each test
beforeEach(() => {
  // Clear localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }

  // Reset store to initial state
  useBadgeStore.setState({
    userBadges: {
      earned: [],
      equippedBadgeId: null,
    },
    learningProgress: {
      completedLessons: [],
      cpuGamesCompleted: 0,
      currentLesson: 'fundamentals',
      isComplete: false,
      completedAt: null,
    },
    showUnlockModal: false,
    pendingUnlockBadgeId: null,
  });
});

describe('Badge Store', () => {
  describe('earnBadge', () => {
    it('should earn a badge and return true for newly earned badge', () => {
      const { earnBadge, hasBadge } = useBadgeStore.getState();

      const wasNewlyEarned = earnBadge('kitchen_table_culture_certified');

      expect(wasNewlyEarned).toBe(true);
      expect(hasBadge('kitchen_table_culture_certified')).toBe(true);
    });

    it('should be idempotent - return false for already earned badge', () => {
      const { earnBadge } = useBadgeStore.getState();

      // First time - newly earned
      const first = earnBadge('kitchen_table_culture_certified');
      expect(first).toBe(true);

      // Second time - already earned
      const second = earnBadge('kitchen_table_culture_certified');
      expect(second).toBe(false);

      // Should still only have one badge
      const { userBadges } = useBadgeStore.getState();
      expect(userBadges.earned.length).toBe(1);
    });

    it('should record earnedAt timestamp', () => {
      const { earnBadge } = useBadgeStore.getState();
      const beforeTime = Date.now();

      earnBadge('kitchen_table_culture_certified');

      const { userBadges } = useBadgeStore.getState();
      const badge = userBadges.earned[0];

      expect(badge).toBeDefined();
      expect(badge?.earnedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(badge?.earnedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('equipBadge', () => {
    it('should equip an earned badge', () => {
      const { earnBadge, equipBadge } = useBadgeStore.getState();

      earnBadge('kitchen_table_culture_certified');
      equipBadge('kitchen_table_culture_certified');

      const { userBadges } = useBadgeStore.getState();
      expect(userBadges.equippedBadgeId).toBe('kitchen_table_culture_certified');
    });

    it('should not equip a badge that is not earned', () => {
      const { equipBadge } = useBadgeStore.getState();

      // Try to equip without earning
      equipBadge('kitchen_table_culture_certified');

      const { userBadges } = useBadgeStore.getState();
      expect(userBadges.equippedBadgeId).toBeNull();
    });

    it('should allow unequipping by passing null', () => {
      const { earnBadge, equipBadge } = useBadgeStore.getState();

      earnBadge('kitchen_table_culture_certified');
      equipBadge('kitchen_table_culture_certified');

      // Verify equipped
      let state = useBadgeStore.getState();
      expect(state.userBadges.equippedBadgeId).toBe('kitchen_table_culture_certified');

      // Unequip
      useBadgeStore.getState().equipBadge(null);

      state = useBadgeStore.getState();
      expect(state.userBadges.equippedBadgeId).toBeNull();
    });

    it('should only allow one badge equipped at a time', () => {
      // Note: Currently only one badge exists in the system
      // This test verifies the single-badge constraint
      const { earnBadge, equipBadge } = useBadgeStore.getState();

      earnBadge('kitchen_table_culture_certified');
      equipBadge('kitchen_table_culture_certified');

      const state = useBadgeStore.getState();
      // Can only have one equippedBadgeId (not an array)
      expect(typeof state.userBadges.equippedBadgeId).toBe('string');
    });
  });

  describe('Learning Progress', () => {
    it('should mark lessons as complete', () => {
      const { markLessonComplete } = useBadgeStore.getState();

      markLessonComplete('fundamentals');

      expect(useBadgeStore.getState().isLessonComplete('fundamentals')).toBe(true);
      expect(useBadgeStore.getState().isLessonComplete('bidding_basics')).toBe(false);
    });

    it('should track completion of all lessons (requires CPU games too)', () => {
      const { markLessonComplete, incrementCPUGamesCompleted } = useBadgeStore.getState();

      // Mark all lessons complete
      markLessonComplete('fundamentals');
      expect(useBadgeStore.getState().isLearningComplete()).toBe(false);

      markLessonComplete('bidding_basics');
      expect(useBadgeStore.getState().isLearningComplete()).toBe(false);

      markLessonComplete('nil_blind_nil');
      expect(useBadgeStore.getState().isLearningComplete()).toBe(false);

      markLessonComplete('light_strategy');
      // Still not complete - need CPU games
      expect(useBadgeStore.getState().isLearningComplete()).toBe(false);

      // Complete CPU games
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();
      expect(useBadgeStore.getState().isLearningComplete()).toBe(false);

      incrementCPUGamesCompleted();
      expect(useBadgeStore.getState().isLearningComplete()).toBe(true);
    });

    it('should trigger badge unlock when both lessons and CPU games are complete', () => {
      const { markLessonComplete, incrementCPUGamesCompleted } = useBadgeStore.getState();

      // Complete all lessons
      markLessonComplete('fundamentals');
      markLessonComplete('bidding_basics');
      markLessonComplete('nil_blind_nil');
      markLessonComplete('light_strategy');

      // Badge should NOT be earned yet (CPU games needed)
      expect(useBadgeStore.getState().hasBadge('kitchen_table_culture_certified')).toBe(false);

      // Complete CPU games
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();

      // Badge should now be automatically earned
      expect(useBadgeStore.getState().hasBadge('kitchen_table_culture_certified')).toBe(true);
    });

    it('should show unlock modal only when all requirements met', () => {
      const { markLessonComplete, incrementCPUGamesCompleted } = useBadgeStore.getState();

      // Complete all lessons
      markLessonComplete('fundamentals');
      markLessonComplete('bidding_basics');
      markLessonComplete('nil_blind_nil');
      markLessonComplete('light_strategy');

      // Modal should not be shown yet (CPU games needed)
      expect(useBadgeStore.getState().showUnlockModal).toBe(false);

      // Complete 2 CPU games
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();
      expect(useBadgeStore.getState().showUnlockModal).toBe(false);

      // Complete final CPU game
      incrementCPUGamesCompleted();

      // Modal should be shown now
      expect(useBadgeStore.getState().showUnlockModal).toBe(true);
      expect(useBadgeStore.getState().pendingUnlockBadgeId).toBe('kitchen_table_culture_certified');
    });

    it('should not show modal if badge was already earned', () => {
      const { earnBadge, markLessonComplete, incrementCPUGamesCompleted } = useBadgeStore.getState();

      // Pre-earn the badge
      earnBadge('kitchen_table_culture_certified');

      // Reset modal state
      useBadgeStore.setState({ showUnlockModal: false, pendingUnlockBadgeId: null });

      // Complete all lessons
      markLessonComplete('fundamentals');
      markLessonComplete('bidding_basics');
      markLessonComplete('nil_blind_nil');
      markLessonComplete('light_strategy');

      // Complete all CPU games
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();
      incrementCPUGamesCompleted();

      // Modal should NOT show since badge was already earned
      expect(useBadgeStore.getState().showUnlockModal).toBe(false);
    });
  });

  describe('completeAllLessons (dev helper)', () => {
    it('should complete all lessons at once', () => {
      const { completeAllLessons } = useBadgeStore.getState();

      completeAllLessons();

      expect(useBadgeStore.getState().isLearningComplete()).toBe(true);
    });

    it('should earn and show badge unlock modal', () => {
      const { completeAllLessons } = useBadgeStore.getState();

      completeAllLessons();

      expect(useBadgeStore.getState().hasBadge('kitchen_table_culture_certified')).toBe(true);
      expect(useBadgeStore.getState().showUnlockModal).toBe(true);
    });
  });

  describe('Modal Actions', () => {
    it('should hide badge unlock modal', () => {
      useBadgeStore.setState({
        showUnlockModal: true,
        pendingUnlockBadgeId: 'kitchen_table_culture_certified',
      });

      useBadgeStore.getState().hideBadgeUnlockModal();

      const state = useBadgeStore.getState();
      expect(state.showUnlockModal).toBe(false);
      expect(state.pendingUnlockBadgeId).toBeNull();
    });
  });
});
