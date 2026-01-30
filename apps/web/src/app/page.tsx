'use client';

import { useState, useEffect } from 'react';
import { useGameStore, useMySeat, useIsMyTurn, useMyTeam } from '@/store/game-store';
import { useBadgeStore } from '@/store/badge-store';
import { useWebSocket } from '@/hooks/use-websocket';
import { Lobby } from '@/components/Lobby';
import { GameTable } from '@/components/GameTable';
import { PlayerHand } from '@/components/PlayerHand';
import { BiddingPanel } from '@/components/BiddingPanel';
import { Chat } from '@/components/Chat';
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
  } = useWebSocket();

  const mySeat = useMySeat();
  const isMyTurn = useIsMyTurn();
  const myTeam = useMyTeam();

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
  const isLobby = roomState.phase === 'LOBBY';

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col no-select">
      {/* Header - compact on mobile */}
      <header className="flex-shrink-0 flex justify-between items-center px-3 py-2 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Spades</h1>
          {mySeat && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${myTeam === 'NS' ? 'bg-green-600' : 'bg-blue-600'}`}>
              {mySeat} ({myTeam})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScore(true)}
            className="btn btn-sm btn-secondary"
          >
            Score
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="btn btn-sm btn-secondary flex items-center gap-1"
          >
            {userBadges.equippedBadgeId && (
              <EquippedBadgeDisplay />
            )}
            Profile
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="btn btn-sm btn-secondary"
          >
            Rules
          </button>
        </div>
      </header>

      {/* Main game area - fills available space */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Game table */}
        <div className="flex-shrink-0">
          <GameTable
            roomState={roomState}
            mySeat={mySeat}
            onTakeSeat={takeSeat}
            onLeaveSeat={leaveSeat}
            onReady={setReady}
          />
        </div>

        {/* Bidding panel */}
        {isBidding && mySeat && roomState.hand && (
          <div className="flex-shrink-0 px-3 py-2">
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
          <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
            <div className="px-3 py-1 text-xs text-slate-400">
              Your Hand ({hand.length})
            </div>
            <div className="card-fan hide-scrollbar pb-2">
              {hand.map((card, i) => (
                <Card
                  key={`${card.rank}-${card.suit}-${i}`}
                  card={card}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        {/* Player's hand - during play */}
        {hand && mySeat && isPlaying && (
          <div className="flex-shrink-0 bg-slate-800/90 backdrop-blur-sm border-t border-slate-700">
            <div className="px-3 py-1 flex justify-between items-center">
              <span className="text-xs text-slate-400">Your Hand ({hand.length})</span>
              {isMyTurn && (
                <span className="text-xs text-yellow-400 animate-pulse font-medium">
                  Tap card twice to play
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

        {/* Chat toggle button - fixed at bottom right during lobby */}
        {isLobby && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-4 right-4 btn btn-primary rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </button>
        )}
      </main>

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
