/**
 * Zod schemas for all WebSocket messages.
 * Used for validation on both client and server.
 */

import { z } from 'zod';

// Card schema
export const CardSchema = z.object({
  suit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).nullable(),
  rank: z.enum([
    '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'J', 'Q', 'K', 'A',
    'LittleJoker', 'BigJoker'
  ]),
});

// Seat schema
export const SeatSchema = z.enum(['N', 'E', 'S', 'W']);

// Team schema
export const TeamSchema = z.enum(['NS', 'EW']);

// Game mode schema
export const GameModeSchema = z.enum(['aceHigh', 'threeJokers', 'straightStruggle']);

// Target score schema
export const TargetScoreSchema = z.union([z.literal(250), z.literal(500)]);

// Game phase schema
export const GamePhaseSchema = z.enum([
  'LOBBY', 'DEAL', 'REDEAL_OFFER', 'BIDDING', 'PLAYING', 'HAND_END', 'GAME_END'
]);

// ===== Client -> Server Messages =====

export const CreateRoomSchema = z.object({
  type: z.literal('room:create'),
  payload: z.object({
    mode: GameModeSchema,
    targetScore: TargetScoreSchema,
    playerName: z.string().min(1).max(20),
  }),
});

export const JoinRoomSchema = z.object({
  type: z.literal('room:join'),
  payload: z.object({
    code: z.string().length(6),
    playerName: z.string().min(1).max(20),
    reconnectToken: z.string().optional(),
  }),
});

export const TakeSeatSchema = z.object({
  type: z.literal('seat:take'),
  payload: z.object({
    seat: SeatSchema,
  }),
});

export const LeaveSeatSchema = z.object({
  type: z.literal('seat:leave'),
  payload: z.object({}),
});

export const AddCpuToSeatSchema = z.object({
  type: z.literal('seat:addCpu'),
  payload: z.object({
    seat: SeatSchema,
  }),
});

export const RemoveCpuFromSeatSchema = z.object({
  type: z.literal('seat:removeCpu'),
  payload: z.object({
    seat: SeatSchema,
  }),
});

export const SetReadySchema = z.object({
  type: z.literal('seat:ready'),
  payload: z.object({
    ready: z.boolean(),
  }),
});

export const RequestRedealSchema = z.object({
  type: z.literal('game:requestRedeal'),
  payload: z.object({
    accept: z.boolean(), // true = request redeal, false = decline
  }),
});

export const SubmitBidSchema = z.object({
  type: z.literal('game:bid'),
  payload: z.object({
    bid: z.number().int().min(0).max(13),
  }),
});

export const PlayCardSchema = z.object({
  type: z.literal('game:play'),
  payload: z.object({
    card: CardSchema,
  }),
});

export const SendChatSchema = z.object({
  type: z.literal('chat:send'),
  payload: z.object({
    message: z.string().min(1).max(500),
  }),
});

export const PingSchema = z.object({
  type: z.literal('ping'),
  payload: z.object({}),
});

export const NextHandSchema = z.object({
  type: z.literal('game:nextHand'),
  payload: z.object({}),
});

// Union of all client messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  CreateRoomSchema,
  JoinRoomSchema,
  TakeSeatSchema,
  LeaveSeatSchema,
  AddCpuToSeatSchema,
  RemoveCpuFromSeatSchema,
  SetReadySchema,
  RequestRedealSchema,
  SubmitBidSchema,
  PlayCardSchema,
  SendChatSchema,
  PingSchema,
  NextHandSchema,
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ===== Server -> Client Messages =====

// Played card in current book
export const PlayedCardSchema = z.object({
  seat: SeatSchema,
  card: CardSchema,
});

// Completed book
export const BookSchema = z.object({
  plays: z.array(PlayedCardSchema),
  leadSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).nullable(),
  winner: SeatSchema,
});

// Team hand state
export const TeamHandStateSchema = z.object({
  bid: z.number(),
  booksWon: z.number(),
});

// Team game state
export const TeamGameStateSchema = z.object({
  score: z.number(),
  setsCount: z.number(),
});

// Public seat state
export const PublicSeatStateSchema = z.object({
  seat: SeatSchema,
  playerId: z.string().nullable(),
  playerName: z.string().nullable(),
  ready: z.boolean(),
  connected: z.boolean(),
  isCPU: z.boolean(),
});

