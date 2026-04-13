import { GameState } from '../types';

interface Props {
  state: GameState;
  myId: string;
  onRestart: () => void;
}

const medals = ['🥇', '🥈', '🥉'];

export default function Results({ state, myId, onRestart }: Props) {
  const isHost = myId === state.hostId;
  // Finishers first (by place), then non-finishers sorted by progress descending
  const sorted = [...state.players].sort((a, b) => {
    if (a.finished && b.finished) return (a.place ?? 999) - (b.place ?? 999);
    if (a.finished) return -1;
    if (b.finished) return 1;
    return b.progress - a.progress;
  });

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--yellow)', marginBottom: '1.75rem' }}>
        Race Finished 🏁
      </h2>

      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
        {sorted.map((p, idx) => (
          <li
            key={p.id}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${p.id === myId ? 'var(--blue)' : 'var(--border)'}`,
              borderRadius: 8,
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.25rem', width: 28, textAlign: 'center' }}>
              {idx < 3 ? medals[idx] : `#${p.place ?? idx + 1}`}
            </span>
            <span style={{ flex: 1, color: p.id === myId ? 'var(--blue)' : 'var(--text)' }}>
              {p.name}
            </span>
            {p.finished ? (
              <span style={{ color: 'var(--green)', fontSize: '0.9rem' }}>
                {p.wpm} WPM
              </span>
            ) : (
              <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                {Math.round(p.progress)}% complete
              </span>
            )}
            {p.id === myId && (
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>you</span>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <button
          onClick={onRestart}
          style={{ background: 'var(--green)', color: '#0f0f14', padding: '0.6rem 2rem', fontSize: '1rem' }}
        >
          Play Again
        </button>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
          Waiting for host to start a new race…
        </p>
      )}
    </div>
  );
}
