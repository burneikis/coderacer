import { useState } from 'react';
import { GameState } from '../types';

interface Props {
  state: GameState;
  myId: string;
  joined: boolean;
  onJoin: (name: string) => void;
  onStart: () => void;
}

export default function Lobby({ state, myId, joined, onJoin, onStart }: Props) {
  const [name, setName] = useState('');
  const isHost = myId === state.hostId;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--blue)', marginBottom: '0.25rem' }}>
        CodeRacer
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Multiplayer typing race — real TypeScript code
      </p>

      {!joined ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = name.trim();
            if (n) onJoin(n);
          }}
          style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}
        >
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name…"
            maxLength={24}
            style={{ flex: 1 }}
          />
          <button type="submit" style={{ background: 'var(--blue)', color: '#0f0f14' }}>
            Join
          </button>
        </form>
      ) : (
        <div style={{ marginBottom: '2rem' }}>
          {isHost ? (
            <button
              onClick={onStart}
              disabled={state.players.length < 1}
              style={{ background: 'var(--green)', color: '#0f0f14', padding: '0.6rem 2rem', fontSize: '1rem' }}
            >
              Start Race
            </button>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              Waiting for host to start…
            </p>
          )}
        </div>
      )}

      <div>
        <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Players ({state.players.length})
        </p>
        {state.players.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>No players yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.players.map((p) => (
              <li
                key={p.id}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${p.id === myId ? 'var(--blue)' : 'var(--border)'}`,
                  borderRadius: 6,
                  padding: '0.5rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                }}
              >
                <span style={{ flex: 1 }}>{p.name}</span>
                {p.id === state.hostId && (
                  <span style={{ color: 'var(--yellow)', fontSize: '0.75rem' }}>host</span>
                )}
                {p.id === myId && (
                  <span style={{ color: 'var(--blue)', fontSize: '0.75rem' }}>you</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
