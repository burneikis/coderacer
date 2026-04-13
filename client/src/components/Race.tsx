import { useCallback, useEffect, useRef, useState } from 'react';
import { GameState } from '../types';

interface Props {
  state: GameState;
  myId: string;
  isJaysean: boolean;
  onProgress: (progress: number, wpm: number) => void;
  onFinished: (wpm: number) => void;
}

export default function Race({ state, myId, isJaysean, onProgress, onFinished }: Props) {
  const snippet = state.snippet;
  const isRacing = state.phase === 'racing';
  const isCountdown = state.phase === 'countdown';
  const endCountdown = state.endCountdown;

  // ── Normal typing mode state ───────────────────────────────────────────
  const [typed, setTyped] = useState(0);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);

  // ── Jaysean mode state ─────────────────────────────────────────────────
  const [jayseanInput, setJayseanInput] = useState('');
  const [jayseanMatched, setJayseanMatched] = useState(0);
  const jayseanFinishedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Track whether IME composition is in progress so we don't count mid-pinyin chars
  const composingRef = useRef(false);

  const target = state.chinesePrompt;

  // Focus the right element on race start
  useEffect(() => {
    if (!isRacing) return;
    if (isJaysean) {
      textareaRef.current?.focus();
    } else {
      containerRef.current?.focus();
    }
  }, [isRacing, isJaysean]);

  // Reset per-race state when a new snippet arrives
  useEffect(() => {
    setTyped(0);
    setHasError(false);
    setJayseanInput('');
    setJayseanMatched(0);
    finishedRef.current = false;
    jayseanFinishedRef.current = false;
  }, [state.snippet]);

  // ── WPM helpers ────────────────────────────────────────────────────────
  function calcWpm(charsTyped: number): number {
    if (!state.startTime) return 0;
    const mins = (Date.now() - state.startTime) / 60000;
    if (mins < 0.001) return 0;
    // For Jaysean: Chinese chars per minute (CPM) — comparable scale to WPM
    return Math.round(charsTyped / (isJaysean ? 1 : 5) / mins);
  }

  // ── Normal keydown handler ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isRacing || finishedRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();

      const expected = snippet[typed];
      const key = e.key;

      if (key === 'Backspace') {
        if (hasError) setHasError(false);
        else if (typed > 0) setTyped((t) => t - 1);
        return;
      }

      if (hasError) return;

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
          onProgress((newTyped / snippet.length) * 100, calcWpm(newTyped));
        }
      } else {
        setHasError(true);
      }
    },
    [isRacing, hasError, typed, snippet, onProgress, onFinished, state.startTime]
  );

  // ── Jaysean IME handlers ───────────────────────────────────────────────
  function evaluateJayseanInput(value: string) {
    if (!isRacing || jayseanFinishedRef.current || !target) return;

    // Count how many leading characters match the target
    let matched = 0;
    for (let i = 0; i < value.length && i < target.length; i++) {
      if (value[i] === target[i]) matched++;
      else break;
    }

    setJayseanMatched(matched);
    const progress = (matched / target.length) * 100;
    const cpm = calcWpm(matched);
    onProgress(progress, cpm);

    if (matched === target.length) {
      jayseanFinishedRef.current = true;
      onFinished(cpm);
    }
  }

  function handleJayseanInput(e: React.FormEvent<HTMLTextAreaElement>) {
    // Don't evaluate while IME is composing — wait for compositionend
    if (composingRef.current) return;
    const value = (e.target as HTMLTextAreaElement).value;
    setJayseanInput(value);
    evaluateJayseanInput(value);
  }

  function handleCompositionStart() {
    composingRef.current = true;
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLTextAreaElement>) {
    composingRef.current = false;
    const value = (e.target as HTMLTextAreaElement).value;
    setJayseanInput(value);
    evaluateJayseanInput(value);
  }

  // ── Shared rendering helpers ───────────────────────────────────────────
  const myPlayer = state.players.find((p) => p.id === myId);

  const metricLabel = isJaysean ? 'CPM' : 'WPM';
  const metricValue = myPlayer?.wpm ?? 0;

  // Render normal code snippet with per-char colouring
  const codeChars = snippet.split('').map((ch, i) => {
    let color = 'var(--muted)';
    let bg = 'transparent';
    let underline = false;
    if (i < typed) {
      color = 'var(--green)';
    } else if (i === typed) {
      underline = true;
      if (hasError) { bg = 'var(--red)'; color = '#0f0f14'; }
    }
    if (ch === '\n') {
      return (
        <span key={i}>
          <span style={{ color, background: bg, borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined, fontStyle: 'italic', opacity: 0.5 }}>↵</span>
          {'\n'}
        </span>
      );
    }
    return (
      <span key={i} style={{ color, background: bg, borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined, whiteSpace: 'pre' }}>
        {ch}
      </span>
    );
  });

  // Render Chinese prompt with per-char colouring
  const promptChars = target
    ? target.split('').map((ch, i) => {
        let color = 'var(--muted)';
        let bg = 'transparent';
        let underline = false;
        if (i < jayseanMatched) {
          color = 'var(--green)';
        } else if (i === jayseanMatched) {
          underline = true;
          // Show red if the user has typed something wrong at this position
          const isWrong = jayseanInput.length > jayseanMatched;
          if (isWrong) { bg = 'var(--red)'; color = '#0f0f14'; }
        }
        return (
          <span key={i} style={{ color, background: bg, borderBottom: underline ? '2px solid var(--blue)' : undefined }}>
            {ch}
          </span>
        );
      })
    : null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Countdown overlay */}
      {isCountdown && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,15,20,0.85)', zIndex: 10 }}>
          <span style={{ fontSize: '6rem', fontWeight: 600, color: 'var(--yellow)', lineHeight: 1 }}>
            {state.countdown}
          </span>
        </div>
      )}

      {/* End countdown banner */}
      {endCountdown !== undefined && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--yellow)', borderRadius: 8, padding: '0.6rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--yellow)', fontSize: '0.875rem', fontWeight: 600 }}>🏁 Someone finished! Keep going…</span>
          <span style={{ color: endCountdown <= 10 ? 'var(--red)' : 'var(--yellow)', fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {endCountdown}s
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{state.snippetName}</span>
        {myPlayer && (
          <span style={{ color: 'var(--blue)', fontSize: '0.875rem' }}>
            {metricValue} {metricLabel}
          </span>
        )}
      </div>

      {/* Progress bars */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {state.players.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 120, fontSize: '0.75rem', color: p.id === myId ? 'var(--blue)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {p.name}
            </span>
            <div style={{ flex: 1, height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${p.progress}%`, height: '100%', background: p.id === myId ? 'var(--blue)' : 'var(--mauve)', borderRadius: 4, transition: 'width 0.1s linear' }} />
            </div>
            <span style={{ width: 60, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
              {p.wpm > 0 ? `${p.wpm} ${p.id === myId && isJaysean ? 'cpm' : 'wpm'}` : ''}
            </span>
            {p.place && (
              <span style={{ fontSize: '0.7rem', background: p.place === 1 ? 'var(--yellow)' : 'var(--surface)', color: p.place === 1 ? '#0f0f14' : 'var(--muted)', borderRadius: 4, padding: '0 0.35rem', flexShrink: 0 }}>
                #{p.place}
              </span>
            )}
          </div>
        ))}
      </div>

      {isJaysean ? (
        /* ── Jaysean Mode UI ─────────────────────────────────────────── */
        <>
          {/* Read-only code reference */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', fontSize: '0.85rem', lineHeight: 1.75, fontFamily: 'var(--font)', whiteSpace: 'pre-wrap', color: 'var(--muted)', marginBottom: '1rem', opacity: 0.7 }}>
            {snippet}
          </div>

          {/* Label */}
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            用中文输入以下提示词 · Type this prompt in Chinese:
          </p>

          {/* Target prompt display */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', fontSize: '1.1rem', lineHeight: 2, marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
            {promptChars}
          </div>

          {/* IME-friendly textarea */}
          <textarea
            ref={textareaRef}
            value={jayseanInput}
            onChange={() => {/* handled by onInput */}}
            onInput={handleJayseanInput}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            disabled={!isRacing || jayseanFinishedRef.current}
            rows={3}
            placeholder="在这里用拼音输入…"
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: `1px solid ${jayseanInput.length > jayseanMatched && !composingRef.current ? 'var(--red)' : 'var(--blue)'}`,
              borderRadius: 8,
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              color: 'var(--text)',
              resize: 'none',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'sans-serif',
            }}
          />
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.4rem' }}>
            用拼音输入法打出上面的中文提示词 · 输入完成后自动判定 ✓
          </p>
        </>
      ) : (
        /* ── Normal Typing UI ────────────────────────────────────────── */
        <>
          <div
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem', fontSize: '0.95rem', lineHeight: 1.75, fontFamily: 'var(--font)', whiteSpace: 'pre-wrap', outline: 'none', cursor: 'text', userSelect: 'none' }}
          >
            {codeChars}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Click the code area and start typing • Enter for newline • Backspace to fix errors
          </p>
        </>
      )}
    </div>
  );
}
