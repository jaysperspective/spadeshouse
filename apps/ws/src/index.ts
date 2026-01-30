/**
 * Spades House Rules WebSocket Server
 *
 * This is the authoritative game server. All game logic runs here.
 * Clients send intents, server validates and broadcasts state.
 */

import { WebSocketServer, WebSocket } from 'ws';
import {
  ClientMessageSchema,
  type ClientMessage,
  type ServerMessage,
  type RoomState,
  type Seat,
  type Card,
  SEATS,
  generateRoomCode,
  generateToken,
  generateId,
  getTeam,
} from '@spades/shared';
import {
  gameReducer,
  createInitialRoomState,
  toPublicRoomState,
  getPlayerSeat,
  createPersistence,
  type SideEffect,
} from '@spades/engine';
import { calculateHandResults } from '@spades/rules';

const PORT = parseInt(process.env['WS_PORT'] || '3001', 10);

// In-memory state
const persistence = createPersistence();
const rooms = new Map<string, RoomState>();
const socketToPlayer = new Map<WebSocket, { playerId: string; roomCode: string; playerName: string }>();
const playerToSocket = new Map<string, WebSocket>();
const playerNames = new Map<string, string>(); // playerId -> name
const roomSockets = new Map<string, Set<WebSocket>>(); // Track all sockets in a room

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on ws://localhost:${PORT}`);

/**
 * Send a message to a specific socket.
 */
function send(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast a message to all sockets in a room.
 */
function broadcastToRoom(roomCode: string, message: ServerMessage): void {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return;

  for (const ws of sockets) {
    send(ws, message);
  }
}

/**
 * Send room state to all players (with private hands sent separately).
 */
function broadcastRoomState(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;

  const publicState = toPublicRoomState(room);
  broadcastToRoom(roomCode, { type: 'room:state', payload: publicState });
}

/**
 * Send private hands to each player.
 */
function sendPrivateHands(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room || !room.hand) return;

  for (const seat of SEATS) {
    const player = room.seats[seat].player;
    if (player) {
      const ws = playerToSocket.get(player.id);
      if (ws) {
        send(ws, {
          type: 'game:privateHand',
          payload: { hand: room.hand.hands[seat] },
        });
      }
    }
  }
}

/**
 * Send hand end results to all players.
 */
function sendHandEndResults(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (!room || !room.hand) return;

  const { results } = calculateHandResults(
    room.hand.teamStates,
    room.teamGameStates,
    room.hand.handIndex,
    room.mode
  );

  broadcastToRoom(roomCode, {
    type: 'game:handEnd',
    payload: { results },
  });
}

/**
 * Process side effects from reducer.
 */
function processSideEffects(roomCode: string, sideEffects: SideEffect[]): void {
  for (const effect of sideEffects) {
    switch (effect.type) {
      case 'BROADCAST_STATE':
        broadcastRoomState(roomCode);
        break;
      case 'SEND_PRIVATE_HANDS':
        sendPrivateHands(roomCode);
        break;
      case 'SEND_HAND_END_RESULTS':
        sendHandEndResults(roomCode);
        break;
      case 'GAME_OVER':
        console.log(`Game over in room ${roomCode}: ${effect.winner} wins (${effect.reason})`);
        break;
    }
  }
}

/**
 * Handle incoming messages from a client.
 */
