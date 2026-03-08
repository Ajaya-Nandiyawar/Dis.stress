import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CONFIG } from '../constants/config';

mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

const MapView = () => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);

    useEffect(() => {
        if (mapRef.current) return;

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [73.8567, 18.5204], // Pune [longitude, latitude]
            zoom: 12,
        });

        mapRef.current = map;

        return () => {
            map.remove();
        };
    }, []);

    return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
};

export default MapView;
