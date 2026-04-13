# CodeRacer

Multiplayer typing race using real TypeScript code snippets.

## Quick Start

```bash
npm run setup   # install all dependencies (root + server + client)
npm run dev     # start server (ws :3001) + client (http :5173)
```

Open http://localhost:5173 in your browser.

## Local Network (multiplayer)

Other players on the same network connect to:
```
http://<your-machine-ip>:5173
```

The client automatically connects to `ws://<host>:3001`, so as long as port 3001 is reachable everything works.

## Adding Snippets

Drop any `.ts` file into `server/snippets/` and restart the server. It will be picked at random during races.

## Game Flow

1. Players open the URL and enter a name to join the lobby
2. The first player to join is the **host** — they see the **Start Race** button
3. A 3-second countdown broadcasts to all players
4. Type the displayed code snippet character-by-character
   - Correct characters turn **green**
   - Wrong key highlights current char **red** — backspace to fix before continuing
   - Press **Enter** for newlines
5. Finish order and WPM are shown on the results screen
6. Host can press **Play Again** to return to the lobby with all players intact
