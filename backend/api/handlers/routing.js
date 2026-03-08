/**
 * Routing Handler — GET /api/routing/optimise
 *
 * Fetches top 15 Level 1/2 SOS waypoints, selects nearest ambulance depot,
 * calls Shrinidhi's AI TSP service, and falls back to greedy nearest-neighbour
 * if the AI service is unavailable or times out (8s).
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../../db/pool');

// ── Haversine Distance (metres) ─────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in metres
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Greedy Nearest-Neighbour Solver ─────────────────────────────
function greedySolve(depot, waypoints) {
    const ordered = [];
    const remaining = [...waypoints];
    let currentLat = depot.lat;
    let currentLng = depot.lng;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = haversine(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIdx = i;
            }
        }

        const next = remaining.splice(nearestIdx, 1)[0];
        ordered.push({
            ...next,
            distance_from_prev_m: Math.round(nearestDist)
        });

        currentLat = next.lat;
        currentLng = next.lng;
    }

    return ordered;
}

// ── Severity → Label/Colour mapping ────────────────────────────
function enrichWaypoint(wp) {
    const labelMap = { 1: 'CRITICAL — Trapped', 2: 'URGENT — Medical', 3: 'LOW — Monitor' };
    const colourMap = { 1: '#FF0000', 2: '#FF8800', 3: '#FFD600' };
    return {
        ...wp,
        label: wp.label || labelMap[wp.severity] || 'UNKNOWN',
        colour: wp.colour || colourMap[wp.severity] || '#888888'
    };
}

// ── GET /api/routing/optimise ───────────────────────────────────
router.get('/optimise', async (req, res) => {
    try {
        // STEP 1 — Fetch waypoints (max 15, Level 1 & 2 only)
        const wpResult = await pool.query(
            `SELECT id, lat, lng, severity, label, colour, message, source
             FROM sos_reports
             WHERE severity IN (1, 2) AND resolved = false
             ORDER BY created_at DESC
             LIMIT 15`
        );
        const waypoints = wpResult.rows;

        // STEP 3a — No waypoints
        if (waypoints.length === 0) {
            return res.status(200).json({
                route: [],
                depot: null,
                stops: 0,
                message: 'No active high-priority SOS reports to route.'
            });
        }

        // STEP 2 — Fetch depot (nearest available ambulance)
        const depotResult = await pool.query(
            `SELECT id, lat, lng, type FROM resources
             WHERE type = 'ambulance' AND available = true
             LIMIT 1`
        );

        // STEP 3b — No ambulance
        if (depotResult.rows.length === 0) {
            return res.status(200).json({
                route: [],
                depot: null,
                stops: 0,
                message: 'No ambulance available in resources table.'
            });
        }

        const depot = depotResult.rows[0];
        const depotPayload = {
            ambulance_id: depot.id,
            lat: parseFloat(depot.lat),
            lng: parseFloat(depot.lng),
            type: depot.type
        };

        // Prepare waypoints for AI service
        const wpPayload = waypoints.map(w => ({
            id: w.id,
            lat: parseFloat(w.lat),
            lng: parseFloat(w.lng),
            severity: w.severity
        }));

        let orderedRoute = null;
        let solverUsed = 'or-tools';

        // STEP 4 — Try AI routing service
        try {
            const aiUrl = process.env.AI_SERVICE_URL;
            if (!aiUrl) throw new Error('AI_SERVICE_URL not configured');

            const aiResponse = await axios.post(
                `${aiUrl}/routing/optimise`,
                { depot: { lat: depotPayload.lat, lng: depotPayload.lng, ambulance_id: depotPayload.ambulance_id }, waypoints: wpPayload },
                { timeout: 8000, headers: { 'Content-Type': 'application/json' } }
            );

            // AI service returns ordered waypoint IDs
            const orderedIds = aiResponse.data.ordered_waypoint_ids || aiResponse.data.route;

            if (Array.isArray(orderedIds) && orderedIds.length > 0) {
                // If AI returns array of IDs, reorder our waypoints accordingly
                if (typeof orderedIds[0] === 'number') {
                    const wpMap = new Map(waypoints.map(w => [w.id, w]));
                    const reordered = [];
                    let prevLat = depotPayload.lat;
                    let prevLng = depotPayload.lng;

                    for (const id of orderedIds) {
                        const wp = wpMap.get(id);
                        if (wp) {
                            const dist = haversine(prevLat, prevLng, parseFloat(wp.lat), parseFloat(wp.lng));
                            reordered.push({
                                ...enrichWaypoint(wp),
                                lat: parseFloat(wp.lat),
                                lng: parseFloat(wp.lng),
                                distance_from_prev_m: Math.round(dist)
                            });
                            prevLat = parseFloat(wp.lat);
                            prevLng = parseFloat(wp.lng);
                        }
                    }
                    orderedRoute = reordered;
                } else {
                    // AI returned full route objects
                    orderedRoute = orderedIds;
                }
                solverUsed = 'or-tools';
            } else {
                throw new Error('AI returned invalid route data');
            }

        } catch (aiErr) {
            // STEP 5 — Greedy fallback
            console.log(`AI service unavailable — using greedy nearest-neighbour fallback (${aiErr.message})`);
            solverUsed = 'greedy-fallback';

            const parsedWaypoints = waypoints.map(w => ({
                ...w,
                lat: parseFloat(w.lat),
                lng: parseFloat(w.lng)
            }));

            const greedyResult = greedySolve(
                { lat: depotPayload.lat, lng: depotPayload.lng },
                parsedWaypoints
            );

            orderedRoute = greedyResult.map(wp => enrichWaypoint(wp));
        }

        // Build final response with stop numbers and total distance
        // Always recalculate distances using Haversine (some solvers don't return distances)
        let totalDistance = 0;
        let prevLat = depotPayload.lat;
        let prevLng = depotPayload.lng;

        const finalRoute = orderedRoute.map((wp, idx) => {
            const wpLat = parseFloat(wp.lat);
            const wpLng = parseFloat(wp.lng);
            const dist = Math.round(haversine(prevLat, prevLng, wpLat, wpLng));
            totalDistance += dist;
            prevLat = wpLat;
            prevLng = wpLng;

            const enriched = enrichWaypoint(wp);
            return {
                stop: idx + 1,
                id: wp.id,
                lat: wpLat,
                lng: wpLng,
                severity: wp.severity,
                label: enriched.label,
                colour: enriched.colour,
                message: wp.message,
                distance_from_prev_m: dist,
                source: wp.source
            };
        });

        return res.status(200).json({
            route: finalRoute,
            depot: depotPayload,
            stops: finalRoute.length,
            total_distance_m: Math.round(totalDistance),
            solver_used: solverUsed,
            computed_at: new Date().toISOString()
        });

    } catch (err) {
        console.error('Routing optimise failed:', err.stack || err.message);
        return res.status(500).json({
            error: true,
            code: 'ROUTING_ERROR',
            message: 'Failed to compute optimised route.'
        });
    }
});

module.exports = router;
