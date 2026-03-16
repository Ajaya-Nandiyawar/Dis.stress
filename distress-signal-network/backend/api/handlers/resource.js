const pool = require('../../db/pool');

async function getResources(req, res) {
    try {
        const { resource_type } = req.query;
        let query = 'SELECT id, name, lat, lng, resource_type, available FROM resources WHERE available = true';
        const params = [];

        if (resource_type) {
            query += ' AND resource_type = $1';
            params.push(resource_type);
        }

        query += ' ORDER BY resource_type, id';

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching resources:', err);
        res.status(500).json({ error: 'Database error' });
    }
}

async function seedResources(req, res) {
    try {
        // Idempotent: clear existing seeded resources first
        await pool.query(`DELETE FROM resources WHERE resource_type IN ('shelter','depot')`);
        // Also reset ambulances (they now get names)
        await pool.query(`DELETE FROM resources WHERE resource_type = 'ambulance'`);

        const resources = [
            { type: 'shelter',   name: 'Deccan Community Hall',    lat: 18.5176, lng: 73.8397, rt: 'shelter' },
            { type: 'shelter',   name: 'Baner Relief Camp',         lat: 18.5590, lng: 73.7877, rt: 'shelter' },
            { type: 'shelter',   name: 'Swargate Relief Centre',    lat: 18.4968, lng: 73.8567, rt: 'shelter' },
            { type: 'depot',     name: 'Sassoon Hospital Supplies', lat: 18.5150, lng: 73.8500, rt: 'depot' },
            { type: 'depot',     name: 'Khadki Supply Depot',       lat: 18.5669, lng: 73.8463, rt: 'depot' },
            { type: 'ambulance', name: 'Ambulance - Sassoon',       lat: 18.5150, lng: 73.8500, rt: 'ambulance' },
            { type: 'ambulance', name: 'Ambulance - Hinjewadi',     lat: 18.5600, lng: 73.7769, rt: 'ambulance' },
            { type: 'ambulance', name: 'Ambulance - Swargate',      lat: 18.4968, lng: 73.8567, rt: 'ambulance' },
        ];

        for (const r of resources) {
            await pool.query(
                `INSERT INTO resources (type, name, lat, lng, available, resource_type) VALUES ($1,$2,$3,$4,true,$5)`,
                [r.type, r.name, r.lat, r.lng, r.rt]
            );
        }

        res.json({ ok: true, seeded: resources.length, message: `${resources.length} resources seeded` });
    } catch (err) {
        console.error('Error seeding resources:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getResources, seedResources };
