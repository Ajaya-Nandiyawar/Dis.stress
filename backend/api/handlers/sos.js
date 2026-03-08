/**
 * SOS Handler — POST /api/sos
 *
 * Ingestion pipeline:
 *   1. Validate required fields (lat, lng, message, source)
 *   2. INSERT into sos_reports (severity defaults to NULL)
 *   3. Publish to Redis 'sos-events' channel for Shrinidhi's AI service
 *   4. Emit Socket.io 'new-sos' event to dashboard clients
 *   5. Return 201 with the saved record
 *
 * // After saving to DB, publish to Redis channel 'sos-events' with this exact structure:
 * // {
 * //   id: <INTEGER from database>,
 * //   lat: <FLOAT>,
 * //   lng: <FLOAT>,
 * //   message: <STRING>,
 * //   source: <STRING>,
 * //   node_id: <STRING or null>,
 * //   metadata: <OBJECT>,
 * //   created_at: <ISO8601 STRING>
 * // }
 * // This structure is consumed by Shrinidhi's Python AI service.
 * // Field names must match exactly — she reads dict['id'], dict['message'], etc.
 */
const express = require('express');
const router = express.Router();
const pool = require('../../db/pool');
const { publish } = require('../../redis/publisher');

const VALID_SOURCES = ['manual', 'zero-touch', 'iot_node', 'sonic_cascade'];

// POST /api/sos — Submit an SOS distress signal
router.post('/', async (req, res) => {
    const { lat, lng, message, source, node_id, metadata } = req.body;

    // ── Validation ──────────────────────────────────────────────
    const missingFields = [];

    if (lat == null || typeof lat !== 'number') missingFields.push('lat');
    if (lng == null || typeof lng !== 'number') missingFields.push('lng');
    if (!message || typeof message !== 'string') missingFields.push('message');
    if (!source || typeof source !== 'string') missingFields.push('source');

    if (missingFields.length > 0) {
        return res.status(400).json({
            error: true,
            code: 'VALIDATION_FAILED',
            message: `Missing required field: ${missingFields[0]}`,
            fields: missingFields,
        });
    }

    if (!VALID_SOURCES.includes(source)) {
        return res.status(400).json({
            error: true,
            code: 'VALIDATION_FAILED',
            message: `Invalid source: '${source}'. Must be one of: ${VALID_SOURCES.join(', ')}`,
            fields: ['source'],
        });
    }

    // ── Database INSERT ─────────────────────────────────────────
    try {
        const result = await pool.query(
            `INSERT INTO sos_reports (lat, lng, message, source, node_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, lat, lng, message, source, node_id, severity, metadata, created_at`,
            [lat, lng, message, source, node_id || null, metadata || {}]
        );

        const saved = result.rows[0];

        // ── Redis Publish (non-blocking) ────────────────────────
        try {
            await publish('sos-events', {
                id: saved.id,
                lat: saved.lat,
                lng: saved.lng,
                message: saved.message,
                source: saved.source,
                node_id: saved.node_id,
                metadata: saved.metadata,
                created_at: saved.created_at,
            });
        } catch (redisErr) {
            console.error('Redis publish failed (non-fatal):', redisErr.message);
        }

        // ── WebSocket Emit ──────────────────────────────────────
        try {
            const { io } = require('../../server');
            io.emit('new-sos', { ...saved, colour: '#888888' });
        } catch (wsErr) {
            console.error('WebSocket emit failed (non-fatal):', wsErr.message);
        }

        // ── 201 Response ────────────────────────────────────────
        return res.status(201).json({
            received: true,
            id: saved.id,
            lat: saved.lat,
            lng: saved.lng,
            message: saved.message,
            source: saved.source,
            severity: null,
            created_at: saved.created_at,
        });

    } catch (dbErr) {
        console.error('DB insert failed:', dbErr.message);
        return res.status(500).json({
            error: true,
            code: 'DB_ERROR',
            message: 'Failed to save SOS report. Please retry.',
        });
    }
});

// GET /api/sos — Get all active SOS signals (placeholder for heatmap endpoint)
router.get('/', (req, res) => {
    // TODO: Implement SOS retrieval logic (Prompt for heatmap)
    res.status(501).json({ message: 'SOS retrieval endpoint not yet implemented' });
});

module.exports = router;
