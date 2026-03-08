import client from './client';

export const getRecentAlerts = (params = {}) => client.get('/api/alerts/recent', { params });
export const triggerAlert = (data) => client.post('/api/alert/trigger', data);
