const { createClient } = require('redis');

const subscriber = createClient({
    url: process.env.REDIS_URL,
});

module.exports = subscriber;
