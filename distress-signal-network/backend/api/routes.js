const express = require('express');
const router = express.Router();

const sosHandlers = require('./handlers/sos');
const alertHandler = require('./handlers/alert');
const routingHandler = require('./handlers/routing');
const resourceHandler = require('./handlers/resource');

// NOTE: /health is mounted at root level in server.js, NOT here.
// This router is strictly for /api/* prefixed routes.

// SOS endoints
router.use('/sos', sosHandlers.router);

// Alert endpoints
router.use('/alert', alertHandler);
router.use('/alerts', alertHandler);

// Resource endpoints
router.get('/resources', resourceHandler.getResources);
router.post('/resources/seed', resourceHandler.seedResources);

// Routing proxy endpoints
router.use('/routing', routingHandler);

// Citizen status update endpoint
router.post('/status', sosHandlers.submitStatus);

module.exports = router;
