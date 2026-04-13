import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
export default function Lobby({ state, myId, joined, onJoin, onStart }) {
    const [name, setName] = useState('');
    const isHost = myId === state.hostId;
    return (_jsxs("div", { style: { maxWidth: 520, margin: '0 auto' }, children: [_jsx("h1", { style: { fontSize: '2rem', fontWeight: 600, color: 'var(--blue)', marginBottom: '0.25rem' }, children: "CodeRacer" }), _jsx("p", { style: { color: 'var(--muted)', marginBottom: '2rem', fontSize: '0.875rem' }, children: "Multiplayer typing race \u2014 real TypeScript code" }), !joined ? (_jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    const n = name.trim();
                    if (n)
                        onJoin(n);
                }, style: { display: 'flex', gap: '0.5rem', marginBottom: '2rem' }, children: [_jsx("input", { autoFocus: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "Enter your name\u2026", maxLength: 24, style: { flex: 1 } }), _jsx("button", { type: "submit", style: { background: 'var(--blue)', color: '#0f0f14' }, children: "Join" })] })) : (_jsx("div", { style: { marginBottom: '2rem' }, children: isHost ? (_jsx("button", { onClick: onStart, disabled: state.players.length < 1, style: { background: 'var(--green)', color: '#0f0f14', padding: '0.6rem 2rem', fontSize: '1rem' }, children: "Start Race" })) : (_jsx("p", { style: { color: 'var(--muted)', fontSize: '0.875rem' }, children: "Waiting for host to start\u2026" })) })), _jsxs("div", { children: [_jsxs("p", { style: { color: 'var(--muted)', fontSize: '0.75rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }, children: ["Players (", state.players.length, ")"] }), state.players.length === 0 ? (_jsx("p", { style: { color: 'var(--muted)', fontSize: '0.875rem' }, children: "No players yet." })) : (_jsx("ul", { style: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }, children: state.players.map((p) => (_jsxs("li", { style: {
                                background: 'var(--surface)',
                                border: `1px solid ${p.id === myId ? 'var(--blue)' : 'var(--border)'}`,
                                borderRadius: 6,
                                padding: '0.5rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                            }, children: [_jsx("span", { style: { flex: 1 }, children: p.name }), p.id === state.hostId && (_jsx("span", { style: { color: 'var(--yellow)', fontSize: '0.75rem' }, children: "host" })), p.id === myId && (_jsx("span", { style: { color: 'var(--blue)', fontSize: '0.75rem' }, children: "you" }))] }, p.id))) }))] })] }));
}
