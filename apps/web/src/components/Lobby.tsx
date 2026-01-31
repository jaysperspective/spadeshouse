'use client';

import { useState } from 'react';
import type { GameMode, TargetScore } from '@spades/shared';
import { CPU_GAMES_REQUIRED } from '@spades/shared';
import { getModeConfig } from '@spades/rules';
import { useBadgeStore } from '@/store/badge-store';

interface LobbyProps {
  onCreateRoom: (mode: GameMode, targetScore: TargetScore, playerName: string) => void;
  onJoinRoom: (code: string, playerName: string) => void;
  onLearnClick?: () => void;
  onCPUGameClick?: () => void;
}

export function Lobby({ onCreateRoom, onJoinRoom, onLearnClick, onCPUGameClick }: LobbyProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [mode, setMode] = useState<GameMode>('aceHigh');
  const [targetScore, setTargetScore] = useState<TargetScore>(250);
  const [joinCode, setJoinCode] = useState('');
  const [playerName, setPlayerName] = useState('');

  const { learningProgress } = useBadgeStore();

  const handleCreate = () => {
    onCreateRoom(mode, targetScore, playerName || 'Host');
  };

  const handleJoin = () => {
    if (joinCode.length !== 6) return;
    onJoinRoom(joinCode.toUpperCase(), playerName || 'Player');
  };

  const modes: GameMode[] = ['aceHigh', 'threeJokers', 'straightStruggle'];

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-8 max-w-md w-full">
        <h1 className="text-xl sm:text-3xl font-bold text-center mb-0.5 sm:mb-1">Spades</h1>
        <p className="text-center text-slate-400 text-xs sm:text-base mb-3 sm:mb-6">House Rules Edition</p>

        {/* Tabs */}
        <div className="flex mb-3 sm:mb-6 bg-slate-700 rounded-xl p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              tab === 'create'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all ${
              tab === 'join'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-slate-400'
            }`}
          >
            Join Room
          </button>
        </div>

        {/* Player Name */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm text-slate-400 mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="input w-full text-sm sm:text-base py-2 sm:py-2.5"
            maxLength={20}
          />
        </div>

        {tab === 'create' ? (
          <>
            {/* Game Mode Selection - Compact horizontal buttons */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Game Mode</label>
              <div className="flex gap-1.5 sm:gap-2">
                {modes.map((m) => {
                  const config = getModeConfig(m);
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`flex-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                        mode === m
                          ? 'border-blue-500 bg-blue-900/30 text-white'
                          : 'border-slate-600 text-slate-300 active:border-slate-500'
                      }`}
                    >
                      {config.name}
                    </button>
                  );
                })}
              </div>
              {/* Show selected mode description */}
              <p className="text-xs text-slate-500 mt-1.5 text-center">
                {getModeConfig(mode).description}
              </p>
            </div>

            {/* Target Score */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Target Score</label>
              <div className="flex gap-2 sm:gap-3">
                {([250, 500] as TargetScore[]).map((score) => (
                  <button
                    key={score}
                    onClick={() => setTargetScore(score)}
                    className={`flex-1 py-2 sm:py-3 rounded-xl text-center border-2 transition-all ${
                      targetScore === score
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-slate-600 active:border-slate-500'
                    }`}
                  >
                    <span className="font-bold text-base sm:text-lg">{score}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleCreate} className="btn btn-primary w-full text-base sm:text-lg py-2.5 sm:py-3">
              Create Room
            </button>
          </>
        ) : (
          <>
            {/* Join Code */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm text-slate-400 mb-1">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABCDEF"
                className="input w-full text-center text-xl sm:text-2xl font-mono tracking-[0.3em] uppercase py-2 sm:py-2.5"
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6}
              className="btn btn-primary w-full text-base sm:text-lg py-2.5 sm:py-3"
            >
              Join Room
            </button>
          </>
        )}

        {/* Practice & Learn buttons - Compact side by side on mobile */}
        {(onCPUGameClick || onLearnClick) && (
          <div className="mt-4 sm:mt-6 pt-3 sm:pt-6 border-t border-slate-700">
            <div className="flex gap-2 sm:gap-3">
              {onCPUGameClick && (
                <button
                  onClick={onCPUGameClick}
                  className="btn btn-secondary flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                    </svg>
                    <span className="hidden sm:inline">Play vs</span> CPU
                  </div>
                  <span className="text-[10px] sm:text-xs bg-yellow-600/30 text-yellow-400 px-1.5 py-0.5 rounded-full">
                    {learningProgress.cpuGamesCompleted}/{CPU_GAMES_REQUIRED}
                  </span>
                </button>
              )}
              {onLearnClick && (
                <button
                  onClick={onLearnClick}
                  className="btn btn-secondary flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    Learn
                  </div>
                  {learningProgress.isComplete ? (
                    <span className="text-[10px] sm:text-xs bg-green-600/30 text-green-400 px-1.5 py-0.5 rounded-full">
                      Done
                    </span>
                  ) : learningProgress.completedLessons.length > 0 ? (
                    <span className="text-[10px] sm:text-xs bg-blue-600/30 text-blue-400 px-1.5 py-0.5 rounded-full">
                      {learningProgress.completedLessons.length}/5
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs bg-slate-600/30 text-slate-400 px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
