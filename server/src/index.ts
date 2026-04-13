import { WebSocketServer, WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'waiting' | 'countdown' | 'racing' | 'finished';

interface Player {
  id: string;
  name: string;
  progress: number;
  wpm: number;
  finished: boolean;
  place?: number;
}

interface GameState {
  phase: Phase;
  snippet: string;
  snippetName: string;
  players: Player[];
  startTime?: number;
  countdown?: number;
  hostId: string | null;
}

// ── Snippets ───────────────────────────────────────────────────────────────

const snippetsDir = path.join(__dirname, '..', 'snippets');

interface Snippet {
  name: string;
  content: string;
}

function loadSnippets(): Snippet[] {
  const files = fs.readdirSync(snippetsDir).filter((f) => f.endsWith('.ts'));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(snippetsDir, file), 'utf-8');
    const content = raw
      .split('\n')
      .map((line) => line.replace(/\t/g, '  ').trimEnd())
      .join('\n')
      .trimEnd();
    return { name: file, content };
  });
}

const snippets = loadSnippets();

function pickSnippet(): Snippet {
  return snippets[Math.floor(Math.random() * snippets.length)];
}

// ── State ──────────────────────────────────────────────────────────────────

const clients = new Map<string, WebSocket>();

const state: GameState = {
  phase: 'waiting',
  snippet: '',
  snippetName: '',
  players: [],
  hostId: null,
};

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function broadcastState() {
  broadcast({ type: 'state', state });
}

function sendTo(id: string, msg: object) {
  const ws = clients.get(id);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function removePlayer(id: string) {
  state.players = state.players.filter((p) => p.id !== id);
  clients.delete(id);

  // Reassign host if needed
  if (state.hostId === id) {
    state.hostId = state.players[0]?.id ?? null;
  }

  // If mid-race, check if everyone remaining has finished
  if (state.phase === 'racing') {
    checkAllFinished();
  }

  broadcastState();
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;

function checkAllFinished() {
  if (
    state.players.length > 0 &&
    state.players.every((p) => p.finished)
  ) {
    state.phase = 'finished';
  }
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  state.phase = 'countdown';
  state.countdown = 3;

  const snippet = pickSnippet();
  state.snippet = snippet.content;
  state.snippetName = snippet.name;

  // Reset player progress
  for (const p of state.players) {
    p.progress = 0;
    p.wpm = 0;
    p.finished = false;
    p.place = undefined;
  }

  broadcastState();

  countdownTimer = setInterval(() => {
    if (state.countdown !== undefined && state.countdown > 1) {
      state.countdown--;
      broadcastState();
    } else {
      clearInterval(countdownTimer!);
      countdownTimer = null;
      state.phase = 'racing';
      state.countdown = undefined;
      state.startTime = Date.now();
      broadcastState();
    }
  }, 1000);
}

// ── Server ─────────────────────────────────────────────────────────────────

const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  const id = crypto.randomUUID();
  clients.set(id, ws);

  // Send init
  sendTo(id, { type: 'init', id, state });

  ws.on('message', (raw) => {
    let msg: { type: string; [k: string]: unknown };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const { type } = msg;

    if (type === 'join') {
      const name = String(msg.name ?? 'Anonymous').trim().slice(0, 24) || 'Anonymous';
      const player: Player = {
        id,
        name,
        progress: 0,
        wpm: 0,
        finished: false,
      };
      state.players.push(player);
      if (!state.hostId) state.hostId = id;
      broadcastState();
    } else if (type === 'start') {
      if (id !== state.hostId) return;
      if (state.phase !== 'waiting') return;
      startCountdown();
    } else if (type === 'progress') {
      if (state.phase !== 'racing') return;
      const player = state.players.find((p) => p.id === id);
      if (!player) return;
      player.progress = Number(msg.progress) || 0;
      player.wpm = Number(msg.wpm) || 0;
      broadcastState();
    } else if (type === 'finished') {
      if (state.phase !== 'racing') return;
      const player = state.players.find((p) => p.id === id);
      if (!player || player.finished) return;
      player.finished = true;
      player.wpm = Number(msg.wpm) || 0;
      player.progress = 100;
      const finishedCount = state.players.filter((p) => p.finished).length;
      player.place = finishedCount;
      checkAllFinished();
      broadcastState();
    } else if (type === 'restart') {
      if (id !== state.hostId) return;
      if (state.phase !== 'finished') return;
      if (countdownTimer) clearInterval(countdownTimer);
      state.phase = 'waiting';
      state.snippet = '';
      state.snippetName = '';
      state.countdown = undefined;
      state.startTime = undefined;
      for (const p of state.players) {
        p.progress = 0;
        p.wpm = 0;
        p.finished = false;
        p.place = undefined;
      }
      broadcastState();
    }
  });

  ws.on('close', () => {
    removePlayer(id);
  });
});

console.log(`CodeRacer server running on ws://localhost:${PORT}`);
