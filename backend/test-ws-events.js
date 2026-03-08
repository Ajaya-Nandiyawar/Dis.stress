const { io } = require('socket.io-client');
const axios = require('axios');

async function runTests() {
    const socket = io('http://localhost:3001');

    let newSosReceived = false;
    let triageCompleteReceived = false;
    let broadcastAlertReceived = false;

    console.log('Connecting to Socket.io...');

    socket.on('connect', async () => {
        console.log('✅ PASS 2: WS Connected. Socket ID:', socket.id);

        try {
            // Setup listeners
            socket.on('new-sos', (data) => {
                newSosReceived = true;
                console.log('✅ PASS 3: Received new-sos:', data.id);
            });
            socket.on('triage-complete', (data) => {
                triageCompleteReceived = true;
                console.log('✅ PASS 4: Received triage-complete:', data.id);
            });
            socket.on('broadcast-alert', (data) => {
                broadcastAlertReceived = true;
                console.log('✅ PASS 5: Received broadcast-alert:', data.alert_id);
            });

            // Give WS a moment to bind
            await new Promise(r => setTimeout(r, 500));

            // 1. Trigger new SOS
            const sosRes = await axios.post('http://localhost:3001/api/sos', { lat: 15, lng: 15, message: 'Test WS', source: 'manual' });
            const newSosId = sosRes.data.id;

            await new Promise(r => setTimeout(r, 1000));
            if (!newSosReceived) throw new Error('new-sos event not received!');

            // 2. Trigger Triage Complete
            await axios.patch(`http://localhost:3001/api/sos/${newSosId}/triage`, { severity: 1, label: 'CRITICAL', colour: '#FF0000' });

            await new Promise(r => setTimeout(r, 1000));
            if (!triageCompleteReceived) throw new Error('triage-complete event not received!');

            // 3. Trigger Broadcast Alert
            await axios.post('http://localhost:3001/api/alert/trigger', { type: 'flood', confidence: 0.99, lat: 10, lng: 10, source: 'nlp' });

            await new Promise(r => setTimeout(r, 1000));
            if (!broadcastAlertReceived) throw new Error('broadcast-alert event not received!');

            console.log('🎉 ALL WEBSOCKET VERIFICATION CHECKS PASSED.');
            socket.disconnect();
            process.exit(0);

        } catch (e) {
            console.error('❌ FAIL:', e.message);
            socket.disconnect();
            process.exit(1);
        }
    });

    socket.on('connect_error', (e) => {
        console.error('Connection error:', e.message);
        process.exit(1);
    });
}

runTests();
