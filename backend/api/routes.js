const express = require('express');
const router = express.Router();

const sosHandler = require('./handlers/sos');
const alertHandler = require('./handlers/alert');
const routingHandler = require('./handlers/routing');

// NOTE: /health is mounted at root level in server.js, NOT here.
// This router is strictly for /api/* prefixed routes.

// SOS endpoints
router.use('/sos', sosHandler);

// Alert endpoints
router.use('/alert', alertHandler);

// Routing proxy endpoints
router.use('/routing', routingHandler);

module.exports = router;
