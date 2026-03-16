import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { BACKEND_URL, WS_RECONNECT_DELAY_MS } from '../constants/config';

export const useWebSocket = ({ addSosPoint, updateSosPoint, onTriageComplete, onBroadcastAlert, onNewSos, onConnectionChange, onCitizenStatus }) => {
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);

    // Store latest callbacks in refs so the socket effect doesn't re-run
    const addSosPointRef = useRef(addSosPoint);
    const updateSosPointRef = useRef(updateSosPoint);
    const onTriageCompleteRef = useRef(onTriageComplete);
    const onBroadcastAlertRef = useRef(onBroadcastAlert);
    const onNewSosRef = useRef(onNewSos);
    const onConnectionChangeRef = useRef(onConnectionChange);
    const onCitizenStatusRef = useRef(onCitizenStatus);

    // Keep refs in sync with latest props
    useEffect(() => { addSosPointRef.current = addSosPoint; }, [addSosPoint]);
    useEffect(() => { updateSosPointRef.current = updateSosPoint; }, [updateSosPoint]);
    useEffect(() => { onTriageCompleteRef.current = onTriageComplete; }, [onTriageComplete]);
    useEffect(() => { onBroadcastAlertRef.current = onBroadcastAlert; }, [onBroadcastAlert]);
    useEffect(() => { onNewSosRef.current = onNewSos; }, [onNewSos]);
    useEffect(() => { onConnectionChangeRef.current = onConnectionChange; }, [onConnectionChange]);
    useEffect(() => { onCitizenStatusRef.current = onCitizenStatus; }, [onCitizenStatus]);

    useEffect(() => {
        const socket = io(BACKEND_URL, {
            reconnectionDelay: WS_RECONNECT_DELAY_MS,
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            console.log('WebSocket connected to backend');
            if (onConnectionChangeRef.current) onConnectionChangeRef.current(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
            console.log('WebSocket disconnected — will reconnect automatically');
            if (onConnectionChangeRef.current) onConnectionChangeRef.current(false);
        });

        socket.on('new-sos', (data) => {
            // data: { id, lat, lng, message, source, severity: null, colour: '#888888', created_at }
            console.log('new-sos received:', data.id, 'source:', data.source);
            if (addSosPointRef.current) addSosPointRef.current(data);
            if (onNewSosRef.current) onNewSosRef.current(data);
        });

        socket.on('triage-complete', (data) => {
            // data: { id, severity, label, colour, triaged_at }
            console.log('triage-complete:', data.id, 'severity:', data.severity, 'colour:', data.colour);
            if (updateSosPointRef.current) updateSosPointRef.current(data);
            if (onTriageCompleteRef.current) onTriageCompleteRef.current(data);
        });

        socket.on('broadcast-alert', (data) => {
            // data: { alert_id, type, confidence, lat, lng, triggered_at }
            console.log('BROADCAST ALERT:', data.type, 'confidence:', data.confidence);
            if (onBroadcastAlertRef.current) onBroadcastAlertRef.current(data);

            // Play alert sound using Web Audio API
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.3);
            } catch (e) {
                console.warn('Audio playback failed (Requires user interaction first):', e.message);
            }
        });

        socket.on('citizen-status', (data) => {
            // data: { sos_id, status }   status = "safe" | "need_rescue" | "medical"
            console.log('citizen-status:', data.sos_id, data.status);
            if (onCitizenStatusRef.current) onCitizenStatusRef.current(data);
        });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { connected };
};
