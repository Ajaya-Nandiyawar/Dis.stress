const express = require('express');
const router = express.Router();

const sosHandler = require('./handlers/sos');
const alertHandler = require('./handlers/alert');
const routingHandler = require('./handlers/routing');
const healthHandler = require('./handlers/health');

// Health check
router.use('/health', healthHandler);

// SOS endpoints
router.use('/sos', sosHandler);

// Alert endpoints
router.use('/alert', alertHandler);

// Routing proxy endpoints
router.use('/routing', routingHandler);

module.exports = router;
