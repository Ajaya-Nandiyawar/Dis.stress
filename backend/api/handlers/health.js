/**
 * Health Check Handler — GET /health
 * Checks PostgreSQL and Redis connectivity.
 * Mounted at root level in server.js (NOT under /api).
 *
 * Response matches api-contract.json exactly:
 *   200 → { status: 'ok',       time, db: 'connected',    redis: 'connected' }
 *   503 → { status: 'degraded', time, db: 'disconnected', redis: 'connected' }
 */
const pool = require('../../db/pool');
const { client: redisClient } = require('../../redis/publisher');

async function healthHandler(req, res) {
    let dbStatus = 'disconnected';
    let redisStatus = 'disconnected';

    // 1. Check PostgreSQL
    try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (err) {
        dbStatus = 'disconnected';
    }

    // 2. Check Redis via publisher client ping
    try {
        await redisClient.ping();
        redisStatus = 'connected';
    } catch (err) {
        redisStatus = 'disconnected';
    }

    // 3. Determine overall status and HTTP code
    const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: allHealthy ? 'ok' : 'degraded',
        time: new Date().toISOString(),
        db: dbStatus,
        redis: redisStatus,
    });
}

module.exports = healthHandler;
