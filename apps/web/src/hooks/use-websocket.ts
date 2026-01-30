'use client';

import { useEffect, useRef, useCallback } from 'react';
import type {
  ClientMessage,
  ServerMessage,
  GameMode,
  TargetScore,
  Seat,
  Card,
} from '@spades/shared';
import { ServerMessageSchema } from '@spades/shared';
import { useGameStore } from '@/store/game-store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setConnected,
    setConnecting,
    setError,
    setPlayerId,
    setReconnectToken,
    setRoomState,
    setHand,
    addChatMessage,
    setHandEndResults,
    reconnectToken,
  } = useGameStore();

  // Send message helper
  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const result = ServerMessageSchema.safeParse(data);

        if (!result.success) {
          console.error('Invalid server message:', result.error);
          return;
        }

        const message = result.data as ServerMessage;

        switch (message.type) {
          case 'room:created':
            setPlayerId(message.payload.playerId);
            setReconnectToken(message.payload.reconnectToken);
            break;

          case 'room:joined':
            setPlayerId(message.payload.playerId);
            setReconnectToken(message.payload.reconnectToken);
            break;

          case 'room:state':
            setRoomState(message.payload);
            break;

          case 'game:privateHand':
            setHand(message.payload.hand);
            break;

          case 'game:handEnd':
            setHandEndResults(message.payload.results);
            break;

          case 'chat:msg':
            addChatMessage(message.payload);
            break;

          case 'error':
            setError(message.payload.message);
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
            break;

          case 'pong':
            // Heartbeat response
            break;
        }
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    },
    [setPlayerId, setReconnectToken, setRoomState, setHand, addChatMessage, setHandEndResults, setError]
  );

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnecting(true);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);

      // Attempt reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('Connection error');
    };
  }, [setConnected, setConnecting, setError, handleMessage]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, [setConnected]);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    // Heartbeat
    const heartbeat = setInterval(() => {
      send({ type: 'ping', payload: {} });
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      disconnect();
    };
  }, [connect, disconnect, send]);

  // Game actions
  const createRoom = useCallback(
    (mode: GameMode, targetScore: TargetScore, playerName: string) => {
      // Clear old player ID when creating a new room
      setPlayerId(null);
      send({
        type: 'room:create',
        payload: { mode, targetScore, playerName },
      });
    },
    [send, setPlayerId]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      // Clear old player ID when joining a new room to avoid conflicts
      // (e.g., when testing with multiple tabs in same browser)
      setPlayerId(null);
      send({
        type: 'room:join',
        payload: { code, playerName, reconnectToken: reconnectToken || undefined },
      });
    },
    [send, reconnectToken, setPlayerId]
  );

  const takeSeat = useCallback(
    (seat: Seat) => {
      send({
        type: 'seat:take',
        payload: { seat },
      });
    },
    [send]
  );

  const leaveSeat = useCallback(() => {
    send({
      type: 'seat:leave',
      payload: {},
    });
  }, [send]);

  const setReady = useCallback(
    (ready: boolean) => {
      send({
        type: 'seat:ready',
        payload: { ready },
      });
    },
    [send]
  );

  const requestRedeal = useCallback(
    (accept: boolean) => {
      send({
        type: 'game:requestRedeal',
        payload: { accept },
      });
    },
    [send]
  );

  const submitBid = useCallback(
    (bid: number) => {
      send({
        type: 'game:bid',
        payload: { bid },
      });
    },
    [send]
  );

  const playCard = useCallback(
    (card: Card) => {
      send({
        type: 'game:play',
        payload: { card },
      });
    },
    [send]
  );

  const sendChat = useCallback(
    (message: string) => {
      send({
        type: 'chat:send',
        payload: { message },
      });
    },
    [send]
  );

  const nextHand = useCallback(() => {
    send({
      type: 'game:nextHand',
      payload: {},
    });
  }, [send]);

  return {
    connect,
    disconnect,
    createRoom,
    joinRoom,
    takeSeat,
    leaveSeat,
    setReady,
    requestRedeal,
    submitBid,
    playCard,
    nextHand,
    sendChat,
  };
}
