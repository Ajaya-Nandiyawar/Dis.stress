const { createClient } = require('redis');

const publisher = createClient({
    url: process.env.REDIS_URL,
});

module.exports = publisher;
