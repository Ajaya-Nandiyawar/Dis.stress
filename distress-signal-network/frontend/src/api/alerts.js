import client from './client';

export async function getRecentAlerts(limit = 10) {
    const res = await client.get('/api/alerts/recent', { params: { limit } });
    return res.data; // returns array
}

export async function triggerAlert(payload) {
    const res = await client.post('/api/alert/trigger', payload);
    return res.data;
}
