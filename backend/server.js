require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const routes = require('./api/routes');
const { connectDB } = require('./db/pool');
const { connectPublisher } = require('./redis/publisher');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mount all routes
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
    console.error('Failed to connect to Redis — server starting without Pub/Sub');
  }
  server.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
})();

module.exports = { app, server };
