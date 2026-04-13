import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import Lobby from './components/Lobby';
import Race from './components/Race';
import Results from './components/Results';
const WS_URL = `ws://${window.location.hostname}:3001`;
export default function App() {
    const [myId, setMyId] = useState(null);
    const [state, setState] = useState(null);
    const [joined, setJoined] = useState(false);
    const [isJaysean, setIsJaysean] = useState(false);
    const wsRef = useRef(null);
    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
        let intentionalClose = false;
        ws.onmessage = (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'init') {
                setMyId(msg.id);
                setState(msg.state);
            }
            else if (msg.type === 'state') {
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
    function send(msg) {
        wsRef.current?.send(JSON.stringify(msg));
    }
    function handleJoin(name) {
        send({ type: 'join', name });
        setIsJaysean(name.toLowerCase() === 'jaysean');
        setJoined(true);
    }
    if (!state || !myId) {
        return (_jsx("div", { style: { textAlign: 'center', color: 'var(--muted)', fontSize: '1rem' }, children: "Connecting\u2026" }));
    }
    const phase = state.phase;
    if (!joined || !state.players.find((p) => p.id === myId)) {
        return _jsx(Lobby, { state: state, myId: myId, joined: false, onJoin: handleJoin, onStart: () => send({ type: 'start' }) });
    }
    if (phase === 'waiting') {
        return _jsx(Lobby, { state: state, myId: myId, joined: true, onJoin: handleJoin, onStart: () => send({ type: 'start' }) });
    }
    if (phase === 'countdown' || phase === 'racing') {
        return (_jsx(Race, { state: state, myId: myId, isJaysean: isJaysean, onProgress: (progress, wpm) => send({ type: 'progress', progress, wpm }), onFinished: (wpm) => send({ type: 'finished', wpm }) }));
    }
    if (phase === 'finished') {
        return _jsx(Results, { state: state, myId: myId, onRestart: () => send({ type: 'restart' }) });
    }
    return null;
}
