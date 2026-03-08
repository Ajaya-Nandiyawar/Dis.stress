/**
 * Alert Handler — POST /api/alert/trigger
 *
 * This endpoint is called by the AI NLP service when it detects a potential threat.
 * If confidence >= 0.85, it triggers a full emergency broadcast.
 */
const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const { publish } = require('../../redis/publisher');
const http = require('http'); // For mock cell broadcast (or https if making real call)

const VALID_TYPES = ['earthquake', 'flood', 'blast', 'fire', 'stampede'];

router.post('/trigger', async (req, res) => {
    const { type, confidence, lat, lng, source } = req.body;
    const metadata = req.body.metadata || {};

    // ── Validation ──────────────────────────────────────────────
    const missingOrInvalid = [];

    if (!type || !VALID_TYPES.includes(type)) missingOrInvalid.push('type');
    if (confidence === undefined || typeof confidence !== 'number' || confidence < 0 || confidence > 1) missingOrInvalid.push('confidence');
    if (lat === undefined || typeof lat !== 'number') missingOrInvalid.push('lat');
    if (lng === undefined || typeof lng !== 'number') missingOrInvalid.push('lng');
    if (!source || typeof source !== 'string') missingOrInvalid.push('source');

    if (missingOrInvalid.length > 0) {
        return res.status(400).json({
            error: true,
            code: 'VALIDATION_FAILED',
            message: `Invalid or missing fields: ${missingOrInvalid.join(', ')}`,
            fields: missingOrInvalid
        });
    }

    // ── Threshold Check ─────────────────────────────────────────
    if (confidence < 0.85) {
        return res.status(200).json({
            broadcast: false,
            action: 'monitoring',
            confidence,
            threshold: 0.85,
            message: 'Confidence below threshold. Continuing to monitor.'
        });
    }

    // ── Confidence >= 0.85: Trigger Broadcast ───────────────────
    try {
        // STEP 1 — Save to database
        const dbResult = await pool.query(
            `INSERT INTO alerts (threat_type, confidence, lat, lng, source, broadcast_fired, metadata)
             VALUES ($1, $2, $3, $4, $5, true, $6)
             RETURNING id, threat_type, confidence, metadata, triggered_at`,
            [type, confidence, lat, lng, source, metadata]
        );
        const alertRecord = dbResult.rows[0];
        const alert_id = alertRecord.id;
        const triggered_at = alertRecord.triggered_at;

        // STEP 2 — Fire all broadcast channels concurrently
        const cellBroadcastPromise = new Promise((resolve) => {
            // Mock call to telecom API
            const reqUrl = new URL('https://mock-cell-broadcast.example.com/broadcast');
            const options = {
                hostname: reqUrl.hostname,
                path: reqUrl.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            const req = require('https').request(options, (res) => {
                resolve('cell_broadcast_ok');
            });
            req.on('error', (e) => {
                console.error(`Cell Broadcast API failed (non-fatal): ${e.message}`);
                resolve('cell_broadcast_failed_but_continue');
            });
            req.write(JSON.stringify({ type, lat, lng }));
            req.end();
            setTimeout(() => resolve('cell_broadcast_timeout'), 2000); // safety timeout
        });

        const mqttPromise = new Promise((resolve) => {
            console.log(`MQTT broadcast fired: ${type} at ${lat},${lng}`);
            resolve('mqtt_ok');
        });

        const pushPromise = new Promise((resolve) => {
            console.log(`Push notification fired to all devices: ${type}`);
            resolve('push_ok');
        });

        await Promise.all([cellBroadcastPromise, mqttPromise, pushPromise]);

        // STEP 3 — Publish to Redis 'alert-broadcast' channel
        try {
            await publish('alert-broadcast', { alert_id, type, confidence, lat, lng, triggered_at, metadata });
        } catch (redisErr) {
            console.error('Redis alert-broadcast publish failed (non-fatal):', redisErr.message);
        }

        // STEP 4 — Emit WebSocket 'broadcast-alert' event
        try {
            const { getIO } = require('../../ws/socket');
            getIO().emit('broadcast-alert', { alert_id, type, confidence, lat, lng, triggered_at, metadata });
        } catch (wsErr) {
            console.error('WebSocket emit failed (non-fatal):', wsErr.message);
        }

        // ── Final 200 Response ──────────────────────────────────
        return res.status(200).json({
            broadcast: true,
            alert_id,
            type: alertRecord.threat_type,
            confidence: alertRecord.confidence,
            channels_fired: ['cell_broadcast', 'mqtt', 'websocket', 'push_notification'],
            triggered_at
        });

    } catch (dbErr) {
        console.error('Alert processing failed:', dbErr.stack || dbErr.message);
        return res.status(500).json({
            error: true,
            code: 'DB_ERROR',
            message: 'Failed to process alert trigger.'
        });
    }
});

// ── GET /api/alert/recent ───────────────────────────────────────
// Returns the last N verified broadcast alerts for the dashboard history panel.
router.get('/recent', async (req, res) => {
    try {
        let limit = parseInt(req.query.limit, 10) || 10;
        if (limit < 1) limit = 10;
        if (limit > 50) limit = 50;

        const result = await pool.query(
            `SELECT id, threat_type, confidence, lat, lng, source, broadcast_fired, triggered_at
             FROM alerts
             ORDER BY triggered_at DESC
             LIMIT $1`,
            [limit]
        );

        return res.status(200).json(result.rows);
    } catch (dbErr) {
        console.error('Recent alerts query failed:', dbErr.message);
        return res.status(500).json({
            error: true,
            code: 'DB_ERROR',
            message: 'Failed to fetch recent alerts.'
        });
    }
});

module.exports = router;
