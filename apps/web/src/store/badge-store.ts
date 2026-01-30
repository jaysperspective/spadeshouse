'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BadgeId,
  UserBadges,
  EarnedBadge,
  LearningProgress,
  LessonId,
} from '@spades/shared';
import { ALL_LESSON_IDS, BADGE_REGISTRY, CPU_GAMES_REQUIRED } from '@spades/shared';

// ============================================
// Badge Store Interface
// ============================================

interface BadgeState {
  // User's badge data
  userBadges: UserBadges;

  // Learning progress
  learningProgress: LearningProgress;

  // UI State
  showUnlockModal: boolean;
  pendingUnlockBadgeId: BadgeId | null;

  // Badge Actions
  earnBadge: (badgeId: BadgeId) => boolean; // Returns true if newly earned
  equipBadge: (badgeId: BadgeId | null) => void;
  hasBadge: (badgeId: BadgeId) => boolean;

  // Learning Actions
  markLessonComplete: (lessonId: LessonId) => void;
  isLessonComplete: (lessonId: LessonId) => boolean;
  isLearningComplete: () => boolean;
  resetLearningProgress: () => void;

  // CPU Game Actions
  incrementCPUGamesCompleted: () => void;
  getCPUGamesCompleted: () => number;

  // For dev/testing
  completeAllLessons: () => void;

  // Modal Actions
  showBadgeUnlockModal: (badgeId: BadgeId) => void;
  hideBadgeUnlockModal: () => void;
}

// ============================================
// Initial State
// ============================================

const initialUserBadges: UserBadges = {
  earned: [],
  equippedBadgeId: null,
};

const initialLearningProgress: LearningProgress = {
  completedLessons: [],
  cpuGamesCompleted: 0,
  currentLesson: 'fundamentals',
  isComplete: false,
  completedAt: null,
};

