'use client';

import { useState } from 'react';
import type { LessonId } from '@spades/shared';
import { ALL_LESSON_IDS } from '@spades/shared';
import { useBadgeStore, useLearningProgress } from '@/store/badge-store';

interface LearningModeProps {
  onClose: () => void;
}

// Lesson content definitions
const LESSONS: Record<LessonId, { title: string; description: string; content: string[] }> = {
  fundamentals: {
    title: 'Fundamentals',
    description: 'Learn about Books, following suit, and trump cards',
    content: [
      'In Spades, what other games call "tricks" we call "Books".',
      'Each round, players take turns playing one card. The four cards played make up a Book.',
      'You must follow suit if you can - play a card of the same suit that was led.',
      'If you can\'t follow suit, you may play any card, including a trump (Spade).',
      'Spades are always trump - they beat any card of another suit.',
      'The highest card of the led suit wins, unless someone played a Spade.',
    ],
  },
  bidding_basics: {
    title: 'Bidding Basics',
    description: 'Understanding how to bid on Books',
    content: [
      'Before each hand, you bid how many Books you think you\'ll win.',
      'Your team\'s combined bid is your contract - you need to win at least that many.',
      'A "Board" is the minimum combined team bid of 4 Books.',
      'Winning exactly what you bid is ideal. Going over (overbooking) can be risky.',
      'If your team wins 3 over your bid, you get 0 points for the hand.',
      'If you win 4+ over your bid, your team gets "Set" and loses points.',
    ],
  },
  nil_blind_nil: {
    title: 'Nil & Blind Nil',
    description: 'High-risk, high-reward bidding strategies',
    content: [
      'Bidding Nil means you promise to win zero Books.',
      'Successfully making Nil earns bonus points; failing costs points.',
      'Your partner must try to protect you by winning Books.',
      'Blind Nil is bidding Nil before seeing your cards - even riskier!',
      'These bids add strategy depth but require team coordination.',
      'Only attempt Nil when you have a weak hand with few high cards.',
    ],
  },
  light_strategy: {
    title: 'Light Strategy',
    description: 'Basic strategic awareness for better play',
    content: [
      'Count the Spades played - knowing how many remain helps planning.',
      'Lead with your strong suits early to establish control.',
      'Save high Spades for when you need to win specific Books.',
      'Watch what cards your partner plays to understand their hand.',
      'Don\'t always play your highest card - sometimes ducking is smart.',
      'A "Dime" (winning exactly 10 Books) earns 110 points - aim for it when possible.',
    ],
  },
};

export function LearningMode({ onClose }: LearningModeProps) {
  const { markLessonComplete, completeAllLessons } = useBadgeStore();
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);

  const lessonIds = ALL_LESSON_IDS;
  const currentLessonId = lessonIds[currentLessonIndex];
  const currentLesson = currentLessonId ? LESSONS[currentLessonId] : null;

  if (!currentLesson || !currentLessonId) {
    return null;
  }

  const isLastContent = currentContentIndex >= currentLesson.content.length - 1;
  const isLastLesson = currentLessonIndex >= lessonIds.length - 1;

  const handleNext = () => {
    if (!isLastContent) {
      setCurrentContentIndex((prev) => prev + 1);
    } else if (!isLastLesson) {
      // Mark current lesson complete and move to next
      markLessonComplete(currentLessonId);
      setCurrentLessonIndex((prev) => prev + 1);
      setCurrentContentIndex(0);
    } else {
      // Final lesson complete
      markLessonComplete(currentLessonId);
      // Modal will show automatically via the store
    }
  };

  const handlePrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex((prev) => prev - 1);
    } else if (currentLessonIndex > 0) {
      setCurrentLessonIndex((prev) => prev - 1);
      const prevLesson = LESSONS[lessonIds[currentLessonIndex - 1]!];
      setCurrentContentIndex(prevLesson.content.length - 1);
    }
  };

  const totalProgress = lessonIds.reduce((acc, id, index) => {
    if (index < currentLessonIndex) return acc + LESSONS[id].content.length;
    if (index === currentLessonIndex) return acc + currentContentIndex + 1;
    return acc;
  }, 0);

  const totalContent = lessonIds.reduce((acc, id) => acc + LESSONS[id].content.length, 0);
  const progressPercent = Math.round((totalProgress / totalContent) * 100);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg sm:m-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="font-semibold text-lg">Learning Mode</h2>
            <div className="text-xs text-slate-400">
              Lesson {currentLessonIndex + 1} of {lessonIds.length}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2 border-b border-slate-700">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{currentLesson.title}</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 mobile-scroll">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-2">{currentLesson.title}</h3>
            <p className="text-sm text-slate-400">{currentLesson.description}</p>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="text-sm text-slate-300 leading-relaxed">
              {currentLesson.content[currentContentIndex]}
            </div>
          </div>

          {/* Content dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {currentLesson.content.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentContentIndex
                    ? 'bg-blue-500'
                    : index < currentContentIndex
                    ? 'bg-blue-500/50'
                    : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentLessonIndex === 0 && currentContentIndex === 0}
            className="btn btn-secondary flex-1"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            className="btn btn-primary flex-1"
          >
            {isLastContent && isLastLesson ? 'Complete' : 'Next'}
          </button>
        </div>

        {/* Dev shortcut */}
        {process.env.NODE_ENV === 'development' && (
          <div className="px-4 pb-4">
            <button
              onClick={() => {
                completeAllLessons();
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-slate-400 underline"
            >
              [Dev] Complete all lessons instantly
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lesson progress indicator for sidebar/menu
 */
export function LearningProgressIndicator() {
  const learningProgress = useLearningProgress();
  const completedCount = learningProgress.completedLessons.length;
  const totalCount = ALL_LESSON_IDS.length;

  if (learningProgress.isComplete) {
    return (
      <span className="text-xs text-green-400">
        Complete
      </span>
    );
  }

  return (
    <span className="text-xs text-slate-400">
      {completedCount}/{totalCount} lessons
    </span>
  );
}
