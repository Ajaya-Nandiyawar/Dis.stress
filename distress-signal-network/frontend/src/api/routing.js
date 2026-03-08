import client from './client';

export const optimiseRoute = (params = {}) => client.get('/api/routing/optimise', { params });
