import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_CENTRE_PUNE, MAP_ZOOM_DEFAULT } from '../constants/config';
import { getHeatmapData } from '../api/sos';
import { useMapData } from '../hooks/useMapData';
import { useWebSocket } from '../hooks/useWebSocket';

const MapView = ({ onMapLoaded, onTriageComplete, onBroadcastAlert, onNewSos, onConnectionChange }) => {
    console.log('MapView component rendering');
    const mapContainerRef = useRef(null);  // ref for the DOM element
    const mapRef = useRef(null);           // ref for the Map object
    const { initMapSources, loadInitialData, addSosPoint, updateSosPoint } = useMapData(mapRef);

    // Wire up real-time updates
    const { connected } = useWebSocket({ addSosPoint, updateSosPoint, onTriageComplete, onBroadcastAlert, onNewSos, onConnectionChange });
    console.log("WS Status:", connected);

    useEffect(() => {
        if (mapRef.current) return; // prevent double init in React StrictMode

        console.log('MapView useEffect running');

        // Ensure container is empty before initialization
        if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = '';
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: MAP_CENTRE_PUNE,  // [73.8567, 18.5204] — lng, lat
            zoom: MAP_ZOOM_DEFAULT,   // 12
        });

        mapRef.current = map;

        map.on('load', () => {
            mapRef.current = map;

            // 1. Register sources and layers
            initMapSources();

            // 2. Fetch initial data
            getHeatmapData()
                .then(data => {
                    const records = data || [];
                    loadInitialData(records);
                    console.log(`Loaded ${records.length} SOS reports onto map`);
                })
                .catch(err => {
                    console.error('Failed to fetch initial heatmap data:', err);
                    loadInitialData([]); // Never skip — source must exist
                });

            // 3. Popup on Marker Click
            map.on('click', 'sos-circles', (e) => {
                const props = e.features[0].properties;
                const coords = e.features[0].geometry.coordinates.slice();

                new mapboxgl.Popup()
                    .setLngLat(coords)
                    .setHTML(`
                        <div style='font-family:monospace; font-size:13px;'>
                            <b>${props.label || 'Awaiting Triage'}</b><br/>
                            ${props.message}<br/>
                            <span style='color:#aaa'>Source: ${props.source}</span><br/>
                            <span style='color:#aaa'>${new Date(props.created_at).toLocaleTimeString()}</span>
                        </div>
                    `)
                    .addTo(map);
            });

            // 4. Cursor Hover Effects
            map.on('mouseenter', 'sos-circles', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'sos-circles', () => {
                map.getCanvas().style.cursor = '';
            });

            if (onMapLoaded) onMapLoaded(mapRef); // Pass ref to parent
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [onMapLoaded]);

    return (
        <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
    );
};

export default MapView;
