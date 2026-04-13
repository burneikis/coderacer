import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
export default function Race({ state, myId, isJaysean, onProgress, onFinished }) {
    const snippet = state.snippet;
    const isRacing = state.phase === 'racing';
    const isCountdown = state.phase === 'countdown';
    const endCountdown = state.endCountdown;
    // ── Normal typing mode state ───────────────────────────────────────────
    const [typed, setTyped] = useState(0);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef(null);
    const finishedRef = useRef(false);
    // ── Jaysean mode state ─────────────────────────────────────────────────
    const [jayseanInput, setJayseanInput] = useState('');
    const [jayseanMatched, setJayseanMatched] = useState(0);
    const jayseanFinishedRef = useRef(false);
    const textareaRef = useRef(null);
    // Track whether IME composition is in progress so we don't count mid-pinyin chars
    const composingRef = useRef(false);
    const target = state.chinesePrompt;
    // Focus the right element on race start
    useEffect(() => {
        if (!isRacing)
            return;
        if (isJaysean) {
            textareaRef.current?.focus();
        }
        else {
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
    function calcWpm(charsTyped) {
        if (!state.startTime)
            return 0;
        const mins = (Date.now() - state.startTime) / 60000;
        if (mins < 0.001)
            return 0;
        // For Jaysean: Chinese chars per minute (CPM) — comparable scale to WPM
        return Math.round(charsTyped / (isJaysean ? 1 : 5) / mins);
    }
    // ── Normal keydown handler ─────────────────────────────────────────────
    const handleKeyDown = useCallback((e) => {
        if (!isRacing || finishedRef.current)
            return;
        if (e.ctrlKey || e.metaKey || e.altKey)
            return;
        e.preventDefault();
        const expected = snippet[typed];
        const key = e.key;
        if (key === 'Backspace') {
            if (hasError)
                setHasError(false);
            else if (typed > 0)
                setTyped((t) => t - 1);
            return;
        }
        if (hasError)
            return;
        const input = key === 'Enter' ? '\n' : key.length === 1 ? key : null;
        if (input === null)
            return;
        if (input === expected) {
            const newTyped = typed + 1;
            setTyped(newTyped);
            setHasError(false);
            if (newTyped === snippet.length) {
                finishedRef.current = true;
                onFinished(calcWpm(newTyped));
            }
            else {
                onProgress((newTyped / snippet.length) * 100, calcWpm(newTyped));
            }
        }
        else {
            setHasError(true);
        }
    }, [isRacing, hasError, typed, snippet, onProgress, onFinished, state.startTime]);
    // ── Jaysean IME handlers ───────────────────────────────────────────────
    function evaluateJayseanInput(value) {
        if (!isRacing || jayseanFinishedRef.current || !target)
            return;
        // Count how many leading characters match the target
        let matched = 0;
        for (let i = 0; i < value.length && i < target.length; i++) {
            if (value[i] === target[i])
                matched++;
            else
                break;
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
    function handleJayseanInput(e) {
        // Don't evaluate while IME is composing — wait for compositionend
        if (composingRef.current)
            return;
        const value = e.target.value;
        setJayseanInput(value);
        evaluateJayseanInput(value);
    }
    function handleCompositionStart() {
        composingRef.current = true;
    }
    function handleCompositionEnd(e) {
        composingRef.current = false;
        const value = e.target.value;
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
        }
        else if (i === typed) {
            underline = true;
            if (hasError) {
                bg = 'var(--red)';
                color = '#0f0f14';
            }
        }
        if (ch === '\n') {
            return (_jsxs("span", { children: [_jsx("span", { style: { color, background: bg, borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined, fontStyle: 'italic', opacity: 0.5 }, children: "\u21B5" }), '\n'] }, i));
        }
        return (_jsx("span", { style: { color, background: bg, borderBottom: underline && !hasError ? '2px solid var(--blue)' : undefined, whiteSpace: 'pre' }, children: ch }, i));
    });
    // Render Chinese prompt with per-char colouring
    const promptChars = target
        ? target.split('').map((ch, i) => {
            let color = 'var(--muted)';
            let bg = 'transparent';
            let underline = false;
            if (i < jayseanMatched) {
                color = 'var(--green)';
            }
            else if (i === jayseanMatched) {
                underline = true;
                // Show red if the user has typed something wrong at this position
                const isWrong = jayseanInput.length > jayseanMatched;
                if (isWrong) {
                    bg = 'var(--red)';
                    color = '#0f0f14';
                }
            }
            return (_jsx("span", { style: { color, background: bg, borderBottom: underline ? '2px solid var(--blue)' : undefined }, children: ch }, i));
        })
        : null;
    return (_jsxs("div", { style: { position: 'relative' }, children: [isCountdown && (_jsx("div", { style: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,15,20,0.85)', zIndex: 10 }, children: _jsx("span", { style: { fontSize: '6rem', fontWeight: 600, color: 'var(--yellow)', lineHeight: 1 }, children: state.countdown }) })), endCountdown !== undefined && (_jsxs("div", { style: { background: 'var(--surface)', border: '1px solid var(--yellow)', borderRadius: 8, padding: '0.6rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { color: 'var(--yellow)', fontSize: '0.875rem', fontWeight: 600 }, children: "\uD83C\uDFC1 Someone finished! Keep going\u2026" }), _jsxs("span", { style: { color: endCountdown <= 10 ? 'var(--red)' : 'var(--yellow)', fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }, children: [endCountdown, "s"] })] })), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }, children: [_jsx("span", { style: { color: 'var(--muted)', fontSize: '0.75rem' }, children: state.snippetName }), myPlayer && (_jsxs("span", { style: { color: 'var(--blue)', fontSize: '0.875rem' }, children: [metricValue, " ", metricLabel] }))] }), _jsx("div", { style: { marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }, children: state.players.map((p) => (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem' }, children: [_jsx("span", { style: { width: 120, fontSize: '0.75rem', color: p.id === myId ? 'var(--blue)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }, children: p.name }), _jsx("div", { style: { flex: 1, height: 8, background: 'var(--surface)', borderRadius: 4, overflow: 'hidden' }, children: _jsx("div", { style: { width: `${p.progress}%`, height: '100%', background: p.id === myId ? 'var(--blue)' : 'var(--mauve)', borderRadius: 4, transition: 'width 0.1s linear' } }) }), _jsx("span", { style: { width: 60, fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }, children: p.wpm > 0 ? `${p.wpm} ${p.id === myId && isJaysean ? 'cpm' : 'wpm'}` : '' }), p.place && (_jsxs("span", { style: { fontSize: '0.7rem', background: p.place === 1 ? 'var(--yellow)' : 'var(--surface)', color: p.place === 1 ? '#0f0f14' : 'var(--muted)', borderRadius: 4, padding: '0 0.35rem', flexShrink: 0 }, children: ["#", p.place] }))] }, p.id))) }), isJaysean ? (
            /* ── Jaysean Mode UI ─────────────────────────────────────────── */
            _jsxs(_Fragment, { children: [_jsx("div", { style: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', fontSize: '0.85rem', lineHeight: 1.75, fontFamily: 'var(--font)', whiteSpace: 'pre-wrap', color: 'var(--muted)', marginBottom: '1rem', opacity: 0.7 }, children: snippet }), _jsx("p", { style: { color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }, children: "\u7528\u4E2D\u6587\u8F93\u5165\u4EE5\u4E0B\u63D0\u793A\u8BCD \u00B7 Type this prompt in Chinese:" }), _jsx("div", { style: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem 1.25rem', fontSize: '1.1rem', lineHeight: 2, marginBottom: '0.75rem', letterSpacing: '0.05em' }, children: promptChars }), _jsx("textarea", { ref: textareaRef, value: jayseanInput, onChange: () => { }, onInput: handleJayseanInput, onCompositionStart: handleCompositionStart, onCompositionEnd: handleCompositionEnd, disabled: !isRacing || jayseanFinishedRef.current, rows: 3, placeholder: "\u5728\u8FD9\u91CC\u7528\u62FC\u97F3\u8F93\u5165\u2026", style: {
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
                        } }), _jsx("p", { style: { color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.4rem' }, children: "\u7528\u62FC\u97F3\u8F93\u5165\u6CD5\u6253\u51FA\u4E0A\u9762\u7684\u4E2D\u6587\u63D0\u793A\u8BCD \u00B7 \u8F93\u5165\u5B8C\u6210\u540E\u81EA\u52A8\u5224\u5B9A \u2713" })] })) : (
            /* ── Normal Typing UI ────────────────────────────────────────── */
            _jsxs(_Fragment, { children: [_jsx("div", { ref: containerRef, tabIndex: 0, onKeyDown: handleKeyDown, style: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem', fontSize: '0.95rem', lineHeight: 1.75, fontFamily: 'var(--font)', whiteSpace: 'pre-wrap', outline: 'none', cursor: 'text', userSelect: 'none' }, children: codeChars }), _jsx("p", { style: { color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.5rem' }, children: "Click the code area and start typing \u2022 Enter for newline \u2022 Backspace to fix errors" })] }))] }));
}
