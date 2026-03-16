import { useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { BACKEND_URL, MAPBOX_TOKEN } from '../constants/config';

const DEMO_RESOURCES = [
    { name: "Deenanath Mangeshkar Hospital", resource_type: "shelter", lat: 18.5019, lng: 73.8321 },
    { name: "Ruby Hall Clinic", resource_type: "shelter", lat: 18.5334, lng: 73.8772 },
    { name: "Sassoon General Hospital", resource_type: "depot", lat: 18.5284, lng: 73.8735 },
    { name: "YCM Hospital (Pimpri)", resource_type: "shelter", lat: 18.6186, lng: 73.8152 },
    { name: "Aditya Birla Hospital", resource_type: "depot", lat: 18.6272, lng: 73.7738 }
];

export const useMapData = (mapRef) => {
    const geoJsonRef = useRef({
        type: 'FeatureCollection',
        features: []
    });

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
            mapRef.current.flyTo({ center: [record.lng, record.lat], zoom: 14, speed: 1.2 });
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

        // Auto-pan to the alert
        mapRef.current.flyTo({ center: [lng, lat], zoom: 13, speed: 1.2 });
    };

    const loadResources = async (map) => {
        const colourMap = { shelter: '#00BCD4', depot: '#9C27B0', ambulance: '#1565C0' };

        DEMO_RESOURCES.forEach(r => {
            const color = colourMap[r.resource_type] || '#1565C0';
            new mapboxgl.Marker({ color })
                .setLngLat([r.lng, r.lat]) // Longitude FIRST
                .setPopup(new mapboxgl.Popup().setHTML(`<b>${r.resource_type.toUpperCase()}</b><br/>${r.name}`))
                .addTo(map);
        });

        console.log(`Loaded ${DEMO_RESOURCES.length} demo resource markers onto map`);
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
        const shelters = DEMO_RESOURCES.filter(r => r.resource_type === 'shelter');
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
