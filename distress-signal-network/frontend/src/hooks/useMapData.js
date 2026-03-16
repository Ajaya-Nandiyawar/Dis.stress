import { useRef } from 'react';
import { BACKEND_URL, MAPBOX_TOKEN } from '../constants/config';



export const useMapData = (mapRef) => {
    const geoJsonRef = useRef({
        type: 'FeatureCollection',
        features: []
    });
    const resourcesRef = useRef([]);
    const alertsRef = useRef([]); // To accumulate disaster markers
    const lastPannedCoordRef = useRef(null);

    const buildFeature = (record) => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [record.lng, record.lat] // CRITICAL: [lng, lat]
        },
        properties: {
            id: record.id,
            severity: record.severity,
            label: record.label,
            colour: record.colour || '#888888',
            source: record.source,
            message: record.message,
            created_at: record.created_at,
        }
    });

    const initMapSources = () => {
        if (!mapRef.current) return;

        // ── SOS data source ────────────────────────────────────
        mapRef.current.addSource('sos-data', {
            type: 'geojson',
            data: geoJsonRef.current
        });

        mapRef.current.addLayer({
            id: 'sos-heatmap',
            type: 'heatmap',
            source: 'sos-data',
            paint: {
                'heatmap-weight': [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'severity'], 0],
                    0, 0,
                    1, 1,
                    2, 0.6,
                    3, 0.2
                ],
                'heatmap-intensity': 1.5,
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,0,0)', 0.4, '#FF8800', 0.8, '#FF0000'],
                'heatmap-radius': 30,
                'heatmap-opacity': 0.7
            }
        });

        mapRef.current.addLayer({
            id: 'sos-circles',
            type: 'circle',
            source: 'sos-data',
            paint: {
                'circle-radius': 7,
                'circle-color': ['get', 'colour'],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF',
                'circle-opacity': 0.9
            }
        });

        // ── Route data source ──────────────────────────────────
        mapRef.current.addSource('route-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        // 1. The blue route line
        mapRef.current.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route-data',
            filter: ['==', '$type', 'LineString'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#0288D1',
                'line-width': 4,
                'line-opacity': 0.85
            }
        });

        // 2. Circle background for stops
        mapRef.current.addLayer({
            id: 'route-stops-bg',
            type: 'circle',
            source: 'route-data',
            filter: ['==', '$type', 'Point'],
            paint: {
                'circle-radius': 12,
                'circle-color': '#0288D1',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
            }
        });

        // 3. Text numbers inside circles
        mapRef.current.addLayer({
            id: 'route-stops-text',
            type: 'symbol',
            source: 'route-data',
            filter: ['==', '$type', 'Point'],
            layout: {
                'text-field': ['get', 'stop'],
                'text-size': 14,
                'text-allow-overlap': true
            },
            paint: {
                'text-color': '#FFFFFF'
            }
        });

        // ── Sonic Cascade Ripple source ───────────────────────
        mapRef.current.addSource('cascade-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        mapRef.current.addLayer({
            id: 'cascade-ripples',
            type: 'circle',
            source: 'cascade-data',
            layout: {
                'visibility': 'none' // Hidden by default until toggle is clicked
            },
            paint: {
                'circle-color': '#1565C0', // Blue ripple
                'circle-radius': ['match', ['get', 'ring'], 1, 40, 2, 80, 3, 120, 0],
                'circle-opacity': ['match', ['get', 'ring'], 1, 0.5, 2, 0.3, 3, 0.15, 0],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#0D47A1'
            }
        });

        // ── Alert Zone (2km radius) ───────────────────────────
        mapRef.current.addSource('alert-zone-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        mapRef.current.addLayer({
            id: 'alert-zone-fill',
            type: 'fill',
            source: 'alert-zone-data',
            paint: {
                'fill-color': '#FF0000',
                'fill-opacity': 0.25,
                'fill-outline-color': '#FF0000'
            }
        });

        // ── Disaster Alerts (NEW) ──────────────────────────────
        mapRef.current.addSource('alerts-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        mapRef.current.addLayer({
            id: 'alert-markers',
            type: 'symbol',
            source: 'alerts-data',
            layout: {
                'text-field': ['concat', ['upcase', ['get', 'type']], '\n', ['get', 'confidence'], '% CONFIDENCE'],
                'text-size': 12, // Reduced size slightly
                'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                'text-offset': [0, 1.2],
                'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                'text-padding': 20, // Increased padding to force more space
                'text-allow-overlap': false,
                'text-ignore-placement': false,
                'symbol-z-order': 'source'
            },
            paint: {
                'text-color': '#FF0000',
                'text-halo-color': '#000000',
                'text-halo-width': 2
            }
        });

        mapRef.current.addLayer({
            id: 'alert-centers',
            type: 'circle',
            source: 'alerts-data',
            paint: {
                'circle-radius': 6,
                'circle-color': '#FF0000',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
            }
        });

        // ── Traffic Source (Part A) ───────────────────────────
        if (!mapRef.current.getSource('traffic-src')) {
            mapRef.current.addSource('traffic-src', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1'
            });
            mapRef.current.addLayer({
                id: 'traffic',
                type: 'line',
                source: 'traffic-src',
                'source-layer': 'traffic',
                layout: { visibility: 'none' },
                paint: {
                    'line-width': 2,
                    'line-color': [
                        'match',
                        ['get', 'congestion'],
                        'low', '#00C853',
                        'moderate', '#FFA726',
                        'heavy', '#EF5350',
                        'severe', '#B71C1C',
                        '#888'
                    ]
                }
            });
        }

        // ── Evacuation Source (Part B) ──────────────────────────
        mapRef.current.addSource('evac-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });
        mapRef.current.addLayer({
            id: 'evac-route',
            type: 'line',
            source: 'evac-data',
            layout: { visibility: 'none' },
            paint: {
                'line-color': '#00E676',
                'line-width': 4,
                'line-dasharray': [2, 2]
            }
        });

        // ── Resource Data Source (NEW) ──────────────────────────
        if (!mapRef.current.getSource('resource-data')) {
            mapRef.current.addSource('resource-data', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            mapRef.current.addLayer({
                id: 'resource-markers',
                type: 'symbol',
                source: 'resource-data',
                layout: {
                    'icon-image': ['match', ['get', 'resource_type'], 
                        'shelter', 'hospital-15', 
                        'depot', 'warehouse-15', 
                        'ambulance', 'ambulance-15', 
                        'circle-15'
                    ],
                    'text-field': ['get', 'name'],
                    'text-size': 12,
                    'text-offset': [0, 1.2],
                    'text-anchor': 'top',
                    'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
                    'text-padding': 10,
                    'text-allow-overlap': false,
                    'text-ignore-placement': false
                },
                paint: {
                    'text-color': ['match', ['get', 'resource_type'],
                        'shelter', '#00BCD4',
                        'depot', '#9C27B0',
                        'ambulance', '#1565C0',
                        '#FFFFFF'
                    ],
                    'text-halo-color': '#000000',
                    'text-halo-width': 1
                }
            });
        }
    };

    const loadInitialData = (records) => {
        if (!mapRef.current) return;
        const features = records.map(buildFeature);
        geoJsonRef.current.features = features;

        const source = mapRef.current.getSource('sos-data');
        if (source) {
            source.setData(geoJsonRef.current);
        }
    };

    const addSosPoint = (record) => {
        const feature = buildFeature(record);
        geoJsonRef.current.features.push(feature);

        const source = mapRef.current && mapRef.current.getSource('sos-data');
        if (source) {
            source.setData(geoJsonRef.current);
        }

        if (mapRef.current && record.lng !== undefined && record.lat !== undefined) {
            const map = mapRef.current;
            if (!map.getBounds().contains([record.lng, record.lat])) {
                map.flyTo({ center: [record.lng, record.lat], zoom: Math.min(map.getZoom(), 10), speed: 1.2 });
            }
        }
    };

    const updateSosPoint = (triagePayload) => {
        const { id, severity, label, colour } = triagePayload;
        const feature = geoJsonRef.current.features.find(f => f.properties.id === id);

        if (!feature) {
            console.warn(`[useMapData] Could not find feature with id: ${id}`);
            return;
        }

        feature.properties.severity = severity;
        feature.properties.label = label;
        feature.properties.colour = colour;

        const source = mapRef.current && mapRef.current.getSource('sos-data');
        if (source) {
            source.setData(geoJsonRef.current);
        }
    };

    const drawRoute = (routeData) => {
        if (!mapRef.current || !mapRef.current.getSource('route-data')) return;

        // If empty route or no depot, clear the map
        if (!routeData || !routeData.route || routeData.route.length === 0 || !routeData.depot) {
            mapRef.current.getSource('route-data').setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        const features = [];

        // Create LineString Feature
        const lineCoords = [
            [routeData.depot.lng, routeData.depot.lat], // Start at depot
            ...routeData.route.map(s => [s.lng, s.lat])  // Connect to all stops
        ];
        features.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: lineCoords }
        });

        // Create Point Features for numbered markers
        routeData.route.forEach(stop => {
            features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [stop.lng, stop.lat] },
                properties: { stop: stop.stop, label: stop.label, colour: stop.colour }
            });
        });

        mapRef.current.getSource('route-data').setData({ type: 'FeatureCollection', features });
    };

    const drawCascadeRipples = (alertData) => {
        if (!mapRef.current || !mapRef.current.getSource('cascade-data')) return;

        const lat = Number(alertData?.lat ?? alertData?.latitude);
        const lng = Number(alertData?.lng ?? alertData?.longitude);

        if (!alertData || isNaN(lat) || isNaN(lng)) {
            mapRef.current.getSource('cascade-data').setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        // Create 3 Point features at the exact same [lng, lat], but with different 'ring' properties
        const features = [1, 2, 3].map(ringNum => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { ring: ringNum }
        }));

        mapRef.current.getSource('cascade-data').setData({ type: 'FeatureCollection', features });
    };

    const toggleCascadeVisibility = (isVisible) => {
        if (!mapRef.current || !mapRef.current.getLayer('cascade-ripples')) return;
        mapRef.current.setLayoutProperty('cascade-ripples', 'visibility', isVisible ? 'visible' : 'none');
    };

    const createCirclePolygon = (center, radiusInKm, points = 64) => {
        const coords = {
            latitude: center[1],
            longitude: center[0]
        };
        const km = radiusInKm;
        const ret = [];
        const distanceX = km / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
        const distanceY = km / 110.574;

        let theta, x, y;
        for (let i = 0; i < points; i++) {
            theta = (i / points) * (2 * Math.PI);
            x = distanceX * Math.cos(theta);
            y = distanceY * Math.sin(theta);
            ret.push([coords.longitude + x, coords.latitude + y]);
        }
        ret.push(ret[0]); // close the polygon

        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [ret]
            }
        };
    };

    const drawAlertZone = (alertData) => {
        if (!mapRef.current || !mapRef.current.getSource('alert-zone-data')) return;

        const lat = Number(alertData?.lat ?? alertData?.latitude);
        const lng = Number(alertData?.lng ?? alertData?.longitude);

        if (!alertData || isNaN(lat) || isNaN(lng)) {
            mapRef.current.getSource('alert-zone-data').setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        const circleFeature = createCirclePolygon([lng, lat], 2); // 2km radius
        mapRef.current.getSource('alert-zone-data').setData({
            type: 'FeatureCollection',
            features: [circleFeature]
        });

        // Add the center point marker (Accumulate instead of replace)
        const alertId = `${alertData?.type}-${lng.toFixed(4)}-${lat.toFixed(4)}`;
        const exists = alertsRef.current.some(a => a.id === alertId);

        if (!exists) {
            const centerFeature = {
                type: 'Feature',
                id: alertId,
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: {
                    type: alertData?.threat_type || alertData?.type || 'UNKNOWN',
                    confidence: Math.round((parseFloat(alertData?.confidence) || 0) * 100)
                }
            };
            alertsRef.current.push(centerFeature);
            // Keep only last 50 alerts to avoid map clutter
            if (alertsRef.current.length > 50) alertsRef.current.shift();

            mapRef.current.getSource('alerts-data')?.setData({
                type: 'FeatureCollection',
                features: alertsRef.current
            });
        }

        // Auto-pan to the alert (Smart Panning: only if off-screen AND not the same as last pan)
        const map = mapRef.current;
        const currentBounds = map.getBounds();
        const distToLast = lastPannedCoordRef.current ? Math.hypot(lastPannedCoordRef.current[0] - lng, lastPannedCoordRef.current[1] - lat) : 999;

        if (!currentBounds.contains([lng, lat]) && distToLast > 0.001) {
            map.flyTo({ center: [lng, lat], zoom: Math.min(map.getZoom(), 10), speed: 1.2 });
            lastPannedCoordRef.current = [lng, lat];
        }
    };

    const loadResources = async (map) => {
        const resources = await fetch(BACKEND_URL + '/api/resources')
            .then(r => r.json())
            .catch(() => []);

        resourcesRef.current = resources;

        const features = resources.map(r => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
            properties: {
                id: r.id,
                name: r.name,
                resource_type: r.resource_type
            }
        }));

        const source = map.getSource('resource-data');
        if (source) {
            source.setData({ type: 'FeatureCollection', features });
        }

        console.log(`Loaded ${resources.length} resource markers onto map layer`);
    };



    const drawEvacuation = async (sosRecords) => {
        if (!mapRef.current) return;
        const critical = sosRecords.filter(s => s.severity === 1 || s.severity === 'CRITICAL');
        if (!critical.length) {
            mapRef.current.getSource('evac-data')?.setData({ type: 'FeatureCollection', features: [] });
            return;
        }

        // 1. Start exactly at the highest priority critical marker
        const startPoint = critical[0];

        // 2. Find the nearest actual shelter from our resource list
        const shelters = resourcesRef.current.filter(r => r.resource_type === 'shelter');
        if (!shelters.length) {
            console.warn('[drawEvacuation] No shelters found in dynamic resources');
            return;
        }

        const nearestShelter = shelters.reduce((closest, current) => {
            const distCurrent = Math.hypot(current.lat - startPoint.lat, current.lng - startPoint.lng);
            const distClosest = Math.hypot(closest.lat - startPoint.lat, closest.lng - startPoint.lng);
            return distCurrent < distClosest ? current : closest;
        });

        // 3. Request Mapbox Directions (Longitude FIRST: lng,lat;lng,lat)
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${startPoint.lng},${startPoint.lat};${nearestShelter.lng},${nearestShelter.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;

        try {
            const res = await fetch(url);
            const data = await res.json();
            const geo = data.routes[0]?.geometry;

            if (geo && mapRef.current.getSource('evac-data')) {
                mapRef.current.getSource('evac-data').setData({
                    type: 'FeatureCollection',
                    features: [{ type: 'Feature', geometry: geo, properties: {} }]
                });
            }
        } catch (err) {
            console.error("Failed to fetch evacuation route", err);
        }
    };

    return { initMapSources, loadInitialData, addSosPoint, updateSosPoint, drawRoute, drawCascadeRipples, toggleCascadeVisibility, drawAlertZone, loadResources, drawEvacuation };
};
