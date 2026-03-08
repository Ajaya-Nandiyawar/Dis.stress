import client from './client';

export const getHeatmap = (params = {}) => client.get('/api/sos/heatmap', { params });
export const getStats = () => client.get('/api/sos/stats');
