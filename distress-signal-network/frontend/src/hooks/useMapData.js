import { useRef } from 'react';
import mapboxgl from 'mapbox-gl';

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

        mapRef.current.addSource('sos-data', {
            type: 'geojson',
            data: geoJsonRef.current
        });

        // Add Heatmap Layer
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

        // Add Circle Layer
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

    return { initMapSources, loadInitialData, addSosPoint, updateSosPoint };
};
