'use client';

interface ConnectionStatusProps {
  connected: boolean;
  connecting: boolean;
}

export function ConnectionStatus({ connected, connecting }: ConnectionStatusProps) {
  // Only show when not connected (less intrusive on mobile)
  if (connected) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div
        className={`px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 ${
          connecting
            ? 'bg-yellow-600/90 text-yellow-100'
            : 'bg-red-600/90 text-red-100'
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            connecting ? 'bg-yellow-200 animate-pulse' : 'bg-red-200'
          }`}
        />
        {connecting ? 'Connecting...' : 'Disconnected - Reconnecting...'}
      </div>
    </div>
  );
}
