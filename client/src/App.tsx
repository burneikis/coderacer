import { useEffect, useRef, useState } from 'react';
import { GameState } from './types';
import Lobby from './components/Lobby';
import Race from './components/Race';
import Results from './components/Results';

const WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:3001`;

export default function App() {
  const [myId, setMyId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [joined, setJoined] = useState(false);
  const [isJaysean, setIsJaysean] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    let intentionalClose = false;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'init') {
        setMyId(msg.id);
        setState(msg.state);
      } else if (msg.type === 'state') {
        setState(msg.state);
      }
    };

    ws.onclose = () => {
      if (!intentionalClose) {
        // Reload to reconnect as new player
        setTimeout(() => window.location.reload(), 2000);
      }
    };

    return () => {
      intentionalClose = true;
      ws.close();
    };
  }, []);

  function send(msg: object) {
    wsRef.current?.send(JSON.stringify(msg));
  }

  function handleJoin(name: string) {
    send({ type: 'join', name });
    setIsJaysean(name.toLowerCase() === 'jaysean');
    setJoined(true);
  }

  if (!state || !myId) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '1rem' }}>
        Connecting…
      </div>
    );
  }

  const phase = state.phase;

  if (!joined || !state.players.find((p) => p.id === myId)) {
    return <Lobby state={state} myId={myId} joined={false} onJoin={handleJoin} onStart={() => send({ type: 'start' })} />;
  }

  if (phase === 'waiting') {
    return <Lobby state={state} myId={myId} joined={true} onJoin={handleJoin} onStart={() => send({ type: 'start' })} />;
  }

  if (phase === 'countdown' || phase === 'racing') {
    return (
      <Race
        state={state}
        myId={myId}
        isJaysean={isJaysean}
        onProgress={(progress, wpm) => send({ type: 'progress', progress, wpm })}
        onFinished={(wpm) => send({ type: 'finished', wpm })}
      />
    );
  }

  if (phase === 'finished') {
    return <Results state={state} myId={myId} onRestart={() => send({ type: 'restart' })} />;
  }

  return null;
}
