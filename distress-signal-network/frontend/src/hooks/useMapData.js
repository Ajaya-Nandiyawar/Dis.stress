import { useState } from 'react';

export const useMapData = () => {
    const [sosData, setSosData] = useState({
        type: 'FeatureCollection',
        features: [],
    });

    // This will be expanded later to manage GeoJSON updates
    return { sosData, setSosData };
};
