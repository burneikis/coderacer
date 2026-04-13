import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const medals = ['🥇', '🥈', '🥉'];
export default function Results({ state, myId, onRestart }) {
    const isHost = myId === state.hostId;
    // Finishers first (by place), then non-finishers sorted by progress descending
    const sorted = [...state.players].sort((a, b) => {
        if (a.finished && b.finished)
            return (a.place ?? 999) - (b.place ?? 999);
        if (a.finished)
            return -1;
        if (b.finished)
            return 1;
        return b.progress - a.progress;
    });
    return (_jsxs("div", { style: { maxWidth: 520, margin: '0 auto' }, children: [_jsx("h2", { style: { fontSize: '1.5rem', fontWeight: 600, color: 'var(--yellow)', marginBottom: '1.75rem' }, children: "Race Finished \uD83C\uDFC1" }), _jsx("ul", { style: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }, children: sorted.map((p, idx) => (_jsxs("li", { style: {
                        background: 'var(--surface)',
                        border: `1px solid ${p.id === myId ? 'var(--blue)' : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '0.6rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                    }, children: [_jsx("span", { style: { fontSize: '1.25rem', width: 28, textAlign: 'center' }, children: idx < 3 ? medals[idx] : `#${p.place ?? idx + 1}` }), _jsx("span", { style: { flex: 1, color: p.id === myId ? 'var(--blue)' : 'var(--text)' }, children: p.name }), p.finished ? (_jsxs("span", { style: { color: 'var(--green)', fontSize: '0.9rem' }, children: [p.wpm, " WPM"] })) : (_jsxs("span", { style: { color: 'var(--muted)', fontSize: '0.9rem' }, children: [Math.round(p.progress), "% complete"] })), p.id === myId && (_jsx("span", { style: { color: 'var(--muted)', fontSize: '0.75rem' }, children: "you" }))] }, p.id))) }), isHost ? (_jsx("button", { onClick: onRestart, style: { background: 'var(--green)', color: '#0f0f14', padding: '0.6rem 2rem', fontSize: '1rem' }, children: "Play Again" })) : (_jsx("p", { style: { color: 'var(--muted)', fontSize: '0.875rem' }, children: "Waiting for host to start a new race\u2026" }))] }));
}
