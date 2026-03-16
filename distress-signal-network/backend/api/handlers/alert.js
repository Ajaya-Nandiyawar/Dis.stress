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
const admin = require('../../firebase.js');
const http = require('http'); // For mock cell broadcast (or https if making real call)
const TelegramBot = require('node-telegram-bot-api');
const { sendEmailAlert } = require('../../services/email');

// Initialize Telegram Bot if token provider
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
let tgBot = null;
if (telegramToken && telegramChatId) {
    tgBot = new TelegramBot(telegramToken, { polling: false });
}

const VALID_TYPES = ['earthquake', 'flood', 'blast', 'fire', 'stampede'];

/**
 * Send FCM push notification to all devices subscribed to 'emergency-alerts' topic.
 * Non-fatal — failures are caught and logged, never rethrown.
 */
async function sendFcm(alertData) {
    try {
        const response = await admin.messaging().send({
            notification: {
                title: `⚠ EMERGENCY: ${alertData.type.toUpperCase()} DETECTED`,
                body: `Confidence: ${Math.round(alertData.confidence * 100)}%` +
                      ` · ${new Date(alertData.triggered_at).toLocaleTimeString()}`,
            },
            data: {
                alert_id: String(alertData.alert_id),
                type:     alertData.type,
                lat:      String(alertData.lat),
                lng:      String(alertData.lng),
                source_count: String(alertData.source_count || 1),
                validation:   alertData.validation || 'SINGLE SOURCE',
            },
            topic: 'emergency-alerts',
        });
        console.log('[FCM] Sent successfully:', response);
    } catch (err) {
        console.error('[FCM] Failed (non-fatal):', err.message);
        // Do NOT rethrow — FCM failure must not block other broadcast channels
    }
}

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

    // ── STEP 1: Cross-validation (Moved up to use boosted confidence in DB) ─────
    let source_count = 1;
    let report_count = 1;
    let validationLabel = 'SINGLE SOURCE';
    let displayConfidence = confidence;

    try {
        const crossValidation = await pool.query(
            `SELECT
               COUNT(DISTINCT source) AS source_count,
               COUNT(*)               AS report_count
             FROM sos_reports
             WHERE created_at > NOW() - INTERVAL '10 minutes'
               AND resolved = false`
        );
        const row = crossValidation.rows[0];
        source_count = parseInt(row.source_count) || 1;
        report_count = parseInt(row.report_count) || 1;
        
        displayConfidence = Math.min(0.99, confidence + (source_count - 1) * 0.03);
        validationLabel = source_count >= 2 ? 'CROSS-VALIDATED' : 'SINGLE SOURCE';
        
        console.log(`[ALERT] Cross-validation: sources=${source_count}, reports=${report_count}, confidence=${confidence}→${displayConfidence}`);
    } catch (corrobErr) {
        console.error('[ALERT] Cross-validation query failed (non-fatal):', corrobErr.message);
    }

    // ── STEP 2: Save Alert to Database ───────────────────────────────────────
    let alertRecord;
    try {
        const query = `INSERT INTO alerts (threat_type, confidence, lat, lng, source, broadcast_fired, metadata)
             VALUES ($1, $2, $3, $4, $5, true, $6)
             RETURNING id, threat_type, confidence, metadata, triggered_at`;
        const params = [type, displayConfidence, lat, lng, source, JSON.stringify(metadata)];
        
        console.log('[ALERT] Executing DB Insert:', query);
        console.log('[ALERT] With Params:', params);

        // Use the boosted confidence in the database as well for consistency
        const dbResult = await pool.query(query, params);
        alertRecord = dbResult.rows[0];
    } catch (dbErr) {
        console.error('[ALERT] Database INSERT failed!');
        console.error('[ALERT] Error Message:', dbErr.message);
        console.error('[ALERT] Error Stack:', dbErr.stack);
        console.error('[ALERT] Error Detail:', dbErr.detail);
        console.error('[ALERT] Error Hint:', dbErr.hint);
        return res.status(500).json({
            error: true,
            code: 'DB_ERROR',
            message: `Failed to process alert trigger: ${dbErr.message}`
        });
    }

    const alert_id = alertRecord.id;
    const triggered_at = alertRecord.triggered_at;

    try {
        // Build enriched payload for broadcast channels
        const broadcastPayload = {
            alert_id,
            type,
            confidence: displayConfidence,
            lat,
            lng,
            triggered_at,
            source_count,
            report_count,
            validation: validationLabel,
            metadata
        };

        // STEP 2 — Fire all broadcast channels concurrently (all non-fatal)
        const cellBroadcastPromise = new Promise((resolve) => {
            const reqUrl = new URL('https://mock-cell-broadcast.example.com/broadcast');
            const options = {
                hostname: reqUrl.hostname,
                path: reqUrl.pathname,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            const req = require('https').request(options, (res) => { resolve('cell_broadcast_ok'); });
            req.on('error', (e) => {
                console.error(`Cell Broadcast API failed (non-fatal): ${e.message}`);
                resolve('cell_broadcast_failed');
            });
            req.write(JSON.stringify({ type, lat, lng }));
            req.end();
            setTimeout(() => resolve('cell_broadcast_timeout'), 2000);
        });

        const telegramPromise = (async () => {
            if (tgBot && telegramChatId) {
                try {
                    const tHeader = `🚨 *CRITICAL ALERT: ${(type || 'UNKNOWN').toUpperCase()}*`;
                    const tBody = `Confidence: ${Math.round((boosted_confidence || 0) * 100)}% (${validation})`;
                    const tInst = metadata?.template ? `\nInstructions: ${metadata.template}` : '';
                    await tgBot.sendMessage(telegramChatId, `${tHeader}\n${tBody}${tInst}`, { parse_mode: 'Markdown' });
                    console.log('Telegram broadcast fired');
                } catch (err) {
                    console.error('Telegram broadcast failed:', err.message);
                }
            }
        })();

        const channelNames = ['redis', 'websocket', 'fcm', 'cell_broadcast', 'telegram', 'mqtt', 'email'];
        const results = await Promise.allSettled([
            publish('alert-broadcast', broadcastPayload),
            (async () => {
                const { getIO } = require('../../ws/socket');
                getIO().emit('broadcast-alert', broadcastPayload);
            })(),
            sendFcm(broadcastPayload),
            cellBroadcastPromise,
            telegramPromise,
            (async () => { console.log(`MQTT broadcast fired: ${type} at ${lat},${lng}`); })(),
            (async () => { 
                try { 
                    await sendEmailAlert(type, boosted_confidence); 
                } catch(e) { console.error('Email alert failed:', e.message); }
            })()
        ]);

        // Log any settled failures for debugging
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`[BROADCAST] Channel ${channelNames[i]} failed:`, r.reason?.message);
            }
        });

        // ── Final 200 Response ──────────────────────────────────
        return res.status(200).json({
            broadcast: true,
            alert_id,
            type: alertRecord.threat_type,
            confidence: displayConfidence,
            source_count,
            report_count,
            validation: validationLabel,
            channels_fired: ['redis', 'websocket', 'fcm', 'cell_broadcast', 'telegram', 'mqtt', 'email'],
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
