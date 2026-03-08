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
        await pool.query("DELETE FROM resources WHERE type = 'ambulance'");

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

        // STEP 5 — Insert 3 ambulance resources
        console.log('Inserting Ambulances...');
        const ambulances = [
            { lat: 18.5150, lng: 73.8500 }, // Sassoon Hospital
            { lat: 18.5600, lng: 73.7769 }, // Hinjewadi
            { lat: 18.4968, lng: 73.8567 }, // Swargate
        ];

        for (const amb of ambulances) {
            await pool.query(`
                INSERT INTO resources (type, lat, lng, available)
                VALUES ('ambulance', $1, $2, true)
            `, [amb.lat, amb.lng]);
        }

        // STEP 6 — Log summary on completion
        console.log('Seed complete: 8 critical + 10 urgent + 7 standard SOS reports. 3 ambulances.');

    } catch (err) {
        console.error('Seed script failed:', err);
        process.exit(1);
    } finally {
        pool.end();
    }
}

seed();
