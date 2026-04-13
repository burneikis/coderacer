# CodeRacer — Build Plan

## Stack
- **Server**: Node.js + `ws` (WebSocket) — in-memory game state, no database
- **Client**: Vite + React + TypeScript — dark code-editor aesthetic
- **Runner**: `concurrently` to start both from root

---

## Project Structure

```
coderacer/
├── package.json               # root — runs both with concurrently
├── plan.md
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   └── index.ts           # WebSocket server + game state
│   └── snippets/              # .ts files used as race text
│       ├── debounce.ts
│       ├── binarySearch.ts
│       ├── fetchRetry.ts
│       └── groupBy.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx             # WS connection, state, routing between phases
        ├── types.ts            # Shared types (GameState, Player)
        ├── index.css
        └── components/
            ├── Lobby.tsx       # Waiting room — player list, host Start button
            ├── Race.tsx        # Countdown overlay + typing engine + progress bars
            └── Results.tsx     # Finish order, WPM, host Restart button
```

---

## Game State (server, in memory)

```ts
type Phase = 'waiting' | 'countdown' | 'racing' | 'finished'

interface Player {
  id: string
  name: string
  progress: number   // 0–100
  wpm: number
  finished: boolean
  place?: number     // finish order
}

interface GameState {
  phase: Phase
  snippet: string
  snippetName: string
  players: Player[]
  startTime?: number
  countdown?: number  // 3, 2, 1
  hostId: string | null
}
```

---

## Phase Flow

```
'waiting' → 'countdown' (3…2…1) → 'racing' → 'finished'
                                                    ↓
                                             host can restart
                                                    ↓
                                              'waiting'
```

- **waiting**: players join, enter name, host sees Start button
- **countdown**: 1-second ticks broadcast from server (3, 2, 1), no typing yet
- **racing**: typing active, progress broadcast on each keystroke
- **finished**: triggered when all players finish (or host can force-end)

---

## WebSocket Messages

### Client → Server
| type | payload | description |
|------|---------|-------------|
| `join` | `{ name }` | player enters their name |
| `start` | — | host starts the race (ignored if not host) |
| `progress` | `{ progress, wpm }` | sent on each correct keystroke |
| `finished` | `{ wpm }` | player completed the snippet |
| `restart` | — | host resets to waiting (ignored if not host) |

### Server → Client
| type | payload | description |
|------|---------|-------------|
| `init` | `{ id, state }` | sent on connect, gives client their ID |
| `state` | `{ state }` | full state broadcast after every change |

The client determines `isHost` by comparing their `id` to `state.hostId`.

---

## Snippets

- Stored as real `.ts` files in `server/snippets/`
- Server reads all `.ts` files on startup
- Tabs normalised to 2 spaces, trailing whitespace trimmed
- One snippet picked at random when host starts each race
- To add more snippets: drop a `.ts` file in the folder and restart the server

---

## Typing Engine (client)

- **Character-by-character** comparison against the snippet string
- **Block-on-error**: wrong key highlights current character red, no progress until backspaced
- **Newlines** (`\n`) typed with Enter key
- **Tabs** already normalised to spaces server-side — no Tab key needed
- WPM = `(charsTyped / 5) / minutesElapsed` (recalculated on each keystroke)
- Progress = `charsTyped / snippet.length * 100`
- On completing last character → send `finished` event

---

## UI / Styling

- Dark background (`#0f0f14`), monospace font (`JetBrains Mono` or fallback)
- Snippet display:
  - **Untyped**: muted gray
  - **Correctly typed**: green
  - **Error (current char)**: red background
  - **Cursor**: blinking underline on current character
- Progress bars: one row per player, showing name / bar / WPM / place badge
- Player's own row highlighted differently from others

---

## Considerations

- **Host disconnects**: next player in list becomes host automatically
- **Player disconnects mid-race**: removed from state, doesn't block `finished` phase
- **All players finish**: server sets phase to `finished` automatically
- **No reconnection handling**: if you close the tab you re-join as a new player (acceptable for one-off use)
- **Local network use**: client connects to `ws://[host-machine-ip]:3001` — document this clearly in README
