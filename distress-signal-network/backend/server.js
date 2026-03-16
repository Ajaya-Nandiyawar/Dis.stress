require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const routes = require('./api/routes');
const pool = require('./db/pool');
const { connectDB } = require('./db/pool');
const { connectPublisher } = require('./redis/publisher');
const { connectSubscriber } = require('./redis/subscriber');
const { initSocket } = require('./ws/socket');

const app = express();
const server = http.createServer(app);
const io = initSocket(server);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Root-level routes (not prefixed with /api) ──────────────
const healthHandler = require('./api/handlers/health');
app.get('/health', healthHandler);

// ── API routes (prefixed with /api) ─────────────────────────
app.use('/api', routes);

const PORT = process.env.PORT || 3001;

// ── Schema migration (safe, idempotent) ─────────────────────
async function runMigrations() {
  try {
    // ── Resources table ──
    await pool.query(`ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check`);
    await pool.query(`ALTER TABLE resources ADD CONSTRAINT resources_type_check CHECK (type IN ('ambulance','fire','police','shelter','depot'))`);
    await pool.query(`
      ALTER TABLE resources
      ADD COLUMN IF NOT EXISTS resource_type VARCHAR(20) DEFAULT 'ambulance',
      ADD COLUMN IF NOT EXISTS name VARCHAR(100)
    `);
    await pool.query(`UPDATE resources SET resource_type = 'ambulance' WHERE resource_type IS NULL`);
    console.log('✔  Schema migration complete (resources table updated)');

    // ── Alerts table ──
    // Ensure source column exists and is wide enough for all source names
    await pool.query(`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS source VARCHAR(30)`);
    await pool.query(`ALTER TABLE alerts ALTER COLUMN source TYPE VARCHAR(30)`);
    console.log('✔  Schema migration complete (alerts.source column ensured)');
  } catch (err) {
    console.error('Schema migration failed (non-fatal):', err.message);
  }
}

// Verify DB and Redis connections, then start listening
(async () => {
  try {
    await connectDB();
    await runMigrations();
  } catch (err) {
    console.error('Failed to connect to PostgreSQL — server starting without DB');
  }
  try {
    await connectPublisher();
  } catch (err) {
    console.error('Failed to connect to Redis Publisher — server starting without Pub/Sub outbound');
  }
  try {
    await connectSubscriber();
  } catch (err) {
    console.error('Failed to connect to Redis Subscriber — server starting without Pub/Sub inbound');
  }
  server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
})();

module.exports = { app, server, io };
