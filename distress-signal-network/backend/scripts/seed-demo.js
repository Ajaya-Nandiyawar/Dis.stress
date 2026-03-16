const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const pool = require('../db/pool');

function randomOffset(min, max) {
    const value = Math.random() * (max - min) + min;
    return Math.random() > 0.5 ? value : -value;
}

const centers = [
    { lat: 18.5204, lng: 73.8567 }, // Shivajinagar
    { lat: 18.5314, lng: 73.8446 }  // FC Road
];

async function seed() {
    try {
        console.log('--- Seeding Demo Data ---');

        // STEP 1 — Clear existing data
        console.log('Clearing old SEED data...');
        await pool.query("DELETE FROM sos_reports WHERE message LIKE '%SEED%'");
        // Delete existing ambulances, shelters, and depots
        await pool.query("DELETE FROM resources WHERE resource_type IN ('ambulance', 'shelter', 'depot')");


        // STEP 2 — Insert 8 Level 1 (CRITICAL) reports
        console.log('Inserting CRITICAL reports...');
        for (let i = 0; i < 8; i++) {
            const center = centers[i % 2];
            const lat = center.lat + randomOffset(0, 0.002);
            const lng = center.lng + randomOffset(0, 0.002);
            const source = Math.random() > 0.5 ? 'zero-touch' : 'iot_node';

            await pool.query(`
                INSERT INTO sos_reports 
                (lat, lng, source, message, severity, label, colour, triaged_at, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            `, [
                lat, lng, source, 'Help needed! [SEED]',
                1, 'CRITICAL - Trapped', '#FF0000',
                JSON.stringify({ people_count: 2, seeded: true })
            ]);
        }

        // STEP 3 — Insert 10 Level 2 (URGENT) reports
        console.log('Inserting URGENT reports...');
        for (let i = 0; i < 10; i++) {
            const center = centers[0]; // Ring around Shivajinagar
            const lat = center.lat + randomOffset(0.005, 0.010);
            const lng = center.lng + randomOffset(0.005, 0.010);
            const source = Math.random() > 0.5 ? 'manual' : 'iot_node';

            await pool.query(`
                INSERT INTO sos_reports 
                (lat, lng, source, message, severity, label, colour, triaged_at, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            `, [
                lat, lng, source, 'Medical emergency reported. [SEED]',
                2, 'URGENT - Medical', '#FF8800',
                JSON.stringify({ seeded: true })
            ]);
        }

        // STEP 4 — Insert 7 Level 3 (STANDARD) reports
        console.log('Inserting STANDARD reports...');
        for (let i = 0; i < 7; i++) {
            const center = centers[0];
            const lat = center.lat + randomOffset(0.012, 0.020);
            const lng = center.lng + randomOffset(0.012, 0.020);

            await pool.query(`
                INSERT INTO sos_reports 
                (lat, lng, source, message, severity, label, colour, triaged_at, metadata)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            `, [
                lat, lng, 'manual', 'Need supplies [SEED]',
                3, 'STANDARD - Supplies', '#FFFF00',
                JSON.stringify({ seeded: true })
            ]);
        }

        // STEP 5 — Insert Resources (Ambulances, Shelters, Depots)
        console.log('Inserting Resources...');
        const resources = [
            // --- Shelters ---
            { type: 'shelter',   name: 'Deccan Community Hall',     lat: 18.5176, lng: 73.8397, rt: 'shelter' },
            { type: 'shelter',   name: 'Baner Relief Camp',          lat: 18.5590, lng: 73.7877, rt: 'shelter' },
            { type: 'shelter',   name: 'Swargate Relief Centre',     lat: 18.4968, lng: 73.8567, rt: 'shelter' },
            { type: 'shelter',   name: 'Aundh Community Center',     lat: 18.5580, lng: 73.8075, rt: 'shelter' },
            { type: 'shelter',   name: 'Kothrud Relief Camp',        lat: 18.5074, lng: 73.8077, rt: 'shelter' },
            { type: 'shelter',   name: 'Hadapsar Shelter',           lat: 18.5089, lng: 73.9259, rt: 'shelter' },
            { type: 'shelter',   name: 'Viman Nagar Hall',           lat: 18.5679, lng: 73.9143, rt: 'shelter' },

            // --- Depots ---
            { type: 'depot',     name: 'Sassoon Hospital Supplies',  lat: 18.5150, lng: 73.8500, rt: 'depot' },
            { type: 'depot',     name: 'Khadki Supply Depot',        lat: 18.5669, lng: 73.8463, rt: 'depot' },
            { type: 'depot',     name: 'Pimpri Relief Warehouse',    lat: 18.6298, lng: 73.7997, rt: 'depot' },
            { type: 'depot',     name: 'Katraj Supply Point',        lat: 18.4529, lng: 73.8543, rt: 'depot' },
            { type: 'depot',     name: 'Wagholi Logistics Hub',      lat: 18.5808, lng: 73.9787, rt: 'depot' },

            // --- Ambulances ---
            { type: 'ambulance', name: 'Ambulance - Sassoon',        lat: 18.5150, lng: 73.8500, rt: 'ambulance' },
            { type: 'ambulance', name: 'Ambulance - Hinjewadi',      lat: 18.5600, lng: 73.7769, rt: 'ambulance' },
            { type: 'ambulance', name: 'Ambulance - Swargate',       lat: 18.4968, lng: 73.8567, rt: 'ambulance' },
            { type: 'ambulance', name: 'Ambulance - Aundh',          lat: 18.5580, lng: 73.8075, rt: 'ambulance' },
        ];

        for (const res of resources) {
            await pool.query(`
                INSERT INTO resources (type, name, lat, lng, available, resource_type)
                VALUES ($1, $2, $3, $4, true, $5)
            `, [res.type, res.name, res.lat, res.lng, res.rt]);
        }

        // STEP 6 — Log summary on completion
        console.log('Seed complete: 8 critical + 10 urgent + 7 standard SOS reports. 8 resources seeded.');

    } catch (err) {
        console.error('Seed script failed:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

seed();
