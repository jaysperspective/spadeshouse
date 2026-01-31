'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Seat } from '@spades/shared';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function Chat({ messages, onSendMessage }: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[50vh] sm:h-64">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 mobile-scroll">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            No messages yet
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="font-semibold text-blue-400">
              {msg.seat ? `[${msg.seat}] ` : ''}
              {msg.playerName}:
            </span>{' '}
            <span className="text-slate-300">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="input flex-1 text-base"
            maxLength={500}
          />
          <button type="submit" className="btn btn-primary">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

// Compact inline chat for during gameplay
interface InlineChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  teamStates?: {
    NS: { bid: number; booksWon: number };
    EW: { bid: number; booksWon: number };
  };
}

export function InlineChat({ messages, onSendMessage, teamStates }: InlineChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const getTeamColor = (seat: Seat | null | undefined): string => {
    if (!seat) return 'text-slate-400';
    return seat === 'N' || seat === 'S' ? 'text-green-400' : 'text-blue-400';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border-t border-slate-700">
      {/* Header with score */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-slate-700/50 flex justify-between items-center">
        <span className="text-[10px] sm:text-xs text-slate-400 font-medium">💬 Chat</span>
        {teamStates && (
          <div className="flex gap-3 text-[10px] sm:text-xs">
            <span className="text-green-400">NS: {teamStates.NS.booksWon}/{teamStates.NS.bid}</span>
            <span className="text-blue-400">EW: {teamStates.EW.booksWon}/{teamStates.EW.bid}</span>
          </div>
        )}
      </div>

      {/* Messages - scrollable */}
      <div
        className="flex-1 overflow-y-auto px-2 py-1.5 space-y-0.5 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-600 text-[10px] sm:text-xs py-2">
            Send a message to your teammates!
          </div>
        ) : (
          messages.slice(-20).map((msg) => (
            <div key={msg.id} className="text-[10px] sm:text-xs leading-relaxed">
              <span className={`font-medium ${getTeamColor(msg.seat)}`}>
                {msg.playerName}:
              </span>{' '}
              <span className="text-slate-300">{msg.message}</span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - with safe area padding */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 px-2 py-1.5 border-t border-slate-700/50"
        style={{ paddingBottom: 'calc(0.375rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="input flex-1 text-sm py-1.5 px-2"
            maxLength={200}
          />
          <button
            type="submit"
            className="btn btn-primary text-xs px-3 py-1.5"
            disabled={!input.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
