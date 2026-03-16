const express = require('express');
const router = express.Router();

const sosHandlers = require('./handlers/sos');
const alertHandler = require('./handlers/alert');
const routingHandler = require('./handlers/routing');

// NOTE: /health is mounted at root level in server.js, NOT here.
// This router is strictly for /api/* prefixed routes.

// SOS endpoints
router.use('/sos', sosHandlers.router);

// Alert endpoints
router.use('/alert', alertHandler);
router.use('/alerts', alertHandler);

// Routing proxy endpoints
router.use('/routing', routingHandler);

// Citizen status update endpoint
router.post('/status', sosHandlers.submitStatus);

module.exports = router;
