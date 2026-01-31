'use client';

import { useState, useEffect } from 'react';
import { useGameStore, useMySeat, useIsMyTurn, useMyTeam, useIsHost } from '@/store/game-store';
import { useBadgeStore } from '@/store/badge-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
import { PlayerHand } from '@/components/PlayerHand';
import { BiddingPanel } from '@/components/BiddingPanel';
import { Chat, InlineChat } from '@/components/Chat';
import { Scoreboard } from '@/components/Scoreboard';
import { RedealOffer } from '@/components/RedealOffer';
import { HandEndSummary } from '@/components/HandEndSummary';
import { RulesScreen } from '@/components/RulesScreen';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { Card } from '@/components/Card';
import { BadgeUnlockModal, BadgeShelf, EquippedBadgeDisplay } from '@/components/badges';
import { LearningMode } from '@/components/LearningMode';
import { CPUGame } from '@/components/CPUGame';

export default function Home() {
  const {
    connected,
    connecting,
    error,
    roomState,
    hand,
    chatMessages,
    handEndResults,
    setError,
  } = useGameStore();

  const {
    createRoom,
    joinRoom,
    takeSeat,
    leaveSeat,
    setReady,
    requestRedeal,
    submitBid,
    playCard,
    sendChat,
    nextHand,
    addCpuToSeat,
    removeCpuFromSeat,
  } = useWebSocket();

  const mySeat = useMySeat();
  const isMyTurn = useIsMyTurn();
  const myTeam = useMyTeam();
  const isHost = useIsHost();

  const [showRules, setShowRules] = useState(false);
  const [showHandEnd, setShowHandEnd] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLearning, setShowLearning] = useState(false);
  const [gameMode, setGameMode] = useState<'lobby' | 'online' | 'cpu'>('lobby');

  // Badge store
  const { userBadges } = useBadgeStore();

  // Show hand end summary when results arrive or game ends
  useEffect(() => {
    if (handEndResults && handEndResults.length > 0) {
      setShowHandEnd(true);
    }
  }, [handEndResults]);

  // Also show popup when game ends
  useEffect(() => {
    if (roomState?.phase === 'GAME_END' && roomState?.winner) {
      setShowHandEnd(true);
    }
  }, [roomState?.phase, roomState?.winner]);

  // Handle hand end continue
  const handleContinue = () => {
    setShowHandEnd(false);
    if (roomState && roomState.phase === 'HAND_END' && !roomState.winner) {
      nextHand();
    }
  };

  // Error toast
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, setError]);

  // Show CPU game if in CPU mode
  if (gameMode === 'cpu') {
    return <CPUGame onExit={() => setGameMode('lobby')} />;
  }

  // Show lobby if not in a room
  if (!roomState) {
    return (
      <>
        <Lobby
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onLearnClick={() => setShowLearning(true)}
          onCPUGameClick={() => setGameMode('cpu')}
        />

        {/* Profile button in lobby */}
        <button
          onClick={() => setShowProfile(true)}
          className="fixed top-4 right-4 btn btn-sm btn-secondary flex items-center gap-1 z-40"
        >
          {userBadges.equippedBadgeId && (
            <EquippedBadgeDisplay />
          )}
          Profile
        </button>

        {/* Profile modal in lobby */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowProfile(false)}>
            <div className="w-full sm:max-w-md sm:m-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <span className="font-semibold text-lg">Profile</span>
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 mobile-scroll">
                <BadgeShelf />
              </div>
            </div>
          </div>
        )}

        {/* Learning Mode modal */}
        {showLearning && (
          <LearningMode onClose={() => setShowLearning(false)} />
        )}

        {/* Badge unlock modal */}
        <BadgeUnlockModal />

        <ConnectionStatus connected={connected} connecting={connecting} />
        {error && (
          <div className="fixed top-4 left-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl z-50 text-center">
            {error}
          </div>
        )}
      </>
    );
  }

  const isPlaying = roomState.phase === 'PLAYING';
  const isBidding = roomState.phase === 'BIDDING';
  const isRedealOffer = roomState.phase === 'REDEAL_OFFER';
  const isGameEnd = roomState.phase === 'GAME_END';
  const isHandEnd = roomState.phase === 'HAND_END';

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col no-select">
      {/* Minimal header - just title and team badge */}
      <header className="flex-shrink-0 flex justify-center items-center px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold">Spades</h1>
          {mySeat && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${myTeam === 'NS' ? 'bg-green-600' : 'bg-blue-600'}`}>
              {mySeat} ({myTeam})
            </span>
          )}
        </div>
      </header>

      {/* Main game area - fills available space */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Game table */}
        <div className="flex-shrink-0 px-2 pt-2 sm:px-4 sm:pt-3">
          <GameTable
            roomState={roomState}
            mySeat={mySeat}
            isHost={isHost}
            onTakeSeat={takeSeat}
            onLeaveSeat={leaveSeat}
            onReady={setReady}
            onAddCpu={addCpuToSeat}
            onRemoveCpu={removeCpuFromSeat}
          />
        </div>

        {/* Bidding panel */}
        {isBidding && mySeat && roomState.hand && (
          <div className="flex-shrink-0 px-2 py-1.5 sm:px-3 sm:py-2">
            <BiddingPanel
              roomState={roomState}
              mySeat={mySeat}
              isMyTurn={isMyTurn}
              onSubmitBid={submitBid}
            />
          </div>
        )}

        {/* Player's hand - during bidding (view only) */}
        {isBidding && hand && mySeat && (
          <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700">
            <div className="px-2 py-0.5 text-[10px] sm:text-xs text-slate-400">
              Your Hand ({hand.length})
            </div>
            <div className="card-fan hide-scrollbar pb-2 sm:pb-3">
              {hand.map((card, i) => (
                <Card
                  key={`${card.rank}-${card.suit}-${i}`}
                  card={card}
                  size="md"
                />
              ))}
            </div>
          </div>
        )}

        {/* Player's hand - during play (directly under table) */}
        {hand && mySeat && isPlaying && (
          <div className="flex-shrink-0 bg-slate-800 border-t border-slate-700">
            <div className="px-2 py-0.5 flex justify-between items-center">
              <span className="text-[10px] sm:text-xs text-slate-400">Your Hand ({hand.length})</span>
              {isMyTurn && (
                <span className="text-[10px] sm:text-xs text-yellow-400 animate-pulse font-medium">
                  Tap twice to play
                </span>
              )}
            </div>
            <PlayerHand
              cards={hand}
              isMyTurn={isMyTurn}
              onPlayCard={playCard}
            />
          </div>
        )}

        {/* Inline chat during play - fills remaining space */}
        {isPlaying && roomState.hand && (
          <div className="flex-1 flex flex-col min-h-0">
            <InlineChat
              messages={chatMessages}
              onSendMessage={sendChat}
              teamStates={roomState.hand.teamStates}
            />
          </div>
        )}

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="flex-shrink-0 bg-slate-900 border-t border-slate-700 safe-area-bottom">
        <div className="flex justify-around items-center py-2">
          <button
            onClick={() => setShowScore(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[10px]">Score</span>
          </button>

          <button
            onClick={() => setShowChat(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 hover:text-white transition-colors relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <span className="text-[10px]">Chat</span>
            {chatMessages.length > 0 && (
              <span className="absolute top-0 right-2 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                {Math.min(chatMessages.length, 9)}
              </span>
            )}
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 hover:text-white transition-colors"
          >
            {userBadges.equippedBadgeId ? (
              <EquippedBadgeDisplay />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            )}
            <span className="text-[10px]">Profile</span>
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="flex flex-col items-center gap-0.5 px-4 py-1 text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <span className="text-[10px]">Rules</span>
          </button>
        </div>
      </nav>

      {/* Score modal */}
      {showScore && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowScore(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Scoreboard roomState={roomState} />
            <button
              onClick={() => setShowScore(false)}
              className="btn btn-secondary w-full mt-3"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chat modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowChat(false)}>
          <div className="w-full sm:max-w-md sm:m-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
              <span className="font-semibold">Chat</span>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Chat messages={chatMessages} onSendMessage={sendChat} />
          </div>
        </div>
      )}

      {/* Modals */}
      {isRedealOffer && roomState.hand?.redealOfferedTo && (
        <RedealOffer
          offeredTo={roomState.hand.redealOfferedTo}
          mySeat={mySeat}
          onAccept={() => requestRedeal(true)}
          onDecline={() => requestRedeal(false)}
        />
      )}

      {(showHandEnd || isHandEnd || isGameEnd) && (
        <HandEndSummary
          results={handEndResults || []}
          winner={roomState.winner}
          winReason={roomState.winReason}
          onContinue={handleContinue}
        />
      )}

      {showRules && (
        <RulesScreen mode={roomState.mode} onClose={() => setShowRules(false)} />
      )}

      {/* Profile / Badges modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowProfile(false)}>
          <div className="w-full sm:max-w-md sm:m-4 bg-slate-800 rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <span className="font-semibold text-lg">Profile</span>
              <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 mobile-scroll">
              <BadgeShelf />
            </div>
          </div>
        </div>
      )}

      {/* Badge unlock modal */}
      <BadgeUnlockModal />

      {/* Connection status */}
      <ConnectionStatus connected={connected} connecting={connecting} />

      {/* Error toast */}
      {error && (
        <div className="fixed top-16 left-4 right-4 bg-red-600 text-white px-4 py-3 rounded-xl z-50 text-center shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
