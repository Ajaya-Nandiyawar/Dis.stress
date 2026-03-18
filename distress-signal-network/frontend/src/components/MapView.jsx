import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_CENTRE_PUNE, MAP_ZOOM_DEFAULT } from '../constants/config';
import { getHeatmapData } from '../api/sos';
import { useMapData } from '../hooks/useMapData';
import { useWebSocket } from '../hooks/useWebSocket';

const MapView = ({ onMapLoaded, onTriageComplete, onBroadcastAlert, onNewSos, onConnectionChange, onCitizenStatus, routingData, cascadeVisible, trafficVisible, evacuationVisible }) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const { initMapSources, loadInitialData, addSosPoint, updateSosPoint, drawRoute, drawCascadeRipples, toggleCascadeVisibility, drawAlertZone, loadResources, drawEvacuation } = useMapData(mapRef);
    const sosRecordsRef = useRef([]);

    const handleBroadcastAlertWithCascade = (data) => {
        if (onBroadcastAlert) onBroadcastAlert(data);
        drawCascadeRipples(data);
        drawAlertZone(data);

        // Update local records ref
        if (data.lat && data.lng && data.severity) {
            sosRecordsRef.current.push(data);
        }
    };

    useWebSocket({ addSosPoint, updateSosPoint, onTriageComplete, onBroadcastAlert: handleBroadcastAlertWithCascade, onNewSos, onConnectionChange, onCitizenStatus });

    // Draw route whenever routingData changes
    useEffect(() => {
        drawRoute(routingData);
    }, [routingData, drawRoute]);

    // Track visibility of cascade layer
    useEffect(() => {
        toggleCascadeVisibility(cascadeVisible);
    }, [cascadeVisible, toggleCascadeVisibility]);

    // Handle Traffic Layer visibility
    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setLayoutProperty('traffic', 'visibility', trafficVisible ? 'visible' : 'none');
    }, [trafficVisible]);

    // Handle Evacuation Route visibility and calculation
    useEffect(() => {
        if (!mapRef.current) return;
        mapRef.current.setLayoutProperty('evac-route', 'visibility', evacuationVisible ? 'visible' : 'none');
        if (evacuationVisible) {
            drawEvacuation(sosRecordsRef.current);
        }
    }, [evacuationVisible, drawEvacuation]);

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
                    sosRecordsRef.current = records;
                    loadInitialData(records);
                    console.log(`Loaded ${records.length} SOS reports onto map`);
                })
                .catch(err => {
                    console.error('Failed to fetch initial heatmap data:', err);
                    loadInitialData([]);
                });

            // Load resource markers (shelters, depots, ambulances)
            loadResources(map);

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

            // ── Disaster Alert Popups (NEW) ──────────────────
            map.on('click', ['alert-centers', 'alert-markers'], (e) => {
                const props = e.features[0].properties;
                const coords = e.features[0].geometry.coordinates.slice();

                new mapboxgl.Popup()
                    .setLngLat(coords)
                    .setHTML(`
                        <div style='font-family:monospace; font-size:13px; color:#fa5252;'>
                            <b style='font-size:15px;'>🚨 ${props.type?.toUpperCase()}</b><br/>
                            <b>THREAT LEVEL: ${props.confidence}% CONFIDENCE</b><br/>
                            <span style='color:#aaa'>Detected by AI Engine</span>
                        </div>
                    `)
                    .addTo(map);
            });

            map.on('mouseenter', ['alert-centers', 'alert-markers'], () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', ['alert-centers', 'alert-markers'], () => {
                map.getCanvas().style.cursor = '';
            });

            // ── Resource Popups (NEW) ────────────────────────
            map.on('click', 'resource-markers', (e) => {
                const props = e.features[0].properties;
                const coords = e.features[0].geometry.coordinates.slice();

                new mapboxgl.Popup()
                    .setLngLat(coords)
                    .setHTML(`
                        <div style='font-family:sans-serif; font-size:13px;'>
                            <b style='color:#00BCD4;'>${props.resource_type?.toUpperCase()}</b><br/>
                            <b style='font-size:14px;'>${props.name}</b>
                        </div>
                    `)
                    .addTo(map);
            });

            map.on('mouseenter', 'resource-markers', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'resource-markers', () => {
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
