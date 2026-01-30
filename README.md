# Spades House Rules

A complete, local-first Spades card game with custom house rules. Built with Next.js for the UI and Node WebSocket server for authoritative multiplayer gameplay.

## Features

- **Three Game Modes**: Ace High, Three Jokers, and Straight Struggle
- **Book Terminology**: Uses "Book" instead of "trick" throughout
- **Full House Rules**: Including Dime bonus, Set limits, Board minimum, and redeals
- **Authoritative Server**: All game logic validated server-side
- **Reconnection Support**: Rejoin games after disconnection
- **Real-time Chat**: In-game chat for all players

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Clone and enter the directory
cd spades-house-rules

# Install dependencies
npm install

# Start both servers (web + ws)
npm run dev
```

### Playing

1. Open `http://localhost:3000` in 4 browser tabs/windows
2. In the first tab, create a room (choose mode and target score)
3. Copy the 6-letter room code
4. In the other 3 tabs, join using the room code
5. Each player takes a seat (N, E, S, or W)
6. All players click "Ready Up"
7. The game starts automatically when all 4 are ready

## Project Structure

```
spades-house-rules/
├── apps/
│   ├── web/           # Next.js 14 app (React UI)
│   └── ws/            # WebSocket server (Node + ws)
├── packages/
│   ├── rules/         # Pure rules logic (no I/O)
│   ├── engine/        # Game state machine
│   └── shared/        # Types, schemas, helpers
└── package.json       # Workspace root
```

## Game Modes

### Ace High (Classic House Style)
- Standard 52-card deck
- Ace is highest rank
- Spades cannot be led until broken
- 3 Sets = automatic loss
- Dime bonus enabled
- Redeal allowed

### Three Jokers
- Modified deck: +2 Jokers, -2♦, -2♥
- Trump order: Big Joker > Little Joker > 2♠ > A♠ > K♠ > ...
- Spades cannot be led until broken
- 3 Sets = automatic loss
- Dime bonus enabled
- Redeal allowed

### Straight Struggle
- Standard 52-card deck
- Spades may be led at any time
- No Set limit
- No Dime bonus
- No redeals

## House Rules Summary

### Terminology
- **Book**: What other games call a "trick"
- **Board**: Minimum team bid of 4 Books
- **Dime**: Winning exactly 10 Books (bonus points)
- **Set**: Failing to make bid OR winning 4+ Books over bid

### Scoring
- Each Book = 10 points
- Making bid = Books Won × 10
- Dime (exactly 10 Books) = 110 points
- Exactly +3 over bid = 0 points (not a Set)
- +4 or more over bid = Set
- Set penalty = -(Bid × 10)

### Special Rules
- First-hand Dime = instant win
- 3 Sets = automatic loss (Ace High/Three Jokers only)
- One redeal per game if dealt zero spades

## Learning Mode & Badges

### Learning Mode
New players can complete a guided learning path to understand the fundamentals of Spades:

1. **Fundamentals** - Books, following suit, trump cards
2. **Bidding Basics** - How to bid on Books
3. **Nil & Blind Nil** - High-risk bidding strategies
4. **Light Strategy** - Basic strategic awareness

Access Learning Mode from the Lobby via the "Learn to Play" button.

### Badge System
Players can earn badges for achievements. Currently available:

**The Kitchen Table Badge: Culture Certified**
- Awarded for completing all Learning Mode lessons
- Can be equipped/unequipped from your Profile
- Displayed next to your name at the table

### Testing Badge Unlock (Development)
In development mode, you can instantly complete all lessons:

1. Open the app and click "Learn to Play"
2. At the bottom of the Learning Mode screen, click "[Dev] Complete all lessons instantly"
3. The badge unlock modal will appear
4. Click "Equip Badge" to display it next to your name

Alternatively, use the browser console:
```javascript
// Access the badge store and complete all lessons
window.__BADGE_STORE?.getState().completeAllLessons()
```

Badge data is persisted in localStorage under `spades-badge-storage`.

## Development

### Running Tests

```bash
npm test
```

### Running in Development

```bash
# Both servers
npm run dev

# Web only
npm run dev:web

# WS only
npm run dev:ws
```

### Building

```bash
npm run build
```

## Deployment Notes

### Moving to Production

1. **Environment Variables**
   ```bash
   # .env for ws server
   WS_PORT=3001

   # .env.local for Next.js
   NEXT_PUBLIC_WS_URL=wss://your-domain.com
   ```

2. **WebSocket Server**
   - Deploy the `apps/ws` directory as a Node.js service
   - Use a process manager like PM2
   - Configure SSL/TLS for WSS (required for HTTPS sites)

   ```bash
   cd apps/ws
   npm run build
   node dist/index.js
   ```

3. **Web App**
   - Deploy `apps/web` to Vercel, Netlify, or any Next.js host
   - Set `NEXT_PUBLIC_WS_URL` to your WSS endpoint

   ```bash
   cd apps/web
   npm run build
   npm run start
   ```

4. **SSL/TLS for WebSockets**
   - Use a reverse proxy (nginx, Caddy) with SSL termination
   - Or use Cloudflare Tunnels
   - Example nginx config:

   ```nginx
   location /ws {
       proxy_pass http://localhost:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
   }
   ```

5. **Persistence**
   - Current: In-memory (data lost on restart)
   - To add database: implement `PersistenceAdapter` interface in `packages/engine/src/persistence.ts`
   - Recommended: PostgreSQL with Prisma or Drizzle

### Capacitor (iOS/Android)

1. Install Capacitor in the web app:
   ```bash
   cd apps/web
   npm install @capacitor/core @capacitor/cli
   npx cap init
   ```

2. Add platforms:
   ```bash
   npx cap add ios
   npx cap add android
   ```

3. Build and sync:
   ```bash
   npm run build
   npx cap sync
   ```

4. Update WebSocket URL for production in the app config.

## API Reference

### Client → Server Messages

| Type | Payload | Description |
|------|---------|-------------|
| `room:create` | `{mode, targetScore, playerName}` | Create a new room |
| `room:join` | `{code, playerName, reconnectToken?}` | Join existing room |
| `seat:take` | `{seat}` | Take a seat (N/E/S/W) |
| `seat:ready` | `{ready}` | Toggle ready status |
| `game:requestRedeal` | `{accept}` | Accept/decline redeal |
| `game:bid` | `{bid}` | Submit bid (0-13) |
| `game:play` | `{card}` | Play a card |
| `chat:send` | `{message}` | Send chat message |

### Server → Client Messages

| Type | Payload | Description |
|------|---------|-------------|
| `room:created` | `{code, playerId, reconnectToken}` | Room created |
| `room:joined` | `{playerId, reconnectToken}` | Joined room |
| `room:state` | `PublicRoomState` | Full room state update |
| `game:privateHand` | `{hand}` | Your cards (private) |
| `game:handEnd` | `{results}` | Hand scoring results |
| `chat:msg` | `ChatMessage` | Chat message received |
| `error` | `{code, message}` | Error occurred |

## License

MIT
