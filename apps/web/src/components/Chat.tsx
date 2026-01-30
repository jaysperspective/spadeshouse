'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@spades/shared';

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
