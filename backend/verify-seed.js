const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./db/pool');

async function verify() {
    try {
        console.log('1. Counts by severity:');
        const res1 = await pool.query("SELECT severity, COUNT(*) FROM sos_reports WHERE metadata->>'seeded'='true' GROUP BY severity ORDER BY severity");
        console.table(res1.rows);

        console.log('2. Untriaged seeded records expected 0:');
        const res2 = await pool.query("SELECT COUNT(*) FROM sos_reports WHERE triaged_at IS NULL AND metadata->>'seeded'='true'");
        console.log(res2.rows[0].count);

        console.log('3. Total seeded reports expected 25 (idempotent):');
        const res3 = await pool.query("SELECT COUNT(*) FROM sos_reports WHERE metadata->>'seeded'='true'");
        console.log(res3.rows[0].count);

        console.log('4. Ambulances:');
        const res4 = await pool.query("SELECT id, type, lat, lng, available FROM resources WHERE type = 'ambulance'");
        console.table(res4.rows);

    } finally {
        await pool.end();
    }
}

verify();
