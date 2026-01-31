'use client';

import type { Seat, PublicRoomState } from '@spades/shared';
import { useBadgeStore } from '@/store/badge-store';
import { BadgeIcon } from './badges';

interface SeatDisplayProps {
  seat: Seat;
  roomState: PublicRoomState;
  isCurrentTurn: boolean;
  isMySeat: boolean;
  isHost?: boolean;
  onTakeSeat?: () => void;
  onLeaveSeat?: () => void;
  onReady?: (ready: boolean) => void;
  onAddCpu?: () => void;
  onRemoveCpu?: () => void;
}

const SEAT_LABELS: Record<Seat, string> = {
  N: 'North',
  E: 'East',
  S: 'South',
  W: 'West',
};

const TEAM_LABELS: Record<Seat, string> = {
  N: 'NS',
  S: 'NS',
  E: 'EW',
  W: 'EW',
};

export function SeatDisplay({
  seat,
  roomState,
  isCurrentTurn,
  isMySeat,
  isHost = false,
  onTakeSeat,
  onLeaveSeat,
  onReady,
  onAddCpu,
  onRemoveCpu,
}: SeatDisplayProps) {
  const seatState = roomState.seats[seat];
  const isOccupied = seatState.playerId !== null;
  const isCPU = seatState.isCPU;
  const isInLobby = roomState.phase === 'LOBBY';

  // Get bid for this seat
  const bid = roomState.hand?.bids[seat];

  // Get equipped badge (only shown for current player's seat for now)
  // Note: To show other players' badges, we'd need to sync badge data via WebSocket
  const { userBadges } = useBadgeStore();
  const equippedBadgeId = isMySeat ? userBadges.equippedBadgeId : null;

  return (
    <div
      className={`
        px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg bg-slate-800/90 backdrop-blur-sm text-center
        min-w-[60px] sm:min-w-[80px]
        ${isCurrentTurn ? 'current-turn border-2 border-yellow-400' : 'border border-slate-600'}
        ${isMySeat ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      {isOccupied ? (
        <>
          <div className="flex items-center justify-center gap-1">
            {isCPU && <span className="text-[10px] text-purple-400">🤖</span>}
            <span className="font-semibold text-white text-xs sm:text-sm truncate max-w-[60px] sm:max-w-[80px]">
              {seatState.playerName || SEAT_LABELS[seat]}
            </span>
            {equippedBadgeId && (
              <BadgeIcon badgeId={equippedBadgeId} size="xs" />
            )}
          </div>
          <div className="text-[10px] sm:text-xs text-slate-400">
            {TEAM_LABELS[seat]}
            {!seatState.connected && !isCPU && <span className="text-red-400 ml-1">(DC)</span>}
          </div>

          {isInLobby && (
            <>
              {isCPU ? (
                // CPU player controls
                <>
                  <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-green-400">
                    Ready
                  </div>
                  {isHost && onRemoveCpu && (
                    <button
                      onClick={onRemoveCpu}
                      className="btn btn-danger text-[10px] sm:text-xs px-2 py-1.5 mt-1 w-full"
                    >
                      Remove
                    </button>
                  )}
                </>
              ) : (
                // Human player controls
                <>
                  <div
                    className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${seatState.ready ? 'text-green-400' : 'text-yellow-400'}`}
                  >
                    {seatState.ready ? 'Ready' : 'Not Ready'}
                  </div>
                  {isMySeat && onReady && (
                    <div className="flex gap-1 mt-1">
                      <button
                        onClick={() => onReady(!seatState.ready)}
                        className={`btn text-[10px] sm:text-xs px-2 py-1.5 flex-1 ${seatState.ready ? 'btn-secondary' : 'btn-success'}`}
                      >
                        {seatState.ready ? 'Unready' : 'Ready'}
                      </button>
                      {onLeaveSeat && !seatState.ready && (
                        <button
                          onClick={onLeaveSeat}
                          className="btn btn-danger text-[10px] sm:text-xs px-2 py-1.5"
                          title="Stand up from seat"
                        >
                          Stand
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Show bid if submitted */}
          {bid !== undefined && (
            <div className="mt-0.5 sm:mt-1 text-xs sm:text-sm">
              <span className="text-slate-400">Bid: </span>
              <span className="font-bold text-white">{bid}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-[10px] sm:text-xs text-slate-400">{SEAT_LABELS[seat]}</div>
          <div className="text-slate-500 text-xs sm:text-sm">Empty</div>
          {isInLobby && (
            <div className="flex flex-col gap-1 mt-1">
              {onTakeSeat && (
                <button
                  onClick={onTakeSeat}
                  className="btn btn-primary text-[10px] sm:text-xs px-3 py-1.5 w-full"
                >
                  Sit
                </button>
              )}
              {isHost && onAddCpu && (
                <button
                  onClick={onAddCpu}
                  className="btn btn-secondary text-[10px] sm:text-xs px-2 py-1 w-full"
                  title="Add CPU player"
                >
                  + CPU
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
