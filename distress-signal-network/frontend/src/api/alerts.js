import client from './client';

export async function getRecentAlerts(limit = 10) {
    const res = await client.get('/api/alerts/recent', { params: { limit } });
    return res.data;
}

export async function triggerManualAlert(payload) {
    const res = await client.post('/api/alert/trigger', payload);
    return res.data;
}
