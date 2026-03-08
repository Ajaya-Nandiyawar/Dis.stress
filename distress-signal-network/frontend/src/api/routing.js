import client from './client';

export async function getOptimisedRoute(ambulanceId) {
    const params = ambulanceId ? { ambulance_id: ambulanceId } : {};
    const res = await client.get('/api/routing/optimise', { params });
    return res.data; // returns { route:[], depot, stops, solver_used }
}
