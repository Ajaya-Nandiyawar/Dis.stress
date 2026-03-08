/**
 * Redis Subscriber — DIST.RESS Signal Network
 * Completely separate client instance from publisher.
 */
if (!process.env.REDIS_URL) {
    require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
}

const { createClient } = require('redis');

const client = createClient({
    url: process.env.REDIS_URL,
});

client.on('error', (err) => {
    console.error('Redis subscriber error:', err.message);
});

/**
 * Connect the subscriber client to Redis.
 * @returns {Promise<void>}
 */
async function connectSubscriber() {
    if (!client.isOpen) {
        await client.connect();
        console.log('Redis subscriber connected');
    }
}

/**
 * Subscribe to a Redis Pub/Sub channel.
 * @param {string} channel - Channel name to subscribe to
 * @param {function} handler - Callback receiving the raw message string
 * @returns {Promise<void>}
 */
async function subscribe(channel, handler) {
    await client.subscribe(channel, (message) => {
        handler(message);
    });
    console.log(`Subscribed to channel: ${channel}`);
}

module.exports = { client, connectSubscriber, subscribe };
