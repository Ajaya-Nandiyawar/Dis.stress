import { useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { BACKEND_URL } from '../constants/config';

export const useWebSocket = (onNewSOS, onTriageComplete, onBroadcastAlert) => {
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = io(BACKEND_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to WebSocket');
        });

        socket.on('new-sos', (payload) => {
            if (onNewSOS) onNewSOS(payload);
        });

        socket.on('triage-complete', (payload) => {
            if (onTriageComplete) onTriageComplete(payload);
        });

        socket.on('broadcast-alert', (payload) => {
            if (onBroadcastAlert) onBroadcastAlert(payload);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });

        return () => {
            socket.disconnect();
        };
    }, [onNewSOS, onTriageComplete, onBroadcastAlert]);

    return socketRef.current;
};
