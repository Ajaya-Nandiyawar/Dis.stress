require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const routes = require('./api/routes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Mount all routes
app.use('/api', routes);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

module.exports = { app, server };