// Public hand state
export const PublicHandStateSchema = z.object({
  handIndex: z.number(),
  phase: GamePhaseSchema,
  dealerSeat: SeatSchema,
  currentTurn: SeatSchema.nullable(),
  bids: z.record(z.string(), z.number()),
  currentBook: z.array(PlayedCardSchema),
  leadSuit: z.enum(['spades', 'hearts', 'diamonds', 'clubs']).nullable(),
  completedBooks: z.array(BookSchema),
  teamStates: z.object({
    NS: TeamHandStateSchema,
    EW: TeamHandStateSchema,
  }),
  spadesBroken: z.boolean(),
  redealUsed: z.boolean(),
  redealOfferedTo: SeatSchema.nullable(),
  handSizes: z.object({
    N: z.number(),
    E: z.number(),
    S: z.number(),
    W: z.number(),
  }),
});

// Public room state
export const PublicRoomStateSchema = z.object({
  code: z.string(),
  mode: GameModeSchema,
  targetScore: TargetScoreSchema,
  phase: GamePhaseSchema,
  hostPlayerId: z.string(),
  seats: z.object({
    N: PublicSeatStateSchema,
    E: PublicSeatStateSchema,
    S: PublicSeatStateSchema,
    W: PublicSeatStateSchema,
  }),
  teamGameStates: z.object({
    NS: TeamGameStateSchema,
    EW: TeamGameStateSchema,
  }),
  hand: PublicHandStateSchema.nullable(),
  winner: TeamSchema.nullable(),
  winReason: z.enum(['score', 'firstHandDime', 'threeSetLoss']).nullable(),
  gameRedealUsed: z.boolean(),
});

// Hand end result
export const HandEndResultSchema = z.object({
  team: TeamSchema,
  bid: z.number(),
  booksWon: z.number(),
  overbooks: z.number(),
  isSet: z.boolean(),
  isDime: z.boolean(),
  pointsEarned: z.number(),
  newScore: z.number(),
  setsCount: z.number(),
});

// Chat message
export const ChatMessageSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  seat: SeatSchema.nullable(),
  message: z.string(),
  timestamp: z.number(),
});

// Server messages

export const RoomCreatedSchema = z.object({
  type: z.literal('room:created'),
  payload: z.object({
    code: z.string(),
    playerId: z.string(),
    reconnectToken: z.string(),
  }),
});

export const RoomJoinedSchema = z.object({
  type: z.literal('room:joined'),
  payload: z.object({
    playerId: z.string(),
    reconnectToken: z.string(),
  }),
});

export const RoomStateSchema = z.object({
  type: z.literal('room:state'),
  payload: PublicRoomStateSchema,
});

export const PrivateHandSchema = z.object({
  type: z.literal('game:privateHand'),
  payload: z.object({
    hand: z.array(CardSchema),
  }),
});

export const HandEndSchema = z.object({
  type: z.literal('game:handEnd'),
  payload: z.object({
    results: z.array(HandEndResultSchema),
  }),
});

export const ErrorSchema = z.object({
  type: z.literal('error'),
  payload: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const ChatMsgSchema = z.object({
  type: z.literal('chat:msg'),
  payload: ChatMessageSchema,
});

export const PongSchema = z.object({
  type: z.literal('pong'),
  payload: z.object({}),
});

// Union of all server messages
export const ServerMessageSchema = z.discriminatedUnion('type', [
  RoomCreatedSchema,
  RoomJoinedSchema,
  RoomStateSchema,
  PrivateHandSchema,
  HandEndSchema,
  ErrorSchema,
  ChatMsgSchema,
  PongSchema,
]);

export type ServerMessage = z.infer<typeof ServerMessageSchema>;

// Export payload types
export type CreateRoomPayload = z.infer<typeof CreateRoomSchema>['payload'];
export type JoinRoomPayload = z.infer<typeof JoinRoomSchema>['payload'];
export type TakeSeatPayload = z.infer<typeof TakeSeatSchema>['payload'];
export type SetReadyPayload = z.infer<typeof SetReadySchema>['payload'];
export type RequestRedealPayload = z.infer<typeof RequestRedealSchema>['payload'];
export type SubmitBidPayload = z.infer<typeof SubmitBidSchema>['payload'];
export type PlayCardPayload = z.infer<typeof PlayCardSchema>['payload'];
export type SendChatPayload = z.infer<typeof SendChatSchema>['payload'];
