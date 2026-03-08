require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const routes = require('./api/routes');
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

// Verify DB and Redis connections, then start listening
(async () => {
  try {
    await connectDB();
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
// Triggering nodemon restart for Telegram bot .env changes
