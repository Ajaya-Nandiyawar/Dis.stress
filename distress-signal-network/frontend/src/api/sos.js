import client from './client';

export async function getHeatmapData(params = {}) {
    const res = await client.get('/api/sos/heatmap', { params });
    return res.data; // returns array, never null
}

export async function getSosStats() {
    const res = await client.get('/api/sos/stats');
    return res.data;
}
