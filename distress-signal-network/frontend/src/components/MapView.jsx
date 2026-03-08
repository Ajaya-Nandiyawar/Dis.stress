import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, MAP_CENTRE_PUNE, MAP_ZOOM_DEFAULT } from '../constants/config';

const MapView = ({ onMapLoaded }) => {
    console.log('MapView component rendering');
    const mapContainerRef = useRef(null);  // ref for the DOM element
    const mapRef = useRef(null);           // ref for the Map object

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
            console.log('Mapbox map loaded');
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
