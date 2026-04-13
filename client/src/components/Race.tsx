import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types';

interface Props {
  state: GameState;
  myId: string;
  onProgress: (progress: number, wpm: number) => void;
  onFinished: (wpm: number) => void;
}

export default function Race({ state, myId, onProgress, onFinished }: Props) {
  const [typed, setTyped] = useState(0);     // correctly typed char count
  const [hasError, setHasError] = useState(false);
  const finishedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const snippet = state.snippet;
  const isRacing = state.phase === 'racing';
  const isCountdown = state.phase === 'countdown';
  const endCountdown = state.endCountdown;

  // Focus container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, [isRacing]);

  function calcWpm(charsTyped: number): number {
    if (!state.startTime) return 0;
    const mins = (Date.now() - state.startTime) / 60000;
    if (mins < 0.001) return 0;
    return Math.round(charsTyped / 5 / mins);
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isRacing || finishedRef.current) return;

      // Prevent browser shortcuts from swallowing keys
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      const expected = snippet[typed];
      const key = e.key;

      if (key === 'Backspace') {
        if (hasError) {
          setHasError(false);
        } else if (typed > 0) {
          setTyped((t) => t - 1);
        }
        return;
      }

      if (hasError) return; // block until backspaced

      const input = key === 'Enter' ? '\n' : key.length === 1 ? key : null;
      if (input === null) return;

      if (input === expected) {
        const newTyped = typed + 1;
        setTyped(newTyped);
        setHasError(false);

        if (newTyped === snippet.length) {
          finishedRef.current = true;
          onFinished(calcWpm(newTyped));
        } else {
          const progress = (newTyped / snippet.length) * 100;
          onProgress(progress, calcWpm(newTyped));
        }
      } else {
        setHasError(true);
      }
    },
    [isRacing, hasError, typed, snippet, onProgress, onFinished, state.startTime]
  );

  // Render snippet chars
  const chars = snippet.split('').map((ch, i) => {
    let color = 'var(--muted)';
    let bg = 'transparent';
    let underline = false;

    if (i < typed) {
      color = 'var(--green)';
    } else if (i === typed) {
      underline = true;
      if (hasError) {
        bg = 'var(--red)';
        color = '#0f0f14';
      }
    }

    if (ch === '\n') {
      return (
        <span key={i}>
          <span
            style={{
              color,
              background: bg,
              borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined,
              fontStyle: 'italic',
              opacity: 0.5,
            }}
          >
            ↵
          </span>
          {'\n'}
        </span>
      );
    }

    return (
      <span
        key={i}
        style={{
          color,
          background: bg,
          borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined,
          whiteSpace: 'pre',
        }}
      >
        {ch}
      </span>
    );
  });

  const myPlayer = state.players.find((p) => p.id === myId);

  return (
    <div style={{ position: 'relative' }}>
      {/* Countdown overlay */}
      {isCountdown && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15,15,20,0.85)',
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: '6rem',
              fontWeight: 600,
              color: 'var(--yellow)',
              lineHeight: 1,
            }}
          >
            {state.countdown}
          </span>
        </div>
      )}

      {/* End countdown banner */}
      {endCountdown !== undefined && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--yellow)',
            borderRadius: 8,
            padding: '0.6rem 1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: 'var(--yellow)', fontSize: '0.875rem', fontWeight: 600 }}>
            🏁 Someone finished! Keep going…
          </span>
          <span
            style={{
              color: endCountdown <= 10 ? 'var(--red)' : 'var(--yellow)',
              fontSize: '1.25rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {endCountdown}s
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{state.snippetName}</span>
        {myPlayer && (
          <span style={{ color: 'var(--blue)', fontSize: '0.875rem' }}>
            {myPlayer.wpm} WPM
          </span>
        )}
      </div>

      {/* Progress bars */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {state.players.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              style={{
                width: 120,
                fontSize: '0.75rem',
                color: p.id === myId ? 'var(--blue)' : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {p.name}
            </span>
            <div
              style={{
                flex: 1,
                height: 8,
                background: 'var(--surface)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${p.progress}%`,
                  height: '100%',
                  background: p.id === myId ? 'var(--blue)' : 'var(--mauve)',
                  borderRadius: 4,
                  transition: 'width 0.1s linear',
                }}
              />
            </div>
            <span style={{ width: 60, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
              {p.wpm > 0 ? `${p.wpm} wpm` : ''}
            </span>
            {p.place && (
              <span
                style={{
                  fontSize: '0.7rem',
                  background: p.place === 1 ? 'var(--yellow)' : 'var(--surface)',
                  color: p.place === 1 ? '#0f0f14' : 'var(--muted)',
                  borderRadius: 4,
                  padding: '0 0.35rem',
                  flexShrink: 0,
                }}
              >
                #{p.place}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Snippet display */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '1.25rem',
          fontSize: '0.95rem',
          lineHeight: 1.75,
          fontFamily: 'var(--font)',
          whiteSpace: 'pre-wrap',
          outline: 'none',
          cursor: 'text',
          userSelect: 'none',
        }}
      >
        {chars}
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
        Click the code area and start typing • Enter for newline • Backspace to fix errors
      </p>
    </div>
  );
}