function handleMessage(ws: WebSocket, message: ClientMessage): void {
  const playerInfo = socketToPlayer.get(ws);

  switch (message.type) {
    case 'room:create': {
      const code = generateRoomCode();
      const playerId = generateId();
      const reconnectToken = generateToken();

      const room = createInitialRoomState(
        code,
        message.payload.mode,
        message.payload.targetScore,
        playerId
      );

      rooms.set(code, room);
      socketToPlayer.set(ws, { playerId, roomCode: code, playerName: message.payload.playerName });
      playerToSocket.set(playerId, ws);
      playerNames.set(playerId, message.payload.playerName);

      // Track socket in room
      if (!roomSockets.has(code)) {
        roomSockets.set(code, new Set());
      }
      roomSockets.get(code)!.add(ws);

      send(ws, {
        type: 'room:created',
        payload: { code, playerId, reconnectToken },
      });

      // Send room state directly to creator (they're not seated yet)
      const publicState = toPublicRoomState(room);
      send(ws, { type: 'room:state', payload: publicState });
      break;
    }

    case 'room:join': {
      const room = rooms.get(message.payload.code);
      if (!room) {
        send(ws, {
          type: 'error',
          payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
        return;
      }

      // Track socket in room
      if (!roomSockets.has(room.code)) {
        roomSockets.set(room.code, new Set());
      }
      roomSockets.get(room.code)!.add(ws);

      // Check for reconnection
      if (message.payload.reconnectToken) {
        for (const seat of SEATS) {
          const player = room.seats[seat].player;
          if (player && player.reconnectToken === message.payload.reconnectToken) {
            // Reconnecting player
            player.connected = true;
            player.socketId = generateId();
            playerToSocket.set(player.id, ws);
            socketToPlayer.set(ws, { playerId: player.id, roomCode: room.code, playerName: player.name });
            playerNames.set(player.id, player.name);

            send(ws, {
              type: 'room:joined',
              payload: { playerId: player.id, reconnectToken: player.reconnectToken },
            });

            broadcastRoomState(room.code);

            // Send private hand if game is in progress
            if (room.hand && room.phase !== 'LOBBY') {
              send(ws, {
                type: 'game:privateHand',
                payload: { hand: room.hand.hands[seat] },
              });
            }
            return;
          }
        }
      }

      // New player joining
      const playerId = generateId();
      const reconnectToken = generateToken();

      socketToPlayer.set(ws, { playerId, roomCode: room.code, playerName: message.payload.playerName });
      playerToSocket.set(playerId, ws);
      playerNames.set(playerId, message.payload.playerName);

      send(ws, {
        type: 'room:joined',
        payload: { playerId, reconnectToken },
      });

      // Send room state directly to joining player (they're not seated yet)
      const publicState = toPublicRoomState(room);
      send(ws, { type: 'room:state', payload: publicState });
      break;
    }

    case 'seat:take': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) {
        send(ws, {
          type: 'error',
          payload: { code: 'ROOM_NOT_FOUND', message: 'Room not found' },
        });
        return;
      }

      // First apply the reducer action
      const { state: newState, result } = gameReducer(room, {
        type: 'TAKE_SEAT',
        playerId: playerInfo.playerId,
        seat: message.payload.seat,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'SEAT_ERROR', message: result.error || 'Failed to take seat' },
        });
        return;
      }

      // Now add the player object to the seat
      const seatState = newState.seats[message.payload.seat];
      const name = playerNames.get(playerInfo.playerId) || `Player ${message.payload.seat}`;
      seatState.player = {
        id: playerInfo.playerId,
        name,
        socketId: generateId(),
        reconnectToken: generateToken(),
        ready: false,
        connected: true,
      };

      rooms.set(playerInfo.roomCode, newState);

      // Send new reconnect token to player
      send(ws, {
        type: 'room:joined',
        payload: {
          playerId: playerInfo.playerId,
          reconnectToken: seatState.player.reconnectToken,
        },
      });

      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'seat:leave': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'LEAVE_SEAT',
        playerId: playerInfo.playerId,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'SEAT_ERROR', message: result.error || 'Failed to leave seat' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'seat:ready': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'SET_READY',
        playerId: playerInfo.playerId,
        ready: message.payload.ready,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'READY_ERROR', message: result.error || 'Failed to set ready' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'game:requestRedeal': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'REQUEST_REDEAL',
        playerId: playerInfo.playerId,
        accept: message.payload.accept,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'REDEAL_ERROR', message: result.error || 'Failed to request redeal' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'game:bid': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'SUBMIT_BID',
        playerId: playerInfo.playerId,
        bid: message.payload.bid,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'BID_ERROR', message: result.error || 'Failed to submit bid' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'game:play': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'PLAY_CARD',
        playerId: playerInfo.playerId,
        card: message.payload.card,
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'PLAY_ERROR', message: result.error || 'Illegal play' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'game:nextHand': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const { state: newState, result } = gameReducer(room, {
        type: 'NEXT_HAND',
      });

      if (!result.success) {
        send(ws, {
          type: 'error',
          payload: { code: 'NEXT_HAND_ERROR', message: result.error || 'Cannot start next hand' },
        });
        return;
      }

      rooms.set(playerInfo.roomCode, newState);
      processSideEffects(playerInfo.roomCode, result.sideEffects || []);
      break;
    }

    case 'chat:send': {
      if (!playerInfo) {
        send(ws, {
          type: 'error',
          payload: { code: 'NOT_IN_ROOM', message: 'Join a room first' },
        });
        return;
      }

      const room = rooms.get(playerInfo.roomCode);
      if (!room) return;

      const seat = getPlayerSeat(room, playerInfo.playerId);
      const player = seat ? room.seats[seat].player : null;

      broadcastToRoom(playerInfo.roomCode, {
        type: 'chat:msg',
        payload: {
          id: generateId(),
          playerId: playerInfo.playerId,
          playerName: player?.name || 'Unknown',
          seat,
          message: message.payload.message,
          timestamp: Date.now(),
        },
      });
      break;
    }

    case 'ping': {
      send(ws, { type: 'pong', payload: {} });
      break;
    }
  }
}

// Connection handling
wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', (data: Buffer) => {
    try {
      const parsed = JSON.parse(data.toString());
      const validated = ClientMessageSchema.safeParse(parsed);

      if (!validated.success) {
        send(ws, {
          type: 'error',
          payload: {
            code: 'INVALID_MESSAGE',
            message: `Invalid message format: ${validated.error.message}`,
          },
        });
        return;
      }

      handleMessage(ws, validated.data);
    } catch (err) {
      send(ws, {
        type: 'error',
        payload: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse message',
        },
      });
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');

    const playerInfo = socketToPlayer.get(ws);
    if (playerInfo) {
      // Remove from room sockets
      const sockets = roomSockets.get(playerInfo.roomCode);
      if (sockets) {
        sockets.delete(ws);
        if (sockets.size === 0) {
          roomSockets.delete(playerInfo.roomCode);
        }
      }

      const room = rooms.get(playerInfo.roomCode);
      if (room) {
        const { state: newState } = gameReducer(room, {
          type: 'PLAYER_DISCONNECT',
          playerId: playerInfo.playerId,
        });
        rooms.set(playerInfo.roomCode, newState);
        broadcastRoomState(playerInfo.roomCode);
      }

      playerToSocket.delete(playerInfo.playerId);
      socketToPlayer.delete(ws);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  wss.close(() => {
    process.exit(0);
  });
});
