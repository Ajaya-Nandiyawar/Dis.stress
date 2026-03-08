const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
});

// Log unexpected errors on idle clients
pool.on('error', (err) => {
    console.error('DB pool error:', err);
});

/**
 * Verify the database connection by running a simple query.
 * Call this at server startup before app.listen().
 * @returns {Promise<void>}
 */
async function connectDB() {
    const client = await pool.connect();
    try {
        await client.query('SELECT NOW()');
        console.log('PostgreSQL connected');
    } catch (err) {
        console.error('PostgreSQL connection failed:', err.message);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = pool;
module.exports.connectDB = connectDB;