// ============================================
// Badge Store Implementation
// ============================================

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set, get) => ({
      userBadges: initialUserBadges,
      learningProgress: initialLearningProgress,
      showUnlockModal: false,
      pendingUnlockBadgeId: null,

      // ============================================
      // Badge Actions
      // ============================================

      earnBadge: (badgeId: BadgeId) => {
        const { userBadges } = get();

        // Idempotent: check if already earned
        if (userBadges.earned.some((b) => b.badgeId === badgeId)) {
          return false; // Already earned
        }

        // Validate badge exists in registry
        if (!BADGE_REGISTRY[badgeId]) {
          console.error(`Badge not found in registry: ${badgeId}`);
          return false;
        }

        const newBadge: EarnedBadge = {
          badgeId,
          earnedAt: Date.now(),
        };

        set((state) => ({
          userBadges: {
            ...state.userBadges,
            earned: [...state.userBadges.earned, newBadge],
          },
        }));

        return true; // Newly earned
      },

      equipBadge: (badgeId: BadgeId | null) => {
        const { userBadges } = get();

        // If equipping a badge, verify it's earned
        if (badgeId !== null && !userBadges.earned.some((b) => b.badgeId === badgeId)) {
          console.error(`Cannot equip badge not earned: ${badgeId}`);
          return;
        }

        set((state) => ({
          userBadges: {
            ...state.userBadges,
            equippedBadgeId: badgeId,
          },
        }));
      },

      hasBadge: (badgeId: BadgeId) => {
        const { userBadges } = get();
        return userBadges.earned.some((b) => b.badgeId === badgeId);
      },

      // ============================================
      // Learning Actions
      // ============================================

      markLessonComplete: (lessonId: LessonId) => {
        const state = get();

        // Already complete?
        if (state.learningProgress.completedLessons.includes(lessonId)) {
          return;
        }

        const newCompletedLessons = [...state.learningProgress.completedLessons, lessonId];
        const allLessonsComplete = ALL_LESSON_IDS.every((id) => newCompletedLessons.includes(id));
        const cpuGamesComplete = state.learningProgress.cpuGamesCompleted >= CPU_GAMES_REQUIRED;
        const allComplete = allLessonsComplete && cpuGamesComplete;

        // Determine next lesson
        let nextLesson: LessonId | null = null;
        if (!allLessonsComplete) {
          nextLesson = ALL_LESSON_IDS.find((id) => !newCompletedLessons.includes(id)) || null;
        }

        set({
          learningProgress: {
            ...state.learningProgress,
            completedLessons: newCompletedLessons,
            currentLesson: nextLesson,
            isComplete: allComplete,
            completedAt: allComplete ? Date.now() : state.learningProgress.completedAt,
          },
        });

        // If all requirements met, trigger badge unlock
        if (allComplete) {
          const wasNewlyEarned = get().earnBadge('kitchen_table_culture_certified');
          if (wasNewlyEarned) {
            get().showBadgeUnlockModal('kitchen_table_culture_certified');
          }
        }
      },

      isLessonComplete: (lessonId: LessonId) => {
        return get().learningProgress.completedLessons.includes(lessonId);
      },

      isLearningComplete: () => {
        const progress = get().learningProgress;
        const allLessonsComplete = ALL_LESSON_IDS.every((id) => progress.completedLessons.includes(id));
        const cpuGamesComplete = progress.cpuGamesCompleted >= CPU_GAMES_REQUIRED;
        return allLessonsComplete && cpuGamesComplete;
      },

      resetLearningProgress: () => {
        set({ learningProgress: initialLearningProgress });
      },

      // CPU Game Actions
      incrementCPUGamesCompleted: () => {
        const state = get();
        const newCount = state.learningProgress.cpuGamesCompleted + 1;
        const allLessonsComplete = ALL_LESSON_IDS.every((id) =>
          state.learningProgress.completedLessons.includes(id)
        );
        const cpuGamesComplete = newCount >= CPU_GAMES_REQUIRED;
        const allComplete = allLessonsComplete && cpuGamesComplete;

        set({
          learningProgress: {
            ...state.learningProgress,
            cpuGamesCompleted: newCount,
            isComplete: allComplete,
            completedAt: allComplete && !state.learningProgress.completedAt ? Date.now() : state.learningProgress.completedAt,
          },
        });

        // If all requirements now met, trigger badge unlock
        if (allComplete && !state.learningProgress.isComplete) {
          const wasNewlyEarned = get().earnBadge('kitchen_table_culture_certified');
          if (wasNewlyEarned) {
            get().showBadgeUnlockModal('kitchen_table_culture_certified');
          }
        }
      },

      getCPUGamesCompleted: () => {
        return get().learningProgress.cpuGamesCompleted;
      },

      // Dev/testing helper
      completeAllLessons: () => {
        // Mark all lessons complete and set CPU games to required
        set({
          learningProgress: {
            completedLessons: [...ALL_LESSON_IDS],
            cpuGamesCompleted: CPU_GAMES_REQUIRED,
            currentLesson: null,
            isComplete: true,
            completedAt: Date.now(),
          },
        });

        // Trigger badge unlock
        const wasNewlyEarned = get().earnBadge('kitchen_table_culture_certified');
        if (wasNewlyEarned) {
          get().showBadgeUnlockModal('kitchen_table_culture_certified');
        }
      },

      // ============================================
      // Modal Actions
      // ============================================

      showBadgeUnlockModal: (badgeId: BadgeId) => {
        set({
          showUnlockModal: true,
          pendingUnlockBadgeId: badgeId,
        });
      },

      hideBadgeUnlockModal: () => {
        set({
          showUnlockModal: false,
          pendingUnlockBadgeId: null,
        });
      },
    }),
    {
      name: 'spades-badge-storage',
      partialize: (state) => ({
        userBadges: state.userBadges,
        learningProgress: state.learningProgress,
      }),
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export function useEquippedBadge() {
  const { userBadges } = useBadgeStore();
  if (!userBadges.equippedBadgeId) return null;
  return BADGE_REGISTRY[userBadges.equippedBadgeId] || null;
}

export function useEarnedBadges() {
  const { userBadges } = useBadgeStore();
  return userBadges.earned.map((eb) => ({
    ...eb,
    definition: BADGE_REGISTRY[eb.badgeId],
  }));
}

export function useLearningProgress() {
  return useBadgeStore((state) => state.learningProgress);
}
