import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_CENTRE_PUNE, MAP_ZOOM_DEFAULT } from '../constants/config';
import { getHeatmapData } from '../api/sos';
import { useMapData } from '../hooks/useMapData';
import { useWebSocket } from '../hooks/useWebSocket';

const MapView = ({ onMapLoaded, onTriageComplete, onBroadcastAlert, onNewSos, onConnectionChange, routingData, cascadeVisible }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const { initMapSources, loadInitialData, addSosPoint, updateSosPoint, drawRoute, drawCascadeRipples, toggleCascadeVisibility } = useMapData(mapRef);

    const handleBroadcastAlertWithCascade = (data) => {
        if (onBroadcastAlert) onBroadcastAlert(data);
        drawCascadeRipples(data);
    };

    useWebSocket({ addSosPoint, updateSosPoint, onTriageComplete, onBroadcastAlert: handleBroadcastAlertWithCascade, onNewSos, onConnectionChange });

    // Draw route whenever routingData changes
    useEffect(() => {
        drawRoute(routingData);
    }, [routingData, drawRoute]);

    // Track visibility of cascade layer
    useEffect(() => {
        toggleCascadeVisibility(cascadeVisible);
    }, [cascadeVisible, toggleCascadeVisibility]);

    useEffect(() => {
        if (mapRef.current) return;

        if (mapContainerRef.current) {
            mapContainerRef.current.innerHTML = '';
        }

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: MAP_CENTRE_PUNE,
            zoom: MAP_ZOOM_DEFAULT,
        });

        mapRef.current = map;

        map.on('load', () => {
            mapRef.current = map;
            initMapSources();

            getHeatmapData()
                .then(data => {
                    const records = data || [];
                    loadInitialData(records);
                    console.log(`Loaded ${records.length} SOS reports onto map`);
                })
                .catch(err => {
                    console.error('Failed to fetch initial heatmap data:', err);
                    loadInitialData([]);
                });

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

            map.on('mouseenter', 'sos-circles', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'sos-circles', () => {
                map.getCanvas().style.cursor = '';
            });

            if (onMapLoaded) onMapLoaded(mapRef);
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Box ref={mapContainerRef} pos="absolute" top={0} left={0} w="100%" h="100%" />
    );
};

export default MapView;
