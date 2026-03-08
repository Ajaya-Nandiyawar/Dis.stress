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
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 1.0, 2, 0.6, 3, 0.2, 0.1],
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

        // Popup Logic
        mapRef.current.on('click', 'sos-circles', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            const { message, label, source, created_at, colour } = e.features[0].properties;

            const html = `
        <div style="color: #fff; padding: 5px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${colour}; border: 1px solid #fff;"></div>
            <strong style="font-size: 14px;">${label.toUpperCase()}</strong>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.4;">${message}</p>
          <div style="font-size: 11px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 5px;">
            <div>Source: ${source}</div>
            <div>Time: ${new Date(created_at).toLocaleString()}</div>
          </div>
        </div>
      `;

            new mapboxgl.Popup({ backgroundColor: '#1A1B1E', closeButton: false })
                .setLngLat(coordinates)
                .setHTML(html)
                .addTo(mapRef.current);
        });

        mapRef.current.on('mouseenter', 'sos-circles', () => {
            mapRef.current.getCanvas().style.cursor = 'pointer';
        });

        mapRef.current.on('mouseleave', 'sos-circles', () => {
            mapRef.current.getCanvas().style.cursor = '';
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
