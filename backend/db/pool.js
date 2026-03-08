const { Pool } = require('pg');

let dbUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === 'production' && dbUrl) {
    dbUrl = dbUrl.replace('?sslmode=require', '');
}

const pool = new Pool({
    connectionString: dbUrl,
    max: 10,
    ...(process.env.NODE_ENV === 'production' && {
        ssl: { rejectUnauthorized: false }
    })
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
